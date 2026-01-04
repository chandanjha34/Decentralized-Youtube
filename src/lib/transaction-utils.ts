/**
 * Transaction Utilities
 * 
 * Shared utilities for handling blockchain transactions with proper
 * error handling, retry logic, and gas estimation.
 */

import { BrowserProvider, Contract, TransactionReceipt, TransactionResponse } from 'ethers';

/**
 * Gas estimation with buffer
 * Estimates gas and adds a safety buffer to prevent out-of-gas errors
 */
export async function estimateGasWithBuffer(
  contract: Contract,
  functionName: string,
  args: unknown[],
  bufferPercent: number = 20
): Promise<bigint> {
  try {
    const estimatedGas = await contract[functionName].estimateGas(...args);
    const buffer = (estimatedGas * BigInt(bufferPercent)) / BigInt(100);
    return estimatedGas + buffer;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Return a reasonable default if estimation fails
    return BigInt(300000);
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on user rejection
      if (lastError.message.includes('user rejected') ||
        lastError.message.includes('ACTION_REJECTED')) {
        throw lastError;
      }

      // Last attempt - throw error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('All retries failed');
}

/**
 * Validate network and get provider
 */
export async function validateNetworkAndGetProvider(
  expectedChainId: bigint = BigInt(80002) // Polygon Amoy
): Promise<{ provider: BrowserProvider; signer: any }> {
  if (!window.ethereum) {
    throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  if (network.chainId !== expectedChainId) {
    throw new Error(
      `Wrong network. Please switch to Polygon Amoy (Chain ID: ${expectedChainId}). ` +
      `Current network: ${network.name} (Chain ID: ${network.chainId})`
    );
  }

  const signer = await provider.getSigner();
  return { provider, signer };
}

/**
 * Check wallet balance
 */
export async function checkBalance(
  provider: BrowserProvider,
  address: string,
  requiredAmount: bigint
): Promise<{ sufficient: boolean; balance: bigint }> {
  const balance = await provider.getBalance(address);
  return {
    sufficient: balance >= requiredAmount,
    balance,
  };
}

/**
 * Parse event from transaction receipt
 */
export function parseEventFromReceipt(
  receipt: TransactionReceipt,
  contract: Contract,
  eventName: string
): any | null {
  try {
    // Find the event in the logs
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });

        if (parsedLog && parsedLog.name === eventName) {
          return parsedLog.args;
        }
      } catch {
        // Skip logs that don't match
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to parse ${eventName} event:`, error);
    return null;
  }
}

/**
 * Wait for transaction with timeout
 */
export async function waitForTransactionWithTimeout(
  tx: TransactionResponse,
  confirmations: number = 1,
  timeoutMs: number = 120000 // 2 minutes
): Promise<TransactionReceipt | null> {
  return Promise.race([
    tx.wait(confirmations),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Format error message for user display
 */
export function formatTransactionError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Transaction failed. Please try again.';
  }

  const message = error.message.toLowerCase();

  // User rejection
  if (message.includes('user rejected') || message.includes('user denied')) {
    return 'Transaction was rejected. Please try again when ready.';
  }

  // Insufficient funds
  if (message.includes('insufficient') || message.includes('balance')) {
    return 'Insufficient balance. Please add more POL to your wallet.';
  }

  // Gas related
  if (message.includes('gas')) {
    return 'Transaction failed due to gas estimation. Please try again.';
  }

  // Network issues
  if (message.includes('network') || message.includes('timeout') || message.includes('rpc')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Wrong network
  if (message.includes('chain') || message.includes('network')) {
    return 'Please ensure you are on the Polygon Amoy network.';
  }

  // Nonce issues
  if (message.includes('nonce')) {
    return 'Transaction nonce error. Try resetting your MetaMask account (Settings → Advanced → Reset Account).';
  }

  // Generic fallback with original error
  return `Transaction failed: ${error.message}`;
}

/**
 * Execute transaction with full error handling and retry
 */
export async function executeTransaction<T extends TransactionResponse>(
  txFunction: () => Promise<T>,
  options: {
    maxRetries?: number;
    confirmations?: number;
    timeout?: number;
  } = {}
): Promise<{ tx: T; receipt: TransactionReceipt }> {
  const {
    maxRetries = 2,
    confirmations = 1,
    timeout = 120000,
  } = options;

  const tx = await retryWithBackoff(txFunction, maxRetries);
  const receipt = await waitForTransactionWithTimeout(tx, confirmations, timeout);

  if (!receipt || receipt.status !== 1) {
    throw new Error('Transaction failed on-chain');
  }

  return { tx, receipt };
}

/**
 * Format POL amount for display
 */
export function formatPOL(weiAmount: bigint, decimals: number = 4): string {
  const ethAmount = Number(weiAmount) / 1e18;
  return ethAmount.toFixed(decimals);
}

/**
 * Format USDC amount for display
 */
export function formatUSDC(usdcAmount: bigint, decimals: number = 2): string {
  const amount = Number(usdcAmount) / 1e6;
  return amount.toFixed(decimals);
}
