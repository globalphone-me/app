"use client";

import { useState } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
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
  const [status, setStatus] = useState<string>("");

  const handleCall = async (targetAddress: string) => {
    setStatus(`Initializing call to ${targetAddress.substring(0, 6)}...`);

    if (!isConnected || !walletClient) {
      alert("Please connect your wallet first!");
      return;
    }

    try {
      // 1. Wrap fetch for x402
      // @ts-ignore - Wagmi client compatibility
      const secureFetch = wrapFetchWithPayment(fetch, walletClient);

      setStatus("Requesting Connection (Payment may be required)...");

      // 2. Call API with the ADDRESS
      const response = await secureFetch("/api/purchase-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAddress }), // Sending address now
      });

      if (response.ok) {
        const data = await response.json();
        setStatus("✅ Payment Successful! Connecting...");

        console.log("--- CALL CREDENTIALS RECEIVED ---");
        console.log("Phone ID:", data.phoneId);
        console.log("JWT Token:", data.token);

        // >>> NEXT STEP: We will pass these to Twilio Device.connect() here <<<
      } else {
        setStatus("❌ Payment/Connection Failed");
        console.error(await response.json());
      }
    } catch (error: any) {
      setStatus(`🚨 Error: ${error.message}`);
      console.error(error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Make a Call - No Phone Nº Required</CardTitle>
        {status && (
          <div className="text-xs text-muted-foreground font-mono mt-2">
            {status}
          </div>
        )}
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
