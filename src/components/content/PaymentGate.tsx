'use client';

/**
 * PaymentGate Component
 * 
 * Displays payment UI for locked content and handles POL payment flow.
 */

import { useEffect, useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType, getUserFriendlyMessage } from '@/components/ui/error-message';
import { RpcErrorHelp } from '@/components/ui/rpc-error-help';
import { usePolPaymentDirect as usePolPayment, type PaymentStatus, usdcToPolAmount, formatPolAmount } from '@/hooks/usePolPaymentDirect';
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

  const [showRpcHelp, setShowRpcHelp] = useState(false);

  // Calculate POL price
  const polWei = usdcToPolAmount(priceUSDC);
  const polPrice = formatPolAmount(polWei);
  const usdcPrice = formatUSDC(priceUSDC);

  // Detect RPC errors and show help
  useEffect(() => {
    if (error && (error.includes('JSON-RPC') || error.includes('gas'))) {
      setShowRpcHelp(true);
    }
  }, [error]);

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
    setShowRpcHelp(false);
    reset();
  }, [reset]);

  const isLoading = ['checking', 'signing', 'confirming', 'granting'].includes(status);
  const showError = status === 'error' && error;
  const showSuccess = status === 'success';

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#605A57] font-['Inter']">
        Unlock this content with a one-time POL payment.
      </p>

      {/* Price display */}
      <div className="bg-[#F7F5F3] rounded-lg p-4 text-center border border-[#E0DEDB]">
        <div className="text-2xl font-['Instrument_Serif'] font-semibold text-[#37322F]">{polPrice} POL</div>
        <div className="text-sm text-[#605A57] font-['Inter'] mt-1">≈ ${usdcPrice} USD</div>
      </div>

      {/* Status message */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-[#605A57] font-['Inter']">
          <LoadingSpinner size="sm" />
          <span>{STATUS_MESSAGES[status]}</span>
        </div>
      )}

      {/* Success message */}
      {showSuccess && (
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-['Inter'] font-medium">
            <span>✅</span>
            <span>Payment successful!</span>
          </div>
          {txHash && (
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#37322F] hover:underline font-['Inter']"
            >
              View transaction →
            </a>
          )}
        </div>
      )}

      {/* Error message */}
      {showError && (
        <div className="space-y-3">
          <ErrorMessage
            type={getErrorType(error || '')}
            message={getUserFriendlyMessage(error || 'Payment failed')}
            onRetry={handleRetry}
            showSuggestion={!showRpcHelp}
            variant="inline"
          />
          {showRpcHelp && (
            <RpcErrorHelp onDismiss={() => setShowRpcHelp(false)} />
          )}
        </div>
      )}

      {/* Unlock button */}
      {!showSuccess && !showError && (
        <Button
          className="w-full rounded-full bg-[#37322F] hover:bg-[#49423D] text-white font-['Inter'] font-medium shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset]"
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
        <p className="text-sm text-amber-600 text-center font-['Inter']">
          Connect your wallet to unlock content
        </p>
      )}

      {/* Info */}
      <div className="text-xs text-[#605A57] text-center space-y-1 font-['Inter']">
        <p>Direct payment on Polygon Amoy</p>
        <p>
          Payment goes to{' '}
          <code className="bg-[#F7F5F3] border border-[#E0DEDB] px-1 rounded font-mono">
            {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
          </code>
        </p>
      </div>
    </div>
  );
}

export default PaymentGate;
