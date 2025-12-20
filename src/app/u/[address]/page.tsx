"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { Loader2, ShieldCheck, Clock, Pencil, Share2, Check, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallCard } from "@/components/call-card";
import { isUserAvailable } from "@/lib/availability";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { YourPriceCard } from "@/components/your-price-card";
import { AvatarCropper } from "@/components/avatar-cropper";
import Image from "next/image";

interface UserProfile {
    name: string;
    handle?: string;
    bio?: string;
    address: string;
    phoneNumber: string;
    price: string;
    onlyHumans: boolean;
    availability?: any;
    avatarUrl?: string;
}

export default function ProfilePage() {
    const params = useParams();
    // The param is named 'address' in the route but can be either address or handle
    const identifier = params.address as string;

    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [avatarCropperOpen, setAvatarCropperOpen] = useState(false);

    const { isConnected, address: currentAddress } = useAccount();
    const router = useRouter();

    const { disconnect } = useDisconnect({
        mutation: {
            onSuccess: () => {
                router.push("/");
            }
        }
    });

    const handleLogout = async () => {
        // Clear session cookie
        await fetch("/api/auth/logout", { method: "POST" });
        // Disconnect wallet - redirect happens in onSuccess callback
        disconnect();
    };

    useEffect(() => {
        async function fetchUser() {
            if (!identifier) return;

            try {
                // identifier can be address or handle
                const res = await fetch(`/api/user?identifier=${identifier}`);
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
    }, [identifier]);

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
                <p className="text-muted-foreground">The user {identifier} does not exist or has no profile.</p>
            </div>
        );
    }

    const isAvailable = isUserAvailable(user.availability);
    const formattedAddress = `${user.address.slice(0, 6)}...${user.address.slice(-4)}`;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            <Header />

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Profile Info Side */}
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                            <CardHeader className="text-center">
                                {/* Avatar - clickable for owner */}
                                {isConnected && user.address.toLowerCase() === (currentAddress || "").toLowerCase() ? (
                                    <button
                                        onClick={() => setAvatarCropperOpen(true)}
                                        className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden group cursor-pointer"
                                        title="Click to change profile picture"
                                    >
                                        {user.avatarUrl ? (
                                            <Image
                                                src={user.avatarUrl}
                                                alt={user.name || "Profile"}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                                                {user.name ? user.name[0].toUpperCase() : "?"}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Pencil className="h-6 w-6 text-white" />
                                        </div>
                                    </button>
                                ) : (
                                    <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                                        {user.avatarUrl ? (
                                            <Image
                                                src={user.avatarUrl}
                                                alt={user.name || "Profile"}
                                                width={96}
                                                height={96}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                                                {user.name ? user.name[0].toUpperCase() : "?"}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <CardTitle>{user.name || "Anonymous User"}</CardTitle>
                                {user.handle && (
                                    <p className="text-sm text-muted-foreground">@{user.handle}</p>
                                )}
                                {user.bio && (
                                    <p className="text-sm text-center mt-2 px-4">{user.bio}</p>
                                )}
                                <p className="text-sm font-mono text-muted-foreground mt-1">{formattedAddress}</p>

                                <div className="flex gap-2 w-full mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                    >
                                        {copied ? <Check className="h-3 w-3 mr-2" /> : <Share2 className="h-3 w-3 mr-2" />}
                                        {copied ? "Copied" : "Share"}
                                    </Button>

                                    {/* Owner Edit Button */}
                                    {isConnected && user.address.toLowerCase() === (currentAddress || "").toLowerCase() && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="flex-1 cursor-pointer">
                                                    <Pencil className="h-3 w-3 mr-2" />
                                                    Edit
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                                <DialogTitle className="sr-only">Edit Profile</DialogTitle>
                                                <DialogDescription className="sr-only">Edit your profile settings</DialogDescription>
                                                <YourPriceCard
                                                    forceEditMode={true}
                                                    onClose={() => window.location.reload()} // Simple reload to refresh data
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
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

                                {/* Logout Button - Only for profile owner */}
                                {isConnected && user.address.toLowerCase() === (currentAddress || "").toLowerCase() && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Log Out
                                    </Button>
                                )}
                            </CardContent>
                        </Card >
                    </div >

                    {/* Call Action Side */}
                    < div className="md:col-span-2" >
                        <div className="h-full">
                            <CallCard
                                prefilledAddress={user.address}
                                prefilledPrice={user.price}
                                disabled={!isAvailable}
                                callButtonText={!isAvailable ? "Not available to call" : undefined}
                            />
                        </div>
                    </div >
                </div >
            </main >

            {/* Avatar Cropper Modal */}
            <AvatarCropper
                open={avatarCropperOpen}
                onClose={() => setAvatarCropperOpen(false)}
                onUploadComplete={(newAvatarUrl) => {
                    setUser(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : null);
                }}
                currentAvatarUrl={user.avatarUrl}
            />
        </div >
    );
}
