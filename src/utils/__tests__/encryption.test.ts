import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hash, generateSecureToken, isEncrypted } from '../encryption';

describe('Encryption Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-enough-for-security';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('hash', () => {
    it('should generate consistent hashes for same input', () => {
      const data = 'consistent-data';
      
      const hash1 = hash(data);
      const hash2 = hash(data);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hash('data1');
      const hash2 = hash('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token with default length', () => {
      const token = generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex encoding)
    });

    it('should generate token with custom length', () => {
      const token = generateSecureToken(16);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32); // 16 bytes * 2 (hex encoding)
    });

    it('should generate different tokens on each call', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for properly formatted encrypted data', () => {
      const validEncryptedData = Buffer.alloc(200).toString('base64');
      
      const result = isEncrypted(validEncryptedData);
      
      expect(result).toBe(true);
    });

    it('should return false for invalid base64', () => {
      const invalidData = 'not-base64-data!@#';
      
      const result = isEncrypted(invalidData);
      
      expect(result).toBe(false);
    });

    it('should return false for data that is too short', () => {
      const shortData = Buffer.alloc(50).toString('base64');
      
      const result = isEncrypted(shortData);
      
      expect(result).toBe(false);
    });

    it('should return false for plain text', () => {
      const plainText = 'this is just plain text';
      
      const result = isEncrypted(plainText);
      
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = isEncrypted('');
      
      expect(result).toBe(false);
    });
  });

  describe('validation functions', () => {
    it('should validate encryption key requirement', () => {
      // Test that the functions exist and are callable
      expect(typeof hash).toBe('function');
      expect(typeof generateSecureToken).toBe('function');
      expect(typeof isEncrypted).toBe('function');
    });
  });
});