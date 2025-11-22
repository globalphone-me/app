"use client";

import { useState } from "react";
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

export default function TestPayment() {
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const handleTestPurchase = async () => {
    try {
      addLog("🔵 Initializing Wallet...");

      if (!window.ethereum) {
        return addLog(
          "❌ No wallet found. Please install Coinbase Wallet or MetaMask.",
        );
      }

      // 1. Get the user's address first
      const tempClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });
      const [address] = await tempClient.requestAddresses();
      addLog(`👛 Connected: ${address}`);

      // 2. Create the authorized client with the account attached
      // This is crucial for x402-fetch to be able to sign the payment
      const walletClient = createWalletClient({
        account: address,
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });

      // 3. Wrap fetch
      const secureFetch = wrapFetchWithPayment(fetch, walletClient as any);

      addLog("🟡 Requesting Connection (Expect 402 -> Wallet Sign -> 200)...");

      // IMPORTANT: Replace this with the ID from your server terminal
      const targetPhoneId = "REPLACE_WITH_REAL_PHONE_ID_FROM_SERVER_LOGS";

      const response = await secureFetch("/api/purchase-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPhoneId }),
      });

      if (response.ok) {
        const data = await response.json();
        addLog("✅ SUCCESS! Payment Confirmed.");

        // Log the token from the body
        if (data.token) {
          addLog(`🎟️ JWT Token: ${data.token.substring(0, 20)}...`);
          console.log("JWT Token:", data.token);
        }

        // Log the payment proof from the headers (Optional verification)
        const paymentHeader = response.headers.get("x-payment-response");
        if (paymentHeader) {
          const paymentInfo = decodeXPaymentResponse(paymentHeader);
          console.log("Payment Receipt:", paymentInfo);
          addLog(`🧾 Receipt verified on-chain`);
        }
      } else {
        addLog(`❌ Failed: ${response.status} ${response.statusText}`);
        const errorData = await response.json();
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
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        💸 Pay & Get Token
      </button>

      <div className="mt-4 bg-black text-green-400 p-3 rounded text-xs font-mono min-h-[150px]">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
