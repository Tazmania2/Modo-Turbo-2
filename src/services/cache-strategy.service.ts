/**
 * Cache Strategy Service - Advanced caching strategies for Funifier data
 * 
 * Provides:
 * - Smart cache invalidation based on data types
 * - Real-time data update strategies
 * - Cache warming and preloading
 * - Cache synchronization across tabs
 */

import { fallbackService } from './fallback.service';

export enum CacheStrategy {
  /** Cache for a long time, rarely changes */
  STATIC = 'STATIC',
  /** Cache for moderate time, changes occasionally */
  MODERATE = 'MODERATE',
  /** Cache for short time, changes frequently */
  DYNAMIC = 'DYNAMIC',
  /** Always fetch fresh, use cache as fallback only */
  REALTIME = 'REALTIME',
  /** Never cache */
  NO_CACHE = 'NO_CACHE',
}

export interface CacheConfig {
  strategy: CacheStrategy;
  duration?: number;
  staleWhileRevalidate?: boolean;
  invalidateOn?: string[];
}

/**
 * Cache configuration for different data types
 */
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // White label configuration - rarely changes
  whiteLabelConfig: {
    strategy: CacheStrategy.STATIC,
    duration: 30 * 60 * 1000, // 30 minutes
    staleWhileRevalidate: true,
    invalidateOn: ['whiteLabelUpdate'],
  },

  // User profile - changes occasionally
  userProfile: {
    strategy: CacheStrategy.MODERATE,
    duration: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    invalidateOn: ['userUpdate', 'profileUpdate'],
  },

  // Dashboard data - changes frequently
  userDashboard: {
    strategy: CacheStrategy.DYNAMIC,
    duration: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
    invalidateOn: ['userUpdate', 'achievementEarned', 'pointsAwarded'],
  },

  // Ranking data - changes very frequently
  ranking: {
    strategy: CacheStrategy.REALTIME,
    duration: 1 * 60 * 1000, // 1 minute
    staleWhileRevalidate: true,
    invalidateOn: ['rankingUpdate', 'pointsAwarded'],
  },

  // Admin verification - moderate caching
  adminVerification: {
    strategy: CacheStrategy.MODERATE,
    duration: 10 * 60 * 1000, // 10 minutes
    staleWhileRevalidate: false,
    invalidateOn: ['roleUpdate', 'permissionUpdate'],
  },
};

/**
 * Cache Strategy Service
 */
export class CacheStrategyService {
  private eventListeners: Map<string, Set<() => void>> = new Map();
  private crossTabChannel: BroadcastChannel | null = null;

  constructor() {
    this.initializeCrossTabSync();
  }

  /**
   * Initialize cross-tab cache synchronization
   */
  private initializeCrossTabSync(): void {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }

