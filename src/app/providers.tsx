'use client';

import * as React from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { injected, coinbaseWallet, metaMask } from 'wagmi/connectors';
import { CHAIN, MAINNET, WORLDCHAIN } from '@/lib/config';

import '@rainbow-me/rainbowkit/styles.css';

const config = createConfig({
  chains: [CHAIN, MAINNET, WORLDCHAIN],
  connectors: [
    injected({ target: 'metaMask' }),
    metaMask(),
    coinbaseWallet({ appName: 'x402 Phone' }),
  ],
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
  const [isWorldApp, setIsWorldApp] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setIsWorldApp(MiniKit.isInstalled());
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
