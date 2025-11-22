"use client";

import * as React from "react";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { CHAIN, MAINNET } from "@/lib/config";

import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "GlobalPhone",
  projectId: "c191fcbb26ddb5417db1a43fe4e2c8f4",
  chains: [CHAIN, MAINNET],
  transports: {
    [CHAIN.id]: http(),
    [MAINNET.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          {mounted && children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
