import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { KeylessProvider } from "@/lib/keyless/provider";
import { Toaster } from "sonner";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aether | Agent Marketplace",
  description: "The decentralized marketplace for AI agents. Buy and sell autonomous services with x402 streaming payments.",
};

import { WalletErrorSuppressor } from "@/components/WalletErrorSuppressor";
import { LiveEconomyFeed } from "@/components/LiveEconomyFeed";
import { CommandPalette } from "@/components/CommandPalette";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <WalletErrorSuppressor />
        <Providers>
          <KeylessProvider>
            <div className="flex-1">
              {children}
            </div>
            <Footer />
            <LiveEconomyFeed />
            <CommandPalette />
            <Toaster theme="dark" position="bottom-right" />
          </KeylessProvider>
        </Providers>
      </body>
    </html>
  );
}
