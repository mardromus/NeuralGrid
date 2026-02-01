/**
 * Keyless Account Utilities - FIXED for SDK v1.39.0
 * Helper functions for AIP-61 integration
 */

import { Aptos, AptosConfig, Network, EphemeralKeyPair, KeylessAccount } from "@aptos-labs/ts-sdk";
import { jwtDecode } from "jwt-decode";
import { GoogleJWTPayload, KeylessConfig, DEFAULT_KEYLESS_CONFIG } from "@/types/keyless";

/**
 * Generate a cryptographically secure nonce for OAuth
 */
export function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build Google OAuth URL
 */
export function buildGoogleAuthUrl(config: KeylessConfig = DEFAULT_KEYLESS_CONFIG): string {
    const nonce = generateNonce();

    // Store nonce for verification
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('oauth_nonce', nonce);
    }

    const params = new URLSearchParams({
        client_id: config.googleClientId,
        redirect_uri: config.redirectUri,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Decode and validate Google JWT
 */
export function decodeGoogleJWT(idToken: string): GoogleJWTPayload {
    try {
        const decoded = jwtDecode<GoogleJWTPayload>(idToken);

        // Basic validation
        if (!decoded.sub || !decoded.iss || !decoded.exp) {
            throw new Error('Invalid JWT: missing required fields');
        }

        if (decoded.iss !== 'https://accounts.google.com' && decoded.iss !== 'accounts.google.com') {
            throw new Error('Invalid JWT: invalid issuer');
        }

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
            throw new Error('JWT expired');
        }

        return decoded;
    } catch (error) {
        throw new Error(`Failed to decode JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Derive keyless account address - CORRECT API for SDK v1.39.0
 * 
 * @param jwt - Raw JWT token string (not an object!)
 * @param ephemeralKeyPair - Ephemeral keypair for this session
 * @param config - Keyless configuration
 * @returns KeylessAccount with accountAddress property
 */
export async function deriveKeylessAccount(
    jwt: string,
    ephemeralKeyPair: EphemeralKeyPair,
    config: KeylessConfig = DEFAULT_KEYLESS_CONFIG
): Promise<KeylessAccount> {
    try {
        const aptos = new Aptos(new AptosConfig({
            network: config.network === 'testnet' ? Network.TESTNET : Network.MAINNET
        }));

        console.log('🔐 Deriving keyless account...');

        // CORRECT API: Use aptos.keyless namespace
        const keylessAccount = await aptos.keyless.deriveKeylessAccount({
            ephemeralKeyPair,
            jwt,  // Pass as string, not object!
            // pepper is optional - SDK will fetch if not provided
        });

        console.log(`✅ Keyless account derived: ${keylessAccount.accountAddress.toString()}`);

        return keylessAccount;
    } catch (error) {
        console.error('Failed to derive keyless account:', error);
        throw new Error(`Failed to derive keyless account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get pepper from Aptos service (optional - SDK handles this automatically)
 * 
 * @param jwt - Raw JWT token string
 * @param ephemeralKeyPair - Ephemeral keypair
 * @param config - Keyless configuration
 * @returns Pepper bytes
 */
export async function getPepper(
    jwt: string,
    ephemeralKeyPair: EphemeralKeyPair,
    config: KeylessConfig = DEFAULT_KEYLESS_CONFIG
): Promise<Uint8Array> {
    try {
        const aptos = new Aptos(new AptosConfig({
            network: config.network === 'testnet' ? Network.TESTNET : Network.MAINNET
        }));

        // CORRECT API: Use aptos.keyless.getPepper()
        const pepper = await aptos.keyless.getPepper({
            jwt,
            ephemeralKeyPair,
        });

        return pepper;
    } catch (error) {
        throw new Error(`Failed to fetch pepper: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Create ephemeral keypair for delegation session
 */
export function createSessionKeypair(): EphemeralKeyPair {
    return EphemeralKeyPair.generate();
}

/**
 * Serialize ephemeral keypair for storage
 * Uses the keypair's built-in serialization
 */
export function serializeKeypair(keypair: EphemeralKeyPair): string {
    // EphemeralKeyPair has bcsToBytes() method for serialization
    const bytes = keypair.bcsToBytes();
    return Buffer.from(bytes).toString('hex');
}

/**
 * Deserialize ephemeral keypair from storage
 */
export function deserializeKeypair(serialized: string): EphemeralKeyPair {
    const bytes = Buffer.from(serialized, 'hex');
    // Use fromBytes static method to reconstruct
    return EphemeralKeyPair.fromBytes(bytes);
}

/**
 * Validate delegation session
 */
export function isSessionValid(session: {
    remainingRequests: number;
    expiresAt: number;
    isActive: boolean;
}): boolean {
    return (
        session.isActive &&
        session.remainingRequests > 0 &&
        Date.now() < session.expiresAt
    );
}

/**
 * Calculate session expiry time
 */
export function getSessionExpiry(duration: number = DEFAULT_KEYLESS_CONFIG.sessionDuration): number {
    return Date.now() + duration;
}
