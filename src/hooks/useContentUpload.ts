/**
 * useContentUpload Hook - SIMPLIFIED VERSION
 * 
 * Direct ethers.js implementation without wagmi complexity
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { BrowserProvider, Contract } from 'ethers';
import { generateAESKey, encryptFile, bytesToBase64 } from '@/lib/encryption';
import { uploadFile, uploadJSON } from '@/lib/lighthouse';
import { ACCESS_REGISTRY_ADDRESS, accessRegistryAbi } from '@/lib/contracts';
import {
  UploadFormData,
  UploadStatus,
  ContentMetadata,
  getContentTypeFromMime,
  parseUSDC,
  Category,
} from '@/types/content';

export interface UploadResult {
  contentId: string;
  metadataCID: string;
  contentCID: string;
  transactionHash: string;
}

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly step: UploadStatus,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export function useContentUpload() {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isWritePending, setIsWritePending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
    setTxHash(null);
    setIsWritePending(false);
    setIsConfirming(false);
    setIsConfirmed(false);
  }, []);

  const upload = useCallback(async (formData: UploadFormData): Promise<UploadResult> => {
    if (!isConnected || !address) {
      throw new UploadError('Please connect your wallet first.', 'idle', true);
    }

    if (!formData.file) {
      throw new UploadError('No file selected.', 'idle', true);
    }

    setError(null);
    setResult(null);

    try {
      // Step 0: Validate network FIRST
      setStatus('encrypting');
      if (!window.ethereum) {
        throw new UploadError('No wallet found', 'idle', false);
      }

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== BigInt(80002)) {
        throw new UploadError(
          'Please switch to Polygon Amoy network (Chain ID: 80002) in your wallet',
          'idle',
          true
        );
      }

      // Check balance
      const balance = await provider.getBalance(address);
      const minBalance = BigInt(10000000000000000); // 0.01 POL
      if (balance < minBalance) {
        throw new UploadError(
          'Insufficient POL balance for gas fees. Please add at least 0.01 POL to your wallet.',
          'idle',
          true
        );
      }

      // Step 1: Encrypt file
      const key = generateAESKey();
      const encryptedContent = await encryptFile(formData.file, key);

      // Step 2: Upload encrypted content to IPFS
      setStatus('uploading');
      const contentUploadResult = await uploadFile(encryptedContent, {
        name: `encrypted-${formData.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
      });
      const contentCID = contentUploadResult.cid;

      // Step 3: Upload thumbnail if provided
      let thumbnailCID: string | null = null;
      if (formData.thumbnail) {
        const thumbnailBuffer = await formData.thumbnail.arrayBuffer();
        const thumbnailUploadResult = await uploadFile(new Uint8Array(thumbnailBuffer), {
          name: `thumbnail-${formData.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
        });
        thumbnailCID = thumbnailUploadResult.cid;
      }

      // Step 4: Create metadata
      const encryptedKeyBlob = bytesToBase64(key);
      const metadata: ContentMetadata = {
        version: '1.0',
        title: formData.title,
        description: formData.description,
        contentType: getContentTypeFromMime(formData.file.type),
        category: formData.category as Category,
        tags: formData.tags,
        thumbnailCID,
        contentCID,
        encryptedKeyBlob,
        creatorAddress: address,
        priceUSDC: formData.priceUSDC,
        fileSize: formData.file.size,
        mimeType: formData.file.type,
        createdAt: new Date().toISOString(),
        encryption: {
          algorithm: 'AES-GCM',
          keyLength: 256,
          ivLength: 12,
        },
      };

      // Step 5: Upload metadata
      const metadataUploadResult = await uploadJSON(metadata as unknown as Record<string, unknown>, {
        name: `metadata-${formData.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
      });
      const metadataCID = metadataUploadResult.cid;

      // Step 6: Register on-chain with proper error handling
      setStatus('registering');
      setIsWritePending(true);

      const priceInUSDC = parseUSDC(formData.priceUSDC);

      console.log('Registering content on-chain:', {
        address: ACCESS_REGISTRY_ADDRESS,
        metadataCID,
        contentCID,
        priceInUSDC: priceInUSDC.toString(),
      });

      const signer = await provider.getSigner();

      // Create contract instance
      const contract = new Contract(ACCESS_REGISTRY_ADDRESS, accessRegistryAbi, signer);

      // Estimate gas with buffer
      let gasLimit: bigint;
      try {
        const estimatedGas = await contract.registerContent.estimateGas(
          metadataCID,
          contentCID,
          priceInUSDC
        );
        gasLimit = (estimatedGas * BigInt(120)) / BigInt(100); // 20% buffer
        console.log('Gas estimated:', estimatedGas.toString(), 'with buffer:', gasLimit.toString());
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError);
        gasLimit = BigInt(300000); // Safe default
      }

      console.log('Calling registerContent with:', {
        metadataCID,
        contentCID,
        priceInUSDC: priceInUSDC.toString(),
        gasLimit: gasLimit.toString(),
        from: address,
      });

      // Call contract with retry logic
      let tx;
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        try {
          tx = await contract.registerContent(metadataCID, contentCID, priceInUSDC, {
            gasLimit,
          });
          break; // Success, exit retry loop
        } catch (err: any) {
          attempt++;

          // Don't retry on user rejection
          if (err.message?.includes('user rejected') || err.message?.includes('ACTION_REJECTED')) {
            throw new UploadError('Transaction rejected by user', 'registering', true);
          }

          // Last attempt failed
          if (attempt >= maxAttempts) {
            const errorMessage = err.message || String(err);
            throw new UploadError(
              `Failed to submit transaction after ${maxAttempts} attempts: ${errorMessage}`,
              'registering',
              true
            );
          }

          // Wait before retry (exponential backoff)
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          console.log(`Transaction attempt ${attempt} failed, retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      if (!tx) {
        throw new UploadError('Failed to create transaction', 'registering', false);
      }

      setTxHash(tx.hash);
      setIsWritePending(false);
      setIsConfirming(true);

      console.log('Transaction sent:', tx.hash);

      // Wait for confirmation with timeout
      const receipt = await Promise.race([
        tx.wait(1),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), 120000)
        ),
      ]);

      setIsConfirming(false);
      setIsConfirmed(true);

      console.log('Transaction confirmed:', receipt);

      if (!receipt || receipt.status !== 1) {
        throw new UploadError('Transaction failed on-chain', 'registering', false);
      }

      // CRITICAL FIX: Parse ContentRegistered event to get actual contentId
      let actualContentId: string | null = null;

      try {
        // Find the ContentRegistered event in the logs
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog({
              topics: [...log.topics],
              data: log.data,
            });

            if (parsedLog && parsedLog.name === 'ContentRegistered') {
              actualContentId = parsedLog.args.contentId;
              console.log('Extracted contentId from event:', actualContentId);
              break;
            }
          } catch {
            // Skip logs that don't match
            continue;
          }
        }
      } catch (parseError) {
        console.error('Failed to parse ContentRegistered event:', parseError);
      }

      // Fallback to transaction hash if event parsing fails (not ideal but prevents total failure)
      const contentId = actualContentId || tx.hash;

      if (!actualContentId) {
        console.warn('WARNING: Could not extract contentId from event, using tx hash as fallback');
      }

      // Create result
      const uploadResult: UploadResult = {
        contentId,
        metadataCID,
        contentCID,
        transactionHash: tx.hash,
      };

      setResult(uploadResult);
      setStatus('success');

      return uploadResult;

    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus('error');
      setIsWritePending(false);
      setIsConfirming(false);
      throw new UploadError(errorMessage, status, true);
    }
  }, [isConnected, address, status]);

  return {
    status,
    error,
    result,
    isConnected,
    txHash,
    isWritePending,
    isConfirming,
    isConfirmed,
    writeError: error,
    receiptError: null,
    receipt: null,
    upload,
    reset,
    handleTransactionSuccess: () => result,
  };
}
