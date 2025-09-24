import Redis from 'ioredis';
import { CacheEntry } from '@/utils/cache';

export interface RedisCacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  enableOfflineQueue?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalResponseTime: number;
  lastReset: Date;
}

export interface CacheOperation {
  operation: 'get' | 'set' | 'delete' | 'exists' | 'expire';
  key: string;
  duration?: number;
  success: boolean;
  error?: string;
}

/**
 * Redis Cache Service for Funifier API responses
 * Provides distributed caching with automatic failover to in-memory cache
 */
export class RedisCacheService {
  private static instance: RedisCacheService;
  private redis: Redis | null = null;
  private fallbackCache = new Map<string, CacheEntry<any>>();
  private isConnected = false;
  private metrics: CacheMetrics;
  private config: RedisCacheConfig;

  private constructor(config?: RedisCacheConfig) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'wlgp:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalResponseTime: 0,
      lastReset: new Date()
    };

    this.initializeRedis();
  }

  static getInstance(config?: RedisCacheConfig): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService(config);
    }
    return RedisCacheService.instance;
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        lazyConnect: this.config.lazyConnect,
        enableOfflineQueue: this.config.enableOfflineQueue
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        console.log('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.metrics.errors++;
        console.error('Redis connection error:', error);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        console.log('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      // Test connection if not lazy
      if (!this.config.lazyConnect) {
        await this.redis.ping();
      }
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache (Redis first, fallback to memory)
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Try Redis first
      if (this.isConnected && this.redis) {
        const value = await this.redis.get(key);
        this.metrics.totalResponseTime += Date.now() - startTime;
        
        if (value) {
          this.metrics.hits++;
          return JSON.parse(value) as T;
        }
      }

      // Fallback to in-memory cache
      const fallbackEntry = this.fallbackCache.get(key);
      if (fallbackEntry && Date.now() < fallbackEntry.timestamp + fallbackEntry.ttl) {
        this.metrics.hits++;
        return fallbackEntry.data as T;
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache get error:', error);
      
      // Try fallback cache on error
      const fallbackEntry = this.fallbackCache.get(key);
      if (fallbackEntry && Date.now() < fallbackEntry.timestamp + fallbackEntry.ttl) {
        this.metrics.hits++;
        return fallbackEntry.data as T;
      }
      
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set value in cache (Redis and memory fallback)
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const serializedValue = JSON.stringify(value);
      
      // Set in Redis
      if (this.isConnected && this.redis) {
        await this.redis.setex(key, ttlSeconds, serializedValue);
      }

      // Always set in fallback cache
      this.fallbackCache.set(key, {
        data: value,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000
      });

      this.metrics.sets++;
      this.metrics.totalResponseTime += Date.now() - startTime;
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache set error:', error);
      
      // Still try to set in fallback cache
      this.fallbackCache.set(key, {
        data: value,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000
      });
      
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;
      
      // Delete from Redis
      if (this.isConnected && this.redis) {
        const result = await this.redis.del(key);
        deleted = result > 0;
      }

      // Delete from fallback cache
      const fallbackDeleted = this.fallbackCache.delete(key);
      
      this.metrics.deletes++;
      return deleted || fallbackDeleted;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache delete error:', error);
      
      // Still try to delete from fallback
      return this.fallbackCache.delete(key);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      // Check Redis first
      if (this.isConnected && this.redis) {
        const exists = await this.redis.exists(key);
        if (exists) return true;
      }

      // Check fallback cache
      const fallbackEntry = this.fallbackCache.get(key);
      return fallbackEntry !== undefined && Date.now() < fallbackEntry.timestamp + fallbackEntry.ttl;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache exists error:', error);
      
      // Check fallback only
      const fallbackEntry = this.fallbackCache.get(key);
      return fallbackEntry !== undefined && Date.now() < fallbackEntry.timestamp + fallbackEntry.ttl;
    }
  }

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      let result = false;
      
      // Set expiration in Redis
      if (this.isConnected && this.redis) {
        result = await this.redis.expire(key, ttlSeconds) === 1;
      }

      // Update TTL in fallback cache
      const fallbackEntry = this.fallbackCache.get(key);
      if (fallbackEntry) {
        fallbackEntry.ttl = ttlSeconds * 1000;
        fallbackEntry.timestamp = Date.now();
        result = true;
      }

      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results: (T | null)[] = [];
      
      if (this.isConnected && this.redis) {
        const values = await this.redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          if (values[i]) {
            results.push(JSON.parse(values[i]!) as T);
            this.metrics.hits++;
          } else {
            // Check fallback for this key
            const fallbackEntry = this.fallbackCache.get(keys[i]);
            if (fallbackEntry && Date.now() < fallbackEntry.timestamp + fallbackEntry.ttl) {
              results.push(fallbackEntry.data as T);
              this.metrics.hits++;
            } else {
              results.push(null);
              this.metrics.misses++;
            }
          }
        }
      } else {
        // Use fallback cache only
        for (const key of keys) {
          const fallbackEntry = this.fallbackCache.get(key);
          if (fallbackEntry && Date.now() < fallbackEntry.timestamp + fallbackEntry.ttl) {
            results.push(fallbackEntry.data as T);
            this.metrics.hits++;
          } else {
            results.push(null);
            this.metrics.misses++;
          }
        }
      }

      return results;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache mget error:', error);
      
      // Fallback to individual gets
      const results: (T | null)[] = [];
      for (const key of keys) {
        results.push(await this.get<T>(key));
      }
      return results;
    }
  }

  /**
   * Set multiple values at once
   */
  async mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    try {
      let success = true;
      
      if (this.isConnected && this.redis) {
        const pipeline = this.redis.pipeline();
        
        for (const { key, value, ttl = 300 } of keyValuePairs) {
          pipeline.setex(key, ttl, JSON.stringify(value));
        }
        
        await pipeline.exec();
      }

      // Set in fallback cache
      for (const { key, value, ttl = 300 } of keyValuePairs) {
        this.fallbackCache.set(key, {
          data: value,
          timestamp: Date.now(),
          ttl: ttl * 1000
        });
      }

      this.metrics.sets += keyValuePairs.length;
      return success;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache mset error:', error);
      
      // Still set in fallback
      for (const { key, value, ttl = 300 } of keyValuePairs) {
        this.fallbackCache.set(key, {
          data: value,
          timestamp: Date.now(),
          ttl: ttl * 1000
        });
      }
      
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      let deletedCount = 0;
      
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await this.redis.del(...keys);
        }
      }

      // Delete from fallback cache
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.fallbackCache.keys()) {
        if (regex.test(key)) {
          this.fallbackCache.delete(key);
          deletedCount++;
        }
      }

      this.metrics.deletes += deletedCount;
      return deletedCount;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache deletePattern error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.flushdb();
      }
      
      this.fallbackCache.clear();
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache clear error:', error);
      
      // Still clear fallback
      this.fallbackCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics & { 
    isRedisConnected: boolean; 
    fallbackCacheSize: number;
    hitRate: number;
    errorRate: number;
    averageResponseTime: number;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const totalOperations = totalRequests + this.metrics.sets + this.metrics.deletes;
    
    return {
      ...this.metrics,
      isRedisConnected: this.isConnected,
      fallbackCacheSize: this.fallbackCache.size,
      hitRate: totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0,
      errorRate: totalOperations > 0 ? (this.metrics.errors / totalOperations) * 100 : 0,
      averageResponseTime: totalRequests > 0 ? this.metrics.totalResponseTime / totalRequests : 0
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalResponseTime: 0,
      lastReset: new Date()
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    redis: { connected: boolean; latency?: number; error?: string };
    fallback: { size: number; operational: boolean };
  }> {
    const result = {
      redis: { connected: false, latency: undefined as number | undefined, error: undefined as string | undefined },
      fallback: { size: this.fallbackCache.size, operational: true }
    };

    try {
      if (this.redis) {
        const start = Date.now();
        await this.redis.ping();
        result.redis.connected = true;
        result.redis.latency = Date.now() - start;
      }
    } catch (error) {
      result.redis.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Cleanup expired entries from fallback cache
   */
  cleanupFallbackCache(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (now >= entry.timestamp + entry.ttl) {
        this.fallbackCache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Get Redis connection status
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Reconnect to Redis
   */
  async reconnect(): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.disconnect();
      }
      
      await this.initializeRedis();
      return this.isConnected;
    } catch (error) {
      console.error('Failed to reconnect to Redis:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.disconnect();
      }
      this.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }
}

// Export singleton instance
export const redisCacheService = RedisCacheService.getInstance();