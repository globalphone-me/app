"use client";

import { useState } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

export default function TestPayment() {
  const [logs, setLogs] = useState<string[]>([]);
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const handleTestPurchase = async () => {
    try {
      if (!isConnected || !walletClient) {
        return addLog(
          "❌ Wallet not connected. Please connect with RainbowKit first.",
        );
      }

      addLog("🔵 Wallet Detected. Preparing request...");

      // 1. Wrap the native fetch with x402 logic using the Wagmi WalletClient
      // @ts-ignore - x402-fetch types might expect a strict Viem client, but Wagmi's is compatible
      const secureFetch = wrapFetchWithPayment(fetch, walletClient);

      addLog("🟡 Requesting Connection (Expect 402 -> Wallet Sign -> 200)...");

      // IMPORTANT: Replace this with the ID you see in your server terminal
      const targetPhoneId = "cba390813be5";

      const response = await secureFetch("/api/purchase-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPhoneId }),
      });

      if (response.ok) {
        const data = await response.json();
        addLog("✅ SUCCESS! Payment Confirmed.");

        if (data.token) {
          addLog(`🎟️ JWT Token: ${data.token.substring(0, 20)}...`);
          console.log("JWT Token:", data.token);
        }

        const paymentHeader = response.headers.get("x-payment-response");
        if (paymentHeader) {
          const paymentInfo = decodeXPaymentResponse(paymentHeader);
          console.log("Payment Receipt:", paymentInfo);
          addLog(`🧾 Receipt verified`);
        }
      } else {
        addLog(`❌ Failed: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({}));
        console.error(errorData);
      }
    } catch (error: any) {
      addLog(`🚨 Error: ${error.message}`);
      console.error(error);
    }
  };

  return (
    <div className="p-6 border rounded-xl bg-gray-50 max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">x402 Payment Test</h2>

      <div className="mb-4 text-sm text-yellow-800 bg-yellow-100 p-2 rounded">
        <strong>Check Terminal:</strong> Look at your VS Code terminal to find
        the <code>phoneId</code> of the "Support Agent" user created by the DB.
      </div>

      <button
        onClick={handleTestPurchase}
        disabled={!isConnected || !walletClient}
        className={`w-full py-2 rounded transition text-white ${
          isConnected
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        {isConnected ? "💸 Pay & Get Token" : "🔌 Connect Wallet First"}
      </button>

      <div className="mt-4 bg-black text-green-400 p-3 rounded text-xs font-mono min-h-[150px]">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
