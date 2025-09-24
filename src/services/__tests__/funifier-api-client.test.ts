import { describe, it, expect, vi } from 'vitest';
import { ErrorType } from '../funifier-api-client';

// Mock axios at the module level
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: { baseURL: 'https://service2.funifier.com' },
    })),
    isAxiosError: vi.fn(),
  },
}));

describe('FunifierApiClient', () => {
  describe('ErrorType enum', () => {
    it('should have correct error types', () => {
      expect(ErrorType.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
      expect(ErrorType.FUNIFIER_API_ERROR).toBe('FUNIFIER_API_ERROR');
      expect(ErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    });
  });

  describe('module exports', () => {
    it('should export FunifierApiClient class', async () => {
      const { FunifierApiClient } = await import('../funifier-api-client');
      expect(FunifierApiClient).toBeDefined();
      expect(typeof FunifierApiClient).toBe('function');
    });

    it('should export funifierApiClient singleton', async () => {
      const { funifierApiClient } = await import('../funifier-api-client');
      expect(funifierApiClient).toBeDefined();
      expect(typeof funifierApiClient.setCredentials).toBe('function');
      expect(typeof funifierApiClient.get).toBe('function');
      expect(typeof funifierApiClient.post).toBe('function');
    });
  });

  describe('API methods', () => {
    it('should have required methods', async () => {
      const { funifierApiClient } = await import('../funifier-api-client');
      
      expect(typeof funifierApiClient.setCredentials).toBe('function');
      expect(typeof funifierApiClient.setAccessToken).toBe('function');
      expect(typeof funifierApiClient.get).toBe('function');
      expect(typeof funifierApiClient.post).toBe('function');
      expect(typeof funifierApiClient.put).toBe('function');
      expect(typeof funifierApiClient.delete).toBe('function');
    });
  });
});