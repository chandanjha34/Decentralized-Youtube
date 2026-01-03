'use client';

/**
 * React Hook for x402 Payment Flow
 * 
 * Provides a simple interface for making x402 micropayments
 * to unlock content access.
 * 
 * Requirements: 5.2, 5.3, 5.4, 5.8
 */

import { useState, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import {
  makePaidRequest,
  checkAccess,
  getPaymentRequirements,
  formatUSDCAmount,
  type PaymentRequirements,
  type PaymentResult,
} from '@/lib/x402';

export type PaymentStatus = 
  | 'idle'
  | 'checking'
  | 'signing'
  | 'verifying'
  | 'settling'
  | 'granting'
  | 'success'
  | 'error';

export interface UseX402PaymentResult {
  /** Current payment status */
  status: PaymentStatus;
  /** Error message if payment failed */
  error: string | null;
  /** Decryption key after successful payment */
  decryptionKey: string | null;
  /** Content CID for fetching encrypted content */
  contentCID: string | null;
  /** Transaction hash of the payment */
  txHash: string | null;
  /** Whether user already has access */
  hasExistingAccess: boolean;
  /** Payment requirements from 402 response */
  paymentRequirements: PaymentRequirements | null;
  /** Formatted price for display */
  formattedPrice: string | null;
  /** Check if user has existing access */
  checkExistingAccess: (contentId: string) => Promise<boolean>;
  /** Fetch payment requirements without paying */
  fetchPaymentRequirements: (contentId: string) => Promise<void>;
  /** Execute payment and get decryption key */
  pay: (contentId: string) => Promise<PaymentResult>;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for handling x402 payment flow
 */
export function useX402Payment(): UseX402PaymentResult {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [decryptionKey, setDecryptionKey] = useState<string | null>(null);
  const [contentCID, setContentCID] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [hasExistingAccess, setHasExistingAccess] = useState(false);
  const [paymentRequirements, setPaymentRequirements] = useState<PaymentRequirements | null>(null);
  const [formattedPrice, setFormattedPrice] = useState<string | null>(null);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setDecryptionKey(null);
    setContentCID(null);
    setTxHash(null);
    setHasExistingAccess(false);
    setPaymentRequirements(null);
    setFormattedPrice(null);
  }, []);

  /**
   * Check if user has existing access to content
   */
  const checkExistingAccess = useCallback(async (contentId: string): Promise<boolean> => {
    if (!address) {
      return false;
    }

    setStatus('checking');
    setError(null);

    try {
      const result = await checkAccess(contentId, address);
      
      if (result.hasAccess) {
        setHasExistingAccess(true);
        setDecryptionKey(result.key || null);
        setContentCID(result.contentCID || null);
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

  /**
   * Fetch payment requirements without making payment
   */
  const fetchPaymentRequirements = useCallback(async (contentId: string): Promise<void> => {
    setStatus('checking');
    setError(null);

    try {
      const requirements = await getPaymentRequirements(contentId);
      
      if (requirements) {
        setPaymentRequirements(requirements);
        
        // Extract and format price
        if (requirements.accepts?.length > 0) {
          const price = requirements.accepts[0].maxAmountRequired;
          setFormattedPrice(formatUSDCAmount(price));
        }
      }

      setStatus('idle');
    } catch {
      setError('Failed to fetch payment requirements');
      setStatus('error');
    }
  }, []);

  /**
   * Execute payment and get decryption key
   */
  const pay = useCallback(async (contentId: string): Promise<PaymentResult> => {
    if (!isConnected || !address) {
      const errorMsg = 'Please connect your wallet';
      setError(errorMsg);
      setStatus('error');
      return { success: false, error: errorMsg };
    }

    if (!walletClient) {
      const errorMsg = 'Wallet client not available';
      setError(errorMsg);
      setStatus('error');
      return { success: false, error: errorMsg };
    }

    setStatus('signing');
    setError(null);

    try {
      // Make the paid request
      setStatus('verifying');
      const result = await makePaidRequest(
        `/api/key/${contentId}`,
        walletClient,
        address
      );

      if (result.success) {
        setDecryptionKey(result.key || null);
        setContentCID(result.contentCID || null);
        setTxHash(result.txHash || null);
        setHasExistingAccess(result.hasExistingAccess || false);
        setStatus('success');
        return result;
      } else {
        setError(result.error || 'Payment failed');
        setStatus('error');
        return result;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMsg);
      setStatus('error');
      return { success: false, error: errorMsg };
    }
  }, [isConnected, address, walletClient]);

  return {
    status,
    error,
    decryptionKey,
    contentCID,
    txHash,
    hasExistingAccess,
    paymentRequirements,
    formattedPrice,
    checkExistingAccess,
    fetchPaymentRequirements,
    pay,
    reset,
  };
}

export default useX402Payment;
