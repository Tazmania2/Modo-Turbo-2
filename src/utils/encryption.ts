import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // For development/demo purposes, use a default key
    // In production, this should always be set via environment variable
    console.warn('ENCRYPTION_KEY not set, using default key for development');
    return 'dev-key-not-for-production-use-32-chars-long';
  }
  return key;
}

/**
 * Derive key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
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

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const result = {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      encrypted: encrypted
    };

    return Buffer.from(JSON.stringify(result)).toString('base64');
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
    const dataStr = Buffer.from(encryptedData, 'base64').toString('utf8');
    const data = JSON.parse(dataStr);

    const salt = Buffer.from(data.salt, 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    const encrypted = data.encrypted;

    const key = deriveKey(password, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
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
    // Check if it's valid base64
    const dataStr = Buffer.from(data, 'base64').toString('utf8');
    const parsed = JSON.parse(dataStr);
    
    // Check if it has the expected structure
    return parsed && 
           typeof parsed.salt === 'string' && 
           typeof parsed.iv === 'string' && 
           typeof parsed.encrypted === 'string';
  } catch {
    return false;
  }
}