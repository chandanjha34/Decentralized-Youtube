/**
 * useContentUpload Hook
 * 
 * Wires together the complete upload flow:
 * 1. Generate AES key
 * 2. Encrypt file
 * 3. Upload encrypted content to Pinata
 * 4. Upload thumbnail to Pinata (optional)
 * 5. Create and upload metadata JSON
 * 6. Call registerContent on AccessRegistry contract
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7
 */

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { generateAESKey, encryptFile, bytesToBase64 } from '@/lib/encryption';
import { uploadFile, uploadJSON } from '@/lib/ipfs';
import { ACCESS_REGISTRY_ADDRESS, accessRegistryAbi } from '@/lib/contracts';
import {
  UploadFormData,
  UploadStatus,
  ContentMetadata,
  getContentTypeFromMime,
  parseUSDC,
  Category,
} from '@/types/content';

/**
 * Result of a successful upload
 */
export interface UploadResult {
  contentId: string;
  metadataCID: string;
  contentCID: string;
  transactionHash: string;
}

/**
 * Upload error with user-friendly message
 */
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

/**
 * Hook for managing the complete content upload flow
 */
export function useContentUpload() {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  
  // Contract write hook
  const { 
    writeContract, 
    data: txHash, 
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();
  
  // Wait for transaction receipt
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  /**
   * Reset the upload state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
    resetWrite();
  }, [resetWrite]);

  /**
   * Execute the complete upload flow
   */
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
      // Step 1: Generate AES key and encrypt file
      setStatus('encrypting');
      
      const key = generateAESKey();
      
      const encryptedContent = await encryptFile(formData.file, key);
      
      // Step 2: Upload encrypted content to IPFS
      setStatus('uploading');
      
      const contentUploadResult = await uploadFile(encryptedContent, {
        name: `encrypted-${formData.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
        keyvalues: {
          type: 'encrypted-content',
          creator: address,
        },
      });
      
      const contentCID = contentUploadResult.cid;
      
      // Step 3: Upload thumbnail if provided
      let thumbnailCID: string | null = null;
      if (formData.thumbnail) {
        const thumbnailBuffer = await formData.thumbnail.arrayBuffer();
        const thumbnailUploadResult = await uploadFile(new Uint8Array(thumbnailBuffer), {
          name: `thumbnail-${formData.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
          keyvalues: {
            type: 'thumbnail',
            creator: address,
          },
        });
        thumbnailCID = thumbnailUploadResult.cid;
      }
      
      // Step 4: Create metadata JSON
      // For MVP, we store the AES key as base64 in the metadata
      // In production, this should be encrypted with the creator's public key
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
      
      // Step 5: Upload metadata to IPFS
      const metadataUploadResult = await uploadJSON(metadata as unknown as Record<string, unknown>, {
        name: `metadata-${formData.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
        keyvalues: {
          type: 'content-metadata',
          creator: address,
          contentType: metadata.contentType,
          category: metadata.category,
        },
      });
      
      const metadataCID = metadataUploadResult.cid;
      
      // Step 6: Register content on-chain
      setStatus('registering');
      
      const priceInUSDC = parseUSDC(formData.priceUSDC);
      
      // Call the contract with explicit gas settings for Polygon Amoy
      writeContract({
        address: ACCESS_REGISTRY_ADDRESS,
        abi: accessRegistryAbi,
        functionName: 'registerContent',
        args: [metadataCID, contentCID, priceInUSDC],
        // Add gas buffer for Polygon Amoy testnet
        gas: BigInt(500000),
      });
      
      // Return partial result - the full result will be available after tx confirmation
      return {
        contentId: '', // Will be populated from event logs
        metadataCID,
        contentCID,
        transactionHash: '', // Will be populated after tx
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setStatus('error');
      throw new UploadError(errorMessage, status, true);
    }
  }, [isConnected, address, status, writeContract]);

  // Handle transaction confirmation
  const handleTransactionSuccess = useCallback((
    metadataCID: string,
    contentCID: string,
    transactionHash: string
  ) => {
    // Extract contentId from transaction logs
    // For now, we'll use the transaction hash as a reference
    // In production, parse the ContentRegistered event
    const uploadResult: UploadResult = {
      contentId: transactionHash, // Placeholder - should parse from event
      metadataCID,
      contentCID,
      transactionHash,
    };
    
    setResult(uploadResult);
    setStatus('success');
    return uploadResult;
  }, []);

  return {
    // State
    status,
    error,
    result,
    isConnected,
    
    // Transaction state
    txHash,
    isWritePending,
    isConfirming,
    isConfirmed,
    writeError,
    receipt,
    
    // Actions
    upload,
    reset,
    handleTransactionSuccess,
  };
}
