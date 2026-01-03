/**
 * Lighthouse Storage Utilities
 * 
 * Client-side utilities for uploading encrypted content and metadata to IPFS via Lighthouse.
 * - Uses Lighthouse SDK for reliable IPFS storage
 * - Uses universal IPFS gateway (dweb.link) for fetching to support content from any provider
 * - Returns CID (Content Identifier) on successful upload
 * 
 * Requirements: 2.3, 2.4, 2.6
 */

import lighthouse from '@lighthouse-web3/sdk';

/**
 * IPFS Gateway configuration
 * Using dweb.link as it's a universal gateway that can fetch from any IPFS node
 * This allows fetching content uploaded to Pinata, Lighthouse, or any other IPFS provider
 */
const IPFS_FETCH_GATEWAY = 'https://dweb.link/ipfs';

/**
 * Gets the Lighthouse API key from environment variables.
 * Throws an error if not configured.
 */
function getLighthouseApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Lighthouse API key not configured. Set NEXT_PUBLIC_LIGHTHOUSE_API_KEY in your environment variables. ' +
      'Get your API key at https://files.lighthouse.storage/'
    );
  }
  return apiKey;
}

/**
 * Options for file upload
 */
export interface UploadFileOptions {
  /** Optional name for the file */
  name?: string;
}

/**
 * Options for JSON upload
 */
export interface UploadJSONOptions {
  /** Name for the JSON file */
  name: string;
}

/**
 * Result of a successful upload
 */
export interface UploadResult {
  /** IPFS Content Identifier */
  cid: string;
  /** Size of content in bytes */
  size: number;
  /** Full gateway URL to access the content */
  gatewayUrl: string;
}

/**
 * Uploads a file (as Uint8Array or Blob) to IPFS via Lighthouse.
 * Used for uploading encrypted content blobs.
 * 
 * @param content - The file content as Uint8Array or Blob
 * @param options - Optional upload configuration
 * @returns Promise resolving to upload result with CID
 * @throws Error if upload fails
 */
export async function uploadFile(
  content: Uint8Array | Blob,
  options: UploadFileOptions = {}
): Promise<UploadResult> {
  const apiKey = getLighthouseApiKey();
  
  // Convert to Blob if needed
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else {
    const buffer = new ArrayBuffer(content.length);
    new Uint8Array(buffer).set(content);
    blob = new Blob([buffer], { type: 'application/octet-stream' });
  }
  
  // Create a File object from Blob (Lighthouse SDK expects File)
  const fileName = options.name || `content-${Date.now()}`;
  const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
  
  // Upload using Lighthouse SDK
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
    gatewayUrl: `${IPFS_FETCH_GATEWAY}/${response.data.Hash}`,
  };
}

/**
 * Uploads a JSON object to IPFS via Lighthouse.
 * Used for uploading content metadata.
 * 
 * @param json - The JSON object to upload
 * @param options - Upload configuration
 * @returns Promise resolving to upload result with CID
 * @throws Error if upload fails
 */
export async function uploadJSON(
  json: Record<string, unknown>,
  options: UploadJSONOptions
): Promise<UploadResult> {
  const apiKey = getLighthouseApiKey();
  
  // Convert JSON to Blob
  const jsonString = JSON.stringify(json, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], `${options.name}.json`, { type: 'application/json' });
  
  // Upload using Lighthouse SDK
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
    gatewayUrl: `${IPFS_FETCH_GATEWAY}/${response.data.Hash}`,
  };
}

/**
 * Fetches content from IPFS via universal gateway.
 * Uses dweb.link which can fetch from any IPFS provider.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns Promise resolving to the content as ArrayBuffer
 * @throws Error if fetch fails
 */
export async function fetchFromIPFS(cid: string): Promise<ArrayBuffer> {
  const url = `${IPFS_FETCH_GATEWAY}/${cid}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  
  return response.arrayBuffer();
}

/**
 * Fetches JSON content from IPFS via universal gateway.
 * Uses dweb.link which can fetch from any IPFS provider.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns Promise resolving to the parsed JSON object
 * @throws Error if fetch or parse fails
 */
export async function fetchJSONFromIPFS<T = Record<string, unknown>>(cid: string): Promise<T> {
  const url = `${IPFS_FETCH_GATEWAY}/${cid}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON from IPFS: ${response.statusText}`);
  }
  
  return response.json() as Promise<T>;
}

/**
 * Constructs a gateway URL for a given CID.
 * Uses universal gateway for maximum compatibility.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns The full gateway URL
 */
export function getGatewayUrl(cid: string): string {
  return `${IPFS_FETCH_GATEWAY}/${cid}`;
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
  
  // CIDv0: starts with Qm, 46 characters
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  
  // CIDv1: starts with bafy (base32) or various other bases
  const cidV1Regex = /^(bafy|bafk|bafz|bafb)[a-z2-7]{52,}$/i;
  
  return cidV0Regex.test(cid) || cidV1Regex.test(cid);
}

/**
 * Constants exported for configuration and testing
 */
export const LIGHTHOUSE_CONSTANTS = {
  GATEWAY_URL: IPFS_FETCH_GATEWAY,
} as const;
