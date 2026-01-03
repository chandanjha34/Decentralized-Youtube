'use client';

/**
 * PaymentGate Component
 * 
 * Displays payment UI for locked content and handles x402 micropayment flow.
 * Shows price, unlock button, and handles the complete payment lifecycle.
 * 
 * Requirements: 5.2, 5.3, 5.4, 5.8, 10.3
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType, getUserFriendlyMessage } from '@/components/ui/error-message';
import { useX402Payment, type PaymentStatus } from '@/hooks/useX402Payment';
import { formatUSDC } from '@/types/content';

export interface PaymentGateProps {
  /** Content ID to unlock */
  contentId: string;
  /** Price in USDC (6 decimals) */
  priceUSDC: bigint;
  /** Creator's wallet address */
  creatorAddress: string;
  /** Callback when payment succeeds */
  onPaymentSuccess?: (key: string, contentCID: string) => void;
  /** Callback when payment fails */
  onPaymentError?: (error: string) => void;
}

/**
 * Status messages for each payment state
 */
const STATUS_MESSAGES: Record<PaymentStatus, string> = {
  idle: '',
  checking: 'Checking access...',
  signing: 'Please sign the payment in your wallet...',
  verifying: 'Verifying payment...',
  settling: 'Settling payment on-chain...',
  granting: 'Granting access...',
  success: 'Payment successful!',
  error: 'Payment failed',
};

/**
 * Status icons for visual feedback
 */
const STATUS_ICONS: Record<PaymentStatus, string> = {
  idle: '🔓',
  checking: '⏳',
  signing: '✍️',
  verifying: '🔍',
  settling: '⛓️',
  granting: '🔑',
  success: '✅',
  error: '❌',
};

/**
 * PaymentGate Component
 * 
 * Handles the x402 payment flow for unlocking content:
 * 1. Displays price and unlock button
 * 2. On click: initiates x402 payment flow
 * 3. Signs EIP-3009 authorization with wallet
 * 4. Sends payment to facilitator
 * 5. Returns decryption key on success
 */
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
    pay,
    reset,
  } = useX402Payment();

  const [isProcessing, setIsProcessing] = useState(false);

  // Handle successful payment
  useEffect(() => {
    if (status === 'success' && decryptionKey && contentCID) {
      onPaymentSuccess?.(decryptionKey, contentCID);
    }
  }, [status, decryptionKey, contentCID, onPaymentSuccess]);

  // Handle payment error
  useEffect(() => {
    if (status === 'error' && error) {
      onPaymentError?.(error);
    }
  }, [status, error, onPaymentError]);

  /**
   * Handle unlock button click
   * Initiates the x402 payment flow
   */
  const handleUnlock = useCallback(async () => {
    if (!isConnected || isProcessing) return;

    setIsProcessing(true);
    reset();

    try {
      await pay(contentId);
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, isProcessing, contentId, pay, reset]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  const formattedPrice = formatUSDC(priceUSDC);
  const isLoading = isProcessing || ['checking', 'signing', 'verifying', 'settling', 'granting'].includes(status);
  const showError = status === 'error' && error;
  const showSuccess = status === 'success';

  return (
    <div className="space-y-4">
      {/* Description */}
      <p className="text-sm text-muted-foreground">
        Unlock this content with a one-time payment. No subscriptions, no accounts.
      </p>

      {/* Status message */}
      {status !== 'idle' && status !== 'success' && status !== 'error' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <span>{STATUS_ICONS[status]}</span>
          <span>{STATUS_MESSAGES[status]}</span>
        </div>
      )}

      {/* Success message */}
      {showSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <span>{STATUS_ICONS.success}</span>
          <span>{STATUS_MESSAGES.success}</span>
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
            <span>🔓 Unlock for ${formattedPrice} USDC</span>
          )}
        </Button>
      )}

      {/* x402 info */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>Powered by x402 micropayments</p>
        <p className="flex items-center justify-center gap-1">
          <span>Payment goes directly to</span>
          <code className="bg-muted px-1 rounded text-[10px]">
            {truncateAddress(creatorAddress)}
          </code>
        </p>
      </div>
    </div>
  );
}

/**
 * Truncate Ethereum address for display
 */
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default PaymentGate;
