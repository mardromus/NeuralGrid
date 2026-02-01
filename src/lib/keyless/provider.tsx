/**
 * Keyless Account Provider
 * React context for managing AIP-61 keyless accounts and delegation sessions
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Aptos, AptosConfig, Network, EphemeralKeyPair, Account, KeylessAccount as SDKKeylessAccount, AccountAddress, AuthenticationKey } from '@aptos-labs/ts-sdk';
import {
    KeylessAccount,
    DelegationSession,
    GoogleJWTPayload,
    KeylessConfig,
    DEFAULT_KEYLESS_CONFIG,
    SessionTransaction
} from '@/types/keyless';
import {
    buildGoogleAuthUrl,
    decodeGoogleJWT,
    createSessionKeypair,
    isSessionValid,
    getSessionExpiry,
    serializeKeypair,
    deserializeKeypair
} from './utils';

interface KeylessContextType {
    // Account state
    account: KeylessAccount | null;
    isAuthenticated: boolean;
    balance: string; // Added balance state

    // Session state
    session: DelegationSession | null;
    isSessionValid: boolean;

    // Actions
    login: () => void;
    logout: () => void;
    handleOAuthCallback: (idToken: string) => Promise<void>;

    // Delegation
    createDelegationSession: (maxRequests?: number, duration?: number, allowance?: string) => Promise<DelegationSession>;
    revokeSession: () => void;
    signWithSession: (transaction: any) => Promise<any>;

    // Session info
    sessionTransactions: SessionTransaction[];
}

/**
 * Check Aptos network health and pepper service availability
 */
async function checkAptosNetworkHealth(): Promise<{ healthy: boolean; status: string; details: any }> {
    try {
        const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

        // Test basic RPC connectivity
        const ledgerInfo = await aptos.getLedgerInfo();
        const isHealthy = !!ledgerInfo && !!ledgerInfo.chain_id;

        return {
            healthy: isHealthy,
            status: isHealthy ? 'Network operational' : 'Network issue detected',
            details: {
                chainId: ledgerInfo?.chain_id,
                epoch: ledgerInfo?.epoch,
                latestLedgerVersion: ledgerInfo?.ledger_version,
                timestamp: new Date().toISOString(),
            }
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('❌ Network health check failed:', errorMsg);

        return {
            healthy: false,
            status: `Network error: ${errorMsg}`,
            details: {
                error: errorMsg,
                timestamp: new Date().toISOString(),
            }
        };
    }
}

const KeylessContext = createContext<KeylessContextType | undefined>(undefined);

const STORAGE_KEYS = {
    ACCOUNT: 'keyless_account',
    SESSION: 'delegation_session',
    TRANSACTIONS: 'session_transactions',
};

export function KeylessProvider({
    children,
    config = DEFAULT_KEYLESS_CONFIG
}: {
    children: ReactNode;
    config?: KeylessConfig;
}) {
    // State
    const [account, setAccount] = useState<KeylessAccount | null>(null);
    const [balance, setBalance] = useState<string>("0"); // New state
    const [session, setSession] = useState<DelegationSession | null>(null);
    const [sessionTransactions, setSessionTransactions] = useState<SessionTransaction[]>([]);

    // Track if OAuth callback is processing to prevent double-execution in Strict Mode
    const processingRef = useRef(false);

    const aptos = new Aptos(new AptosConfig({
        network: config.network === 'testnet' ? Network.TESTNET : Network.MAINNET
    }));

    // Fetch balance helper
    const fetchBalance = useCallback(async (addr: string) => {
        try {
            const resources = await aptos.getAccountResources({ accountAddress: addr });
            const coinResource = resources.find(r => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
            if (coinResource) {
                const val = (coinResource.data as any).coin.value;
                const balanceAPT = (Number(val) / 100_000_000).toFixed(2);
                setBalance(balanceAPT);
            }
        } catch (e) {
            console.warn("Failed to fetch balance:", e);
            setBalance("0.00");
        }
    }, [aptos]);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const restoreState = async () => {
            try {
                // Check if we need to force login
                localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
                setAccount(null);
                setBalance("0"); // Reset balance
                console.log('ℹ️ Keyless account cleared. Please login to continue.');

                // Restore session if it exists (sessions are short-lived and safer)
                const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
                if (savedSession) {
                    // ... (session restoring logic)
                }
            } catch (error) {
                console.error('Failed to load keyless state:', error);
            }
        };

        restoreState();
    }, []);

    // ... (rest of the file) ...

    const address = sdkKeylessAccount.accountAddress.toString();
    console.log(`✅ Keyless account derived: ${address}`);

    // NEW: Fetch balance immediately
    await fetchBalance(address);

    // Step 4: Create account object
    const keylessAccount: KeylessAccount = {
        // ...
    };

    // ... (rest of the file) ...

    const contextValue: KeylessContextType = {
        account,
        isAuthenticated: !!account,
        balance, // Expose balance
        session,
        isSessionValid: session ? isSessionValid(session) : false,
        login,
        logout,
        handleOAuthCallback,
        createDelegationSession,
        revokeSession,
        signWithSession,
        sessionTransactions
    };

    return (
        <KeylessContext.Provider value={contextValue}>
            {children}
        </KeylessContext.Provider>
    );
}