    try {
      this.crossTabChannel = new BroadcastChannel('funifier_cache_sync');
      
      this.crossTabChannel.onmessage = (event) => {
        const { type, key, pattern } = event.data;
        
        if (type === 'invalidate') {
          if (key) {
            fallbackService.invalidateCache(key);
          } else if (pattern) {
            fallbackService.invalidateCachePattern(pattern);
          }
        } else if (type === 'clear') {
          fallbackService.clearCache();
        }
      };
    } catch (error) {
      console.warn('Failed to initialize cross-tab sync:', error);
    }
  }

  /**
   * Get cache configuration for a data type
   */
  getCacheConfig(dataType: string): CacheConfig {
    return CACHE_CONFIGS[dataType] || {
      strategy: CacheStrategy.MODERATE,
      duration: 5 * 60 * 1000,
      staleWhileRevalidate: true,
    };
  }

  /**
   * Get cache duration based on strategy
   */
  getCacheDuration(strategy: CacheStrategy): number {
    switch (strategy) {
      case CacheStrategy.STATIC:
        return 30 * 60 * 1000; // 30 minutes
      case CacheStrategy.MODERATE:
        return 5 * 60 * 1000; // 5 minutes
      case CacheStrategy.DYNAMIC:
        return 2 * 60 * 1000; // 2 minutes
      case CacheStrategy.REALTIME:
        return 1 * 60 * 1000; // 1 minute
      case CacheStrategy.NO_CACHE:
        return 0;
      default:
        return 5 * 60 * 1000;
    }
  }

  /**
   * Invalidate cache based on event
   */
  invalidateByEvent(eventType: string): void {
    // Find all cache configs that should be invalidated by this event
    Object.entries(CACHE_CONFIGS).forEach(([dataType, config]) => {
      if (config.invalidateOn?.includes(eventType)) {
        // Invalidate all caches of this data type
        fallbackService.invalidateCachePattern(`.*${dataType}.*`);
      }
    });

    // Notify other tabs
    this.broadcastInvalidation(eventType);

    // Trigger event listeners
    this.triggerEventListeners(eventType);
  }

  /**
   * Broadcast cache invalidation to other tabs
   */
  private broadcastInvalidation(eventType: string): void {
    if (this.crossTabChannel) {
      try {
        this.crossTabChannel.postMessage({
          type: 'invalidate',
          pattern: `.*${eventType}.*`,
        });
      } catch (error) {
        console.warn('Failed to broadcast invalidation:', error);
      }
    }
  }

  /**
   * Subscribe to cache invalidation events
   */
  onInvalidation(eventType: string, callback: () => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Trigger event listeners
   */
  private triggerEventListeners(eventType: string): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  /**
   * Warm up cache with commonly accessed data
   */
  async warmUpCache(operations: Array<{
    key: string;
    fetcher: () => Promise<any>;
    dataType: string;
  }>): Promise<void> {
    const warmUpPromises = operations.map(async ({ key, fetcher, dataType }) => {
      try {
        const config = this.getCacheConfig(dataType);
        const data = await fetcher();
        fallbackService.setCache(key, data, config.duration);
      } catch (error) {
        console.warn(`Failed to warm up cache for ${key}:`, error);
      }
    });

    await Promise.allSettled(warmUpPromises);
  }

  /**
   * Preload critical data
   */
  async preloadCriticalData(userId: string, operations: {
    getUserProfile?: () => Promise<any>;
    getUserDashboard?: () => Promise<any>;
    getWhiteLabelConfig?: () => Promise<any>;
  }): Promise<void> {
    const preloadOps: Array<{
      key: string;
      fetcher: () => Promise<any>;
      dataType: string;
    }> = [];

    if (operations.getUserProfile) {
      preloadOps.push({
        key: `user_profile_${userId}`,
        fetcher: operations.getUserProfile,
        dataType: 'userProfile',
      });
    }

    if (operations.getUserDashboard) {
      preloadOps.push({
        key: `user_dashboard_${userId}`,
        fetcher: operations.getUserDashboard,
        dataType: 'userDashboard',
      });
    }

    if (operations.getWhiteLabelConfig) {
      preloadOps.push({
        key: 'white_label_config',
        fetcher: operations.getWhiteLabelConfig,
        dataType: 'whiteLabelConfig',
      });
    }

    await this.warmUpCache(preloadOps);
  }

  /**
   * Invalidate user-specific caches
   */
  invalidateUserCaches(userId: string): void {
    fallbackService.invalidateCachePattern(`user_.*_${userId}`);
    this.broadcastUserInvalidation(userId);
  }

  /**
   * Broadcast user cache invalidation to other tabs
   */
  private broadcastUserInvalidation(userId: string): void {
    if (this.crossTabChannel) {
      try {
        this.crossTabChannel.postMessage({
          type: 'invalidate',
          pattern: `user_.*_${userId}`,
        });
      } catch (error) {
        console.warn('Failed to broadcast user invalidation:', error);
      }
    }
  }

  /**
   * Clear all caches and notify other tabs
   */
  clearAllCaches(): void {
    fallbackService.clearCache();
    
    if (this.crossTabChannel) {
      try {
        this.crossTabChannel.postMessage({ type: 'clear' });
      } catch (error) {
        console.warn('Failed to broadcast cache clear:', error);
      }
    }
  }

  /**
   * Get cache health metrics
   */
  getCacheHealth() {
    return fallbackService.getCacheHealth();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return fallbackService.getCacheStats();
  }

  /**
   * Optimize cache by removing expired entries
   */
  optimizeCache(): void {
    const stats = fallbackService.getCacheStats();
    
    // Remove expired entries
    stats.entries.forEach((entry) => {
      if (entry.expiresIn <= 0) {
        fallbackService.invalidateCache(entry.key);
      }
    });
  }

  /**
   * Schedule periodic cache optimization
   */
  scheduleOptimization(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
    return setInterval(() => {
      this.optimizeCache();
    }, intervalMs);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.crossTabChannel) {
      this.crossTabChannel.close();
      this.crossTabChannel = null;
    }
    
    this.eventListeners.clear();
    fallbackService.stopAllRealtimeUpdates();
  }
}

// Singleton instance
export const cacheStrategyService = new CacheStrategyService();
