import { ConfigurationCache, CacheEntry } from '@/utils/cache';
import { DashboardData, PlayerPerformance, HistoryData } from '@/types/dashboard';
import { ProcessedDashboardData } from './dashboard-processor.service';
import { DashboardMetrics } from './dashboard-data-transformer.service';
import { TeamDashboardData } from './team-processor.service';

export interface DashboardCacheConfig {
  dashboardDataTTL: number;
  playerPerformanceTTL: number;
  teamDataTTL: number;
  historyDataTTL: number;
  metricsTTL: number;
  maxCacheSize: number;
  enablePersistence: boolean;
}

export interface CacheKey {
  type: 'dashboard' | 'performance' | 'team' | 'history' | 'metrics';
  playerId?: string;
  teamName?: string;
  dashboardType?: string;
  timeframe?: string;
  additionalParams?: Record<string, string>;
}

export interface CacheStats {
  totalEntries: number;
  entriesByType: Record<string, number>;
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  cacheSize: number;
  maxSize: number;
}

export interface CacheInvalidationRule {
  id: string;
  name: string;
  triggers: CacheTrigger[];
  scope: 'player' | 'team' | 'global' | 'custom';
  pattern?: string; // Regex pattern for custom scope
}

export interface CacheTrigger {
  event: 'player_update' | 'team_change' | 'leaderboard_update' | 'time_based' | 'manual';
  condition?: string;
  delay?: number; // Delay in milliseconds before invalidation
}

export interface CacheMetrics {
  requests: number;
  hits: number;
  misses: number;
  invalidations: number;
  totalResponseTime: number;
  lastReset: Date;
}

/**
 * Dashboard Cache Service
 * Specialized caching service for dashboard data with intelligent invalidation
 */
export class DashboardCacheService {
  private static instance: DashboardCacheService;
  private cache: ConfigurationCache;
  private config: DashboardCacheConfig;
  private metrics: CacheMetrics;
  private invalidationRules: Map<string, CacheInvalidationRule>;
  private keyIndex: Map<string, Set<string>>; // Index for efficient invalidation

  private constructor(config?: Partial<DashboardCacheConfig>) {
    this.config = {
      dashboardDataTTL: 5 * 60 * 1000, // 5 minutes
      playerPerformanceTTL: 3 * 60 * 1000, // 3 minutes
      teamDataTTL: 10 * 60 * 1000, // 10 minutes
      historyDataTTL: 30 * 60 * 1000, // 30 minutes
      metricsTTL: 15 * 60 * 1000, // 15 minutes
      maxCacheSize: 500,
      enablePersistence: true,
      ...config
    };

    this.cache = new ConfigurationCache({
      ttl: this.config.dashboardDataTTL,
      maxSize: this.config.maxCacheSize
    });

    this.metrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalResponseTime: 0,
      lastReset: new Date()
    };