/**
 * Initiate Google OAuth login
 */
const login = useCallback(() => {
    // CRITICAL: Generate ephemeral keypair BEFORE OAuth redirect
    const ephemeralKeyPair = EphemeralKeyPair.generate();

    // Serialize and store in sessionStorage
    const ephemeralKeyPairBytes = ephemeralKeyPair.bcsToBytes();
    const ephemeralKeyPairHex = Buffer.from(ephemeralKeyPairBytes).toString('hex');
    sessionStorage.setItem('ephemeral_keypair', ephemeralKeyPairHex);

    console.log('✅ Ephemeral keypair generated and stored before OAuth');

    // Build OAuth URL (will use nonce from keypair)
    // CRITICAL: Use the ephemeral keypair's NONCE
    const nonce = ephemeralKeyPair.nonce;
    console.log(`🔑 Using ephemeral keypair nonce: ${nonce}`);

    // Build OAuth URL with ephemeral keypair's nonce
    const params = new URLSearchParams({
        client_id: config.googleClientId,
        redirect_uri: config.redirectUri,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce,  // Use ephemeral keypair's nonce!
    });


    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    window.location.href = authUrl;
}, [config]);

/**
 * Handle OAuth callback with ID token
 */
const handleOAuthCallback = useCallback(async (idToken: string) => {
    // Prevent double-invocation in Strict Mode
    if (processingRef.current) {
        console.log('⏳ OAuth callback already processing, skipping...');
        return;
    }

    if (account) {
        console.log('✅ Account already authenticated, skipping callback processing');
        return;
    }

    try {
        processingRef.current = true;
        console.log('🔐 Processing keyless account...');

        // Step 1: Decode JWT
        const jwt: GoogleJWTPayload = decodeGoogleJWT(idToken);
        console.log(`✅ JWT decoded for user: ${jwt.email}`);

        // Step 2: Retrieve ephemeral keypair from sessionStorage (generated BEFORE OAuth)
        const ephemeralKeyPairHex = sessionStorage.getItem('ephemeral_keypair');

        // Handle case where keypair missing but we might be recovering from a race condition
        // If we can't find it, we must fail as we cannot derive the account
        if (!ephemeralKeyPairHex) {
            console.error('❌ Ephemeral keypair missing from session storage');
            throw new Error('Ephemeral keypair not found. Please try logging in again.');
        }

        // Deserialize the stored ephemeral keypair
        const ephemeralKeyPairBytes = Uint8Array.from(Buffer.from(ephemeralKeyPairHex, 'hex'));
        const ephemeralKeyPair = EphemeralKeyPair.fromBytes(ephemeralKeyPairBytes);
        console.log('✅ Ephemeral keypair retrieved from session');

        // Step 3: Derive keyless account (returns full KeylessAccount object!)
        // We implement a retry mechanism here because the Aptos Pepper Service can be flaky on Testnet
        const deriveWithRetry = async (retries = 8, delay = 2000): Promise<any> => {
            try {
                console.log(`⏳ Pepper Service attempt (${9 - retries}/9)...`);
                return await aptos.keyless.deriveKeylessAccount({
                    ephemeralKeyPair,
                    jwt: idToken,
                });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.warn(`⚠️ Pepper service error: ${errorMsg}`);

                if (retries <= 0) {
                    console.error('❌ Pepper Service failed after 9 attempts');
                    console.error('Full error:', err);

                    // Last resort: Try to use offline recovery if available
                    console.log('💾 Attempting offline account recovery...');
                    const sessionData = sessionStorage.getItem(`keyless_account_${idToken.sub}`);
                    if (sessionData) {
                        try {
                            const recovered = JSON.parse(sessionData);
                            console.log('✅ Recovered account from session:', recovered.address);
                            return {
                                accountAddress: { toString: () => recovered.address },
                                pepper: recovered.pepperHex ? Uint8Array.from(Buffer.from(recovered.pepperHex, 'hex')) : undefined,
                                proof: recovered.proofHex ? Uint8Array.from(Buffer.from(recovered.proofHex, 'hex')) : undefined,
                            };
                        } catch (e) {
                            console.error('Failed to recover from session:', e);
                        }
                    }

                    throw new Error(`Pepper Service unavailable after 9 attempts: ${errorMsg}`);
                }

                const nextDelay = Math.min(delay * 1.5, 15000); // Cap at 15s
                console.warn(`⚠️ Retrying in ${nextDelay}ms... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, nextDelay));
                return deriveWithRetry(retries - 1, nextDelay);
            }
        };

        console.log('⏳ Contacting Aptos Pepper Service...');
        const sdkKeylessAccount = await deriveWithRetry();

        // 2. EXTRACT PEPPER for persistence!
        // We need to save this so we can restore offline
        const pepper = (sdkKeylessAccount as any).pepper;
        let pepperHex: string | undefined;
        if (pepper && pepper instanceof Uint8Array) {
            pepperHex = Buffer.from(pepper).toString('hex');
            console.log('🌶️ Pepper secured for offline access');
        }

        // EXTRACT PROOF for persistence!
        // The proof object is needed for signing.
        const proof = (sdkKeylessAccount as any).proof;
        let proofHex: string | undefined;
        if (proof && typeof proof.bcsToBytes === 'function') {
            try {
                const proofBytes = proof.bcsToBytes();
                proofHex = Buffer.from(proofBytes).toString('hex');
                console.log('🛡️ ZK Proof secured for offline signing');
            } catch (e) {
                console.error('Failed to serialize proof:', e);
            }
        }

        const address = sdkKeylessAccount.accountAddress.toString();
        console.log(`✅ Keyless account derived: ${address}`);

        // Step 4: Create account object with SDK account
        const keylessAccount: KeylessAccount = {
            keylessAccount: sdkKeylessAccount,  // Store SDK account for signing!
            address,
            jwt: idToken,
            ephemeralKeyPair,
            expiryDate: new Date(jwt.exp * 1000),
            email: jwt.email,
            name: jwt.name,
            pepperHex, // Store in state
            proofHex,  // Store in state
        };

        setAccount(keylessAccount);

        // Save to localStorage (DO NOT serialize keypair - generate fresh on load)
        localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify({
            address: keylessAccount.address,
            jwt: keylessAccount.jwt,
            expiryDate: keylessAccount.expiryDate.toISOString(),
            email: keylessAccount.email,
            name: keylessAccount.name,
            pepperHex, // Persist!
            proofHex,  // Persist!
        }));

        // Clean up sessionStorage
        sessionStorage.removeItem('ephemeral_keypair');

        console.log('🎉 Keyless account created successfully!');
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('❌ Failed to create keyless account:', errorMsg);

        // Detailed error diagnostics
        if (errorMsg.includes('Pepper Service')) {
            console.error('⚠️ Aptos Pepper Service Issue:');
            console.error('The Pepper Service derives your keyless account.');
            console.error('');
            console.error('Possible causes:');
            console.error('1. Pepper Service is down (check status.aptoslabs.com)');
            console.error('2. Network connectivity issues');
            console.error('3. Browser security/CORS restrictions');
            console.error('4. Testnet congestion (happens on Fridays)');
            console.error('');
            console.error('Solutions:');
            console.error('✓ Try again in 30 seconds');
            console.error('✓ Clear browser cache and retry');
            console.error('✓ Try in Incognito/Private mode');
            console.error('✓ Check Aptos status: https://status.aptoslabs.com');

            // Check network health
            const health = await checkAptosNetworkHealth();
            console.error('Network Health:', health);
        } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            console.error('⚠️ JWT Verification Issue:');
            console.error('Your Google login token may have expired or is invalid.');
            console.error('Please try logging in again.');
        } else if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT')) {
            console.error('⚠️ Request Timeout:');
            console.error('The Pepper Service took too long to respond.');
            console.error('This usually resolves by retrying.');
        }

        // Clear state to allow retry
        processingRef.current = false;
        throw error;
    } finally {
        processingRef.current = false;
    }
}, [config, aptos, account]);

/**
 * Create delegation session for autonomous payments
 */
const createDelegationSession = useCallback(async (
    maxRequests: number = config.sessionMaxRequests,
    duration: number = config.sessionDuration,
    allowance: string = "100000000" // Default 1 APT
) => {
    if (!account) {
        throw new Error('No keyless account found. Please login first.');
    }

    try {
        console.log(`🤖 Creating delegation session (${maxRequests} autonomous payments)...`);

        // FIX: Reuse the existing ephemeral keypair and account
        // We cannot create a new keypair because the JWT is bound to the original one!
        const sessionKeyPair = account.ephemeralKeyPair;
        const sessionKeylessAccount = account.keylessAccount;

        console.log('✅ reuse existing keyless account for session');

        const newSession: DelegationSession = {
            id: `session-${Date.now()}`,
            ephemeralKeyPair: sessionKeyPair,
            keylessAccount: sessionKeylessAccount,  // Store for signing!
            remainingRequests: maxRequests,
            maxRequests,
            totalAllowance: allowance,
            spentAmount: "0",
            createdAt: Date.now(),
            expiresAt: getSessionExpiry(duration),
            accountAddress: account.address,
            scope: 'x402_payments',
            isActive: true
        };

        setSession(newSession);
        setSessionTransactions([]); // Reset transaction log

        // Save to localStorage (DO NOT serialize keypair)
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
            ...newSession,
            ephemeralKeyPair: undefined, // Don't store - will regenerate on use
            keylessAccount: undefined // Can't serialize
        }));

        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));

        console.log(`✅ Delegation session created! ${maxRequests} autonomous payments authorized`);
        console.log(`⏰ Expires at: ${new Date(newSession.expiresAt).toLocaleString()}`);

        return newSession;
    } catch (error) {
        console.error('Failed to create delegation session:', error);
        throw error;
    }
}, [account, config]);

/**
 * Sign transaction with delegation session (AUTONOMOUS - NO POPUP!)
 */
const signWithSession = useCallback(async (transaction: any) => {
    if (!session || !account) {
        throw new Error('No active delegation session');
    }

    // Validate session
    if (!isSessionValid(session)) {
        throw new Error('Delegation session expired or invalid');
    }

    // Ensure session has keyless account
    if (!session.keylessAccount) {
        throw new Error('Session keyless account not initialized');
    }

    try {
        console.log(`🤖 Signing transaction autonomously... (${session.remainingRequests}/${session.maxRequests} remaining)`);

        // CRITICAL FIX: Ensure ephemeralKeyPair is in sync before signing
        if (session.ephemeralKeyPair && !session.keylessAccount.ephemeralKeyPair) {
            console.warn('⚠️ Syncing ephemeralKeyPair into keylessAccount...');
            Object.defineProperty(session.keylessAccount, 'ephemeralKeyPair', {
                value: session.ephemeralKeyPair,
                writable: true,
                configurable: true
            });
        }

        // DEBUG: Inspect the signer object
        console.log('🔍 Inspecting session signer:', session.keylessAccount);

        // Validate signer structure to catch "undefined reading bcsToBytes"
        if (!session.keylessAccount.ephemeralKeyPair) {
            console.error('❌ Signer is missing ephemeralKeyPair!', session.keylessAccount);
            throw new Error('Signer configuration error: missing ephemeral keypair');
        }

        // Check if it's a real EphemeralKeyPair instance (has bcsToBytes)
        if (typeof session.keylessAccount.ephemeralKeyPair.bcsToBytes !== 'function') {
            console.error('❌ ephemeralKeyPair is not a class instance! It might be a plain object from JSON.', session.keylessAccount.ephemeralKeyPair);

            // ATTEMPT REPAIR: If it's a plain object but has the data, try to re-instantiate
            // This shouldn't happen if useEffect logic is correct, but let's be safe
            try {
                // Check if it has 'data' property (Uint8Array) or similar
                // For now, let's just throw, but logging this will confirm the theory
                throw new Error('Signer ephemeralKeyPair is malformed (not an instance)');
            } catch (e) {
                throw e;
            }
        }

        if (!transaction.function) {
            console.error("❌ Transaction payload missing 'function' field!", transaction);
            throw new Error("Invalid transaction payload: missing 'function'");
        }

        // ALLOWANCE CHECK (Pillar B)
        const amount = transaction.arguments ? transaction.arguments[1] : (transaction.functionArguments ? transaction.functionArguments[1] : "0");
        const amountBigInt = BigInt(amount);
        const allowanceRemaining = BigInt(session.totalAllowance) - BigInt(session.spentAmount);

        if (amountBigInt > allowanceRemaining) {
            throw new Error(`Insufficient session allowance. Remaining: ${allowanceRemaining.toString()} Octas`);
        }

        // 1. Build the transaction explicitly (Fixes "invalid payload" / serialization issues)
        const builtTxn = await aptos.transaction.build.simple({
            sender: session.keylessAccount.accountAddress,
            data: {
                function: transaction.function,
                typeArguments: transaction.type_arguments || transaction.typeArguments || [],
                functionArguments: transaction.arguments || transaction.functionArguments || []
            }
        });

        // 2. Sign the BUILT transaction
        const signedTxn = await aptos.transaction.sign({
            signer: session.keylessAccount,
            transaction: builtTxn
        });

        // 3. Submit the signed transaction
        const committedTxn = await aptos.transaction.submit.simple({
            transaction: builtTxn,
            senderAuthenticator: signedTxn
        });

        // Wait for confirmation
        const executedTxn = await aptos.waitForTransaction({
            transactionHash: committedTxn.hash
        });

        // Record transaction
        const txRecord: SessionTransaction = {
            txHash: committedTxn.hash,
            timestamp: Date.now(),
            status: 'success',
            type: 'x402_payment',
            amount: amount.toString()
        };

        const updatedTxns = [...sessionTransactions, txRecord];
        setSessionTransactions(updatedTxns);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxns));

        // Update session state
        const updatedSession: DelegationSession = {
            ...session,
            remainingRequests: session.remainingRequests - 1,
            spentAmount: (BigInt(session.spentAmount) + amountBigInt).toString()
        };

        // Auto-revoke if no requests left or allowance spent
        if (updatedSession.remainingRequests <= 0 || BigInt(updatedSession.spentAmount) >= BigInt(updatedSession.totalAllowance)) {
            updatedSession.isActive = false;
            console.log('⚠️ Delegation session exhausted or allowance depleted.');
        }

        setSession(updatedSession);
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
            ...updatedSession,
            ephemeralKeyPair: undefined,
            keylessAccount: undefined
        }));

        console.log(`✅ Transaction signed autonomously! Hash: ${committedTxn.hash}`);
        console.log(`📊 Remaining: ${updatedSession.remainingRequests}/${updatedSession.maxRequests}`);

        return committedTxn;
    } catch (error) {
        console.error('Failed to sign with session:', error);

        // Record failed transaction
        const txRecord: SessionTransaction = {
            txHash: '',
            timestamp: Date.now(),
            status: 'failed',
            type: 'x402_payment'
        };

        const updatedTxns = [...sessionTransactions, txRecord];
        setSessionTransactions(updatedTxns);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxns));

        throw error;
    }
}, [session, account, sessionTransactions, aptos]);

/**
 * Revoke delegation session
 */
const revokeSession = useCallback(() => {
    if (session) {
        const revokedSession = { ...session, isActive: false };
        setSession(revokedSession);
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
            ...revokedSession,
            ephemeralKeyPair: undefined
        }));
        console.log('🔒 Delegation session revoked');
    }
}, [session]);

/**
 * Logout and clear all data
 */
const logout = useCallback(() => {
    setAccount(null);
    setSession(null);
    setSessionTransactions([]);

    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);

    console.log('👋 Logged out');
}, []);

const contextValue: KeylessContextType = {
    account,
    isAuthenticated: !!account,
    session,
    isSessionValid: session ? isSessionValid(session) : false,
    login,
    logout,
    handleOAuthCallback,
    createDelegationSession,
    revokeSession,
    signWithSession,
    sessionTransactions
};

return (
    <KeylessContext.Provider value={contextValue}>
        {children}
    </KeylessContext.Provider>
);
}

/**
 * Hook to use keyless context
 */
export function useKeyless() {
    const context = useContext(KeylessContext);
    if (!context) {
        throw new Error('useKeyless must be used within KeylessProvider');
    }
    return context;
}
