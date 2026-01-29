/**
 * Encryption utilities for API key storage
 * Uses AES-256-GCM for authenticated encryption
 */

export interface EncryptedData {
  encryptedKey: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypts an API key using AES-256-GCM
 * @param plaintext - The API key to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export async function encryptApiKey(plaintext: string): Promise<EncryptedData> {
  // TODO: Implement AES-256-GCM encryption
  // 1. Generate random IV (12 bytes)
  // 2. Use ENCRYPTION_KEY from env
  // 3. Encrypt with GCM mode
  // 4. Return base64-encoded cipher, IV, and auth tag
  throw new Error("Not implemented");
}

/**
 * Decrypts an API key using AES-256-GCM
 * @param encrypted - The encrypted data object
 * @returns Decrypted API key
 */
export async function decryptApiKey(encrypted: EncryptedData): Promise<string> {
  // TODO: Implement AES-256-GCM decryption
  // 1. Decode base64 values
  // 2. Use ENCRYPTION_KEY from env
  // 3. Verify auth tag
  // 4. Decrypt and return plaintext
  throw new Error("Not implemented");
}

/**
 * Creates a masked version of an API key for display
 * @param apiKey - The full API key
 * @returns Masked key (e.g., "sk-...xyz123")
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length < 8) return "***";
  return `${apiKey.slice(0, 3)}...${apiKey.slice(-6)}`;
}
