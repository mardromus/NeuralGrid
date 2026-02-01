import { KeylessWalletSelector } from "./KeylessWalletSelector";
import Link from "next/link";
import { Cpu, LayoutDashboard, FileText, Plus } from "lucide-react"; // Added icons
import { Button } from "@/components/ui/button";

export function Navbar() {
    return (
        <nav className="w-full h-16 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between px-6 fixed top-0 z-50">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/20">
                    <Cpu className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <Link href="/" className="text-xl font-bold tracking-tighter text-glow text-white group mr-8">
                    AETHER <span className="text-primary group-hover:text-pink-500 transition-colors">MARKET</span>
                </Link>

                {/* New Links */}
                <div className="hidden md:flex gap-6 items-center border-l border-white/10 pl-6 h-8">
                    <Link href="/dashboard" className="text-xs font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                        <LayoutDashboard className="w-3 h-3" /> DASHBOARD
                    </Link>
                    <Link href="/protocol" className="text-xs font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                        <FileText className="w-3 h-3" /> PROTOCOL
                    </Link>
                </div>
            </div>
            <div className="flex gap-4 items-center">
                <Link href="/register">
                    <Button variant="ghost" className="text-cyan-400 hover:text-white hover:bg-cyan-400/10 font-bold tracking-wide border border-cyan-400/20">
                        <Plus className="w-4 h-4 mr-2" /> MINT AGENT
                    </Button>
                </Link>
                <KeylessWalletSelector />
            </div>
        </nav>
    );
}
