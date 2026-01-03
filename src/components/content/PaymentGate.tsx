'use client';

/**
 * PaymentGate Component
 * 
 * Displays payment UI for locked content and handles POL payment flow.
 */

import { useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType, getUserFriendlyMessage } from '@/components/ui/error-message';
import { usePolPayment, type PaymentStatus, usdcToPolAmount, formatPolAmount } from '@/hooks/usePolPayment';
import { formatUSDC } from '@/types/content';

export interface PaymentGateProps {
  contentId: string;
  priceUSDC: bigint;
  creatorAddress: string;
  onPaymentSuccess?: (key: string, contentCID: string) => void;
  onPaymentError?: (error: string) => void;
}

const STATUS_MESSAGES: Record<PaymentStatus, string> = {
  idle: '',
  checking: 'Checking access...',
  signing: 'Confirm in your wallet...',
  confirming: 'Waiting for confirmation...',
  granting: 'Granting access...',
  success: 'Payment successful!',
  error: 'Payment failed',
};

export function PaymentGate({
  contentId,
  priceUSDC,
  creatorAddress,
  onPaymentSuccess,
  onPaymentError,
}: PaymentGateProps) {
  const { isConnected } = useAccount();
  const {
    status,
    error,
    decryptionKey,
    contentCID,
    txHash,
    pay,
    reset,
  } = usePolPayment();

  // Calculate POL price
  const polWei = usdcToPolAmount(priceUSDC);
  const polPrice = formatPolAmount(polWei);
  const usdcPrice = formatUSDC(priceUSDC);

  // Handle success callback
  useEffect(() => {
    if (status === 'success' && decryptionKey && contentCID) {
      onPaymentSuccess?.(decryptionKey, contentCID);
    }
  }, [status, decryptionKey, contentCID, onPaymentSuccess]);

  // Handle error callback
  useEffect(() => {
    if (status === 'error' && error) {
      onPaymentError?.(error);
    }
  }, [status, error, onPaymentError]);

  const handleUnlock = useCallback(() => {
    if (!isConnected) return;
    reset();
    pay(contentId, creatorAddress, priceUSDC);
  }, [isConnected, contentId, creatorAddress, priceUSDC, pay, reset]);

  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  const isLoading = ['checking', 'signing', 'confirming', 'granting'].includes(status);
  const showError = status === 'error' && error;
  const showSuccess = status === 'success';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Unlock this content with a one-time POL payment.
      </p>

      {/* Price display */}
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold text-primary">{polPrice} POL</div>
        <div className="text-sm text-muted-foreground">≈ ${usdcPrice} USD</div>
      </div>

      {/* Status message */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner size="sm" />
          <span>{STATUS_MESSAGES[status]}</span>
        </div>
      )}

      {/* Success message */}
      {showSuccess && (
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-green-600">
            <span>✅</span>
            <span>Payment successful!</span>
          </div>
          {txHash && (
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              View transaction →
            </a>
          )}
        </div>
      )}

      {/* Error message */}
      {showError && (
        <ErrorMessage
          type={getErrorType(error || '')}
          message={getUserFriendlyMessage(error || 'Payment failed')}
          onRetry={handleRetry}
          showSuggestion={true}
          variant="inline"
        />
      )}

      {/* Unlock button */}
      {!showSuccess && !showError && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleUnlock}
          disabled={!isConnected || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              {STATUS_MESSAGES[status] || 'Processing...'}
            </span>
          ) : (
            <span>🔓 Pay {polPrice} POL to Unlock</span>
          )}
        </Button>
      )}

      {/* Wallet not connected */}
      {!isConnected && !showSuccess && (
        <p className="text-sm text-amber-600 text-center">
          Connect your wallet to unlock content
        </p>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>Direct payment on Polygon Amoy</p>
        <p>
          Payment goes to{' '}
          <code className="bg-muted px-1 rounded">
            {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
          </code>
        </p>
      </div>
    </div>
  );
}

export default PaymentGate;
