'use client';

import { WagmiProvider, http } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// Use multiple RPC endpoints for Polygon Amoy with fallback
// Primary: Alchemy free tier, Fallback: Public RPC
const POLYGON_AMOY_RPCS = [
  'https://polygon-amoy.g.alchemy.com/v2/demo', // Alchemy demo
  'https://polygon-amoy-bor-rpc.publicnode.com', // PublicNode
  'https://rpc-amoy.polygon.technology', // Official (can be slow)
];

// Create wagmi config with RainbowKit defaults
const config = getDefaultConfig({
  appName: 'Unlock - Decentralized Content Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http(POLYGON_AMOY_RPCS[1], {
      batch: false, // Disable batching to avoid timeout issues
      retryCount: 2,
      retryDelay: 500,
      timeout: 30000, // 30 second timeout
    }),
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
