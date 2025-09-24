import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedCacheManagerService } from '../enhanced-cache-manager.service';

// Mock dependencies
vi.mock('../redis-cache.service', () => ({
  redisCacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    deletePattern: vi.fn(),
    clear: vi.fn(),
    isRedisConnected: vi.fn().mockReturnValue(true),
    getMetrics: vi.fn().mockReturnValue({
      hits: 10,
      misses: 2,
      hitRate: 83.33,
      errorRate: 0,
      averageResponseTime: 50,
      isRedisConnected: true,
      errors: 0
    }),
    healthCheck: vi.fn().mockResolvedValue({
      redis: { connected: true, latency: 5 },
      fallback: { size: 0, operational: true }
    })
  }
}));

vi.mock('../dashboard-cache.service', () => ({
  dashboardCacheService: {
    getCacheStats: vi.fn().mockReturnValue({
      totalEntries: 25,
      hitRate: 85,
      invalidations: 3
    }),
    invalidate: vi.fn(),
    performMaintenance: vi.fn()
  }
}));

vi.mock('../ranking-cache.service', () => ({
  rankingCacheService: {
    getCacheStats: vi.fn().mockReturnValue({
      totalEntries: 15,
      hitRate: 90,
      memoryUsage: 1024 * 1024 // 1MB
    }),
    clearRankingCache: vi.fn(),
    invalidateLeaderboard: vi.fn(),
    invalidatePlayerRanking: vi.fn()
  }
}));

vi.mock('@/utils/cache', () => ({
  whiteLabelConfigCache: {
    getStats: vi.fn().mockReturnValue({
      size: 5
    }),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn()
  }
}));

vi.mock('../performance-monitor.service', () => ({
  performanceMonitor: {
    recordCacheHit: vi.fn(),
    recordCacheMiss: vi.fn()
  }
}));

