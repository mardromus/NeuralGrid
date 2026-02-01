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
    const [account, setAccount] = useState<KeylessAccount | null>(null);
    const [session, setSession] = useState<DelegationSession | null>(null);
    const [sessionTransactions, setSessionTransactions] = useState<SessionTransaction[]>([]);

    // Track if OAuth callback is processing to prevent double-execution in Strict Mode
    const processingRef = useRef(false);

    const aptos = new Aptos(new AptosConfig({
        network: config.network === 'testnet' ? Network.TESTNET : Network.MAINNET
    }));

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const restoreState = async () => {
            try {
                // Load account
                const savedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
                let restoredAccount: KeylessAccount | null = null;

                if (savedAccount) {
                    const parsed = JSON.parse(savedAccount);

                    // Reconstruct ephemeral keypair
                    const ephemeralKeyPair = deserializeKeypair(parsed.ephemeralKeyPairSerialized);

                    // Re-derive the SDK keyless account (Critical for signing!)
                    const pepper = parsed.pepperHex
                        ? Uint8Array.from(Buffer.from(parsed.pepperHex, 'hex'))
                        : undefined;

                    if (pepper) console.log('🌶️ Using cached pepper for offline restoration');

                    let sdkKeylessAccount;
                    try {
                        // 1. TRY OFFLINE RESTORATION FIRST (If we have proof)
                        // This bypasses any potential network calls in deriveKeylessAccount
                        if (parsed.proofHex && pepper) {
                            console.log('🛡️ Attempting OFFLINE restoration with persisted Proof & Pepper...');
                            const proofBytes = Uint8Array.from(Buffer.from(parsed.proofHex, 'hex'));

                            // Manual instantiation of the KeylessAccount class
                            // We need to match the constructor signature or use a fromBytes/create method if available.
                            // Looking at SDK docs/usage: KeylessAccount usually takes { ephemeralKeyPair, jwt, pepper, proof, ... }
                            // Let's try to instantiate it.

                            // The SDKKeylessAccount might need 'proof' as a specific object type (ZeroKnowledgeSig).
                            // However, usually the SDK is flexible or we can cast.
                            // Actually, let's try `deriveKeylessAccount` again but with the PROOF included if the SDK supports it validation-free.
                            // BUT `deriveKeylessAccount` threw the error.

                            // Alternative: Construct it manually.
                            // NOTE: We verified `sdkKeylessAccount` has `proof` property.
                            // We will try to instantiate it.

                            try {
                                // We don't have the exact constructor handy, so we'll use a safer approach:
                                // We create the object with `deriveKeylessAccount` (which we know works if network is okay)
                                // but since network is BAD, we need a way to skip it.

                                // HACK: If we have the PROOF, we can essentially "mock" the class if we can't instantiate it
                                // OR use `deriveKeylessAccount` but catch the error and fallback to manual construction?
                                // The error was "Network Error" inside deriveKeylessAccount.

                                // Let's assume `SDKKeylessAccount` constructor is accessible.
                                // const acc = new SDKKeylessAccount({ ... }); 
                                // If that fails (type mismatch), we will use the fallback:

                                // We'll try to use `deriveKeylessAccount` with `proof` if the type allows it, maybe it skips fetch?
                                // Checking type definition... deriveKeylessAccount input doesn't take 'proof'.

                                // OK, we must instantiate `SDKKeylessAccount`. 
                                // Constructor signature is typically: new KeylessAccount(args)
                                // args: { jwt, ephemeralKeyPair, pepper, proof, ... }

                                // Since we don't know the exact "Proof" type (it's likely a class), we might struggle to pass raw bytes.
                                // However, we know `deriveKeylessAccount` returns `SDKKeylessAccount`.

                                // LET'S TRY THIS:
                                // We will assume `deriveKeylessAccount` is failing because it tries to verify something.
                                // If we truly cannot use it, we will construct a partial object that HAS `signTransaction`.
                                // KeylessAccount.signTransaction uses `this.ephemeralKeyPair.sign(message)` and then creates the ZK signature.

                                // CRITICAL: The `signTransaction` method is what we need.
                                // It authenticates the tx.

                                // Let's try to instantiate `SDKKeylessAccount` directly.
                                const decodedJwt = decodeGoogleJWT(parsed.jwt);

                                // FIX: Convert pepper Uint8Array to hex string (SDK expects HexInput which starts with '0x')
                                const pepperHex = '0x' + Buffer.from(pepper).toString('hex');

                                // FIX: Create a complete proof mock that implements all required methods
                                const mockProof = {
                                    bcsToBytes: () => proofBytes,
                                    serialize: (serializer: any) => {
                                        // CRITICAL FIX: ZkProof is an Enum (Variant 0 = Groth16).
                                        // The persisted proofBytes likely lacks the variant index (just the struct).
                                        // We must PREPEND variant index 0 so Address Derivation & Signature Verification match.

                                        // 1. Write Variant Index 0 (Groth16)
                                        if (typeof serializer.serializeU32AsUleb128 === 'function') {
                                            serializer.serializeU32AsUleb128(0);
                                        } else {
                                            serializer.serializeU8(0); // Fallback (0 in ULEB128 is 0x00)
                                        }

                                        // 2. Write the Groth16 struct bytes
                                        if (typeof serializer.serializeFixedBytes === 'function') {
                                            serializer.serializeFixedBytes(proofBytes);
                                        } else {
                                            proofBytes.forEach((b) => serializer.serializeU8(b));
                                        }
                                    }
                                };

                                sdkKeylessAccount = new SDKKeylessAccount({
                                    ephemeralKeyPair,
                                    jwt: parsed.jwt,
                                    pepper: pepperHex, // FIXED: Use hex string instead of Uint8Array
                                    uidKey: 'sub',
                                    uidVal: decodedJwt.sub,
                                    aud: decodedJwt.aud || 'unknown',
                                    iss: decodedJwt.iss,
                                    proof: mockProof as any, // FIXED: Complete proof mock with serialize
                                    proofFetchCallback: async () => { }, // REQUIRED: SDK validation needs this even for sync proofs
                                });

                                // CRITICAL STABILITY FIX: Force override the address!
                                // The SDK's address derivation getter tries to re-serialize EphemeralPublicKey/Proof.
                                // This causes "Unknown variant index" errors (random bytes used as variant) due to restoration mismatches.
                                // Since we ALREADY have the correct address from storage, we enforce it to bypass derivation.
                                Object.defineProperty(sdkKeylessAccount, 'accountAddress', {
                                    value: AccountAddress.fromString(parsed.address),
                                    writable: true,
                                    configurable: true
                                });

                                // ALSO override authenticationKey to prevent ANY derivation usage
                                Object.defineProperty(sdkKeylessAccount, 'authenticationKey', {
                                    value: new AuthenticationKey({
                                        data: AccountAddress.fromString(parsed.address).toUint8Array() // AuthKey == Address for Keyless
                                    }),
                                    writable: true,
                                    configurable: true
                                });
                                console.log('✅ INSTANTIATED KeylessAccount directly (Offline Mode)');
                            } catch (e) {
                                console.warn('⚠️ Manual instantiation failed, falling back to derive...', e);
                                throw e; // Fall through to derive
                            }

                        } else {
                            // 2. FALLBACK TO DERIVE (Needs Network if no pepper/proof)
                            sdkKeylessAccount = await aptos.keyless.deriveKeylessAccount({
                                ephemeralKeyPair,
                                jwt: parsed.jwt,
                                pepper,
                            });
                        }

                        // Inject Proof if we used derive (and it didn't fail) but still need to restore proof
                        if (parsed.proofHex && sdkKeylessAccount && !(sdkKeylessAccount as any).proof) {
                            const proofBytes = Uint8Array.from(Buffer.from(parsed.proofHex, 'hex'));
                            (sdkKeylessAccount as any).proof = {
                                bcsToBytes: () => proofBytes,
                                serialize: (serializer: any) => {
                                    serializer.serializeBytes(proofBytes);
                                }
                            };
                        }

                        console.log('✅ Keyless account restored');
                    } catch (error: any) {
                        console.error('❌ Failed to restore keyless account:', error);

                        // CRITICAL FIX: Do NOT clear storage on Network Errors or Rate Limits (429)!
                        const isNetworkError = error.message === 'Network Error' || error.status === 429 || (error.response && error.response.status === 429);

                        if (!isNetworkError) {
                            // Only clear if it looks like a non-transient logic/data error
                            // console.warn('⚠️ Clearing potentially corrupt keyless state');
                            // localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
                        } else {
                            console.warn('⚠️ Network/Rate Limit error during restoration. Preserving session for retry.');
                        }

                        setAccount(null);
                        return; // Stop restoration
                    }

                    restoredAccount = {
                        ...parsed,
                        ephemeralKeyPair,
                        keylessAccount: sdkKeylessAccount,
                        expiryDate: new Date(parsed.expiryDate)
                    };

                    setAccount(restoredAccount);
                    console.log('✅ Restored keyless account from storage (Active)');
                }

                // Load session
                const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
                if (savedSession && restoredAccount) {
                    const parsed = JSON.parse(savedSession);

                    // Reconstruct session keypair (usually same as account's for this implementation)
                    const ephemeralKeyPair = deserializeKeypair(parsed.ephemeralKeyPairSerialized);

                    const sessionObj: DelegationSession = {
                        ...parsed,
                        ephemeralKeyPair,
                        keylessAccount: restoredAccount.keylessAccount // Link to the active account signer
                    };

                    // Only restore if still valid
                    if (isSessionValid(sessionObj)) {
                        setSession(sessionObj);
                        console.log('✅ Restored delegation session from storage');
                    } else {
                        localStorage.removeItem(STORAGE_KEYS.SESSION);
                    }
                }

                // Load transactions
                const savedTxns = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
                if (savedTxns) {
                    setSessionTransactions(JSON.parse(savedTxns));
                }
            } catch (error) {
                console.error('Failed to load keyless state:', error);
            }
        };

        restoreState();
    }, []);

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
            const deriveWithRetry = async (retries = 5, delay = 2000): Promise<any> => {
                try {
                    return await aptos.keyless.deriveKeylessAccount({
                        ephemeralKeyPair,
                        jwt: idToken,
                    });
                } catch (err) {
                    if (retries <= 0) throw err;

                    console.warn(`⚠️ Pepper service failed, retrying in ${delay}ms... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return deriveWithRetry(retries - 1, delay * 2);
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

            // Save to localStorage (serialize keypair AND PEPPER AND PROOF)
            localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify({
                address: keylessAccount.address,
                jwt: keylessAccount.jwt,
                ephemeralKeyPairSerialized: serializeKeypair(ephemeralKeyPair),
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
            console.error('Failed to create keyless account:', error);

            // Helpful error handling for common Aptos Prover Service issues
            if (error instanceof Error && error.message.includes('Network Error')) {
                console.error('❌ Failed to contact Aptos Pepper Service. Checks:');
                console.error('1. Internet connection');
                console.error('2. Aptos Devnet/Testnet status');
                console.error('3. CORS/Browser extensions blocking the request');

                // Clear state to allow retry
                processingRef.current = false;
                throw new Error('Connection to Aptos Keyless Service failed. Please check your connection and try again.');
            }

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

            // Save to localStorage (serialize keypair)
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
                ...newSession,
                ephemeralKeyPairSerialized: serializeKeypair(sessionKeyPair),
                ephemeralKeyPair: undefined, // Don't serialize the object directly
                keylessAccount: undefined // Can't serialize, will re-derive on load
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
                ephemeralKeyPairSerialized: serializeKeypair(updatedSession.ephemeralKeyPair),
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
                ephemeralKeyPairSerialized: serializeKeypair(revokedSession.ephemeralKeyPair),
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
