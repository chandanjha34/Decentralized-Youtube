'use client';

import { WagmiProvider, http } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// Use multiple RPC endpoints for Polygon Amoy with fallback
// Try different providers for reliability
const POLYGON_AMOY_RPC = 'https://rpc.ankr.com/polygon_amoy';

// Create wagmi config with RainbowKit defaults
const config = getDefaultConfig({
  appName: 'Unlock - Decentralized Content Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http(POLYGON_AMOY_RPC, {
      batch: false,
      retryCount: 3,
      retryDelay: 1000,
      timeout: 60000, // 60 second timeout
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
