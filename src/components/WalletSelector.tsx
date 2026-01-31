"use client";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function WalletSelector() {
    const { connect, disconnect, account, connected, wallets } = useWallet();

    const handleConnect = async () => {
        try {
            // For MVP, just connect to the first available wallet (usually Petra)
            const petra = wallets.find(w => w.name === "Petra");
            if (petra) {
                await connect(petra.name);
            } else {
                // If wallet not found, could prompt install
                if (wallets.length > 0) {
                    await connect(wallets[0].name);
                } else {
                    window.open("https://petra.app/", "_blank");
                }
            }
        } catch (error) {
            // Silently suppress "wallet already connected" errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.toLowerCase().includes('already connected')) {
                // Wallet is already connected, ignore
                return;
            }
            // Only log unexpected errors
            console.error('Wallet connection error:', error);
        }
    };

    if (connected && account && typeof account.address === "string") {
        return (
            <Button variant="outline" onClick={() => disconnect()} className="gap-2 glass-card text-primary hover:bg-primary/20 border-primary/50">
                <Wallet className="w-4 h-4" />
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </Button>
        );
    }

    return (
        <Button onClick={handleConnect} className="bg-primary text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(14,165,233,0.5)] font-bold transition-all hover:scale-105">
            Connect Wallet
        </Button>
    );
}
