"use client";

import Image from "next/image";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { YourPriceCard } from "@/components/your-price-card";
// import { CallCard } from '@/components/call-card'; // Hidden debug component
import { CallListCard } from "@/components/call-list-card";
import { Badge } from "@/components/ui/badge";
import { Banner1 } from "@/components/banner1";
// import TestPayment from "./components/TestPayment"; // Hidden debug component

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header with wallet button */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 items-center">
              <Image
                src="/globalphone_logo.png"
                alt="GlobalPhone Logo"
                width={32}
                height={32}
                className="object-contain"
              />
              <h1 className="text-2xl font-bold">GlobalPhone</h1>
              <Badge variant={"destructive"}>Alpha</Badge>
            </div>
            <WalletConnectButton />
          </div>
        </div>
      </header>
      <Banner1
        title="Alpha Disclaimer"
        description="This is an Alpha release of our product. Use at your own risk. We cannot guarantee phone privacy yet."
        linkUrl=""
        linkText=""
      />

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Responsive two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Your Price */}
          <div className="space-y-6">
            <YourPriceCard />
            {/* <CallCard /> */}{" "}
            {/* Hidden debug component - "Call Someone" World Payment */}
          </div>

          {/* Right column - Call List */}
          <div className="flex flex-col">
            <CallListCard />
          </div>
        </div>
        {/* <TestPayment /> */}{" "}
        {/* Hidden debug component - x402 Payment Test */}
      </main>
    </div>
  );
}
