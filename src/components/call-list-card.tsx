"use client";

import { useState, useEffect } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { wrapFetchWithPayment } from "x402-fetch";
import { Device, Call } from "@twilio/voice-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CallListItem } from "@/components/call-list-item";

// Matches the address in lib/db.ts
const MOCK_USERS = [
  {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    displayName: "user.eth",
    price: 100,
  },
];

export function CallListCard() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Twilio State
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [deviceStatus, setDeviceStatus] = useState("Initializing...");
  const [status, setStatus] = useState<string>("");

  // 1. Initialize Twilio Device on Mount
  useEffect(() => {
    async function initTwilio() {
      try {
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
    if (!isConnected || !walletClient) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!device || deviceStatus !== "Ready") {
      alert("Phone service not ready yet. Please wait.");
      return;
    }

    try {
      setStatus("💰 Processing Payment...");

      // 2. x402 Payment Flow
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
      setStatus("✅ Paid! Connecting call...");

      // 3. Connect via Twilio using the credentials
      const { phoneId, token } = data;

      const newCall = await device.connect({
        params: {
          phoneId: phoneId, // Who to call (Hidden ID)
          token: token, // Proof of payment
        },
      });

      // 4. Handle Call Events
      newCall.on("accept", () => {
        setStatus("📞 Connected!");
        // TRIAL ACCOUNT HACK: Press '1' automatically to bypass robot
        // setTimeout(() => {
        //   console.log("Bypassing trial prompt...");
        //   newCall.sendDigits("1");
        // }, 1000);
      });

      newCall.on("disconnect", () => {
        setStatus("Call ended");
        setActiveCall(null);
      });

      setActiveCall(newCall);
    } catch (error) {
      setStatus(`🚨 Error: ${error instanceof Error ? error.message : String(error)}`);
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Make a Call - No Phone Nº Required</CardTitle>
        <div className="flex justify-between items-center text-xs mt-2">
          <span className="text-muted-foreground font-mono">{status}</span>
          <span
            className={`px-2 py-1 rounded ${deviceStatus === "Ready" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            System: {deviceStatus}
          </span>
        </div>
      </CardHeader>
      <CardContent>
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
            {MOCK_USERS.map((user, index) => (
              <div key={user.address}>
                <CallListItem
                  address={user.address}
                  displayName={user.displayName}
                  price={user.price}
                  onCall={() => handleCall(user.address)}
                />
                {index < MOCK_USERS.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
