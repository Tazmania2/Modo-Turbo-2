import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigurationCache, WhiteLabelConfigCache, CachePersistence } from '../cache';
import { WhiteLabelConfiguration } from '@/types/funifier';

describe('Cache Utils', () => {
  describe('ConfigurationCache', () => {
    let cache: ConfigurationCache;

    beforeEach(() => {
      cache = new ConfigurationCache({ ttl: 1000, maxSize: 3 });
    });

    describe('set and get', () => {
      it('should store and retrieve values', () => {
        const key = 'test-key';
        const value = { data: 'test-value' };

        cache.set(key, value);
        const retrieved = cache.get(key);

        expect(retrieved).toEqual(value);
      });

      it('should return null for non-existent keys', () => {
        const result = cache.get('non-existent-key');
        expect(result).toBeNull();
      });

      it('should respect custom TTL', () => {
        const key = 'ttl-test';
        const value = 'test-value';

        cache.set(key, value, 100); // 100ms TTL
        expect(cache.get(key)).toBe(value);

        // Wait for expiration
        vi.useFakeTimers();
        vi.advanceTimersByTime(150);
        expect(cache.get(key)).toBeNull();
        vi.useRealTimers();
      });

      it('should use default TTL when not specified', () => {
        const key = 'default-ttl-test';
        const value = 'test-value';

        cache.set(key, value);
        expect(cache.get(key)).toBe(value);

        vi.useFakeTimers();
        vi.advanceTimersByTime(1500); // Beyond default TTL
        expect(cache.get(key)).toBeNull();
        vi.useRealTimers();
      });
    });

    describe('has', () => {
      it('should return true for existing non-expired keys', () => {
        cache.set('existing-key', 'value');
        expect(cache.has('existing-key')).toBe(true);
      });

      it('should return false for non-existent keys', () => {
        expect(cache.has('non-existent-key')).toBe(false);
      });

      it('should return false for expired keys', () => {
        cache.set('expired-key', 'value', 50);
        
        vi.useFakeTimers();
        vi.advanceTimersByTime(100);
        expect(cache.has('expired-key')).toBe(false);
        vi.useRealTimers();
      });
    });

    describe('delete', () => {
      it('should delete existing keys', () => {
        cache.set('delete-test', 'value');
        expect(cache.has('delete-test')).toBe(true);

        const deleted = cache.delete('delete-test');
        expect(deleted).toBe(true);
        expect(cache.has('delete-test')).toBe(false);
      });

      it('should return false for non-existent keys', () => {
        const deleted = cache.delete('non-existent');
        expect(deleted).toBe(false);
      });
    });

    describe('clear', () => {
      it('should remove all entries', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');

        expect(cache.getStats().size).toBe(3);

        cache.clear();
        expect(cache.getStats().size).toBe(0);
        expect(cache.has('key1')).toBe(false);
        expect(cache.has('key2')).toBe(false);
        expect(cache.has('key3')).toBe(false);
      });
    });

    describe('maxSize enforcement', () => {
      it('should remove oldest entries when max size is reached', () => {
        // Cache has maxSize of 3
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        expect(cache.getStats().size).toBe(3);

        // Adding 4th entry should remove the oldest (key1)
        cache.set('key4', 'value4');
        expect(cache.getStats().size).toBe(3);
        expect(cache.has('key1')).toBe(false);
        expect(cache.has('key2')).toBe(true);
        expect(cache.has('key3')).toBe(true);
        expect(cache.has('key4')).toBe(true);
      });
    });

    describe('cleanup', () => {
      it('should remove expired entries', () => {
        cache.set('key1', 'value1', 100);
        cache.set('key2', 'value2', 200);
        cache.set('key3', 'value3', 300);

        vi.useFakeTimers();
        vi.advanceTimersByTime(150); // Expire key1

        const removedCount = cache.cleanup();
        expect(removedCount).toBe(1);
        expect(cache.has('key1')).toBe(false);
        expect(cache.has('key2')).toBe(true);
        expect(cache.has('key3')).toBe(true);

        vi.useRealTimers();
      });

      it('should return 0 when no entries are expired', () => {
        cache.set('key1', 'value1', 1000);
        cache.set('key2', 'value2', 1000);

        const removedCount = cache.cleanup();
        expect(removedCount).toBe(0);
      });
    });

    describe('updateTTL', () => {
      it('should update TTL for existing entries', () => {
        cache.set('ttl-update-test', 'value', 100);
        
        const updated = cache.updateTTL('ttl-update-test', 1000);
        expect(updated).toBe(true);

        vi.useFakeTimers();
        vi.advanceTimersByTime(150); // Original TTL would have expired
        expect(cache.has('ttl-update-test')).toBe(true);
        vi.useRealTimers();
      });

      it('should return false for non-existent entries', () => {
        const updated = cache.updateTTL('non-existent', 1000);
        expect(updated).toBe(false);
      });
    });

    describe('getStats', () => {
      it('should return correct statistics', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');

        const stats = cache.getStats();
        expect(stats.size).toBe(2);
        expect(stats.maxSize).toBe(3);
        expect(stats.keys).toContain('key1');
        expect(stats.keys).toContain('key2');
      });
    });
  });

  describe('WhiteLabelConfigCache', () => {
    let cache: WhiteLabelConfigCache;
    const mockInstanceId = 'test-instance';
    const mockConfig: WhiteLabelConfiguration = {
      instanceId: mockInstanceId,
      branding: {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        accentColor: '#0000FF',
        logo: '',
        favicon: '',
        companyName: 'Test Company',
        tagline: 'Test Tagline'
      },
      features: {
        ranking: true,
        dashboards: { carteira_i: true },
        history: true,
        personalizedRanking: true
      },
      funifierIntegration: {
        apiKey: 'test-key',
        serverUrl: 'https://test.com',
        authToken: 'test-token',
        customCollections: []
      }
    };

    beforeEach(() => {
      cache = WhiteLabelConfigCache.getInstance();
      cache.clear(); // Clear any existing data
    });

    describe('configuration management', () => {
      it('should store and retrieve configurations', () => {
        cache.setConfiguration(mockInstanceId, mockConfig);
        const retrieved = cache.getConfiguration(mockInstanceId);

        expect(retrieved).toEqual(mockConfig);
      });

      it('should return null for non-existent configurations', () => {
        const result = cache.getConfiguration('non-existent-instance');
        expect(result).toBeNull();
      });
    });

    describe('setup status management', () => {
      it('should store and retrieve setup status', () => {
        cache.setSetupStatus(mockInstanceId, true);
        const status = cache.getSetupStatus(mockInstanceId);

        expect(status).toBe(true);
      });

      it('should return null for non-existent setup status', () => {
        const status = cache.getSetupStatus('non-existent-instance');
        expect(status).toBeNull();
      });
    });

    describe('validation result caching', () => {
      it('should cache and retrieve validation results', () => {
        const configHash = 'test-hash';
        const validationResult = { isValid: true, errors: [], warnings: [] };

        cache.setValidationResult(configHash, validationResult);
        const retrieved = cache.getValidationResult(configHash);

        expect(retrieved).toEqual(validationResult);
      });
    });

    describe('connection status caching', () => {
      it('should cache and retrieve connection status', () => {
        cache.setConnectionStatus(mockInstanceId, true);
        const status = cache.getConnectionStatus(mockInstanceId);

        expect(status).toBe(true);
      });
    });

    describe('invalidateInstance', () => {
      it('should remove all cache entries for a specific instance', () => {
        cache.setConfiguration(mockInstanceId, mockConfig);
        cache.setSetupStatus(mockInstanceId, true);
        cache.setConnectionStatus(mockInstanceId, true);

        expect(cache.getConfiguration(mockInstanceId)).not.toBeNull();
        expect(cache.getSetupStatus(mockInstanceId)).not.toBeNull();
        expect(cache.getConnectionStatus(mockInstanceId)).not.toBeNull();

        cache.invalidateInstance(mockInstanceId);

        expect(cache.getConfiguration(mockInstanceId)).toBeNull();
        expect(cache.getSetupStatus(mockInstanceId)).toBeNull();
        expect(cache.getConnectionStatus(mockInstanceId)).toBeNull();
      });

      it('should not affect other instances', () => {
        const otherInstanceId = 'other-instance';
        
        cache.setConfiguration(mockInstanceId, mockConfig);
        cache.setConfiguration(otherInstanceId, { ...mockConfig, instanceId: otherInstanceId });

        cache.invalidateInstance(mockInstanceId);

        expect(cache.getConfiguration(mockInstanceId)).toBeNull();
        expect(cache.getConfiguration(otherInstanceId)).not.toBeNull();
      });
    });

    describe('singleton behavior', () => {
      it('should return the same instance', () => {
        const instance1 = WhiteLabelConfigCache.getInstance();
        const instance2 = WhiteLabelConfigCache.getInstance();

        expect(instance1).toBe(instance2);
      });
    });
  });

  describe('CachePersistence', () => {
    let mockLocalStorage: { [key: string]: string };

    beforeEach(() => {
      mockLocalStorage = {};
      
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
          setItem: vi.fn((key: string, value: string) => {
            mockLocalStorage[key] = value;
          }),
          removeItem: vi.fn((key: string) => {
            delete mockLocalStorage[key];
          }),
        },
        writable: true,
      });
    });

    describe('saveCache', () => {
      it('should save cache data to localStorage', async () => {
        const cache = new ConfigurationCache();
        cache.set('test-key', 'test-value');

        await CachePersistence.saveCache(cache);

        expect(localStorage.setItem).toHaveBeenCalled();
        const savedData = JSON.parse(mockLocalStorage['whitelabel_cache_backup']);
        expect(savedData).toHaveProperty('timestamp');
        expect(savedData).toHaveProperty('entries');
      });

      it('should handle save errors gracefully', async () => {
        const cache = new ConfigurationCache();
        vi.mocked(localStorage.setItem).mockImplementation(() => {
          throw new Error('Storage error');
        });

        // Should not throw
        await expect(CachePersistence.saveCache(cache)).resolves.toBeUndefined();
      });
    });

    describe('loadCache', () => {
      it('should load cache data from localStorage', async () => {
        const cache = new ConfigurationCache();
        const mockData = {
          timestamp: Date.now(),
          entries: [
            ['test-key', { data: 'test-value', timestamp: Date.now(), ttl: 60000 }]
          ]
        };
        mockLocalStorage['whitelabel_cache_backup'] = JSON.stringify(mockData);

        await CachePersistence.loadCache(cache);

        expect(cache.get('test-key')).toBe('test-value');
      });

      it('should ignore expired entries when loading', async () => {
        const cache = new ConfigurationCache();
        const expiredTimestamp = Date.now() - 120000; // 2 minutes ago
        const mockData = {
          timestamp: Date.now(),
          entries: [
            ['expired-key', { data: 'expired-value', timestamp: expiredTimestamp, ttl: 60000 }]
          ]
        };
        mockLocalStorage['whitelabel_cache_backup'] = JSON.stringify(mockData);

        await CachePersistence.loadCache(cache);

        expect(cache.get('expired-key')).toBeNull();
      });

      it('should handle missing localStorage data gracefully', async () => {
        const cache = new ConfigurationCache();
        
        // Should not throw
        await expect(CachePersistence.loadCache(cache)).resolves.toBeUndefined();
      });

      it('should handle invalid JSON gracefully', async () => {
        const cache = new ConfigurationCache();
        mockLocalStorage['whitelabel_cache_backup'] = 'invalid-json';

        // Should not throw
        await expect(CachePersistence.loadCache(cache)).resolves.toBeUndefined();
      });
    });

    describe('clearPersistedCache', () => {
      it('should clear persisted cache data', async () => {
        mockLocalStorage['whitelabel_cache_backup'] = 'some-data';

        await CachePersistence.clearPersistedCache();

        expect(localStorage.removeItem).toHaveBeenCalledWith('whitelabel_cache_backup');
        expect(mockLocalStorage['whitelabel_cache_backup']).toBeUndefined();
      });

      it('should handle clear errors gracefully', async () => {
        vi.mocked(localStorage.removeItem).mockImplementation(() => {
          throw new Error('Remove error');
        });

        // Should not throw
        await expect(CachePersistence.clearPersistedCache()).resolves.toBeUndefined();
      });
    });
  });
});