import { vi } from 'vitest';
import { fallbackManager } from '../fallback-manager.service';
import { demoDataService } from '../demo-data.service';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the demo data service
vi.mock('../demo-data.service', () => ({
  demoDataService: {
    generateDashboardData: vi.fn(() => ({ type: 'dashboard', data: 'mock' })),
    generateRankingData: vi.fn(() => ({ type: 'ranking', data: 'mock' })),
    generateWhiteLabelConfig: vi.fn(() => ({ type: 'config', data: 'mock' }))
  }
}));

describe('FallbackManagerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeWithFallback', () => {
    it('should execute operation successfully without fallback', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await fallbackManager.executeWithFallback(
        operation,
        'testOperation'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use demo fallback when operation fails', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      const result = await fallbackManager.executeWithFallback(
        operation,
        'dashboardData'
      );

      expect(result).toEqual({ type: 'dashboard', data: 'mock' });
      expect(demoDataService.generateDashboardData).toHaveBeenCalled();
    });

    it('should retry operation with exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success on attempt 3');

      // Configure retry fallback
      fallbackManager.updateFallbackConfig('retryOperation', {
        type: 'retry',
        enabled: true,
        maxRetries: 3,
        retryDelay: 100
      });

      const result = await fallbackManager.executeWithFallback(
        operation,
        'retryOperation'
      );

      expect(result).toBe('success on attempt 3');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not use fallback when disabled', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      fallbackManager.setFallbackEnabled('testOperation', false);

      await expect(
        fallbackManager.executeWithFallback(operation, 'testOperation')
      ).rejects.toThrow('Operation failed');
    });
  });

  describe('fallback configuration management', () => {
    it('should update fallback configuration', () => {
      fallbackManager.updateFallbackConfig('testKey', {
        type: 'cache',
        enabled: true,
        maxRetries: 5
      });

      const config = fallbackManager.getFallbackConfig();
      expect(config.testKey).toEqual({
        type: 'cache',
        enabled: true,
        maxRetries: 5
      });
    });

    it('should enable/disable fallback for specific keys', () => {
      fallbackManager.setFallbackEnabled('testKey', false);
      expect(fallbackManager.isFallbackAvailable('testKey')).toBe(false);

      fallbackManager.setFallbackEnabled('testKey', true);
      expect(fallbackManager.isFallbackAvailable('testKey')).toBe(true);
    });
  });

  describe('demo data fallback', () => {
    it('should return appropriate demo data for different keys', async () => {
      const dashboardResult = await fallbackManager.executeWithFallback(
        () => Promise.reject(new Error('Failed')),
        'dashboardData'
      );

      const rankingResult = await fallbackManager.executeWithFallback(
        () => Promise.reject(new Error('Failed')),
        'rankingData'
      );

      const configResult = await fallbackManager.executeWithFallback(
        () => Promise.reject(new Error('Failed')),
        'configuration'
      );

      expect(dashboardResult).toEqual({ type: 'dashboard', data: 'mock' });
      expect(rankingResult).toEqual({ type: 'ranking', data: 'mock' });
      expect(configResult).toEqual({ type: 'config', data: 'mock' });
    });
  });

  describe('offline data storage and retrieval', () => {
    beforeEach(() => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      });
    });

    it('should store offline data', async () => {
      const testData = { test: 'data' };
      
      await fallbackManager.storeOfflineData('testKey', testData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'offline_testKey',
        JSON.stringify(testData)
      );
    });

    it('should handle localStorage errors gracefully', async () => {
      (localStorage.setItem as any).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error
      await expect(
        fallbackManager.storeOfflineData('testKey', { data: 'test' })
      ).resolves.toBeUndefined();
    });
  });

  describe('retry logic', () => {
    it('should calculate correct retry delays', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      
      fallbackManager.updateFallbackConfig('retryTest', {
        type: 'retry',
        enabled: true,
        maxRetries: 2,
        retryDelay: 100
      });

      await fallbackManager.executeWithFallback(operation, 'retryTest');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have waited at least for the retry delays (100ms + 200ms)
      expect(duration).toBeGreaterThan(250);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect maximum retry limit', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      fallbackManager.updateFallbackConfig('retryTest', {
        type: 'retry',
        enabled: true,
        maxRetries: 2,
        retryDelay: 10
      });

      await expect(
        fallbackManager.executeWithFallback(operation, 'retryTest')
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});