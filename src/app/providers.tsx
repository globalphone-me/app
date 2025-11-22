'use client';

import * as React from 'react';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { injected, coinbaseWallet, metaMask } from 'wagmi/connectors';
import { CHAIN, MAINNET } from '@/lib/config';

import '@rainbow-me/rainbowkit/styles.css';

const config = createConfig({
  chains: [CHAIN, MAINNET],
  connectors: [
    injected({ target: 'metaMask' }),
    metaMask(),
    coinbaseWallet({ appName: 'x402 Phone' }),
  ],
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
