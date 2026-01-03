'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * ConnectButton Component
 * 
 * Wraps RainbowKit ConnectButton with custom styling and
 * automatic network switching to Polygon Amoy.
 * 
 * Validates: Requirements 1.1, 1.3, 1.4, 10.2
 */
export function ConnectButton() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  const [showNetworkError, setShowNetworkError] = useState(false);

  // Auto-prompt to switch to Polygon Amoy if on wrong chain
  useEffect(() => {
    if (isConnected && chainId !== polygonAmoy.id) {
      switchChain?.({ chainId: polygonAmoy.id });
    }
  }, [isConnected, chainId, switchChain]);

  // Show network error briefly then hide
  useEffect(() => {
    if (switchError) {
      setShowNetworkError(true);
      const timer = setTimeout(() => setShowNetworkError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [switchError]);

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              // Loading state while mounting
              if (!ready) {
                return (
                  <Button variant="outline" disabled>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Loading...
                  </Button>
                );
              }

              // Not connected state
              if (!connected) {
                return (
                  <Button onClick={openConnectModal} variant="default">
                    Connect Wallet
                  </Button>
                );
              }

              // Wrong network state
              if (chain.unsupported) {
                return (
                  <div className="flex flex-col items-end gap-1">
                    <Button 
                      onClick={openChainModal} 
                      variant="destructive"
                      disabled={isSwitching}
                    >
                      {isSwitching ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Switching...
                        </>
                      ) : (
                        '⚠️ Wrong Network'
                      )}
                    </Button>
                    {showNetworkError && (
                      <p className="text-xs text-destructive max-w-[200px] text-right">
                        Failed to switch network. Please switch manually.
                      </p>
                    )}
                  </div>
                );
              }

              // Connected state
              return (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={openChainModal}
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                    disabled={isSwitching}
                  >
                    {isSwitching ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        {chain.hasIcon && chain.iconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            className="w-4 h-4 mr-2"
                          />
                        )}
                        {chain.name}
                      </>
                    )}
                  </Button>

                  <Button onClick={openAccountModal} variant="outline" size="sm">
                    {account.displayName}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
