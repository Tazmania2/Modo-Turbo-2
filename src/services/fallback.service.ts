/**
 * Fallback service for handling API failures with caching and fallback strategies
 * Integrates with ErrorHandlerService for comprehensive error management
 */

import { ErrorHandlerService, ErrorContext } from './error-handler.service';
import { ApiError } from './funifier-api-client';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface FallbackOptions<T> {
  cacheKey: string;
  cacheDuration?: number; // in milliseconds
  fallbackData?: T;
  onError?: (error: Error) => void;
  errorContext?: ErrorContext;
  retryOnError?: boolean;
  staleWhileRevalidate?: boolean;
}

export class FallbackService {
  private static readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100;
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get data with comprehensive fallback strategy
   */
  async getWithFallback<T>(
    fetcher: () => Promise<T>,
    options: FallbackOptions<T>
  ): Promise<T> {
    const {
      cacheKey,
      cacheDuration = FallbackService.DEFAULT_CACHE_DURATION,
      fallbackData,
      onError,
      errorContext,
      retryOnError = false,
      staleWhileRevalidate = false,
    } = options;

    // If stale-while-revalidate is enabled, return cached data immediately if available
    if (staleWhileRevalidate) {
      const cachedData = this.getCache<T>(cacheKey);
      if (cachedData !== null) {
        // Revalidate in background
        this.revalidateInBackground(fetcher, cacheKey, cacheDuration, onError);
        return cachedData;
      }
    }

    try {
      // Try to fetch fresh data with optional retry
      const data = retryOnError
        ? await ErrorHandlerService.withRetry(() => fetcher(), {}, errorContext)
        : await fetcher();
      
      // Cache the successful result
      this.setCache(cacheKey, data, cacheDuration);
      
      return data;
    } catch (error) {
      // Handle error with ErrorHandlerService
      const apiError = error as ApiError;
      
      if (onError) {
        onError(error as Error);
      } else {
        ErrorHandlerService.logError(apiError, {
          operation: 'getWithFallback',
          cacheKey,
          ...errorContext,
        });
      }

      // Try to get from cache (even if expired, it's better than nothing)
      const cachedData = this.getCacheIncludingExpired<T>(cacheKey);
      if (cachedData !== null) {
        console.info(`Using cached data for ${cacheKey} (may be stale)`);
        return cachedData;
      }

      // Use fallback data if available
      if (fallbackData !== undefined) {
        console.info(`Using fallback data for ${cacheKey}`);
        return fallbackData;
      }

      // No fallback available, throw the error
      throw error;
    }
  }

