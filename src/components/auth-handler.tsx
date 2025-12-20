"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { monitor } from "@/lib/monitor";

/**
 * AuthHandler component that manages SIWE authentication.
 * Renders invisibly unless the user needs to sign in, in which case it shows a modal.
 * Should be placed in a layout so it's always mounted when the app is running.
 */
export function AuthHandler() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { signMessageAsync } = useSignMessage();

    const [sessionStatus, setSessionStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
    const [showModal, setShowModal] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check session status when address changes
    useEffect(() => {
        if (!isConnected || !address) {
            setSessionStatus("loading");
            setShowModal(false);
            return;
        }

        let isMounted = true;

        const checkSession = async () => {
            try {
                const res = await fetch("/api/auth/status");
                const data = await res.json();

                if (!isMounted) return;

                if (data.authenticated && data.address?.toLowerCase() === address.toLowerCase()) {
                    setSessionStatus("authenticated");
                    setShowModal(false);
                } else {
                    setSessionStatus("unauthenticated");
                    setShowModal(true); // Show modal to prompt sign-in
                }
            } catch {
                if (!isMounted) return;
                setSessionStatus("unauthenticated");
                setShowModal(true);
            }
        };

        monitor.setUser(address);
        monitor.log("User connected wallet", { address });
        checkSession();

        return () => {
            isMounted = false;
        };
    }, [address, isConnected]);

    const handleSignIn = useCallback(async () => {
        if (!address) return;

        setIsSigning(true);
        setError(null);

        try {
            // 1. Get nonce from server
            const nonceRes = await fetch("/api/nonce");
            const { nonce } = await nonceRes.json();

            // 2. Create proper SIWE message with EIP-4361 format
            const message = createSiweMessage({
                address,
                chainId,
                domain: window.location.host,
                nonce,
                uri: window.location.origin,
                version: "1",
                statement: "Sign in to GlobalPhone",
            });

            // 3. Sign the SIWE message
            const signature = await signMessageAsync({ message });

            // 4. Verify with backend
            const res = await fetch("/api/complete-siwe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, signature, nonce }),
            });

            if (res.ok) {
                setSessionStatus("authenticated");
                setShowModal(false);
                monitor.log("User signed in successfully via SIWE", { address });
            } else {
                const data = await res.json();
                setError(data.error || "Failed to verify signature. Please try again.");
            }
        } catch (_err) {
            // User rejected the signature or error occurred
            setError("Signature rejected. You can try again when you're ready.");
        } finally {
            setIsSigning(false);
        }
    }, [address, chainId, signMessageAsync]);

    // Don't render anything if authenticated or not connected
    if (!isConnected || sessionStatus === "authenticated" || sessionStatus === "loading") {
        return null;
    }

    return (
        <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-full">
                            <Shield className="h-6 w-6 text-blue-600" />
                        </div>
                        <DialogTitle className="text-xl">Sign In to GlobalPhone</DialogTitle>
                    </div>
                    <DialogDescription className="text-base">
                        To access your profile and make calls, please sign a message to verify you own this wallet. This is free and doesn&apos;t require any transaction.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={handleSignIn}
                            disabled={isSigning}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {isSigning ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Waiting for signature...
                                </>
                            ) : (
                                "Sign Message"
                            )}
                        </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        By signing in, you agree to our terms of service.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
