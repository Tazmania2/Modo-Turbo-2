import { redisCacheService } from './redis-cache.service';
import { dashboardCacheService } from './dashboard-cache.service';
import { rankingCacheService } from './ranking-cache.service';
import { performanceMonitor } from './performance-monitor.service';
import { whiteLabelConfigCache } from '@/utils/cache';

export interface CacheStrategy {
  name: string;
  ttl: number;
  useRedis: boolean;
  useMemory: boolean;
  compressionEnabled: boolean;
  invalidationRules: string[];
}

export interface CacheInvalidationEvent {
  type: 'player_update' | 'team_change' | 'leaderboard_update' | 'config_change' | 'manual';
  scope: 'global' | 'player' | 'team' | 'leaderboard' | 'config';
  identifier?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface CacheWarmupConfig {
  enabled: boolean;
  strategies: {
    dashboard: boolean;
    ranking: boolean;
    config: boolean;
  };
  schedules: {
    startup: boolean;
    periodic: boolean;
    intervalMinutes: number;
  };
  preloadData: {
    topPlayers: number;
    activeLeaderboards: boolean;
    recentConfigs: boolean;
  };
}

export interface CachePerformanceReport {
  overall: {
    hitRate: number;
    missRate: number;
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
  };
  byService: {
    redis: {
      connected: boolean;
      hitRate: number;
      responseTime: number;
      errorCount: number;
    };
    dashboard: {
      hitRate: number;
      totalEntries: number;
      invalidations: number;
    };
    ranking: {
      hitRate: number;
      totalEntries: number;
      memoryUsage: number;
    };
    config: {
      hitRate: number;
      totalEntries: number;
      size: number;
    };
  };
  recommendations: string[];
}

/**
 * Enhanced Cache Manager Service
 * Orchestrates all caching layers with intelligent strategies and performance optimization
 */
export class EnhancedCacheManagerService {
  private static instance: EnhancedCacheManagerService;
  
  private strategies: Map<string, CacheStrategy>;
  private warmupConfig: CacheWarmupConfig;
  private invalidationQueue: CacheInvalidationEvent[];
  private isProcessingInvalidation = false;
  
  private constructor() {
    this.strategies = new Map();
    this.invalidationQueue = [];
    
    this.warmupConfig = {
      enabled: true,
      strategies: {
        dashboard: true,
        ranking: true,
        config: true
      },
      schedules: {
        startup: true,
        periodic: true,
        intervalMinutes: 30
      },
      preloadData: {
        topPlayers: 50,
        activeLeaderboards: true,
        recentConfigs: true
      }
    };
    
    this.initializeStrategies();
    this.startInvalidationProcessor();
    this.startPeriodicTasks();
  }

  static getInstance(): EnhancedCacheManagerService {
    if (!EnhancedCacheManagerService.instance) {
      EnhancedCacheManagerService.instance = new EnhancedCacheManagerService();
    }
    return EnhancedCacheManagerService.instance;
  }

  /**
   * Initialize cache strategies
   */
  private initializeStrategies(): void {
    // Dashboard data strategy
    this.strategies.set('dashboard_data', {
      name: 'Dashboard Data',
      ttl: 300, // 5 minutes
      useRedis: true,
      useMemory: true,
      compressionEnabled: false,
      invalidationRules: ['player_update', 'team_change']
    });

    // Ranking data strategy
    this.strategies.set('ranking_data', {
      name: 'Ranking Data',
      ttl: 120, // 2 minutes
      useRedis: true,
      useMemory: true,
      compressionEnabled: true,
      invalidationRules: ['leaderboard_update', 'player_update']
    });

    // Personal ranking strategy
    this.strategies.set('personal_ranking', {
      name: 'Personal Ranking',
      ttl: 60, // 1 minute
      useRedis: true,
      useMemory: false,
      compressionEnabled: false,
      invalidationRules: ['player_update', 'leaderboard_update']
    });

    // Configuration strategy
    this.strategies.set('config_data', {
      name: 'Configuration Data',
      ttl: 600, // 10 minutes
      useRedis: true,
      useMemory: true,
      compressionEnabled: false,
      invalidationRules: ['config_change']
    });

    // History data strategy
    this.strategies.set('history_data', {
      name: 'History Data',
      ttl: 1800, // 30 minutes
      useRedis: true,
      useMemory: false,
      compressionEnabled: true,
      invalidationRules: ['manual']
    });

    // Leaderboard list strategy
    this.strategies.set('leaderboard_list', {
      name: 'Leaderboard List',
      ttl: 300, // 5 minutes
      useRedis: true,
      useMemory: true,
      compressionEnabled: false,
      invalidationRules: ['leaderboard_update', 'config_change']
    });
  }

