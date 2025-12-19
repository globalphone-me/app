"use client";

import Image from "next/image";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { UserGrid } from "@/components/user-grid";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Banner1 } from "@/components/banner1";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        {/* Left: Logo and Branding */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo_transparent.png"
            alt="GlobalPhone Logo"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
          />
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              GlobalPhone
            </span>
            <Badge variant="destructive" className="text-[0.65rem] uppercase tracking-wide">
              Alpha
            </Badge>
          </div>
        </div>

        {/* Right: User Controls */}
        <div className="flex items-center gap-3">
          <WalletConnectButton />
        </div>
      </header>

      {/* Disclaimer Banner */}
      <Banner1
        title="Alpha Disclaimer"
        description="This is an Alpha release of our product. Use at your own risk. We cannot guarantee phone privacy yet."
        linkUrl=""
        linkText=""
      />

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-6 py-8">
        <UserGrid />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
