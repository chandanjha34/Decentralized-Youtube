/**
 * AES-GCM Encryption Utilities
 * 
 * Client-side encryption for content protection using Web Crypto API.
 * - Uses AES-GCM with 256-bit keys
 * - IV (12 bytes) is prepended to encrypted content
 * 
 * Requirements: 2.1, 2.2
 */

const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

/**
 * Generates a cryptographically secure random 256-bit AES key.
 * 
 * @returns A 32-byte Uint8Array containing the AES key
 * 
 * Validates: Requirements 2.1 - Generate random 256-bit AES key client-side
 */
export function generateAESKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Generates a cryptographically secure random 12-byte IV for AES-GCM.
 * 
 * @returns A 12-byte Uint8Array containing the IV
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Imports a raw AES key into a CryptoKey object for use with Web Crypto API.
 * 
 * @param rawKey - The raw 256-bit AES key as Uint8Array
 * @param usages - Key usages ('encrypt', 'decrypt', or both)
 * @returns Promise resolving to a CryptoKey
 */
async function importAESKey(
  rawKey: Uint8Array,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  // Create a new ArrayBuffer copy to ensure type compatibility
  const keyBuffer = new ArrayBuffer(rawKey.length);
  new Uint8Array(keyBuffer).set(rawKey);
  
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    usages
  );
}

/**
 * Encrypts content using AES-GCM with the provided key.
 * The IV is prepended to the encrypted content for storage.
 * 
 * @param content - The content to encrypt as Uint8Array
 * @param key - The 256-bit AES key as Uint8Array
 * @returns Promise resolving to encrypted content with IV prepended [IV || ciphertext]
 * 
 * Validates: Requirements 2.2 - Use AES-GCM with generated key
 */
export async function encrypt(
  content: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> {
  const iv = generateIV();
  const cryptoKey = await importAESKey(key, ['encrypt']);
  
  // Create a copy of content as ArrayBuffer for encryption
  const contentBuffer = new ArrayBuffer(content.length);
  new Uint8Array(contentBuffer).set(content);
  
  // Create ArrayBuffer copy of IV for Web Crypto API compatibility
  const ivBuffer = new ArrayBuffer(iv.length);
  new Uint8Array(ivBuffer).set(iv);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    cryptoKey,
    contentBuffer
  );
  
  // Prepend IV to ciphertext: [IV (12 bytes) || ciphertext]
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_LENGTH);
  
  return result;
}

/**
 * Decrypts content that was encrypted with AES-GCM.
 * Expects the IV to be prepended to the ciphertext.
 * 
 * @param encryptedContent - The encrypted content with IV prepended [IV || ciphertext]
 * @param key - The 256-bit AES key as Uint8Array
 * @returns Promise resolving to the decrypted content
 * @throws Error if decryption fails (wrong key, corrupted data, etc.)
 * 
 * Validates: Requirements 7.4 - Decrypt using AES-GCM with provided key
 */
export async function decrypt(
  encryptedContent: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> {
  if (encryptedContent.length <= IV_LENGTH) {
    throw new Error('Invalid encrypted content: too short');
  }
  
  // Extract IV from first 12 bytes
  const iv = encryptedContent.slice(0, IV_LENGTH);
  const ciphertext = encryptedContent.slice(IV_LENGTH);
  
  const cryptoKey = await importAESKey(key, ['decrypt']);
  
  // Create ArrayBuffer copies for Web Crypto API compatibility
  const ivBuffer = new ArrayBuffer(iv.length);
  new Uint8Array(ivBuffer).set(iv);
  
  const ciphertextBuffer = new ArrayBuffer(ciphertext.length);
  new Uint8Array(ciphertextBuffer).set(ciphertext);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    cryptoKey,
    ciphertextBuffer
  );
  
  return new Uint8Array(decrypted);
}

/**
 * Encrypts a File object and returns the encrypted content.
 * 
 * @param file - The File to encrypt
 * @param key - The 256-bit AES key as Uint8Array
 * @returns Promise resolving to encrypted content with IV prepended
 */
export async function encryptFile(
  file: File,
  key: Uint8Array
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const content = new Uint8Array(arrayBuffer);
  return encrypt(content, key);
}

/**
 * Decrypts content and returns it as a Blob with the specified MIME type.
 * 
 * @param encryptedContent - The encrypted content with IV prepended
 * @param key - The 256-bit AES key as Uint8Array
 * @param mimeType - The MIME type for the resulting Blob
 * @returns Promise resolving to a Blob containing the decrypted content
 */
export async function decryptToBlob(
  encryptedContent: Uint8Array,
  key: Uint8Array,
  mimeType: string
): Promise<Blob> {
  const decrypted = await decrypt(encryptedContent, key);
  // Create ArrayBuffer copy for Blob constructor
  const buffer = new ArrayBuffer(decrypted.length);
  new Uint8Array(buffer).set(decrypted);
  return new Blob([buffer], { type: mimeType });
}

/**
 * Creates an object URL from decrypted content for rendering in the browser.
 * Remember to call URL.revokeObjectURL() when done to free memory.
 * 
 * @param encryptedContent - The encrypted content with IV prepended
 * @param key - The 256-bit AES key as Uint8Array
 * @param mimeType - The MIME type for the resulting Blob
 * @returns Promise resolving to an object URL string
 */
export async function decryptToObjectURL(
  encryptedContent: Uint8Array,
  key: Uint8Array,
  mimeType: string
): Promise<string> {
  const blob = await decryptToBlob(encryptedContent, key, mimeType);
  return URL.createObjectURL(blob);
}

/**
 * Converts a Uint8Array to a base64 string for storage/transmission.
 * 
 * @param bytes - The bytes to encode
 * @returns Base64 encoded string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return btoa(binary);
}

/**
 * Converts a base64 string back to Uint8Array.
 * 
 * @param base64 - The base64 encoded string
 * @returns Decoded bytes as Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Helper to compare two Uint8Arrays for equality.
 * Useful for testing round-trip encryption.
 * 
 * @param a - First array
 * @param b - Second array
 * @returns true if arrays are equal, false otherwise
 */
export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Constants exported for testing and validation
 */
export const ENCRYPTION_CONSTANTS = {
  AES_KEY_LENGTH,
  IV_LENGTH,
  KEY_BYTES: 32, // 256 bits = 32 bytes
} as const;
