import { WhiteLabelConfiguration } from '@/types/funifier';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
}

/**
 * In-memory cache implementation for configuration data
 */
export class ConfigurationCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, entry);
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Update TTL for an existing entry
   */
  updateTTL(key: string, newTTL: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    entry.ttl = newTTL;
    entry.timestamp = Date.now(); // Reset timestamp
    return true;
  }
}

/**
 * Specialized cache for white-label configurations
 */
export class WhiteLabelConfigCache extends ConfigurationCache {
  private static instance: WhiteLabelConfigCache;

  private constructor() {
    super({
      ttl: 10 * 60 * 1000, // 10 minutes for config data
      maxSize: 50
    });
  }

  static getInstance(): WhiteLabelConfigCache {
    if (!WhiteLabelConfigCache.instance) {
      WhiteLabelConfigCache.instance = new WhiteLabelConfigCache();
    }
    return WhiteLabelConfigCache.instance;
  }

  /**
   * Cache configuration by instance ID
   */
  setConfiguration(instanceId: string, config: WhiteLabelConfiguration): void {
    this.set(`config:${instanceId}`, config);
  }

  /**
   * Get cached configuration by instance ID
   */
  getConfiguration(instanceId: string): WhiteLabelConfiguration | null {
    return this.get<WhiteLabelConfiguration>(`config:${instanceId}`);
  }

  /**
   * Cache setup status
   */
  setSetupStatus(instanceId: string, isSetup: boolean): void {
    this.set(`setup:${instanceId}`, isSetup, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Get cached setup status
   */
  getSetupStatus(instanceId: string): boolean | null {
    return this.get<boolean>(`setup:${instanceId}`);
  }

  /**
   * Cache validation results
   */
  setValidationResult(configHash: string, result: any): void {
    this.set(`validation:${configHash}`, result, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get cached validation result
   */
  getValidationResult(configHash: string): any | null {
    return this.get(`validation:${configHash}`);
  }

  /**
   * Invalidate all cache entries for a specific instance
   */
  invalidateInstance(instanceId: string): void {
    const keysToDelete = Array.from(this.getStats().keys).filter(key => 
      key.includes(instanceId)
    );
    
    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Cache Funifier connection status
   */
  setConnectionStatus(instanceId: string, isConnected: boolean): void {
    this.set(`connection:${instanceId}`, isConnected, 2 * 60 * 1000); // 2 minutes
  }

  /**
   * Get cached connection status
   */
  getConnectionStatus(instanceId: string): boolean | null {
    return this.get<boolean>(`connection:${instanceId}`);
  }
}

// Export singleton instance
export const whiteLabelConfigCache = WhiteLabelConfigCache.getInstance();

/**
 * Persistence layer for cache data (for server restarts)
 */
export class CachePersistence {
  private static readonly STORAGE_KEY = 'whitelabel_cache_backup';

  /**
   * Save cache data to persistent storage (localStorage in browser, file in Node.js)
   */
  static async saveCache(cache: ConfigurationCache): Promise<void> {
    try {
      const cacheData = JSON.stringify({
        timestamp: Date.now(),
        entries: Array.from((cache as any).cache.entries())
      });

      // In a real implementation, this would save to a file or database
      // For now, we'll use a simple in-memory backup
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, cacheData);
      }
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  /**
   * Load cache data from persistent storage
   */
  static async loadCache(cache: ConfigurationCache): Promise<void> {
    try {
      let cacheData: string | null = null;

      if (typeof window !== 'undefined') {
        cacheData = localStorage.getItem(this.STORAGE_KEY);
      }

      if (!cacheData) {
        return;
      }

      const parsed = JSON.parse(cacheData);
      const entries = parsed.entries as [string, CacheEntry<any>][];

      // Restore non-expired entries
      const now = Date.now();
      entries.forEach(([key, entry]) => {
        if (now - entry.timestamp <= entry.ttl) {
          (cache as any).cache.set(key, entry);
        }
      });
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  /**
   * Clear persistent cache storage
   */
  static async clearPersistedCache(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to clear persisted cache:', error);
    }
  }
}

// Export alias for backward compatibility
export const CacheService = ConfigurationCache;