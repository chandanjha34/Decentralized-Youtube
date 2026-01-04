'use client';

import { WagmiProvider, http, fallback } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// Custom Polygon Amoy with better RPC
const customPolygonAmoy = {
  ...polygonAmoy,
  rpcUrls: {
    default: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
    public: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
  },
};

// Use default RPC from hardhat config with fallback for reliability
const config = getDefaultConfig({
  appName: 'Unlock - Decentralized Content Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [customPolygonAmoy],
  transports: {
    [customPolygonAmoy.id]: fallback([
      http('https://rpc-amoy.polygon.technology', { timeout: 60000 }), // Default from hardhat config
      http('https://polygon-amoy.drpc.org', { timeout: 60000 }),
      http('https://polygon-amoy-bor-rpc.publicnode.com', { timeout: 60000 }),
    ]),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

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
