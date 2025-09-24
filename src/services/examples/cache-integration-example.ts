/**
 * Cache Integration Example
 * 
 * This file demonstrates how to integrate the enhanced caching system
 * with the existing Funifier API services for optimal performance.
 */

import { enhancedCacheManager } from '../enhanced-cache-manager.service';
import { performanceMonitor } from '../performance-monitor.service';
import { useCacheInvalidation } from '@/hooks/useCacheInvalidation';
import { FunifierPlayerStatus, FunifierLeaderboard } from '@/types/funifier';

/**
 * Example: Enhanced Dashboard Service with Caching
 */
export class CachedDashboardService {
  /**
   * Get player dashboard data with intelligent caching
   */
  async getPlayerDashboard(playerId: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      const cacheKey = `dashboard:player:${playerId}`;
      
      const result = await enhancedCacheManager.get(
        cacheKey,
        'dashboard_data',
        async () => {
          // This would be the actual Funifier API call
          const response = await this.fetchPlayerDataFromFunifier(playerId);
          return this.transformDashboardData(response);
        }
      );

      // Record performance metrics
      const loadTime = Date.now() - startTime;
      performanceMonitor.recordDashboardLoadTime('player_dashboard', playerId, loadTime);

      return result;
    } catch (error) {
      console.error('Failed to get player dashboard:', error);
      throw error;
    }
  }

  /**
   * Update player data and invalidate related caches
   */
  async updatePlayerData(playerId: string, updates: any): Promise<void> {
    try {
      // Update data in Funifier
      await this.updatePlayerInFunifier(playerId, updates);

      // Invalidate related caches
      await enhancedCacheManager.invalidate({
        type: 'player_update',
        scope: 'player',
        identifier: playerId,
        metadata: { updates },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to update player data:', error);
      throw error;
    }
  }

  private async fetchPlayerDataFromFunifier(playerId: string): Promise<FunifierPlayerStatus> {
    // Simulate Funifier API call
    const startTime = Date.now();
    
    try {
      // Actual API call would go here
      const response = await fetch(`/api/funifier/player/${playerId}`);
      const data = await response.json();
      
      // Record Funifier API metrics
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordFunifierRequest(`/v3/player/${playerId}`, 'GET', responseTime);
      
      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordFunifierRequest(
        `/v3/player/${playerId}`, 
        'GET', 
        responseTime, 
        error instanceof Error ? error.message : 'unknown_error'
      );
      throw error;
    }
  }

  private transformDashboardData(playerData: FunifierPlayerStatus): any {
    // Transform Funifier data to dashboard format
    return {
      playerId: playerData._id,
      playerName: playerData.name,
      totalPoints: playerData.total_points,
      level: playerData.level_progress,
      challenges: playerData.challenges,
      // ... other transformations
    };
  }

  private async updatePlayerInFunifier(playerId: string, updates: any): Promise<void> {
    // Simulate Funifier API update call
    console.log(`Updating player ${playerId} in Funifier:`, updates);
  }
}

/**
 * Example: Enhanced Ranking Service with Caching
 */
export class CachedRankingService {
  /**
   * Get leaderboard data with caching
   */
  async getLeaderboard(leaderboardId: string): Promise<FunifierLeaderboard> {
    const cacheKey = `ranking:leaderboard:${leaderboardId}`;
    
    return enhancedCacheManager.get(
      cacheKey,
      'ranking_data',
      async () => {
        const startTime = Date.now();
        
        try {
          // Actual Funifier API call
          const response = await this.fetchLeaderboardFromFunifier(leaderboardId);
          
          const responseTime = Date.now() - startTime;
          performanceMonitor.recordFunifierRequest(
            `/v3/leaderboard/${leaderboardId}`, 
            'GET', 
            responseTime
          );
          
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          performanceMonitor.recordFunifierRequest(
            `/v3/leaderboard/${leaderboardId}`, 
            'GET', 
            responseTime,
            error instanceof Error ? error.message : 'unknown_error'
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get personal ranking with contextual caching
   */
  async getPersonalRanking(leaderboardId: string, playerId: string): Promise<any> {
    const startTime = Date.now();
    const cacheKey = `ranking:personal:${leaderboardId}:${playerId}`;
    
    try {
      const result = await enhancedCacheManager.get(
        cacheKey,
        'personal_ranking',
        async () => {
          // Fetch personal ranking data
          return this.fetchPersonalRankingFromFunifier(leaderboardId, playerId);
        }
      );

      // Record performance metrics
      const loadTime = Date.now() - startTime;
      performanceMonitor.recordRankingLoadTime(leaderboardId, 'personal', loadTime);

      return result;
    } catch (error) {
      console.error('Failed to get personal ranking:', error);
      throw error;
    }
  }

  /**
   * Update leaderboard and invalidate caches
   */
  async updateLeaderboard(leaderboardId: string): Promise<void> {
    try {
      // Trigger leaderboard recalculation in Funifier
      await this.recalculateLeaderboardInFunifier(leaderboardId);

      // Invalidate all related caches
      await enhancedCacheManager.invalidate({
        type: 'leaderboard_update',
        scope: 'leaderboard',
        identifier: leaderboardId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to update leaderboard:', error);
      throw error;
    }
  }

  private async fetchLeaderboardFromFunifier(leaderboardId: string): Promise<FunifierLeaderboard> {
    // Simulate API call
    console.log(`Fetching leaderboard ${leaderboardId} from Funifier`);
    return {} as FunifierLeaderboard;
  }

  private async fetchPersonalRankingFromFunifier(leaderboardId: string, playerId: string): Promise<any> {
    // Simulate API call
    console.log(`Fetching personal ranking for player ${playerId} in leaderboard ${leaderboardId}`);
    return {};
  }

  private async recalculateLeaderboardInFunifier(leaderboardId: string): Promise<void> {
    // Simulate API call
    console.log(`Recalculating leaderboard ${leaderboardId} in Funifier`);
  }
}

/**
 * Example: React Component with Cache Invalidation
 */
export function ExampleDashboardComponent({ playerId }: { playerId: string }) {
  const { invalidatePlayer, invalidateAll } = useCacheInvalidation();
  
  const handlePlayerUpdate = async (updates: any) => {
    try {
      // Update player data
      const dashboardService = new CachedDashboardService();
      await dashboardService.updatePlayerData(playerId, updates);
      
      // Cache invalidation is handled automatically by the service
      console.log('Player data updated and cache invalidated');
    } catch (error) {
      console.error('Failed to update player:', error);
    }
  };

  const handleRefreshAll = () => {
    // Manually invalidate all caches
    invalidateAll({ reason: 'manual_refresh' });
  };

  // Component JSX would go here
  return null;
}

/**
 * Example: API Route with Performance Monitoring
 */
export async function exampleApiHandler(request: Request) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const playerId = url.searchParams.get('playerId');
  
  try {
    if (!playerId) {
      throw new Error('Player ID is required');
    }

    const dashboardService = new CachedDashboardService();
    const dashboardData = await dashboardService.getPlayerDashboard(playerId);

    // Record successful API request
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordApiRequest('GET', '/api/dashboard', 200, responseTime);

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Record failed API request
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordApiRequest('GET', '/api/dashboard', 500, responseTime);

    return new Response(
      JSON.stringify({ error: 'Failed to get dashboard data' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Example: Cache Warmup Strategy
 */
export class CacheWarmupStrategy {
  private dashboardService = new CachedDashboardService();
  private rankingService = new CachedRankingService();

  /**
   * Warm up caches for frequently accessed data
   */
  async warmUpFrequentlyAccessedData(): Promise<void> {
    console.log('Starting cache warmup...');
    
    try {
      // Get list of active players (this would come from your data source)
      const activePlayerIds = await this.getActivePlayerIds();
      
      // Get list of active leaderboards
      const activeLeaderboardIds = await this.getActiveLeaderboardIds();

      // Warm up dashboard data for top players
      const topPlayers = activePlayerIds.slice(0, 20);
      await Promise.allSettled(
        topPlayers.map(playerId => 
          this.dashboardService.getPlayerDashboard(playerId)
        )
      );

      // Warm up leaderboard data
      await Promise.allSettled(
        activeLeaderboardIds.map(leaderboardId =>
          this.rankingService.getLeaderboard(leaderboardId)
        )
      );

      console.log('Cache warmup completed');
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  /**
   * Scheduled cache refresh for real-time data
   */
  async schedulePeriodicRefresh(): Promise<void> {
    // Refresh critical data every 2 minutes
    setInterval(async () => {
      try {
        await this.refreshCriticalData();
      } catch (error) {
        console.error('Periodic cache refresh failed:', error);
      }
    }, 2 * 60 * 1000);
  }

  private async getActivePlayerIds(): Promise<string[]> {
    // This would fetch from your data source
    return ['player1', 'player2', 'player3'];
  }

  private async getActiveLeaderboardIds(): Promise<string[]> {
    // This would fetch from your data source
    return ['leaderboard1', 'leaderboard2'];
  }

  private async refreshCriticalData(): Promise<void> {
    // Invalidate and refresh critical data
    await enhancedCacheManager.invalidate({
      type: 'manual',
      scope: 'global',
      metadata: { reason: 'periodic_refresh' },
      timestamp: new Date()
    });
  }
}

/**
 * Example: Performance Monitoring Dashboard
 */
export class PerformanceMonitoringDashboard {
  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    const cacheReport = await enhancedCacheManager.getPerformanceReport();
    const performanceMetrics = performanceMonitor.getMetrics();
    const alerts = performanceMonitor.getUnresolvedAlerts();

    return {
      cache: cacheReport,
      performance: performanceMetrics,
      alerts,
      summary: {
        overallHealth: this.calculateOverallHealth(cacheReport, performanceMetrics, alerts),
        recommendations: this.generateRecommendations(cacheReport, performanceMetrics, alerts)
      }
    };
  }

  private calculateOverallHealth(cacheReport: any, performanceMetrics: any, alerts: any[]): string {
    const criticalAlerts = alerts.filter(a => a.type === 'critical').length;
    const cacheHitRate = cacheReport.overall.hitRate;
    const avgResponseTime = performanceMetrics.apiResponseTime;

    if (criticalAlerts > 0) return 'critical';
    if (cacheHitRate < 70 || avgResponseTime > 3000) return 'warning';
    return 'healthy';
  }

  private generateRecommendations(cacheReport: any, performanceMetrics: any, alerts: any[]): string[] {
    const recommendations: string[] = [];

    if (cacheReport.overall.hitRate < 80) {
      recommendations.push('Consider increasing cache TTL values or implementing cache preloading');
    }

    if (performanceMetrics.apiResponseTime > 2000) {
      recommendations.push('API response times are high. Consider optimizing database queries or adding more cache layers');
    }

    if (alerts.length > 5) {
      recommendations.push('Multiple performance alerts detected. Review system resources and configuration');
    }

    return recommendations;
  }
}

// Export usage examples
export const examples = {
  dashboardService: new CachedDashboardService(),
  rankingService: new CachedRankingService(),
  warmupStrategy: new CacheWarmupStrategy(),
  performanceDashboard: new PerformanceMonitoringDashboard()
};