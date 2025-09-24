import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisCacheService } from '../redis-cache.service';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      ping: vi.fn().mockResolvedValue('PONG'),
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      expire: vi.fn(),
      mget: vi.fn(),
      keys: vi.fn(),
      flushdb: vi.fn(),
      pipeline: vi.fn().mockReturnValue({
        setex: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      }),
      disconnect: vi.fn()
    }))
  };
});

describe('RedisCacheService', () => {
  let cacheService: RedisCacheService;
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheService = RedisCacheService.getInstance({
      host: 'localhost',
      port: 6379,
      lazyConnect: false
    });
    mockRedis = (cacheService as any).redis;
    // Mock the connection state
    (cacheService as any).isConnected = true;
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('get', () => {
    it('should return data from Redis when available', async () => {
      const testData = { test: 'data' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when data not found in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should fallback to memory cache when Redis fails', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      
      // Set data in fallback cache first by calling set with Redis failing
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));
      await cacheService.set('test-key', { test: 'data' }, 300);
      
      const result = await cacheService.get('test-key');

      expect(result).toEqual({ test: 'data' });
    });
  });

  describe('set', () => {
    it('should set data in Redis and fallback cache', async () => {
      const testData = { test: 'data' };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', testData, 300);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
    });

    it('should still set in fallback cache when Redis fails', async () => {
      const testData = { test: 'data' };
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.set('test-key', testData, 300);

      expect(result).toBe(false);
      
      // Should still be available from fallback
      const retrieved = await cacheService.get('test-key');
      expect(retrieved).toEqual(testData);
    });
  });

  describe('delete', () => {
    it('should delete from both Redis and fallback cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('exists', () => {
    it('should check existence in Redis first', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('test-key');
    });

    it('should check fallback cache when Redis fails', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));
      
      // Set in fallback cache
      await cacheService.set('test-key', { test: 'data' }, 300);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
    });
  });

  describe('mget', () => {
    it('should get multiple values from Redis', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['{"data":1}', '{"data":2}', null];
      mockRedis.mget.mockResolvedValue(values);

      const result = await cacheService.mget(keys);

      expect(result).toEqual([{ data: 1 }, { data: 2 }, null]);
      expect(mockRedis.mget).toHaveBeenCalledWith(...keys);
    });
  });

  describe('mset', () => {
    it('should set multiple values in Redis', async () => {
      const keyValuePairs = [
        { key: 'key1', value: { data: 1 }, ttl: 300 },
        { key: 'key2', value: { data: 2 }, ttl: 600 }
      ];

      const mockPipeline = {
        setex: vi.fn(),
        exec: vi.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await cacheService.mset(keyValuePairs);

      expect(result).toBe(true);
      expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      const pattern = 'test:*';
      const matchingKeys = ['test:key1', 'test:key2'];
      mockRedis.keys.mockResolvedValue(matchingKeys);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.deletePattern(pattern);

      expect(result).toBe(2);
      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const health = await cacheService.healthCheck();

      expect(health.redis.connected).toBe(true);
      expect(health.redis.latency).toBeGreaterThanOrEqual(0);
      expect(health.fallback.operational).toBe(true);
    });

    it('should handle Redis connection errors', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const health = await cacheService.healthCheck();

      expect(health.redis.connected).toBe(false);
      expect(health.redis.error).toBe('Connection failed');
    });
  });

  describe('metrics', () => {
    it('should track cache metrics', async () => {
      // Perform some operations
      await cacheService.set('key1', 'value1', 300);
      await cacheService.get('key1');
      await cacheService.get('nonexistent');

      const metrics = cacheService.getMetrics();

      expect(metrics.sets).toBeGreaterThan(0);
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.misses).toBeGreaterThan(0);
    });

    it('should calculate hit and error rates', async () => {
      const metrics = cacheService.getMetrics();

      expect(typeof metrics.hitRate).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.averageResponseTime).toBe('number');
    });
  });

  describe('fallback cache cleanup', () => {
    it('should remove expired entries from fallback cache', async () => {
      // Set entry with very short TTL
      await cacheService.set('short-lived', 'data', 0.001);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const removedCount = cacheService.cleanupFallbackCache();
      
      expect(removedCount).toBeGreaterThan(0);
    });
  });
});