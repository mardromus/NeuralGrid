/**
 * OAuth Callback Page
 * Handles Google OAuth redirect and keyless account creation
 */

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyless } from '@/lib/keyless/provider';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
    const router = useRouter();
    const { handleOAuthCallback } = useKeyless();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        async function processCallback() {
            try {
                // Extract ID token from URL hash
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const idToken = params.get('id_token');

                if (!idToken) {
                    throw new Error('No ID token found in callback');
                }

                setStatus('processing');

                // Create keyless account
                await handleOAuthCallback(idToken);

                setStatus('success');

                // Redirect to home after 1 second
                setTimeout(() => {
                    router.push('/');
                }, 1000);

            } catch (err) {
                console.error('OAuth callback error:', err);
                setStatus('error');
                setError(err instanceof Error ? err.message : 'Unknown error');
            }
        }

        processCallback();
    }, [handleOAuthCallback, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="glass-card p-8 max-w-md w-full text-center">
                {status === 'processing' && (
                    <>
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Creating Keyless Account...</h2>
                        <p className="text-muted-foreground">
                            Deriving your Aptos address from Google OAuth
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
                        <p className="text-muted-foreground">
                            Redirecting to marketplace...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Authentication Failed</h2>
                        <p className="text-red-400 text-sm mb-4">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/80"
                        >
                            Return to Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
