/**
 * x402 Agent Execution API
 * 
 * Implements the complete x402 payment protocol with REAL AI execution:
 * 1. Receives initial request → Returns 402 Payment Required
 * 2. Receives retry with PAYMENT-SIGNATURE → Verifies payment
 * 3. Executes agent task using real AI APIs → Returns result with PAYMENT-RESPONSE
 */

import { NextRequest, NextResponse } from "next/server";
import { getFacilitator } from "@/lib/x402/facilitator";
import { Network } from "@aptos-labs/ts-sdk";
import type { PaymentRequired, PaymentSignature, AgentTaskRequest } from "@/types/x402";
import { executeAgent, getAgentType } from "@/lib/agents/executor";
import { getAgentCostOctas } from "@/lib/agents/config";

// In-memory store for payment requests (in production, use Redis or database)
const pendingRequests = new Map<string, PaymentRequired>();

export async function POST(request: NextRequest) {
    try {
        console.log("\n🚀 [API] Agent Execute Request Received");
        const body: AgentTaskRequest & { requestId?: string } = await request.json();
        console.log("📦 [API] Body:", JSON.stringify(body, null, 2));

        const paymentSignatureHeader = request.headers.get("PAYMENT-SIGNATURE");
        console.log("💳 [API] Payment Signature Header Present:", !!paymentSignatureHeader);
        console.log("🆔 [API] Agent ID:", body.agentId);
        console.log("📋 [API] Task Type:", body.taskType);
        console.log("⚙️ [API] Parameters:", JSON.stringify(body.parameters, null, 2));

        // Get agent pricing from unified config
        const priceInOctas = getAgentCostOctas(body.agentId);
        console.log("💰 [API] Price in Octas:", priceInOctas);

        // CASE 1: Initial request without payment - Return 402 Payment Required
        if (!paymentSignatureHeader) {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const paymentRequired: PaymentRequired = {
                amount: priceInOctas,
                recipient: process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT || "0x1",
                expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
                requestId,
                description: `Agent ${body.agentId} - ${body.taskType}`,
                metadata: {
                    agentId: body.agentId,
                    taskType: body.taskType
                }
            };

            // Store for verification
            pendingRequests.set(requestId, paymentRequired);

            // Clean up expired requests
            setTimeout(() => pendingRequests.delete(requestId), 5 * 60 * 1000);

            return NextResponse.json(paymentRequired, {
                status: 402,
                headers: {
                    "Payment-Required": "true"
                }
            });
        }

        // CASE 2: Request with payment signature - Verify and execute
        const paymentSignature: PaymentSignature = JSON.parse(paymentSignatureHeader);
        const storedRequest = pendingRequests.get(body.requestId || "");

        if (!storedRequest) {
            return NextResponse.json(
                { error: "Invalid or expired request ID" },
                { status: 400 }
            );
        }

        // Verify payment hasn't expired
        if (Date.now() > storedRequest.expiresAt) {
            pendingRequests.delete(body.requestId!);
            return NextResponse.json(
                { error: "Payment request expired" },
                { status: 410 }
            );
        }

        // Verify payment on-chain via facilitator
        const facilitator = getFacilitator({
            network: (process.env.NEXT_PUBLIC_APTOS_NETWORK as Network) || Network.TESTNET
        });

        const verification = await facilitator.verifyAndSubmit(
            paymentSignature,
            storedRequest.amount
        );

        if (!verification.isValid) {
            return NextResponse.json(
                { error: `Payment verification failed: ${verification.error}` },
                { status: 402 }
            );
        }

        // Payment verified! Execute the REAL agent task
        console.log(`\n✅ [x402] Payment Verified! Executing agent ${body.agentId}...`);

        const agentType = getAgentType(body.agentId);
        console.log(`🎭 [EXECUTOR] Agent Type Resolved:`, agentType);
        console.log(`🎭 [EXECUTOR] Calling executeAgent with:`, { agentId: body.agentId, agentType, parameters: body.parameters });

        const taskResult = await executeAgent(
            body.agentId,
            agentType,
            body.parameters
        );

        console.log(`🎯 [EXECUTOR] Task Result:`, JSON.stringify(taskResult, null, 2));

        // Clean up
        pendingRequests.delete(body.requestId!);

        // Return result with payment response header
        const response = NextResponse.json({
            requestId: body.requestId,
            ...taskResult,
            cost: storedRequest.amount
        });

        response.headers.set("PAYMENT-RESPONSE", JSON.stringify(verification.transaction));
        response.headers.set("X-Agent-Id", body.agentId);
        response.headers.set("X-Execution-Time", taskResult.executionTime.toString());

        console.log(`[x402] Task completed successfully in ${taskResult.executionTime}ms`);

        return response;

    } catch (error) {
        console.error("Agent execution error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Unknown error",
                details: "Check server logs for more information"
            },
            { status: 500 }
        );
    }
}