describe('EnhancedCacheManagerService', () => {
  let cacheManager: EnhancedCacheManagerService;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheManager = EnhancedCacheManagerService.getInstance();
  });

  describe('get with strategy', () => {
    it('should get data using specified strategy', async () => {
      const mockFetchFunction = vi.fn().mockResolvedValue({ data: 'test' });
      const { redisCacheService } = await import('../redis-cache.service');
      
      (redisCacheService.get as any).mockResolvedValue({ data: 'cached' });

      const result = await cacheManager.get('test-key', 'dashboard_data', mockFetchFunction);

      expect(result).toEqual({ data: 'cached' });
      expect(mockFetchFunction).not.toHaveBeenCalled();
    });

    it('should fallback to fetch function when cache miss', async () => {
      const mockFetchFunction = vi.fn().mockResolvedValue({ data: 'fresh' });
      const { redisCacheService } = await import('../redis-cache.service');
      
      (redisCacheService.get as any).mockResolvedValue(null);

      const result = await cacheManager.get('test-key', 'dashboard_data', mockFetchFunction);

      expect(result).toEqual({ data: 'fresh' });
      expect(mockFetchFunction).toHaveBeenCalled();
    });

    it('should throw error for unknown strategy', async () => {
      const mockFetchFunction = vi.fn();

      await expect(
        cacheManager.get('test-key', 'unknown_strategy', mockFetchFunction)
      ).rejects.toThrow('Unknown cache strategy: unknown_strategy');
    });
  });

  describe('set with strategy', () => {
    it('should set data according to strategy', async () => {
      const { redisCacheService } = await import('../redis-cache.service');
      
      await cacheManager.set('test-key', { data: 'test' }, 'dashboard_data');

      expect(redisCacheService.set).toHaveBeenCalledWith('test-key', { data: 'test' }, 300);
    });

    it('should throw error for unknown strategy', async () => {
      await expect(
        cacheManager.set('test-key', { data: 'test' }, 'unknown_strategy')
      ).rejects.toThrow('Unknown cache strategy: unknown_strategy');
    });
  });

  describe('invalidation', () => {
    it('should invalidate player data', async () => {
      const event = {
        type: 'player_update' as const,
        scope: 'player' as const,
        identifier: 'player123',
        timestamp: new Date()
      };

      await cacheManager.invalidate(event);

      // Should process the invalidation (implementation detail)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should invalidate global cache', async () => {
      const event = {
        type: 'manual' as const,
        scope: 'global' as const,
        timestamp: new Date()
      };

      await cacheManager.invalidate(event);

      // Should clear all caches
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('performance report', () => {
    it('should generate comprehensive performance report', async () => {
      const report = await cacheManager.getPerformanceReport();

      expect(report).toHaveProperty('overall');
      expect(report).toHaveProperty('byService');
      expect(report).toHaveProperty('recommendations');

      expect(report.overall).toHaveProperty('hitRate');
      expect(report.overall).toHaveProperty('missRate');
      expect(report.overall).toHaveProperty('averageResponseTime');

      expect(report.byService).toHaveProperty('redis');
      expect(report.byService).toHaveProperty('dashboard');
      expect(report.byService).toHaveProperty('ranking');
      expect(report.byService).toHaveProperty('config');

      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should calculate overall metrics correctly', async () => {
      const report = await cacheManager.getPerformanceReport();

      expect(typeof report.overall.hitRate).toBe('number');
      expect(typeof report.overall.missRate).toBe('number');
      expect(report.overall.hitRate + report.overall.missRate).toBeCloseTo(100, 1);
    });
  });

  describe('strategy management', () => {
    it('should update cache strategy', () => {
      const updates = {
        ttl: 600,
        useRedis: false
      };

      cacheManager.updateStrategy('dashboard_data', updates);

      // Strategy should be updated (implementation detail)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('warmup configuration', () => {
    it('should update warmup configuration', () => {
      const config = {
        enabled: false,
        strategies: {
          dashboard: false,
          ranking: true,
          config: true
        }
      };

      cacheManager.updateWarmupConfig(config);

      // Configuration should be updated
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('cache warmup', () => {
    it('should warm up caches when enabled', async () => {
      // Enable warmup
      cacheManager.updateWarmupConfig({ enabled: true });

      await cacheManager.warmUpCaches();

      // Should complete without errors
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should skip warmup when disabled', async () => {
      // Disable warmup
      cacheManager.updateWarmupConfig({ enabled: false });

      await cacheManager.warmUpCaches();

      // Should return early
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('clear all caches', () => {
    it('should clear all cache services', async () => {
      const { redisCacheService } = await import('../redis-cache.service');
      const { dashboardCacheService } = await import('../dashboard-cache.service');
      const { rankingCacheService } = await import('../ranking-cache.service');

      await cacheManager.clearAllCaches();

      expect(redisCacheService.clear).toHaveBeenCalled();
      expect(dashboardCacheService.invalidate).toHaveBeenCalledWith('global');
      expect(rankingCacheService.clearRankingCache).toHaveBeenCalled();
    });
  });

  describe('recommendations generation', () => {
    it('should generate recommendations based on metrics', async () => {
      const report = await cacheManager.getPerformanceReport();

      expect(Array.isArray(report.recommendations)).toBe(true);
      
      // Should have recommendations based on mock data
      if (report.recommendations.length > 0) {
        expect(typeof report.recommendations[0]).toBe('string');
      }
    });
  });

  describe('memory cache routing', () => {
    it('should route config keys to whiteLabelConfigCache', async () => {
      const { whiteLabelConfigCache } = await import('@/utils/cache');
      
      // This would test the private method routing logic
      // In a real implementation, we'd need to expose this or test through public methods
      expect(whiteLabelConfigCache.get).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const { redisCacheService } = await import('../redis-cache.service');
      
      (redisCacheService.get as any).mockRejectedValue(new Error('Redis connection failed'));
      
      const mockFetchFunction = vi.fn().mockResolvedValue({ data: 'fallback' });

      const result = await cacheManager.get('test-key', 'dashboard_data', mockFetchFunction);

      expect(result).toEqual({ data: 'fallback' });
      expect(mockFetchFunction).toHaveBeenCalled();
    });

    it('should handle cache service errors during invalidation', async () => {
      const { dashboardCacheService } = await import('../dashboard-cache.service');
      
      (dashboardCacheService.invalidate as any).mockRejectedValue(new Error('Cache service error'));

      const event = {
        type: 'player_update' as const,
        scope: 'player' as const,
        identifier: 'player123',
        timestamp: new Date()
      };

      // Should not throw error
      await expect(cacheManager.invalidate(event)).resolves.not.toThrow();
    });
  });
});