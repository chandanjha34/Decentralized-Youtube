'use client';

/**
 * Direct POL Payment Hook - Using ethers.js
 * 
 * Bypasses wagmi completely for maximum simplicity and reliability.
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { BrowserProvider } from 'ethers';

export type PaymentStatus = 
  | 'idle'
  | 'checking'
  | 'signing'
  | 'confirming'
  | 'granting'
  | 'success'
  | 'error';

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
  const ethAmount = Number(weiAmount) / 1e18;
  return ethAmount.toFixed(4);
}

export function usePolPaymentDirect(): UsePolPaymentResult {
  const { address, isConnected } = useAccount();
  
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [decryptionKey, setDecryptionKey] = useState<string | null>(null);
  const [contentCID, setContentCID] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [hasExistingAccess, setHasExistingAccess] = useState(false);
  const [polPrice, setPolPrice] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setDecryptionKey(null);
    setContentCID(null);
    setTxHash(null);
    setHasExistingAccess(false);
    setPolPrice(null);
  }, []);

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

    if (!window.ethereum) {
      setError('No wallet found');
      setStatus('error');
      return;
    }

    setError(null);
    setTxHash(null);
    
    try {
      const polAmount = usdcToPolAmount(priceUSDC);
      
      console.log('Sending POL payment:', {
        from: address,
        to: creatorAddress,
        value: polAmount.toString(),
        valueInPOL: formatPolAmount(polAmount),
      });

      // Get provider and signer from window.ethereum
      setStatus('signing');
      
      // Request account access if needed
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      console.log('Signer address:', await signer.getAddress());
      const network = await provider.getNetwork();
      console.log('Network:', network);
      console.log('Chain ID:', network.chainId);
      console.log('Network name:', network.name);
      
      // Check if we're on the right network
      if (network.chainId !== BigInt(80002)) {
        throw new Error('Please switch to Polygon Amoy network (Chain ID: 80002)');
      }

      // Send transaction - with manual gas limit to avoid RPC estimation failure
      const tx = await signer.sendTransaction({
        to: creatorAddress,
        value: polAmount,
        gasLimit: BigInt(100000), // Manual gas limit - more than enough for simple transfer
      });

      console.log('Transaction sent:', tx.hash);
      setTxHash(tx.hash);
      setStatus('confirming');

      // Wait for confirmation
      const receipt = await tx.wait(1);
      console.log('Transaction confirmed:', receipt);

      // Grant access
      setStatus('granting');
      const response = await fetch(`/api/key/${contentId}/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumerAddress: address,
          txHash: tx.hash,
          polAmount: polAmount.toString(),
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

      console.log('Payment successful!');
    } catch (err) {
      console.error('Payment error:', err);
      
      let errorMsg = 'Failed to send transaction. Please try again.';
      
      if (err instanceof Error) {
        if (err.message?.includes('user rejected') || err.message?.includes('ACTION_REJECTED')) {
          errorMsg = 'Transaction rejected by user';
        } else if (err.message?.includes('insufficient')) {
          errorMsg = 'Insufficient POL balance';
        } else {
          errorMsg = err.message;
        }
      }
      
      setError(errorMsg);
      setStatus('error');
    }
  }, [isConnected, address]);

  return {
    status,
    error,
    decryptionKey,
    contentCID,
    txHash,
    hasExistingAccess,
    polPrice,
    checkExistingAccess,
    fetchPolPrice,
    pay,
    reset,
  };
}

export default usePolPaymentDirect;
