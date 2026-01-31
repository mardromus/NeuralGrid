/**
 * x402 Protocol Type Definitions
 * Based on the x402 specification for HTTP-native micropayments
 */

export interface PaymentRequired {
    /** Cost in Octas (1 APT = 100,000,000 Octas) */
    amount: string;
    /** Recipient address on Aptos */
    recipient: string;
    /** Time window for payment validity (Unix timestamp) */
    expiresAt: number;
    /** Unique identifier for this payment request */
    requestId: string;
    /** Optional: Description of the service being paid for */
    description?: string;
    /** Optional: Metadata for the transaction */
    metadata?: Record<string, unknown>;
}

export interface PaymentSignature {
    /** The signed transaction payload */
    signature: string;
    /** Public key of the signer */
    publicKey: string;
    /** Transaction hash */
    txnHash: string;
    /** Timestamp of signature creation */
    timestamp: number;
}

export interface PaymentResponse {
    /** Transaction hash on Aptos blockchain */
    transactionHash: string;
    /** Block height where transaction was confirmed */
    blockHeight: number;
    /** Fee paid in Octas */
    gasFee: string;
    /** Total amount transferred */
    amount: string;
    /** Timestamp of settlement */
    settledAt: number;
    /** Success status */
    success: boolean;
}

export interface PaymentVerification {
    /** Whether the payment is valid */
    isValid: boolean;
    /** Transaction details if valid */
    transaction?: PaymentResponse;
    /** Error message if invalid */
    error?: string;
}

export enum PaymentStatus {
    PENDING = "pending",
    AUTHORIZING = "authorizing",
    SUBMITTED = "submitted",
    CONFIRMED = "confirmed",
    FAILED = "failed",
    EXPIRED = "expired"
}

export interface AgentTaskRequest {
    agentId: string;
    taskType: string;
    parameters: Record<string, unknown>;
    maxPrice?: string; // Maximum price user is willing to pay in Octas
}

export interface AgentTaskResponse {
    requestId: string;
    result: unknown;
    executionTime: number;
    cost: string;
    payment: PaymentResponse;
}
