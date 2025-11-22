"use client";

import { WalletConnectButton } from "@/components/wallet-connect-button";
import { YourPriceCard } from "@/components/your-price-card";
import { CallListCard } from "@/components/call-list-card";
import TestPayment from "./components/TestPayment";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header with wallet button */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">GlobalPhone</h1>
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Responsive two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Left column - Your Price (larger on desktop) */}
          <div>
            <YourPriceCard />
          </div>

          {/* Right column - Call List (smaller on desktop) */}
          <div>
            <CallListCard />
          </div>
        </div>

        <TestPayment />
      </main>
    </div>
  );
}