  /**
   * Revalidate data in background
   */
  private async revalidateInBackground<T>(
    fetcher: () => Promise<T>,
    cacheKey: string,
    cacheDuration: number,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const freshData = await fetcher();
      this.setCache(cacheKey, freshData, cacheDuration);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        console.warn(`Background revalidation failed for ${cacheKey}:`, error);
      }
    }
  }

  /**
   * Get cache data even if expired (for emergency fallback)
   */
  private getCacheIncludingExpired<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : null;
  }

  /**
   * Set data in cache with metadata
   */
  setCache<T>(
    key: string,
    data: T,
    duration: number = FallbackService.DEFAULT_CACHE_DURATION,
    metadata?: Record<string, unknown>
  ): void {
    // Implement simple LRU by removing oldest entries if cache is full
    if (this.cache.size >= FallbackService.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
      version: this.generateVersion(),
      metadata,
    };

    this.cache.set(key, entry);
  }

  /**
   * Generate cache version for tracking
   */
  private generateVersion(): string {
    return `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get data from cache if not expired
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if cache has valid data for a key
   */
  hasValidCache(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && Date.now() <= entry.expiresAt;
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidateCachePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    entries: Array<{ key: string; age: number; expiresIn: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      expiresIn: Math.max(0, entry.expiresAt - now),
    }));

    return {
      size: this.cache.size,
      maxSize: FallbackService.MAX_CACHE_SIZE,
      entries,
    };
  }

  /**
   * Preload data into cache
   */
  async preloadCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    duration?: number
  ): Promise<void> {
    try {
      const data = await fetcher();
      this.setCache(key, data, duration);
    } catch (error) {
      console.warn(`Failed to preload cache for ${key}:`, error);
    }
  }

  /**
   * Get data with stale-while-revalidate strategy
   */
  async getWithStaleWhileRevalidate<T>(
    fetcher: () => Promise<T>,
    options: FallbackOptions<T>
  ): Promise<T> {
    return this.getWithFallback(fetcher, {
      ...options,
      staleWhileRevalidate: true,
    });
  }

  /**
   * Batch get multiple cache keys
   */
  async batchGetWithFallback<T>(
    fetchers: Array<{ key: string; fetcher: () => Promise<T>; fallback?: T }>,
    options: {
      cacheDuration?: number;
      parallel?: boolean;
      errorContext?: ErrorContext;
    } = {}
  ): Promise<Map<string, T>> {
    const { cacheDuration, parallel = true, errorContext } = options;
    const results = new Map<string, T>();

    const fetchOperations = fetchers.map(async ({ key, fetcher, fallback }) => {
      try {
        const data = await this.getWithFallback(fetcher, {
          cacheKey: key,
          cacheDuration,
          fallbackData: fallback,
          errorContext,
        });
        results.set(key, data);
      } catch (error) {
        console.error(`Failed to fetch data for key ${key}:`, error);
      }
    });

    if (parallel) {
      await Promise.allSettled(fetchOperations);
    } else {
      for (const operation of fetchOperations) {
        await operation.catch(() => {
          /* errors already handled */
        });
      }
    }

    return results;
  }

  /**
   * Warm up cache with data
   */
  async warmUpCache<T>(
    entries: Array<{ key: string; fetcher: () => Promise<T>; duration?: number }>
  ): Promise<void> {
    const operations = entries.map(async ({ key, fetcher, duration }) => {
      try {
        const data = await fetcher();
        this.setCache(key, data, duration);
      } catch (error) {
        console.warn(`Failed to warm up cache for ${key}:`, error);
      }
    });

    await Promise.allSettled(operations);
  }

  /**
   * Get cache health metrics
   */
  getCacheHealth(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    hitRate: number;
    averageAge: number;
  } {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    let totalAge = 0;

    this.cache.forEach((entry) => {
      if (now <= entry.expiresAt) {
        validCount++;
      } else {
        expiredCount++;
      }
      totalAge += now - entry.timestamp;
    });

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      hitRate: this.cache.size > 0 ? validCount / this.cache.size : 0,
      averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
    };
  }

  /**
   * Subscribe to cache invalidation events
   */
  onCacheInvalidation(callback: (key: string) => void): () => void {
    // Simple event emitter pattern
    const listeners = (this as any)._invalidationListeners || [];
    listeners.push(callback);
    (this as any)._invalidationListeners = listeners;

    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit cache invalidation event
   */
  private emitInvalidation(key: string): void {
    const listeners = (this as any)._invalidationListeners || [];
    listeners.forEach((callback: (key: string) => void) => {
      try {
        callback(key);
      } catch (error) {
        console.error('Cache invalidation listener error:', error);
      }
    });
  }

  /**
   * Enhanced invalidate cache with event emission
   */
  invalidateCacheWithEvent(key: string): void {
    this.invalidateCache(key);
    this.emitInvalidation(key);
  }

  /**
   * Real-time cache update - update cache and notify listeners
   */
  updateCacheRealtime<T>(
    key: string,
    data: T,
    duration?: number
  ): void {
    this.setCache(key, data, duration);
    this.emitInvalidation(key);
  }

  /**
   * Get cache with real-time update subscription
   */
  async getWithRealtimeUpdate<T>(
    fetcher: () => Promise<T>,
    options: FallbackOptions<T> & {
      onUpdate?: (data: T) => void;
      pollInterval?: number;
    }
  ): Promise<T> {
    const { onUpdate, pollInterval, ...fallbackOptions } = options;

    // Get initial data
    const data = await this.getWithFallback(fetcher, fallbackOptions);

    // Set up polling if requested
    if (pollInterval && onUpdate) {
      const intervalId = setInterval(async () => {
        try {
          const freshData = await fetcher();
          this.setCache(fallbackOptions.cacheKey, freshData, fallbackOptions.cacheDuration);
          onUpdate(freshData);
        } catch (error) {
          console.warn('Real-time update failed:', error);
        }
      }, pollInterval);

      // Store interval ID for cleanup
      if (typeof window !== 'undefined') {
        (window as any).__cachePollingIntervals = (window as any).__cachePollingIntervals || {};
        (window as any).__cachePollingIntervals[fallbackOptions.cacheKey] = intervalId;
      }
    }

    return data;
  }

  /**
   * Stop real-time updates for a cache key
   */
  stopRealtimeUpdates(cacheKey: string): void {
    if (typeof window !== 'undefined' && (window as any).__cachePollingIntervals) {
      const intervalId = (window as any).__cachePollingIntervals[cacheKey];
      if (intervalId) {
        clearInterval(intervalId);
        delete (window as any).__cachePollingIntervals[cacheKey];
      }
    }
  }

  /**
   * Stop all real-time updates
   */
  stopAllRealtimeUpdates(): void {
    if (typeof window !== 'undefined' && (window as any).__cachePollingIntervals) {
      Object.values((window as any).__cachePollingIntervals).forEach((intervalId: any) => {
        clearInterval(intervalId);
      });
      (window as any).__cachePollingIntervals = {};
    }
  }
}

// Singleton instance
export const fallbackService = new FallbackService();