  /**
   * Get data with intelligent caching strategy
   */
  async get<T>(
    key: string, 
    strategyName: string, 
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const strategy = this.strategies.get(strategyName);
    
    if (!strategy) {
      throw new Error(`Unknown cache strategy: ${strategyName}`);
    }

    try {
      // Try Redis first if enabled
      if (strategy.useRedis && redisCacheService.isRedisConnected()) {
        const redisData = await redisCacheService.get<T>(key);
        if (redisData !== null) {
          const responseTime = Date.now() - startTime;
          performanceMonitor.recordCacheHit('redis', strategyName, responseTime);
          return redisData;
        }
      }

      // Try memory cache if enabled
      if (strategy.useMemory) {
        const memoryData = await this.getFromMemoryCache<T>(key, strategyName);
        if (memoryData !== null) {
          const responseTime = Date.now() - startTime;
          performanceMonitor.recordCacheHit('memory', strategyName, responseTime);
          
          // Backfill Redis if connected
          if (strategy.useRedis && redisCacheService.isRedisConnected()) {
            await redisCacheService.set(key, memoryData, strategy.ttl);
          }
          
          return memoryData;
        }
      }

      // Cache miss - fetch data
      performanceMonitor.recordCacheMiss('all', strategyName);
      const data = await fetchFunction();
      
      // Store in caches according to strategy
      await this.set(key, data, strategyName);
      
      return data;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      // Fallback to direct fetch
      return await fetchFunction();
    }
  }

  /**
   * Set data in caches according to strategy
   */
  async set<T>(key: string, data: T, strategyName: string): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    
    if (!strategy) {
      throw new Error(`Unknown cache strategy: ${strategyName}`);
    }

    const promises: Promise<any>[] = [];

    // Set in Redis if enabled
    if (strategy.useRedis) {
      promises.push(redisCacheService.set(key, data, strategy.ttl));
    }

