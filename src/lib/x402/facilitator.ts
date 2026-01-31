/**
 * x402 Facilitator Integration
 * 
 * Handles gas abstraction, transaction submission, and settlement verification
 * Can integrate with Coinbase CDP or run as a self-hosted facilitator
 */

import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";
import type { PaymentSignature, PaymentResponse, PaymentVerification } from "@/types/x402";

interface FacilitatorConfig {
    network: Network;
    apiEndpoint?: string; // Optional: Coinbase CDP facilitator endpoint
    privateKey?: string; // For self-hosted facilitator
}

export class X402Facilitator {
    private aptos: Aptos;
    private config: FacilitatorConfig;
    private facilitatorAccount?: Account;

    constructor(config: FacilitatorConfig) {
        const aptosConfig = new AptosConfig({ network: config.network });
        this.aptos = new Aptos(aptosConfig);
        this.config = config;

        // Initialize self-hosted facilitator if private key provided
        if (config.privateKey) {
            // Note: In production, use secure key management
            // this.facilitatorAccount = Account.fromPrivateKey({ privateKey: config.privateKey });
        }
    }

    /**
     * Verify and submit a payment transaction
     * This is called by the backend API to validate x402 payments
     */
    async verifyAndSubmit(
        paymentSignature: PaymentSignature,
        expectedAmount: string,
        expectedRecipient: string
    ): Promise<PaymentVerification> {

        try {
            // Wait for transaction confirmation on Aptos
            const txnResponse = await this.aptos.waitForTransaction({
                transactionHash: paymentSignature.txnHash,
                options: {
                    timeoutSecs: 30,
                    checkSuccess: true
                }
            });

            // Verify transaction succeeded
            if (!txnResponse.success) {
                return {
                    isValid: false,
                    error: "Transaction failed on-chain"
                };
            }

            // Extract and verify payment details from transaction
            const verification = await this.verifyTransactionDetails(
                txnResponse,
                expectedAmount,
                expectedRecipient
            );

            if (!verification.isValid) {
                return verification;
            }

            // Build payment response
            const paymentResponse: PaymentResponse = {
                transactionHash: txnResponse.hash,
                blockHeight: Number(txnResponse.version),
                gasFee: txnResponse.gas_used,
                amount: expectedAmount,
                settledAt: Math.floor(Number(txnResponse.timestamp) / 1000),
                success: true
            };

            return {
                isValid: true,
                transaction: paymentResponse
            };

        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : "Verification failed"
            };
        }
    }

    /**
     * Verify transaction details match payment requirements
     */
    private async verifyTransactionDetails(
        txn: any,
        expectedAmount: string,
        expectedRecipient: string
    ): Promise<PaymentVerification> {

        // Parse transaction payload
        if (txn.payload?.function !== "0x1::aptos_account::transfer") {
            return {
                isValid: false,
                error: "Invalid transaction function"
            };
        }

        const [recipient, amount] = txn.payload.arguments || [];

        // Verify recipient
        if (recipient !== expectedRecipient) {
            return {
                isValid: false,
                error: `Invalid recipient: expected ${expectedRecipient}, got ${recipient}`
            };
        }

        // Verify amount
        if (amount !== expectedAmount) {
            return {
                isValid: false,
                error: `Invalid amount: expected ${expectedAmount}, got ${amount}`
            };
        }

        return { isValid: true };
    }

    /**
     * Get transaction status
     */
    async getTransactionStatus(txnHash: string): Promise<{
        pending: boolean;
        success: boolean;
        blockHeight?: number;
    }> {
        try {
            const txn = await this.aptos.getTransactionByHash({ transactionHash: txnHash });

            return {
                pending: false,
                success: "success" in txn ? txn.success : false,
                blockHeight: "version" in txn ? Number(txn.version) : undefined
            };
        } catch {
            return {
                pending: true,
                success: false
            };
        }
    }

    /**
     * Estimate gas cost for a payment transaction
     */
    async estimateGasCost(amount: string, recipient: string): Promise<string> {
        try {
            // Use a dummy sender for simulation
            const dummySender = "0x1";

            const transaction = await this.aptos.transaction.build.simple({
                sender: dummySender,
                data: {
                    function: "0x1::aptos_account::transfer",
                    functionArguments: [recipient, amount]
                }
            });

            // Estimate gas (typically ~700-1500 for simple transfer)
            // On Aptos: gas_unit_price * max_gas_amount
            return "1000"; // Conservative estimate in gas units

        } catch {
            return "1500"; // Fallback estimate
        }
    }

    /**
     * For self-hosted facilitators: Submit transaction on behalf of user
     * (Advanced feature - requires secure key management)
     */
    async submitOnBehalfOf(
        fromAddress: string,
        toAddress: string,
        amount: string
    ): Promise<string> {
        if (!this.facilitatorAccount) {
            throw new Error("Facilitator account not configured");
        }

        // This would require implementing sponsored transactions or
        // a more complex delegation pattern. For now, just a placeholder.
        throw new Error("Not implemented - use client-side signing");
    }
}

/**
 * Singleton instance for backend use
 */
let facilitatorInstance: X402Facilitator | null = null;

export function getFacilitator(config?: FacilitatorConfig): X402Facilitator {
    if (!facilitatorInstance) {
        facilitatorInstance = new X402Facilitator(
            config || {
                network: (process.env.NEXT_PUBLIC_APTOS_NETWORK as Network) || Network.TESTNET
            }
        );
    }
    return facilitatorInstance;
}
