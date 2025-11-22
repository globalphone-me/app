// middleware.ts
import { paymentMiddleware } from "x402-next";

// This middleware intercepts requests to specific routes
// and ensures a payment has been made via the x402 protocol.
export const middleware = paymentMiddleware(
  process.env.NEXT_PUBLIC_WALLET_ADDRESS as `0x${string}`,
  {
    "/api/purchase-connection": {
      price: "0.05", // Cost per call in USDC
      network: "base-sepolia", // Use 'base' for mainnet later
      config: {
        description: "Purchase a secure phone connection",
      },
    },
  },
  {
    url: "https://x402.org/facilitator", // Testnet facilitator
  },
);

// Only run this middleware on the purchase route
export const config = {
  matcher: ["/api/purchase-connection"],
};
