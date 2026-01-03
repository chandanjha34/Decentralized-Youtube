/**
 * Pinata IPFS Upload Utilities
 * 
 * Client-side utilities for uploading encrypted content and metadata to IPFS via Pinata.
 * - Uses Pinata's pinning API for reliable IPFS storage
 * - Returns CID (Content Identifier) on successful upload
 * 
 * Requirements: 2.3, 2.4, 2.6
 */

/**
 * Pinata API configuration
 */
const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';

/**
 * Response from Pinata pin API
 */
interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Error response from Pinata API
 */
interface PinataError {
  error?: {
    reason: string;
    details: string;
  };
  message?: string;
}

/**
 * Options for file upload
 */
export interface UploadFileOptions {
  /** Optional name for the pinned file */
  name?: string;
  /** Optional key-value metadata for Pinata */
  keyvalues?: Record<string, string>;
}

/**
 * Options for JSON upload
 */
export interface UploadJSONOptions {
  /** Name for the pinned JSON (required for identification) */
  name: string;
  /** Optional key-value metadata for Pinata */
  keyvalues?: Record<string, string>;
}

/**
 * Result of a successful upload
 */
export interface UploadResult {
  /** IPFS Content Identifier */
  cid: string;
  /** Size of pinned content in bytes */
  size: number;
  /** Timestamp of when content was pinned */
  timestamp: string;
  /** Full gateway URL to access the content */
  gatewayUrl: string;
}

/**
 * Gets the Pinata JWT from environment variables.
 * Supports both server-side (PINATA_JWT) and client-side (NEXT_PUBLIC_PINATA_JWT) usage.
 * Throws an error if not configured.
 */
function getPinataJWT(): string {
  // Try client-side env var first (for browser), then server-side
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error(
      'Pinata JWT not configured. Set NEXT_PUBLIC_PINATA_JWT in your environment variables. ' +
      'Get your JWT at https://app.pinata.cloud/developers/api-keys'
    );
  }
  return jwt;
}

/**
 * Uploads a file (as Uint8Array or Blob) to IPFS via Pinata.
 * Used for uploading encrypted content blobs.
 * 
 * @param content - The file content as Uint8Array or Blob
 * @param options - Optional upload configuration
 * @returns Promise resolving to upload result with CID
 * @throws Error if upload fails
 * 
 * Validates: Requirements 2.3 - Upload encrypted blob to Pinata IPFS
 */
export async function uploadFile(
  content: Uint8Array | Blob,
  options: UploadFileOptions = {}
): Promise<UploadResult> {
  const jwt = getPinataJWT();
  
  // Convert Uint8Array to Blob if needed
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else {
    // Create ArrayBuffer copy for Blob constructor compatibility
    const buffer = new ArrayBuffer(content.length);
    new Uint8Array(buffer).set(content);
    blob = new Blob([buffer], { type: 'application/octet-stream' });
  }
  
  // Create form data for multipart upload
  const formData = new FormData();
  const fileName = options.name || `encrypted-content-${Date.now()}`;
  formData.append('file', blob, fileName);
  
  // Add pinata metadata if provided
  if (options.name || options.keyvalues) {
    const pinataMetadata = {
      name: options.name,
      keyvalues: options.keyvalues,
    };
    formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
  }
  
  // Add pinata options for CID version
  const pinataOptions = {
    cidVersion: 1, // Use CIDv1 for better compatibility
  };
  formData.append('pinataOptions', JSON.stringify(pinataOptions));
  
  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as PinataError;
    const errorMessage = errorData.error?.details || errorData.message || response.statusText;
    throw new Error(`Pinata upload failed: ${errorMessage}`);
  }
  
  const data = await response.json() as PinataResponse;
  
  return {
    cid: data.IpfsHash,
    size: data.PinSize,
    timestamp: data.Timestamp,
    gatewayUrl: `${PINATA_GATEWAY_URL}/${data.IpfsHash}`,
  };
}

/**
 * Uploads a JSON object to IPFS via Pinata.
 * Used for uploading content metadata.
 * 
 * @param json - The JSON object to upload
 * @param options - Upload configuration (name is required)
 * @returns Promise resolving to upload result with CID
 * @throws Error if upload fails
 * 
 * Validates: Requirements 2.6 - Upload metadata JSON to Pinata and receive Metadata_CID
 */
export async function uploadJSON(
  json: Record<string, unknown>,
  options: UploadJSONOptions
): Promise<UploadResult> {
  const jwt = getPinataJWT();
  
  const body = {
    pinataContent: json,
    pinataMetadata: {
      name: options.name,
      keyvalues: options.keyvalues,
    },
    pinataOptions: {
      cidVersion: 1,
    },
  };
  
  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as PinataError;
    const errorMessage = errorData.error?.details || errorData.message || response.statusText;
    throw new Error(`Pinata JSON upload failed: ${errorMessage}`);
  }
  
  const data = await response.json() as PinataResponse;
  
  return {
    cid: data.IpfsHash,
    size: data.PinSize,
    timestamp: data.Timestamp,
    gatewayUrl: `${PINATA_GATEWAY_URL}/${data.IpfsHash}`,
  };
}

/**
 * Fetches content from IPFS via Pinata gateway.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns Promise resolving to the content as ArrayBuffer
 * @throws Error if fetch fails
 * 
 * Validates: Requirements 7.3 - Fetch encrypted content from IPFS via Content_CID
 */
export async function fetchFromIPFS(cid: string): Promise<ArrayBuffer> {
  const url = `${PINATA_GATEWAY_URL}/${cid}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  
  return response.arrayBuffer();
}

/**
 * Fetches JSON content from IPFS via Pinata gateway.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns Promise resolving to the parsed JSON object
 * @throws Error if fetch or parse fails
 */
export async function fetchJSONFromIPFS<T = Record<string, unknown>>(cid: string): Promise<T> {
  const url = `${PINATA_GATEWAY_URL}/${cid}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON from IPFS: ${response.statusText}`);
  }
  
  return response.json() as Promise<T>;
}

/**
 * Constructs a gateway URL for a given CID.
 * 
 * @param cid - The IPFS Content Identifier
 * @returns The full gateway URL
 */
export function getGatewayUrl(cid: string): string {
  return `${PINATA_GATEWAY_URL}/${cid}`;
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
export const IPFS_CONSTANTS = {
  PINATA_API_URL,
  PINATA_GATEWAY_URL,
} as const;
