"use client";

import { useState, useEffect } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { wrapFetchWithPayment } from "x402-fetch";
import { Device, Call } from "@twilio/voice-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CallListItem } from "@/components/call-list-item";
import { MiniKit, PayCommandInput, Tokens, tokenToDecimals, VerifyCommandInput, VerificationLevel, ISuccessResult, Permission, RequestPermissionPayload } from '@worldcoin/minikit-js';

interface CallTarget {
  address: string;
  displayName: string;
  price: number;
}

export function CallListCard() {
  const { isConnected: wagmiConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Detect environment - prioritize MiniKit if available
  const isMiniKitEnv = MiniKit.isInstalled();
  const isWalletEnv = !isMiniKitEnv && wagmiConnected && !!walletClient;
  const isConnected = isMiniKitEnv || isWalletEnv;

  // Twilio State
  const [users, setUsers] = useState<CallTarget[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [deviceStatus, setDeviceStatus] = useState("Initializing...");
  const [status, setStatus] = useState<string>("");
  const [currentAmount] = useState('0.1'); // Default amount for World App
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);

  // 1. Initialize Twilio Device on Mount
  useEffect(() => {
    async function initTwilio() {
      try {
        console.log("brooo?");
        // A. Fetch Users
        const usersResp = await fetch("/api/users");
        console.log({ usersResp });
        if (usersResp.ok) {
          const usersData = await usersResp.json();
          setUsers(usersData);
        }

        const resp = await fetch("/api/token");
        const data = await resp.json();

        const newDevice = new Device(data.token);

        newDevice.on("ready", () => setDeviceStatus("Ready"));
        newDevice.on("error", (err) => {
          console.error("Twilio Error:", err);
          setDeviceStatus("Error");
        });

        newDevice.register();
        setDevice(newDevice);
        setDeviceStatus("Ready");
      } catch (e) {
        console.error("Failed to init Twilio", e);
        setDeviceStatus("Failed");
      }
    }
    initTwilio();

    return () => {
      // Cleanup will be handled when device changes
    };
  }, []);

  const handleCall = async (targetAddress: string) => {
    if (!isConnected) {
      alert("Please connect your wallet or open in World App!");
      return;
    }

    if (!device || deviceStatus !== "Ready") {
      alert("Phone service not ready yet. Please wait.");
      return;
    }

    try {
      let phoneId: string;
      let token: string;

      if (isMiniKitEnv) {
        // World App Payment Flow

        // STEP 0: Request microphone permission before anything else
        setStatus("🎤 Checking microphone permissions...");

        try {
          // Check current permissions
          const { finalPayload: permissionsResult } = await MiniKit.commandsAsync.getPermissions();

          if (permissionsResult.status === 'success') {
            const hasMicrophonePermission = permissionsResult.permissions[Permission.Microphone] === true;

            if (!hasMicrophonePermission) {
              setStatus("🎤 Requesting microphone access...");

              const requestPermissionPayload: RequestPermissionPayload = {
                permission: Permission.Microphone,
              };

              const { finalPayload: permissionResult } = await MiniKit.commandsAsync.requestPermission(requestPermissionPayload);

              if (permissionResult.status === 'error') {
                const errorCode = permissionResult.error_code as string;
                if (errorCode === 'world_app_permission_not_enabled') {
                  setStatus("❌ Please enable microphone for World App in your device settings first");
                } else if (errorCode === 'user_rejected') {
                  setStatus("❌ Microphone permission denied");
                } else if (errorCode === 'permission_disabled') {
                  setStatus("❌ Microphone permission is disabled for World App");
                } else {
                  setStatus(`❌ Permission error: ${errorCode}`);
                }
                return;
              }

              setMicrophonePermissionGranted(true);
            } else {
              setMicrophonePermissionGranted(true);
            }
          }
        } catch (error) {
          console.error("Permission check error:", error);
          setStatus("❌ Failed to check microphone permissions");
          return;
        }

        // STEP 1: Verify humanity with World ID
        setStatus("🔍 Verifying humanity...");

        const verifyPayload: VerifyCommandInput = {
          action: 'call-payment-gate',
          verification_level: VerificationLevel.Device,
        };

        const { finalPayload: verifyResult } = await MiniKit.commandsAsync.verify(verifyPayload);

        if (verifyResult.status === 'error') {
          setStatus("❌ Verification cancelled");
          return;
        }

        // Verify the proof in backend
        const verifyResponse = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: verifyResult as ISuccessResult,
            action: 'call-payment-gate',
          }),
        });

        const verifyResponseJson = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyResponseJson.success) {
          setStatus("❌ Verification failed");
          return;
        }

        const nullifierHash = verifyResponseJson.nullifierHash;

        // STEP 2: Initiate payment
        setStatus("💰 Processing payment...");

        const initiateRes = await fetch('/api/initiate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientAddress: targetAddress,
            amount: currentAmount,
            verifiedNullifier: nullifierHash,
          }),
        });

        if (!initiateRes.ok) {
          setStatus("❌ Payment initiation failed");
          return;
        }

        const { id } = await initiateRes.json();

        // STEP 3: Create payment payload
        const payPayload: PayCommandInput = {
          reference: id,
          to: targetAddress,
          tokens: [
            {
              symbol: Tokens.USDC,
              token_amount: tokenToDecimals(parseFloat(currentAmount), Tokens.USDC).toString(),
            },
          ],
          description: `Call to ${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`,
        };

        // STEP 4: Send payment command via MiniKit
        const { finalPayload: payResult } = await MiniKit.commandsAsync.pay(payPayload);

        if (payResult.status === 'error') {
          setStatus("❌ Payment cancelled");
          return;
        }

        // STEP 5: Confirm payment in backend
        const confirmRes = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: payResult }),
        });

        const confirmData = await confirmRes.json();

        if (!confirmData.success) {
          setStatus("❌ Payment verification failed");
          return;
        }

        phoneId = confirmData.phoneId;
        token = confirmData.token;
      } else {
        // x402 Payment Flow
        setStatus("💰 Processing Payment...");

        // @ts-expect-error - x402-fetch types might expect a strict Viem client, but Wagmi's is compatible
        const secureFetch = wrapFetchWithPayment(fetch, walletClient);

        const response = await secureFetch("/api/purchase-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetAddress }),
        });

        if (!response.ok) {
          setStatus("❌ Payment Failed");
          return;
        }

        const data = await response.json();
        phoneId = data.phoneId;
        token = data.token;
      }

      // Connect via Twilio using the credentials
      setStatus("📞 Connecting call...");

      const newCall = await device.connect({
        params: {
          phoneId: phoneId,
          token: token,
        },
      });

      // Handle Call Events
      newCall.on("accept", () => {
        setStatus("📞 Connected!");
      });

      newCall.on("disconnect", () => {
        setStatus("Call ended");
        setActiveCall(null);
      });

      setActiveCall(newCall);
    } catch (error) {
      setStatus(
        `🚨 Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error(error);
    }
  };

  const handleHangup = () => {
    if (activeCall) {
      activeCall.disconnect();
      setActiveCall(null);
      setStatus("Ready");
    }
  };

  const paymentMethod = isMiniKitEnv ? 'World App' : isWalletEnv ? 'x402' : 'Not Connected';

  return (
    <Card className="w-full flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Make a Call - No Phone Nº Required</CardTitle>
        <div className="flex justify-between items-center text-xs mt-2">
          <span className="text-muted-foreground font-mono">
            {status || `Payment: ${paymentMethod}`}
          </span>
          <span
            className={`px-2 py-1 rounded ${deviceStatus === "Ready" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            System: {deviceStatus}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto min-h-0">
        {activeCall ? (
          <div className="bg-red-50 p-4 rounded text-center">
            <p className="mb-2 font-bold text-red-700">On a call...</p>
            <button
              onClick={handleHangup}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition"
            >
              🛑 Hang Up
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {users.map((user, index) => (
              <div key={user.address}>
                <CallListItem
                  address={user.address}
                  displayName={user.displayName}
                  price={user.price}
                  onCall={() => handleCall(user.address)}
                />
                {index < users.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
