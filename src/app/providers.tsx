"use client";

import * as React from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { CHAIN, MAINNET, WORLDCHAIN } from "@/lib/config";

import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "GlobalPhone",
  projectId: "c191fcbb26ddb5417db1a43fe4e2c8f4",
  chains: [CHAIN, MAINNET, WORLDCHAIN],
  transports: {
    [CHAIN.id]: http(),
    [MAINNET.id]: http(),
    [WORLDCHAIN.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

// MiniKit Provider for World App mode
function MiniKitProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    MiniKit.install();
  }, []);

  return <>{children}</>;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Browser mode - use RainbowKit
  return (
    <MiniKitProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider modalSize="compact">
            {mounted && children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </MiniKitProvider>
  );
}
