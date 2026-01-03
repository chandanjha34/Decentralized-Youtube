'use client';

/**
 * React Hook for POL (Native Token) Payment Flow
 * 
 * Uses wagmi's useSendTransaction for reliable wallet-managed transactions.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';

export type PaymentStatus = 
  | 'idle'
  | 'checking'
  | 'signing'
  | 'confirming'
  | 'granting'
  | 'success'
  | 'error';

export interface PaymentResult {
  success: boolean;
  key?: string;
  contentCID?: string;
  txHash?: string;
  error?: string;
  hasExistingAccess?: boolean;
}

export interface UsePolPaymentResult {
  status: PaymentStatus;
  error: string | null;
  decryptionKey: string | null;
  contentCID: string | null;
  txHash: string | null;
  hasExistingAccess: boolean;
  polPrice: string | null;
  checkExistingAccess: (contentId: string) => Promise<boolean>;
  fetchPolPrice: (priceUSDC: bigint) => Promise<string | null>;
  pay: (contentId: string, creatorAddress: string, priceUSDC: bigint) => Promise<void>;
  reset: () => void;
}

// Fixed POL/USD rate for testnet
const POL_USD_RATE = 0.40;

/**
 * Convert USDC amount (6 decimals) to POL amount in wei
 */
export function usdcToPolAmount(priceUSDC: bigint): bigint {
  const usdAmount = Number(priceUSDC) / 1e6;
  const polAmount = usdAmount / POL_USD_RATE;
  return BigInt(Math.floor(polAmount * 1e18));
}

/**
 * Format POL amount for display
 */
export function formatPolAmount(weiAmount: bigint): string {
  return parseFloat(formatEther(weiAmount)).toFixed(4);
}

export function usePolPayment(): UsePolPaymentResult {
  const { address, isConnected } = useAccount();
  
  // Wagmi hooks for transaction
  const { 
    sendTransaction, 
    data: txHash,
    isPending: isSigning,
    isError: isSendError,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isConfirmError,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [decryptionKey, setDecryptionKey] = useState<string | null>(null);
  const [contentCID, setContentCID] = useState<string | null>(null);
  const [hasExistingAccess, setHasExistingAccess] = useState(false);
  const [polPrice, setPolPrice] = useState<string | null>(null);
  
  // Store pending payment info for grant call
  const [pendingPayment, setPendingPayment] = useState<{
    contentId: string;
    polAmount: string;
  } | null>(null);

  // Update status based on wagmi state
  useEffect(() => {
    if (isSigning) {
      setStatus('signing');
    }
  }, [isSigning]);

  useEffect(() => {
    if (txHash && isConfirming) {
      setStatus('confirming');
    }
  }, [txHash, isConfirming]);

  // Handle send error
  useEffect(() => {
    if (isSendError && sendError) {
      const msg = sendError.message.includes('User rejected') 
        ? 'Transaction rejected by user'
        : sendError.message.includes('insufficient')
        ? 'Insufficient POL balance'
        : 'Failed to send transaction. Please try again.';
      setError(msg);
      setStatus('error');
    }
  }, [isSendError, sendError]);

  // Handle confirm error
  useEffect(() => {
    if (isConfirmError && confirmError) {
      setError('Transaction failed on-chain');
      setStatus('error');
    }
  }, [isConfirmError, confirmError]);

  // Handle successful confirmation - grant access
  useEffect(() => {
    if (isConfirmed && txHash && pendingPayment && status === 'confirming') {
      const grantAccess = async () => {
        setStatus('granting');
        try {
          const response = await fetch(`/api/key/${pendingPayment.contentId}/grant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consumerAddress: address,
              txHash: txHash,
              polAmount: pendingPayment.polAmount,
            }),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to grant access');
          }

          const result = await response.json();
          setDecryptionKey(result.key || null);
          setContentCID(result.contentCID || null);
          setStatus('success');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to grant access');
          setStatus('error');
        }
      };
      grantAccess();
    }
  }, [isConfirmed, txHash, pendingPayment, address, status]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setDecryptionKey(null);
    setContentCID(null);
    setHasExistingAccess(false);
    setPolPrice(null);
    setPendingPayment(null);
    resetSend();
  }, [resetSend]);

  const checkExistingAccess = useCallback(async (contentId: string): Promise<boolean> => {
    if (!address) return false;

    setStatus('checking');
    setError(null);

    try {
      const response = await fetch(`/api/key/${contentId}`, {
        headers: { 'x-consumer-address': address },
      });

      if (response.ok) {
        const data = await response.json();
        setHasExistingAccess(true);
        setDecryptionKey(data.key || null);
        setContentCID(data.contentCID || null);
        setStatus('success');
        return true;
      }

      setHasExistingAccess(false);
      setStatus('idle');
      return false;
    } catch {
      setStatus('idle');
      return false;
    }
  }, [address]);

  const fetchPolPrice = useCallback(async (priceUSDC: bigint): Promise<string | null> => {
    const polWei = usdcToPolAmount(priceUSDC);
    const formatted = formatPolAmount(polWei);
    setPolPrice(formatted);
    return formatted;
  }, []);

  const pay = useCallback(async (
    contentId: string,
    creatorAddress: string,
    priceUSDC: bigint
  ): Promise<void> => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      setStatus('error');
      return;
    }

    setError(null);
    
    const polAmount = usdcToPolAmount(priceUSDC);
    
    // Store payment info for grant call after confirmation
    setPendingPayment({
      contentId,
      polAmount: polAmount.toString(),
    });

    // Send transaction - wagmi handles the wallet interaction
    sendTransaction({
      to: creatorAddress as `0x${string}`,
      value: polAmount,
    });
  }, [isConnected, address, sendTransaction]);

  return {
    status,
    error,
    decryptionKey,
    contentCID,
    txHash: txHash || null,
    hasExistingAccess,
    polPrice,
    checkExistingAccess,
    fetchPolPrice,
    pay,
    reset,
  };
}

export default usePolPayment;
