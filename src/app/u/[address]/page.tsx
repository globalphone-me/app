"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Loader2, Phone, ShieldCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallCard } from "@/components/call-card";
import { isUserAvailable } from "@/lib/availability";
import Image from "next/image";
import { WalletConnectButton } from "@/components/wallet-connect-button";

interface UserProfile {
    name: string;
    address: string;
    phoneNumber: string; // We might want to mask this or not send it at all for public profiles? Usually safe if it's just the ID.
    price: string;
    onlyHumans: boolean;
    availability?: any; // Reusing the type from db logic implicitly for now
}

export default function ProfilePage() {
    const params = useParams();
    const address = params.address as string;

    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { isConnected } = useAccount();

    useEffect(() => {
        async function fetchUser() {
            if (!address) return;

            try {
                const res = await fetch(`/api/user?address=${address}`);
                if (!res.ok) {
                    throw new Error("User not found");
                }
                const data = await res.json();

                if (data.found && data.user) {
                    setUser(data.user);
                } else {
                    setError("User not found via API");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load profile");
            } finally {
                setLoading(false);
            }
        }

        fetchUser();
    }, [address]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-destructive">Profile Not Found</h1>
                <p className="text-muted-foreground">The user {address} does not exist or has no profile.</p>
            </div>
        );
    }

    const isAvailable = isUserAvailable(user.availability);
    const formattedAddress = `${user.address.slice(0, 6)}...${user.address.slice(-4)}`;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            {/* Header with wallet button */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 items-center">
                            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                                <Image
                                    src="/logo_transparent.png"
                                    alt="GlobalPhone Logo"
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                />
                                <span className="text-xl font-bold hidden sm:inline">GlobalPhone</span>
                            </a>
                        </div>
                        <WalletConnectButton />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Profile Info Side */}
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                            <CardHeader className="text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                                    {user.name ? user.name[0].toUpperCase() : "?"}
                                </div>
                                <CardTitle>{user.name || "Anonymous User"}</CardTitle>
                                <p className="text-sm font-mono text-muted-foreground">{formattedAddress}</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {user.onlyHumans && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded justify-center">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>Verified Humans Only</span>
                                    </div>
                                )}

                                <div className={`flex items-center gap-2 text-sm p-2 rounded justify-center ${isAvailable ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50'}`}>
                                    <Clock className="h-4 w-4" />
                                    <span>{isAvailable ? "Available Now" : "Currently Unavailable"}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Call Action Side */}
                    <div className="md:col-span-2">
                        <div className="h-full">
                            <CallCard
                                prefilledAddress={user.address}
                                prefilledPrice={user.price}
                                disabled={!isAvailable}
                                callButtonText={!isAvailable ? "Not available to call" : undefined}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
