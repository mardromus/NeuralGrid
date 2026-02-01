/**
 * Keyless Account Types
 * AIP-61 Implementation for Aether Marketplace
 */

import { EphemeralKeyPair, KeylessAccount as SDKKeylessAccount } from "@aptos-labs/ts-sdk";

export interface KeylessAccount {
    keylessAccount: SDKKeylessAccount;  // The actual SDK account object
    address: string;
    jwt: string;
    ephemeralKeyPair: EphemeralKeyPair;
    expiryDate: Date;
    email?: string;
    name?: string;
    pepperHex?: string; // Stored pepper for offline restoration
    proofHex?: string;  // Stored ZK Proof for offline signing
}

export interface DelegationSession {
    id: string;
    ephemeralKeyPair: EphemeralKeyPair;
    keylessAccount: SDKKeylessAccount;  // Store the account for signing
    remainingRequests: number;
    maxRequests: number;
    totalAllowance: string; // Total APT allowance (in Octas)
    spentAmount: string;    // Cumulative spent (in Octas)
    createdAt: number;
    expiresAt: number;
    accountAddress: string;
    scope: 'x402_payments' | 'all';
    isActive: boolean;
}

export interface GoogleJWTPayload {
    iss: string;          // "https://accounts.google.com"
    sub: string;          // Google user ID
    aud: string;          // Your client ID
    exp: number;          // Expiration timestamp
    iat: number;          // Issued at timestamp
    email?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
}

export interface SessionTransaction {
    txHash: string;
    timestamp: number;
    status: 'pending' | 'success' | 'failed';
    type: 'x402_payment' | 'skill_purchase';
    amount?: string;
}

export interface KeylessConfig {
    googleClientId: string;
    redirectUri: string;
    proverUrl: string;
    pepperServiceUrl: string;
    network: 'testnet' | 'mainnet';
    sessionMaxRequests: number;
    sessionDuration: number; // milliseconds
}

export const DEFAULT_KEYLESS_CONFIG: KeylessConfig = {
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
    proverUrl: 'https://prover.devnet.aptoslabs.com',
    pepperServiceUrl: 'https://pepper.devnet.aptoslabs.com/v0/pepper',
    network: 'testnet',
    sessionMaxRequests: 10,
    sessionDuration: 3600000, // 1 hour
};
