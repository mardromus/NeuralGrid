/**
 * Payment Modal Component
 * 
 * Beautiful UI for x402 payment authorization and status tracking
 */

"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Zap, Clock, Shield } from "lucide-react";
import { X402Client } from "@/lib/x402/client";
import { PaymentStatus, AgentTaskRequest } from "@/types/x402";
import { useKeyless } from "@/lib/keyless/provider"; // Use Keyless provider instead of Wallet Adapter
import { Network } from "@aptos-labs/ts-sdk";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    agentId: string;
    agentName: string;
    taskType: string;
    taskParameters: Record<string, unknown>;
    priceAPT: number;
    onSuccess?: (result: any) => void;
}

export function PaymentModal({
    isOpen,
    onClose,
    agentId,
    agentName,
    taskType,
    taskParameters,
    priceAPT,
    onSuccess
}: PaymentModalProps) {
    // Use Keyless hook instead of useWallet
    const { account, isAuthenticated, signWithSession } = useKeyless();

    const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
    const [error, setError] = useState<string | null>(null);
    const [txnHash, setTxnHash] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const handleExecuteWithPayment = async () => {
        if (!isAuthenticated || !account) {
            setError("Please login with Google first");
            return;
        }

        setStatus(PaymentStatus.AUTHORIZING);
        setError(null);

        try {
            const client = new X402Client(Network.TESTNET);

            const request: AgentTaskRequest = {
                agentId,
                taskType,
                parameters: taskParameters,
                maxPrice: X402Client.aptToOctas(priceAPT * 1.1) // 10% slippage tolerance
            };

            setStatus(PaymentStatus.SUBMITTED);

            const taskResult = await client.executeAgentTask(
                request,
                account.address, // Keyless account address (string)
                async (payload) => {
                    // Sign with Keyless Autonomous Session!
                    // This is much smoother - no popup required
                    const response = await signWithSession(payload);

                    if (response.hash) {
                        setTxnHash(response.hash);
                    }

                    return response;
                }
            );

            setStatus(PaymentStatus.CONFIRMED);
            setResult(taskResult);

            if (onSuccess) {
                onSuccess(taskResult);
            }

        } catch (err) {
            setStatus(PaymentStatus.FAILED);
            // Handle specific errors like session expiration
            if (err instanceof Error && err.message.includes("session")) {
                setError("Session expired. Please refresh autonomous mode.");
            } else {
                setError(err instanceof Error ? err.message : "Payment failed");
            }
        }
    };

    const handleClose = () => {
        if (status !== PaymentStatus.SUBMITTED && status !== PaymentStatus.AUTHORIZING) {
            setStatus(PaymentStatus.PENDING);
            setError(null);
            setTxnHash(null);
            setResult(null);
            onClose();
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case PaymentStatus.AUTHORIZING:
            case PaymentStatus.SUBMITTED:
                return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
            case PaymentStatus.CONFIRMED:
                return <CheckCircle2 className="w-12 h-12 text-green-500" />;
            case PaymentStatus.FAILED:
                return <XCircle className="w-12 h-12 text-red-500" />;
            default:
                return <Zap className="w-12 h-12 text-primary" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case PaymentStatus.AUTHORIZING:
                return "Authorizing payment...";
            case PaymentStatus.SUBMITTED:
                return "Processing transaction...";
            case PaymentStatus.CONFIRMED:
                return "Payment confirmed!";
            case PaymentStatus.FAILED:
                return "Payment failed";
            default:
                return "Ready to execute";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="glass-card border-primary/30 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        x402 Payment Authorization
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Secure micropayment for agent task execution
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">

                    {/* Status Indicator */}
                    <div className="flex flex-col items-center gap-3 py-6 border-y border-white/10">
                        {getStatusIcon()}
                        <p className="text-lg font-medium text-white">{getStatusText()}</p>
                        {status === PaymentStatus.SUBMITTED && (
                            <p className="text-xs text-muted-foreground">This usually takes 2-5 seconds on Aptos</p>
                        )}
                    </div>

                    {/* Task Details */}
                    <div className="space-y-3 bg-black/40 rounded-lg p-4 border border-white/10">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Agent</span>
                            <span className="text-sm font-mono text-white">{agentName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Task</span>
                            <Badge variant="outline" className="border-primary/50 text-primary">
                                {taskType}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                            <span className="text-sm text-muted-foreground">Cost</span>
                            <span className="text-lg font-bold text-primary flex items-center gap-1">
                                <Zap className="w-4 h-4 fill-current" />
                                {priceAPT} APT
                            </span>
                        </div>
                    </div>

                    {/* Transaction Hash */}
                    {txnHash && (
                        <div className="space-y-2">
                            <span className="text-xs text-muted-foreground">Transaction Hash</span>
                            <p className="text-xs font-mono text-white bg-black/40 p-2 rounded border border-white/10 break-all">
                                {txnHash}
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Result Preview */}
                    {result && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2">
                            <p className="text-sm text-green-400 font-medium">✓ Task completed successfully</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                Execution time: {result.executionTime}ms
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        {status === PaymentStatus.PENDING && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="flex-1 border-white/20"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleExecuteWithPayment}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold"
                                    disabled={!account}
                                >
                                    <Zap className="w-4 h-4 mr-2 fill-current" />
                                    Authorize & Execute
                                </Button>
                            </>
                        )}

                        {status === PaymentStatus.CONFIRMED && (
                            <Button
                                onClick={handleClose}
                                className="w-full bg-green-500 hover:bg-green-600 text-white"
                            >
                                Done
                            </Button>
                        )}

                        {status === PaymentStatus.FAILED && (
                            <Button
                                onClick={() => {
                                    setStatus(PaymentStatus.PENDING);
                                    setError(null);
                                }}
                                className="w-full"
                                variant="outline"
                            >
                                Try Again
                            </Button>
                        )}
                    </div>

                    {/* x402 Protocol Badge */}
                    <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10">
                        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            POWERED BY x402 PROTOCOL
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
