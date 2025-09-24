import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAGPOSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAGPOSITION + TAG_LENGTH;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return key;
}

/**
 * Derive key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  try {
    const password = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(password, salt);

    const cipher = crypto.createCipher(ALGORITHM, key);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

    return Buffer.concat([salt, iv, encrypted]).toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  try {
    const password = getEncryptionKey();
    const data = Buffer.from(encryptedData, 'base64');

    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH);

    const key = deriveKey(password, salt);
    const decipher = crypto.createDecipher(ALGORITHM, key);

    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Hash data for validation purposes
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate if a string is properly encrypted
 */
export function isEncrypted(data: string): boolean {
  try {
    // Check if it's valid base64 and has minimum expected length
    const buffer = Buffer.from(data, 'base64');
    return buffer.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}