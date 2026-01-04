/**
 * Lighthouse Storage Utilities
 * 
 * Client-side utilities for uploading and fetching encrypted content via Lighthouse.
 * - Uses Lighthouse SDK for reliable IPFS storage
 * - Uses Lighthouse's dedicated gateway for fast retrieval
 * - Returns CID (Content Identifier) on successful upload
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5
 */

import lighthouse from '@lighthouse-web3/sdk';

/**
 * Lighthouse Gateway configuration - single dedicated gateway for fast, reliable fetching
 */
const LIGHTHOUSE_GATEWAY = 'https://gateway.lighthouse.storage/ipfs';

/**
 * Fetch configuration
 */
const FETCH_TIMEOUT_MS = 10000; // 10 seconds per attempt
const MAX_RETRIES = 3; // Total of 3 attempts

/**
 * Gets the Lighthouse API key from environment variables.
 */
function getLighthouseApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Lighthouse API key not configured. Set NEXT_PUBLIC_LIGHTHOUSE_API_KEY in your environment variables.'
    );
  }
  return apiKey;
}

export interface UploadFileOptions {
  name?: string;
}

export interface UploadJSONOptions {
  name: string;
}

export interface UploadResult {
  cid: string;
  size: number;
  gatewayUrl: string;
}

/**
 * Uploads a file to IPFS via Lighthouse.
 * 
 * @param content - The file content as Uint8Array or Blob
 * @param options - Optional upload configuration
 * @returns Promise resolving to upload result with CID
 * @throws Error if upload fails
 * 
 * Validates: Requirements 2.1, 2.2
 */
export async function uploadFile(
  content: Uint8Array | Blob,
  options: UploadFileOptions = {}
): Promise<UploadResult> {
  const apiKey = getLighthouseApiKey();
  
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else {
    const buffer = new ArrayBuffer(content.length);
    new Uint8Array(buffer).set(content);
    blob = new Blob([buffer], { type: 'application/octet-stream' });
  }
  
  const fileName = options.name || `content-${Date.now()}`;
  const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
  
  const response = await lighthouse.upload(
    [file] as unknown as FileList,
    apiKey
  );
  
  if (!response.data || !response.data.Hash) {
    throw new Error('Lighthouse upload failed: No CID returned');
  }
  
  return {
    cid: response.data.Hash,
    size: parseInt(response.data.Size || '0', 10),
    gatewayUrl: `${LIGHTHOUSE_GATEWAY}/${response.data.Hash}`,
  };
}

/**
 * Uploads a JSON object to IPFS via Lighthouse.
 * 
 * @param json - The JSON object to upload
 * @param options - Upload configuration (name is required)
 * @returns Promise resolving to upload result with CID
 * @throws Error if upload fails
 * 
 * Validates: Requirements 2.3
 */
export async function uploadJSON(
  json: Record<string, unknown>,
  options: UploadJSONOptions
): Promise<UploadResult> {
  const apiKey = getLighthouseApiKey();
  
  const jsonString = JSON.stringify(json, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], `${options.name}.json`, { type: 'application/json' });
  
  const response = await lighthouse.upload(
    [file] as unknown as FileList,
    apiKey
  );
  
  if (!response.data || !response.data.Hash) {
    throw new Error('Lighthouse JSON upload failed: No CID returned');
  }
  
  return {
    cid: response.data.Hash,
    size: parseInt(response.data.Size || '0', 10),
    gatewayUrl: `${LIGHTHOUSE_GATEWAY}/${response.data.Hash}`,
  };
}

/**
 * Helper function to fetch with retry and exponential backoff.
 * 
 * @param url - The URL to fetch
 * @param maxRetries - Maximum number of retry attempts
 * @returns Promise resolving to Response
 * @throws Error if all retries fail
 * 
 * Validates: Requirements 1.3, 1.5
 */
async function fetchWithRetry(url: string, maxRetries: number): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry on 404 - content doesn't exist
      if (response.status === 404) {
        throw new Error('Content not found on Lighthouse');
      }
      
      // For other errors, prepare to retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Fetch failed');
      
      // Check for timeout
      if (lastError.name === 'TimeoutError' || lastError.message.includes('timeout')) {
        lastError = new Error('Network timeout - please check your connection');
      }
      
      // Don't retry on 404 or invalid CID errors
      if (lastError.message.includes('not found') || 
          lastError.message.includes('Invalid')) {
        throw lastError;
      }
      
      // Exponential backoff: wait 2^attempt seconds before retry
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000; // 0s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All retries failed
  throw lastError || new Error('Failed to fetch from Lighthouse after retries');
}

/**
 * Fetches content from IPFS via Lighthouse gateway with retry logic.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns Promise resolving to the content as ArrayBuffer
 * @throws Error if fetch fails after retries
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4
 */
export async function fetchFromIPFS(cid: string): Promise<ArrayBuffer> {
  // Validate CID first
  if (!isValidCID(cid)) {
    throw new Error('Invalid content identifier');
  }
  
  const url = `${LIGHTHOUSE_GATEWAY}/${cid}`;
  
  try {
    const response = await fetchWithRetry(url, MAX_RETRIES);
    return response.arrayBuffer();
  } catch (err) {
    // Re-throw with context
    const error = err instanceof Error ? err : new Error('Fetch failed');
    throw new Error(`Failed to fetch from Lighthouse: ${error.message}`);
  }
}

/**
 * Fetches JSON content from IPFS via Lighthouse gateway with retry logic.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns Promise resolving to the parsed JSON object
 * @throws Error if fetch or parse fails after retries
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4
 */
export async function fetchJSONFromIPFS<T = Record<string, unknown>>(cid: string): Promise<T> {
  // Validate CID first
  if (!isValidCID(cid)) {
    throw new Error('Invalid content identifier');
  }
  
  const url = `${LIGHTHOUSE_GATEWAY}/${cid}`;
  
  try {
    const response = await fetchWithRetry(url, MAX_RETRIES);
    return response.json() as Promise<T>;
  } catch (err) {
    // Re-throw with context
    const error = err instanceof Error ? err : new Error('Fetch failed');
    throw new Error(`Failed to fetch JSON from Lighthouse: ${error.message}`);
  }
}

/**
 * Constructs a gateway URL for a given CID.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns The full Lighthouse gateway URL
 */
export function getGatewayUrl(cid: string): string {
  return `${LIGHTHOUSE_GATEWAY}/${cid}`;
}

/**
 * Validates that a string looks like a valid IPFS CID.
 * Supports both CIDv0 (Qm...) and CIDv1 (bafy...) formats.
 * 
 * @param cid - The string to validate
 * @returns true if the string appears to be a valid CID
 */
export function isValidCID(cid: string): boolean {
  if (!cid || typeof cid !== 'string') return false;
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const cidV1Regex = /^(bafy|bafk|bafz|bafb)[a-z2-7]{52,}$/i;
  return cidV0Regex.test(cid) || cidV1Regex.test(cid);
}

/**
 * Constants exported for configuration and testing
 */
export const LIGHTHOUSE_CONSTANTS = {
  GATEWAY_URL: LIGHTHOUSE_GATEWAY,
  FETCH_TIMEOUT_MS,
  MAX_RETRIES,
} as const;