    this.invalidationRules = new Map();
    this.keyIndex = new Map();
    this.initializeInvalidationRules();
  }

  static getInstance(config?: Partial<DashboardCacheConfig>): DashboardCacheService {
    if (!DashboardCacheService.instance) {
      DashboardCacheService.instance = new DashboardCacheService(config);
    }
    return DashboardCacheService.instance;
  }

  /**
   * Initialize default cache invalidation rules
   */
  private initializeInvalidationRules(): void {
    // Player data update rule
    this.invalidationRules.set('player_update', {
      id: 'player_update',
      name: 'Player Data Update',
      triggers: [
        { event: 'player_update' },
        { event: 'leaderboard_update', delay: 1000 }
      ],
      scope: 'player'
    });

    // Team change rule
    this.invalidationRules.set('team_change', {
      id: 'team_change',
      name: 'Team Membership Change',
      triggers: [
        { event: 'team_change' }
      ],
      scope: 'team'
    });

    // Time-based invalidation for real-time data
    this.invalidationRules.set('realtime_data', {
      id: 'realtime_data',
      name: 'Real-time Data Refresh',
      triggers: [
        { event: 'time_based', delay: 60000 } // Every minute
      ],
      scope: 'custom',
      pattern: '^(dashboard|performance):.*'
    });

    // Global leaderboard updates
    this.invalidationRules.set('global_leaderboard', {
      id: 'global_leaderboard',
      name: 'Global Leaderboard Update',
      triggers: [
        { event: 'leaderboard_update' }
      ],
      scope: 'global'
    });
  }

  /**
   * Generate cache key from CacheKey object
   */
  private generateCacheKey(keyObj: CacheKey): string {
    const parts: string[] = [keyObj.type];
    
    if (keyObj.playerId) parts.push(`player:${keyObj.playerId}`);
    if (keyObj.teamName) parts.push(`team:${keyObj.teamName}`);
    if (keyObj.dashboardType) parts.push(`type:${keyObj.dashboardType}`);
    if (keyObj.timeframe) parts.push(`time:${keyObj.timeframe}`);
    
    if (keyObj.additionalParams) {
      const paramString = Object.entries(keyObj.additionalParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      if (paramString) parts.push(`params:${paramString}`);
    }
    
    return parts.join('|');
  }

  /**
   * Index cache key for efficient invalidation
   */
  private indexCacheKey(key: string, keyObj: CacheKey): void {
    // Index by type
    if (!this.keyIndex.has(keyObj.type)) {
      this.keyIndex.set(keyObj.type, new Set());
    }
    this.keyIndex.get(keyObj.type)!.add(key);

    // Index by player
    if (keyObj.playerId) {
      const playerKey = `player:${keyObj.playerId}`;
      if (!this.keyIndex.has(playerKey)) {
        this.keyIndex.set(playerKey, new Set());
      }
      this.keyIndex.get(playerKey)!.add(key);
    }

    // Index by team
    if (keyObj.teamName) {
      const teamKey = `team:${keyObj.teamName}`;
      if (!this.keyIndex.has(teamKey)) {
        this.keyIndex.set(teamKey, new Set());
      }
      this.keyIndex.get(teamKey)!.add(key);
    }
  }

  /**
   * Remove key from index
   */
  private removeFromIndex(key: string): void {
    for (const [indexKey, keySet] of this.keyIndex.entries()) {
      keySet.delete(key);
      if (keySet.size === 0) {
        this.keyIndex.delete(indexKey);
      }
    }
  }

  /**
   * Get dashboard data from cache
   */
  async getDashboardData(keyObj: CacheKey): Promise<ProcessedDashboardData | null> {
    const startTime = Date.now();
    this.metrics.requests++;
    
    const key = this.generateCacheKey(keyObj);
    const data = this.cache.get<ProcessedDashboardData>(key);
    
    this.metrics.totalResponseTime += Date.now() - startTime;
    
    if (data) {
      this.metrics.hits++;
      return data;
    } else {
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set dashboard data in cache
   */
  async setDashboardData(keyObj: CacheKey, data: ProcessedDashboardData, customTTL?: number): Promise<void> {
    const key = this.generateCacheKey(keyObj);
    const ttl = customTTL || this.config.dashboardDataTTL;
    
    this.cache.set(key, data, ttl);
    this.indexCacheKey(key, keyObj);
  }

  /**
   * Get player performance data from cache
   */
  async getPlayerPerformance(keyObj: CacheKey): Promise<PlayerPerformance | null> {
    const startTime = Date.now();
    this.metrics.requests++;
    
    const key = this.generateCacheKey(keyObj);
    const data = this.cache.get<PlayerPerformance>(key);
    
    this.metrics.totalResponseTime += Date.now() - startTime;
    
    if (data) {
      this.metrics.hits++;
      return data;
    } else {
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set player performance data in cache
   */
  async setPlayerPerformance(keyObj: CacheKey, data: PlayerPerformance, customTTL?: number): Promise<void> {
    const key = this.generateCacheKey(keyObj);
    const ttl = customTTL || this.config.playerPerformanceTTL;
    
    this.cache.set(key, data, ttl);
    this.indexCacheKey(key, keyObj);
  }

  /**
   * Get team dashboard data from cache
   */
  async getTeamData(keyObj: CacheKey): Promise<TeamDashboardData | null> {
    const startTime = Date.now();
    this.metrics.requests++;
    
    const key = this.generateCacheKey(keyObj);
    const data = this.cache.get<TeamDashboardData>(key);
    
    this.metrics.totalResponseTime += Date.now() - startTime;
    
    if (data) {
      this.metrics.hits++;
      return data;
    } else {
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set team dashboard data in cache
   */
  async setTeamData(keyObj: CacheKey, data: TeamDashboardData, customTTL?: number): Promise<void> {
    const key = this.generateCacheKey(keyObj);
    const ttl = customTTL || this.config.teamDataTTL;
    
    this.cache.set(key, data, ttl);
    this.indexCacheKey(key, keyObj);
  }

  /**
   * Get metrics data from cache
   */
  async getMetrics(keyObj: CacheKey): Promise<DashboardMetrics | null> {
    const startTime = Date.now();
    this.metrics.requests++;
    
    const key = this.generateCacheKey(keyObj);
    const data = this.cache.get<DashboardMetrics>(key);
    
    this.metrics.totalResponseTime += Date.now() - startTime;
    
    if (data) {
      this.metrics.hits++;
      return data;
    } else {
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set metrics data in cache
   */
  async setMetrics(keyObj: CacheKey, data: DashboardMetrics, customTTL?: number): Promise<void> {
    const key = this.generateCacheKey(keyObj);
    const ttl = customTTL || this.config.metricsTTL;
    
    this.cache.set(key, data, ttl);
    this.indexCacheKey(key, keyObj);
  }

  /**
   * Get history data from cache
   */
  async getHistoryData(keyObj: CacheKey): Promise<HistoryData | null> {
    const startTime = Date.now();
    this.metrics.requests++;
    
    const key = this.generateCacheKey(keyObj);
    const data = this.cache.get<HistoryData>(key);
    
    this.metrics.totalResponseTime += Date.now() - startTime;
    
    if (data) {
      this.metrics.hits++;
      return data;
    } else {
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set history data in cache
   */
  async setHistoryData(keyObj: CacheKey, data: HistoryData, customTTL?: number): Promise<void> {
    const key = this.generateCacheKey(keyObj);
    const ttl = customTTL || this.config.historyDataTTL;
    
    this.cache.set(key, data, ttl);
    this.indexCacheKey(key, keyObj);
  }

  /**
   * Invalidate cache entries based on scope
   */
  async invalidate(scope: 'player' | 'team' | 'global' | 'custom', identifier?: string, pattern?: string): Promise<number> {
    let invalidatedCount = 0;
    
    switch (scope) {
      case 'player':
        if (identifier) {
          const playerKey = `player:${identifier}`;
          const keysToInvalidate = this.keyIndex.get(playerKey);
          if (keysToInvalidate) {
            keysToInvalidate.forEach(key => {
              this.cache.delete(key);
              this.removeFromIndex(key);
              invalidatedCount++;
            });
          }
        }
        break;
        
      case 'team':
        if (identifier) {
          const teamKey = `team:${identifier}`;
          const keysToInvalidate = this.keyIndex.get(teamKey);
          if (keysToInvalidate) {
            keysToInvalidate.forEach(key => {
              this.cache.delete(key);
              this.removeFromIndex(key);
              invalidatedCount++;
            });
          }
        }
        break;
        
      case 'global':
        invalidatedCount = this.cache.getStats().size;
        this.cache.clear();
        this.keyIndex.clear();
        break;
        
      case 'custom':
        if (pattern) {
          const regex = new RegExp(pattern);
          const allKeys = this.cache.getStats().keys;
          allKeys.forEach(key => {
            if (regex.test(key)) {
              this.cache.delete(key);
              this.removeFromIndex(key);
              invalidatedCount++;
            }
          });
        }
        break;
    }
    
    this.metrics.invalidations += invalidatedCount;
    return invalidatedCount;
  }

  /**
   * Trigger cache invalidation based on event
   */
  async triggerInvalidation(event: CacheTrigger['event'], context?: { playerId?: string; teamName?: string }): Promise<void> {
    for (const rule of this.invalidationRules.values()) {
      const matchingTrigger = rule.triggers.find(trigger => trigger.event === event);
      
      if (matchingTrigger) {
        const delay = matchingTrigger.delay || 0;
        
        setTimeout(async () => {
          let identifier: string | undefined;
          
          switch (rule.scope) {
            case 'player':
              identifier = context?.playerId;
              break;
            case 'team':
              identifier = context?.teamName;
              break;
          }
          
          await this.invalidate(rule.scope, identifier, rule.pattern);
        }, delay);
      }
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(playerIds: string[], teamNames: string[]): Promise<void> {
    // This would typically pre-load frequently accessed data
    // Implementation would depend on the specific data loading services
    console.log(`Warming up cache for ${playerIds.length} players and ${teamNames.length} teams`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const cacheStats = this.cache.getStats();
    const hitRate = this.metrics.requests > 0 ? (this.metrics.hits / this.metrics.requests) * 100 : 0;
    const missRate = this.metrics.requests > 0 ? (this.metrics.misses / this.metrics.requests) * 100 : 0;
    const averageResponseTime = this.metrics.requests > 0 ? this.metrics.totalResponseTime / this.metrics.requests : 0;
    
    // Count entries by type
    const entriesByType: Record<string, number> = {};
    cacheStats.keys.forEach(key => {
      const type = key.split('|')[0];
      entriesByType[type] = (entriesByType[type] || 0) + 1;
    });

    return {
      totalEntries: cacheStats.size,
      entriesByType,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      cacheSize: cacheStats.size,
      maxSize: cacheStats.maxSize
    };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalResponseTime: 0,
      lastReset: new Date()
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<DashboardCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update underlying cache configuration
    if (newConfig.maxCacheSize) {
      // Would need to recreate cache with new size limit
      console.log(`Cache max size updated to ${newConfig.maxCacheSize}`);
    }
  }

  /**
   * Add custom invalidation rule
   */
  addInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.set(rule.id, rule);
  }

  /**
   * Remove invalidation rule
   */
  removeInvalidationRule(ruleId: string): boolean {
    return this.invalidationRules.delete(ruleId);
  }

  /**
   * Get all invalidation rules
   */
  getInvalidationRules(): CacheInvalidationRule[] {
    return Array.from(this.invalidationRules.values());
  }

  /**
   * Perform cache maintenance (cleanup expired entries, optimize index)
   */
  async performMaintenance(): Promise<{
    expiredEntriesRemoved: number;
    indexOptimized: boolean;
  }> {
    // Clean up expired entries
    const expiredEntriesRemoved = this.cache.cleanup();
    
    // Optimize index by removing references to deleted keys
    const currentKeys = new Set(this.cache.getStats().keys);
    let indexOptimized = false;
    
    for (const [indexKey, keySet] of this.keyIndex.entries()) {
      const keysToRemove: string[] = [];
      
      keySet.forEach(key => {
        if (!currentKeys.has(key)) {
          keysToRemove.push(key);
        }
      });
      
      if (keysToRemove.length > 0) {
        keysToRemove.forEach(key => keySet.delete(key));
        indexOptimized = true;
        
        if (keySet.size === 0) {
          this.keyIndex.delete(indexKey);
        }
      }
    }
    
    return {
      expiredEntriesRemoved,
      indexOptimized
    };
  }

  /**
   * Export cache data for backup/migration
   */
  async exportCacheData(): Promise<{
    config: DashboardCacheConfig;
    metrics: CacheMetrics;
    invalidationRules: CacheInvalidationRule[];
    cacheEntries: Array<{ key: string; data: any; timestamp: number; ttl: number }>;
  }> {
    const cacheStats = this.cache.getStats();
    const cacheEntries: Array<{ key: string; data: any; timestamp: number; ttl: number }> = [];
    
    // This would need access to internal cache data structure
    // For now, return structure without actual data
    
    return {
      config: this.config,
      metrics: this.metrics,
      invalidationRules: Array.from(this.invalidationRules.values()),
      cacheEntries
    };
  }

  /**
   * Import cache data from backup
   */
  async importCacheData(data: {
    config?: DashboardCacheConfig;
    invalidationRules?: CacheInvalidationRule[];
    cacheEntries?: Array<{ key: string; data: any; timestamp: number; ttl: number }>;
  }): Promise<void> {
    if (data.config) {
      this.updateConfig(data.config);
    }
    
    if (data.invalidationRules) {
      data.invalidationRules.forEach(rule => {
        this.addInvalidationRule(rule);
      });
    }
    
    if (data.cacheEntries) {
      // Restore cache entries (implementation would depend on cache structure)
      console.log(`Importing ${data.cacheEntries.length} cache entries`);
    }
  }
}

// Export singleton instance
export const dashboardCacheService = DashboardCacheService.getInstance();