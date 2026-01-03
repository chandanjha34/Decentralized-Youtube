'use client';

import { WagmiProvider, http, fallback } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// Use multiple RPC endpoints with fallback for reliability
const config = getDefaultConfig({
  appName: 'Unlock - Decentralized Content Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: fallback([
      http('https://rpc-amoy.polygon.technology', {
        batch: false,
        timeout: 60000,
      }),
      http('https://polygon-amoy-bor-rpc.publicnode.com', {
        batch: false,
        timeout: 60000,
      }),
      http(), // Default - lets wallet use its own RPC
    ]),
  },
  ssr: true,
});

// Create a client for React Query
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
