/**
 * Keyless Wallet Selector
 * Replaces Petra wallet with Google OAuth login
 */

"use client";

import { useKeyless } from "@/lib/keyless/provider";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Zap, Shield } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function KeylessWalletSelector() {
    const {
        account,
        isAuthenticated,
        session,
        isSessionValid,
        login,
        logout,
        createDelegationSession,
        revokeSession,
        sessionTransactions
    } = useKeyless();

    if (!isAuthenticated || !account) {
        return (
            <Button
                onClick={login}
                className="bg-primary text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(14,165,233,0.5)] font-bold transition-all hover:scale-105 gap-2"
            >
                <LogIn className="w-4 h-4" />
                Login with Google
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 glass-card text-primary hover:bg-primary/20 border-primary/50"
                >
                    <Shield className="w-4 h-4" />
                    {account.address.slice(0, 6)}...{account.address.slice(-4)}
                    {isSessionValid && (
                        <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            {session!.remainingRequests} auto
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 glass-card border-primary/20">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">Keyless Account</p>
                        <p className="text-xs text-muted-foreground">{account.email}</p>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-white/10" />

                <div className="p-2">
                    <div className="text-xs text-muted-foreground mb-2">Delegation Session</div>
                    {isSessionValid ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-green-400">🤖 Active</span>
                                <span>{session!.remainingRequests}/{session!.maxRequests} left</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Autonomous payments enabled
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Expires: {new Date(session!.expiresAt).toLocaleTimeString()}
                            </div>
                            <Button
                                onClick={revokeSession}
                                variant="ghost"
                                size="sm"
                                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                                Revoke Session
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">No active session</div>
                            <Button
                                onClick={() => createDelegationSession()}
                                size="sm"
                                className="w-full bg-primary text-black hover:bg-primary/80 gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                Enable 10 Auto-Payments
                            </Button>
                        </div>
                    )}
                </div>

                {sessionTransactions.length > 0 && (
                    <>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <div className="p-2">
                            <div className="text-xs text-muted-foreground mb-1">
                                Recent Transactions
                            </div>
                            <div className="text-sm">
                                {sessionTransactions.slice(-3).reverse().map((tx, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs py-1">
                                        <span className={tx.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                                            {tx.status === 'success' ? '✓' : '✗'}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {tx.txHash.slice(0, 6)}...
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                    onClick={logout}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