    // Set in memory cache if enabled
    if (strategy.useMemory) {
      promises.push(this.setInMemoryCache(key, data, strategyName, strategy.ttl));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Delete data from all caches
   */
  async delete(key: string, strategyName?: string): Promise<void> {
    const promises: Promise<any>[] = [];

    // Delete from Redis
    promises.push(redisCacheService.delete(key));

    // Delete from memory caches
    if (!strategyName || this.shouldUseMemoryCache(strategyName)) {
      promises.push(this.deleteFromMemoryCache(key, strategyName));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate cache based on event
   */
  async invalidate(event: CacheInvalidationEvent): Promise<void> {
    this.invalidationQueue.push(event);
    
    if (!this.isProcessingInvalidation) {
      await this.processInvalidationQueue();
    }
  }

  /**
   * Warm up caches with frequently accessed data
   */
  async warmUpCaches(): Promise<void> {
    if (!this.warmupConfig.enabled) {
      return;
    }

    console.log('Starting cache warmup...');
    const startTime = Date.now();

    try {
      const promises: Promise<void>[] = [];

      // Warm up dashboard cache
      if (this.warmupConfig.strategies.dashboard) {
        promises.push(this.warmUpDashboardCache());
      }

      // Warm up ranking cache
      if (this.warmupConfig.strategies.ranking) {
        promises.push(this.warmUpRankingCache());
      }

      // Warm up config cache
      if (this.warmupConfig.strategies.config) {
        promises.push(this.warmUpConfigCache());
      }

      await Promise.allSettled(promises);
      
      const duration = Date.now() - startTime;
      console.log(`Cache warmup completed in ${duration}ms`);
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(): Promise<CachePerformanceReport> {
    const redisMetrics = redisCacheService.getMetrics();
    const dashboardStats = dashboardCacheService.getCacheStats();
    const rankingStats = rankingCacheService.getCacheStats();
    const configStats = whiteLabelConfigCache.getStats();

    // Calculate overall metrics
    const totalRequests = redisMetrics.hits + redisMetrics.misses + 
                         dashboardStats.totalEntries + rankingStats.totalEntries;
    const totalHits = redisMetrics.hits + 
                     (dashboardStats.hitRate / 100) * dashboardStats.totalEntries +
                     (rankingStats.hitRate / 100) * rankingStats.totalEntries;
    
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const overallMissRate = 100 - overallHitRate;

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      redisMetrics,
      dashboardStats,
      rankingStats,
      configStats
    });

    return {
      overall: {
        hitRate: Math.round(overallHitRate * 100) / 100,
        missRate: Math.round(overallMissRate * 100) / 100,
        averageResponseTime: redisMetrics.averageResponseTime,
        totalRequests,
        errorRate: redisMetrics.errorRate
      },
      byService: {
        redis: {
          connected: redisMetrics.isRedisConnected,
          hitRate: redisMetrics.hitRate,
          responseTime: redisMetrics.averageResponseTime,
          errorCount: redisMetrics.errors
        },
        dashboard: {
          hitRate: dashboardStats.hitRate,
          totalEntries: dashboardStats.totalEntries,
          invalidations: 0 // Would need to track this
        },
        ranking: {
          hitRate: rankingStats.hitRate,
          totalEntries: rankingStats.totalEntries,
          memoryUsage: rankingStats.memoryUsage
        },
        config: {
          hitRate: 0, // Would need to implement hit tracking
          totalEntries: configStats.size,
          size: configStats.size
        }
      },
      recommendations
    };
  }

  /**
   * Update cache strategies
   */
  updateStrategy(strategyName: string, updates: Partial<CacheStrategy>): void {
    const existing = this.strategies.get(strategyName);
    if (existing) {
      this.strategies.set(strategyName, { ...existing, ...updates });
    }
  }

  /**
   * Update warmup configuration
   */
  updateWarmupConfig(config: Partial<CacheWarmupConfig>): void {
    this.warmupConfig = { ...this.warmupConfig, ...config };
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    const promises = [
      redisCacheService.clear(),
      dashboardCacheService.invalidate('global'),
      rankingCacheService.clearRankingCache(),
      whiteLabelConfigCache.clear()
    ];

    await Promise.allSettled(promises);
  }

  /**
   * Get data from appropriate memory cache
   */
  private async getFromMemoryCache<T>(key: string, strategyName: string): Promise<T | null> {
    // Route to appropriate memory cache based on key pattern
    if (key.startsWith('dashboard:')) {
      // Use dashboard cache service
      return null; // Would need to implement generic get method
    } else if (key.startsWith('ranking:')) {
      // Use ranking cache service
      return null; // Would need to implement generic get method
    } else if (key.startsWith('config:')) {
      return whiteLabelConfigCache.get<T>(key);
    }
    
    return null;
  }

  /**
   * Set data in appropriate memory cache
   */
  private async setInMemoryCache<T>(
    key: string, 
    data: T, 
    strategyName: string, 
    ttl: number
  ): Promise<void> {
    // Route to appropriate memory cache based on key pattern
    if (key.startsWith('config:')) {
      whiteLabelConfigCache.set(key, data, ttl);
    }
    // Other caches would need generic set methods
  }

  /**
   * Delete from appropriate memory cache
   */
  private async deleteFromMemoryCache(key: string, strategyName?: string): Promise<void> {
    if (key.startsWith('config:')) {
      whiteLabelConfigCache.delete(key);
    }
    // Other caches would need generic delete methods
  }

  /**
   * Check if strategy should use memory cache
   */
  private shouldUseMemoryCache(strategyName: string): boolean {
    const strategy = this.strategies.get(strategyName);
    return strategy?.useMemory ?? false;
  }

  /**
   * Process invalidation queue
   */
  private async processInvalidationQueue(): Promise<void> {
    if (this.isProcessingInvalidation || this.invalidationQueue.length === 0) {
      return;
    }

    this.isProcessingInvalidation = true;

    try {
      while (this.invalidationQueue.length > 0) {
        const event = this.invalidationQueue.shift()!;
        await this.processInvalidationEvent(event);
      }
    } finally {
      this.isProcessingInvalidation = false;
    }
  }

  /**
   * Process single invalidation event
   */
  private async processInvalidationEvent(event: CacheInvalidationEvent): Promise<void> {
    console.log(`Processing cache invalidation: ${event.type} - ${event.scope}`);

    switch (event.scope) {
      case 'global':
        await this.clearAllCaches();
        break;
        
      case 'player':
        if (event.identifier) {
          await this.invalidatePlayerData(event.identifier);
        }
        break;
        
      case 'team':
        if (event.identifier) {
          await this.invalidateTeamData(event.identifier);
        }
        break;
        
      case 'leaderboard':
        if (event.identifier) {
          await this.invalidateLeaderboardData(event.identifier);
        }
        break;
        
      case 'config':
        await this.invalidateConfigData();
        break;
    }
  }

  /**
   * Invalidate player-specific data
   */
  private async invalidatePlayerData(playerId: string): Promise<void> {
    const promises = [
      redisCacheService.deletePattern(`*player:${playerId}*`),
      dashboardCacheService.invalidate('player', playerId),
      rankingCacheService.invalidatePlayerRanking(playerId)
    ];

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate team-specific data
   */
  private async invalidateTeamData(teamName: string): Promise<void> {
    const promises = [
      redisCacheService.deletePattern(`*team:${teamName}*`),
      dashboardCacheService.invalidate('team', teamName)
    ];

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate leaderboard-specific data
   */
  private async invalidateLeaderboardData(leaderboardId: string): Promise<void> {
    const promises = [
      redisCacheService.deletePattern(`*leaderboard:${leaderboardId}*`),
      rankingCacheService.invalidateLeaderboard(leaderboardId)
    ];

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate configuration data
   */
  private async invalidateConfigData(): Promise<void> {
    const promises = [
      redisCacheService.deletePattern(`*config:*`),
      whiteLabelConfigCache.clear()
    ];

    await Promise.allSettled(promises);
  }

  /**
   * Warm up dashboard cache
   */
  private async warmUpDashboardCache(): Promise<void> {
    // Implementation would depend on available data sources
    console.log('Warming up dashboard cache...');
  }

  /**
   * Warm up ranking cache
   */
  private async warmUpRankingCache(): Promise<void> {
    // Implementation would depend on available data sources
    console.log('Warming up ranking cache...');
  }

  /**
   * Warm up config cache
   */
  private async warmUpConfigCache(): Promise<void> {
    // Implementation would depend on available data sources
    console.log('Warming up config cache...');
  }

  /**
   * Start invalidation processor
   */
  private startInvalidationProcessor(): void {
    // Process invalidation queue every 5 seconds
    setInterval(() => {
      if (this.invalidationQueue.length > 0) {
        this.processInvalidationQueue();
      }
    }, 5000);
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    // Periodic cache warmup
    if (this.warmupConfig.schedules.periodic) {
      setInterval(() => {
        this.warmUpCaches();
      }, this.warmupConfig.schedules.intervalMinutes * 60 * 1000);
    }

    // Cleanup expired entries every 10 minutes
    setInterval(() => {
      redisCacheService.cleanupFallbackCache();
      dashboardCacheService.performMaintenance();
    }, 10 * 60 * 1000);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    // Redis connection recommendations
    if (!metrics.redisMetrics.isRedisConnected) {
      recommendations.push('Redis is not connected. Consider checking Redis configuration or using memory-only caching.');
    }

    // Hit rate recommendations
    if (metrics.redisMetrics.hitRate < 70) {
      recommendations.push('Redis hit rate is low. Consider increasing TTL values or improving cache key strategies.');
    }

    if (metrics.dashboardStats.hitRate < 80) {
      recommendations.push('Dashboard cache hit rate is low. Consider pre-loading frequently accessed data.');
    }

    // Memory usage recommendations
    if (metrics.rankingStats.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('Ranking cache memory usage is high. Consider enabling compression or reducing cache size.');
    }

    // Error rate recommendations
    if (metrics.redisMetrics.errorRate > 5) {
      recommendations.push('High Redis error rate detected. Check Redis server health and network connectivity.');
    }

    // Performance recommendations
    if (metrics.redisMetrics.averageResponseTime > 100) {
      recommendations.push('Redis response time is high. Consider optimizing queries or checking network latency.');
    }

    return recommendations;
  }
}

// Export singleton instance
export const enhancedCacheManager = EnhancedCacheManagerService.getInstance();