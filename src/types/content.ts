/**
 * Content Types for Decentralized Content Platform
 * 
 * TypeScript interfaces for content metadata, upload forms, and related data structures.
 * Based on the metadata schema defined in the design document.
 */

/**
 * Supported content types for the platform
 */
export const CONTENT_TYPES = ['video', 'audio', 'pdf', 'image', 'article'] as const;
export type ContentType = typeof CONTENT_TYPES[number];

/**
 * Supported content categories
 */
export const CATEGORIES = [
  'education',
  'entertainment',
  'music',
  'art',
  'gaming',
  'technology',
  'lifestyle',
  'other',
] as const;
export type Category = typeof CATEGORIES[number];

/**
 * Upload form state for tracking the multi-step upload process
 */
export type UploadStatus = 
  | 'idle' 
  | 'encrypting' 
  | 'uploading' 
  | 'registering' 
  | 'success' 
  | 'error';

/**
 * Form data for content upload
 */
export interface UploadFormData {
  file: File | null;
  thumbnail: File | null;
  title: string;
  description: string;
  category: Category | '';
  tags: string[];
  priceUSDC: string;
}

/**
 * Metadata JSON structure stored on IPFS
 * Validates: Requirements 3.1
 */
export interface ContentMetadata {
  version: string;
  title: string;
  description: string;
  contentType: ContentType;
  category: Category;
  tags: string[];
  thumbnailCID: string | null;
  contentCID: string;
  encryptedKeyBlob: string;
  creatorAddress: string;
  priceUSDC: string;
  duration?: number;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  encryption: {
    algorithm: 'AES-GCM';
    keyLength: 256;
    ivLength: 12;
  };
}

/**
 * Content info returned from the AccessRegistry contract
 */
export interface ContentInfo {
  creator: string;
  metadataCID: string;
  contentCID: string;
  priceUSDC: bigint;
  createdAt: bigint;
  active: boolean;
}

/**
 * Access proof stored on-chain
 */
export interface AccessProof {
  contentId: string;
  consumer: string;
  paymentTxHash: string;
  grantedAt: bigint;
  expiryTimestamp: bigint;
}

/**
 * Content card display data for browse grid
 */
export interface ContentCardData {
  contentId: string;
  title: string;
  thumbnailCID: string | null;
  creatorAddress: string;
  priceUSDC: bigint;
  category: Category;
  /** Tags for search filtering */
  tags: string[];
}

/**
 * Dashboard content item with earnings data
 */
export interface DashboardContent {
  contentId: string;
  title: string;
  category: Category;
  priceUSDC: bigint;
  uploadDate: Date;
  viewCount: number;
  totalEarnings: bigint;
  status: 'active' | 'inactive';
}

/**
 * Transaction data for earnings display
 */
export interface Transaction {
  contentId: string;
  contentTitle: string;
  consumerAddress: string;
  amountUSDC: bigint;
  timestamp: Date;
  txHash: string;
}

/**
 * Helper to detect content type from file MIME type
 */
export function getContentTypeFromMime(mimeType: string): ContentType {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'article';
  return 'article'; // Default fallback
}

/**
 * Accepted file types for upload
 */
export const ACCEPTED_FILE_TYPES = {
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  article: ['text/plain', 'text/markdown', 'text/html', 'application/json'],
} as const;

/**
 * All accepted MIME types for content upload
 */
export const ALL_ACCEPTED_TYPES = [
  ...ACCEPTED_FILE_TYPES.video,
  ...ACCEPTED_FILE_TYPES.audio,
  ...ACCEPTED_FILE_TYPES.pdf,
  ...ACCEPTED_FILE_TYPES.image,
  ...ACCEPTED_FILE_TYPES.article,
];

/**
 * Accepted image types for thumbnail upload
 */
export const THUMBNAIL_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Maximum file sizes in bytes
 */
export const MAX_FILE_SIZES = {
  content: 100 * 1024 * 1024, // 100MB
  thumbnail: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format USDC amount for display (6 decimals)
 */
export function formatUSDC(amount: bigint): string {
  const value = Number(amount) / 1e6;
  return `$${value.toFixed(2)}`;
}

/**
 * Parse USDC string to bigint (6 decimals)
 */
export function parseUSDC(value: string): bigint {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return BigInt(0);
  return BigInt(Math.round(num * 1e6));
}
