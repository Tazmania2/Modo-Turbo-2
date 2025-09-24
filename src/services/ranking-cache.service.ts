import { 
  LeaderboardsResponse, 
  PersonalRankingResponse, 
  GlobalRankingResponse
} from './ranking-leaderboard.service';
import { ProcessedRankingData } from './ranking-data-processor.service';
import { FunifierLeaderboard, FunifierLeader } from '@/types/funifier';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

export interface CacheConfig {
  leaderboardsTTL: number; // Time to live for leaderboards list
  rankingDataTTL: number; // Time to live for ranking data
  personalDataTTL: number; // Time to live for personal ranking data
  globalDataTTL: number; // Time to live for global ranking data
  maxCacheSize: number; // Maximum number of entries
  enableCompression: boolean; // Enable data compression
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export class RankingCacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats = {
    hits: 0,
    misses: 0
  };

  private readonly config: CacheConfig = {
    leaderboardsTTL: 5 * 60 * 1000, // 5 minutes
    rankingDataTTL: 2 * 60 * 1000, // 2 minutes
    personalDataTTL: 1 * 60 * 1000, // 1 minute
    globalDataTTL: 3 * 60 * 1000, // 3 minutes
    maxCacheSize: 1000,
    enableCompression: false
  };

  constructor(customConfig?: Partial<CacheConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Cache leaderboards list
   */
  async cacheLeaderboards(data: LeaderboardsResponse): Promise<void> {
    const key = 'leaderboards:all';
    await this.setCache(key, data, this.config.leaderboardsTTL);
  }

  /**
   * Get cached leaderboards list
   */
  async getCachedLeaderboards(): Promise<LeaderboardsResponse | null> {
    const key = 'leaderboards:all';
    return this.getCache<LeaderboardsResponse>(key);
  }

  /**
   * Cache leaderboard data
   */
  async cacheLeaderboardData(leaderboardId: string, data: FunifierLeaderboard): Promise<void> {
    const key = `leaderboard:${leaderboardId}`;
    await this.setCache(key, data, this.config.rankingDataTTL);
  }

  /**
   * Get cached leaderboard data
   */
  async getCachedLeaderboardData(leaderboardId: string): Promise<FunifierLeaderboard | null> {
    const key = `leaderboard:${leaderboardId}`;
    return this.getCache<FunifierLeaderboard>(key);
  }

  /**
   * Cache leaderboard aggregate results
   */
  async cacheLeaderboardAggregate(
    leaderboardId: string, 
    queryHash: string, 
    data: FunifierLeader[]
  ): Promise<void> {
    const key = `leaderboard:${leaderboardId}:aggregate:${queryHash}`;
    await this.setCache(key, data, this.config.rankingDataTTL);
  }

  /**
   * Get cached leaderboard aggregate results
   */
  async getCachedLeaderboardAggregate(
    leaderboardId: string, 
    queryHash: string
  ): Promise<FunifierLeader[] | null> {
    const key = `leaderboard:${leaderboardId}:aggregate:${queryHash}`;
    return this.getCache<FunifierLeader[]>(key);
  }

  /**
   * Cache personal ranking data
   */
  async cachePersonalRanking(
    leaderboardId: string, 
    playerId: string, 
    data: PersonalRankingResponse
  ): Promise<void> {
    const key = `ranking:personal:${leaderboardId}:${playerId}`;
    await this.setCache(key, data, this.config.personalDataTTL);
  }

  /**
   * Get cached personal ranking data
   */
  async getCachedPersonalRanking(
    leaderboardId: string, 
    playerId: string
  ): Promise<PersonalRankingResponse | null> {
    const key = `ranking:personal:${leaderboardId}:${playerId}`;
    return this.getCache<PersonalRankingResponse>(key);
  }

  /**
   * Cache global ranking data
   */
  async cacheGlobalRanking(leaderboardId: string, data: GlobalRankingResponse): Promise<void> {
    const key = `ranking:global:${leaderboardId}`;
    await this.setCache(key, data, this.config.globalDataTTL);
  }

  /**
   * Get cached global ranking data
   */
  async getCachedGlobalRanking(leaderboardId: string): Promise<GlobalRankingResponse | null> {
    const key = `ranking:global:${leaderboardId}`;
    return this.getCache<GlobalRankingResponse>(key);
  }

  /**
   * Cache processed ranking data
   */
  async cacheProcessedRankingData(
    leaderboardId: string, 
    data: ProcessedRankingData
  ): Promise<void> {
    const key = `ranking:processed:${leaderboardId}`;
    await this.setCache(key, data, this.config.rankingDataTTL);
  }

  /**
   * Get cached processed ranking data
   */
  async getCachedProcessedRankingData(leaderboardId: string): Promise<ProcessedRankingData | null> {
    const key = `ranking:processed:${leaderboardId}`;
    return this.getCache<ProcessedRankingData>(key);
  }

  /**
   * Invalidate all cache entries for a specific leaderboard
   */
  async invalidateLeaderboard(leaderboardId: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(leaderboardId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate personal ranking cache for a specific player
   */
  async invalidatePlayerRanking(playerId: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(`personal:`) && key.includes(playerId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all ranking-related cache
   */
  async clearRankingCache(): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith('leaderboard') || key.startsWith('ranking:')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    const timestamps = entries.map(entry => entry.timestamp);
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      totalEntries: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0 ? 
        (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 : 0,
      missRate: this.stats.hits + this.stats.misses > 0 ? 
        (this.stats.misses / (this.stats.hits + this.stats.misses)) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : now,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : now
    };
  }

  /**
   * Generate hash for query objects to use as cache keys
   */
  generateQueryHash(query: unknown): string {
    return Buffer.from(JSON.stringify(query)).toString('base64').slice(0, 16);
  }

  /**
   * Set cache entry
   */
  private async setCache<T>(key: string, data: T, ttl: number): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      key
    };

    // Check cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldestEntries();
    }

    this.cache.set(key, entry);
  }

  /**
   * Get cache entry
   */
  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    // Clean up every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimation of object size in bytes
      totalSize += JSON.stringify(entry).length * 2; // UTF-16 encoding
    }
    
    return totalSize;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(leaderboardIds: string[]): Promise<void> {
    // This would be called during application startup or when new leaderboards are detected
    // Implementation would fetch and cache the most commonly accessed data
    console.log(`Warming up cache for ${leaderboardIds.length} leaderboards`);
    
    // In a real implementation, you would:
    // 1. Fetch leaderboards list
    // 2. Fetch top leaderboard data
    // 3. Pre-calculate common aggregations
    // 4. Cache the results
  }
}

// Singleton instance
export const rankingCacheService = new RankingCacheService();