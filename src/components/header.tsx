"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/wallet-connect-button";

export function Header() {
    const { isConnected, address } = useAccount();

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
            {/* Left: Logo and Branding */}
            <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-3">
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
                </Link>
            </div>

            {/* Right: User Controls */}
            <div className="flex items-center gap-3">
                {isConnected && address ? (
                    <Link href={`/u/${address}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-2 cursor-pointer">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">My Profile</span>
                        </Button>
                    </Link>
                ) : (
                    <WalletConnectButton />
                )}
            </div>
        </header>
    );
}
