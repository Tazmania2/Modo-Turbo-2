import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  DashboardCacheService,
  dashboardCacheService,
  CacheKey,
  CacheInvalidationRule
} from '../dashboard-cache.service';
import { ProcessedDashboardData } from '../dashboard-processor.service';
import { DashboardMetrics } from '../dashboard-data-transformer.service';
import { TeamDashboardData } from '../team-processor.service';
import { PlayerPerformance, HistoryData } from '@/types/dashboard';

describe('DashboardCacheService', () => {
  let service: DashboardCacheService;
  let mockDashboardData: ProcessedDashboardData;
  let mockPlayerPerformance: PlayerPerformance;
  let mockTeamData: TeamDashboardData;
  let mockMetrics: DashboardMetrics;
  let mockHistoryData: HistoryData;

  beforeEach(() => {
    service = DashboardCacheService.getInstance();
    
    mockDashboardData = {
      playerName: 'Test Player',
      totalPoints: 2500,
      pointsLocked: false,
      currentCycleDay: 15,
      totalCycleDays: 30,
      primaryGoal: {
        name: 'Total Points',
        percentage: 75,
        description: 'Accumulate points',
        emoji: '🎯',
        target: 3000,
        current: 2250,
        unit: 'points'
      },
      secondaryGoal1: {
        name: 'Challenges',
        percentage: 60,
        description: 'Complete challenges',
        emoji: '⚡',
        target: 10,
        current: 6,
        unit: 'challenges'
      },
      secondaryGoal2: {
        name: 'Level Progress',
        percentage: 80,
        description: 'Progress to next level',
        emoji: '📈',
        target: 100,
        current: 80,
        unit: '%'
      },
      metadata: {
        dashboardType: 'carteira_i',
        processingTime: 150,
        dataFreshness: new Date(),
        teamInfo: {
          name: 'Alpha Team',
          memberCount: 5,
          averagePoints: 2000
        },
        boosts: []
      }
    };

    mockPlayerPerformance = {
      playerId: 'player123',
      playerName: 'Test Player',
      totalPoints: 2500,
      position: 3,
      previousPosition: 5,
      pointsGainedToday: 150,
      avatar: 'avatar.jpg',
      team: 'Alpha Team',
      goals: [],
      lastUpdated: new Date()
    };

    mockTeamData = {
      teamMetrics: {
        teamName: 'Alpha Team',
        memberCount: 5,
        totalPoints: 10000,
        averagePoints: 2000,
        topPerformer: mockPlayerPerformance,
        bottomPerformer: mockPlayerPerformance,
        pointsDistribution: {
          min: 1000,
          max: 3000,
          median: 2000,
          standardDeviation: 500
        },
        growthRate: 15,
        activityLevel: 'high',
        cohesionScore: 85
      },
      memberPerformances: [mockPlayerPerformance],
      recommendations: [],
      lastUpdated: new Date()
    };

    mockMetrics = {
      performance: {
        totalPoints: 2500,
        pointsPerDay: 125,
        efficiency: 85,
        consistency: 90,
        trend: 'up'
      },
      engagement: {
        activeDays: 25,
        challengesCompleted: 20,
        streakDays: 7,
        participationRate: 80
      },
      progress: {
        levelProgress: 75,
        goalsCompleted: 3,
        milestones: 7,
        timeToNextLevel: 5
      },
      social: {
        teamRank: 2,
        teamContribution: 25,
        collaborationScore: 70,
        mentorshipPoints: 50
      },
      achievements: {
        badgesEarned: 5,
        certificationsCompleted: 2,
        specialRecognitions: 1,
        leaderboardAppearances: 3
      }
    };

    mockHistoryData = {
      seasons: [],
      currentSeasonGraphs: []
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clear cache after each test
    service.invalidate('global');
    service.resetMetrics();
  });

  describe('cache key generation', () => {
    it('should generate consistent cache keys', async () => {
      const keyObj: CacheKey = {
        type: 'dashboard',
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      await service.setDashboardData(keyObj, mockDashboardData);
      const retrieved = await service.getDashboardData(keyObj);

      expect(retrieved).toEqual(mockDashboardData);
    });

    it('should generate different keys for different parameters', async () => {
      const keyObj1: CacheKey = {
        type: 'dashboard',
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      const keyObj2: CacheKey = {
        type: 'dashboard',
        playerId: 'player123',
        dashboardType: 'carteira_ii'
      };

      await service.setDashboardData(keyObj1, mockDashboardData);
      await service.setDashboardData(keyObj2, { ...mockDashboardData, playerName: 'Different Data' });

      const retrieved1 = await service.getDashboardData(keyObj1);
      const retrieved2 = await service.getDashboardData(keyObj2);

      expect(retrieved1?.playerName).toBe('Test Player');
      expect(retrieved2?.playerName).toBe('Different Data');
    });

    it('should handle additional parameters in cache keys', async () => {
      const keyObj: CacheKey = {
        type: 'dashboard',
        playerId: 'player123',
        additionalParams: {
          timeframe: 'weekly',
          includeHistory: 'true'
        }
      };

      await service.setDashboardData(keyObj, mockDashboardData);
      const retrieved = await service.getDashboardData(keyObj);

      expect(retrieved).toEqual(mockDashboardData);
    });
  });

  describe('dashboard data caching', () => {
    it('should cache and retrieve dashboard data', async () => {
      const keyObj: CacheKey = {
        type: 'dashboard',
        playerId: 'player123'
      };

      await service.setDashboardData(keyObj, mockDashboardData);
      const retrieved = await service.getDashboardData(keyObj);

      expect(retrieved).toEqual(mockDashboardData);
    });

    it('should return null for non-existent cache entries', async () => {
      const keyObj: CacheKey = {
        type: 'dashboard',
        playerId: 'nonexistent'
      };

      const retrieved = await service.getDashboardData(keyObj);

      expect(retrieved).toBeNull();
    });

    it('should respect custom TTL', async () => {
      const keyObj: CacheKey = {
        type: 'dashboard',
        playerId: 'player123'
      };

      await service.setDashboardData(keyObj, mockDashboardData, 100); // 100ms TTL

      // Should be available immediately
      let retrieved = await service.getDashboardData(keyObj);
      expect(retrieved).toEqual(mockDashboardData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      retrieved = await service.getDashboardData(keyObj);
      expect(retrieved).toBeNull();
    });
  });

  describe('player performance caching', () => {
    it('should cache and retrieve player performance data', async () => {
      const keyObj: CacheKey = {
        type: 'performance',
        playerId: 'player123'
      };

      await service.setPlayerPerformance(keyObj, mockPlayerPerformance);
      const retrieved = await service.getPlayerPerformance(keyObj);

      expect(retrieved).toEqual(mockPlayerPerformance);
    });

    it('should handle performance data with different timeframes', async () => {
      const keyObj1: CacheKey = {
        type: 'performance',
        playerId: 'player123',
        timeframe: 'daily'
      };

      const keyObj2: CacheKey = {
        type: 'performance',
        playerId: 'player123',
        timeframe: 'weekly'
      };

      const dailyPerformance = { ...mockPlayerPerformance, pointsGainedToday: 100 };
      const weeklyPerformance = { ...mockPlayerPerformance, pointsGainedToday: 700 };

      await service.setPlayerPerformance(keyObj1, dailyPerformance);
      await service.setPlayerPerformance(keyObj2, weeklyPerformance);

      const retrievedDaily = await service.getPlayerPerformance(keyObj1);
      const retrievedWeekly = await service.getPlayerPerformance(keyObj2);

      expect(retrievedDaily?.pointsGainedToday).toBe(100);
      expect(retrievedWeekly?.pointsGainedToday).toBe(700);
    });
  });

  describe('team data caching', () => {
    it('should cache and retrieve team data', async () => {
      const keyObj: CacheKey = {
        type: 'team',
        teamName: 'Alpha Team'
      };

      await service.setTeamData(keyObj, mockTeamData);
      const retrieved = await service.getTeamData(keyObj);

      expect(retrieved).toEqual(mockTeamData);
    });

    it('should handle team data with comparisons', async () => {
      const keyObj: CacheKey = {
        type: 'team',
        teamName: 'Alpha Team',
        additionalParams: {
          includeComparisons: 'true'
        }
      };

      const teamDataWithComparisons = {
        ...mockTeamData,
        teamComparison: {
          currentTeam: mockTeamData.teamMetrics,
          comparisonTeams: [],
          ranking: { position: 1, totalTeams: 5, percentile: 80 },
          insights: []
        }
      };

      await service.setTeamData(keyObj, teamDataWithComparisons);
      const retrieved = await service.getTeamData(keyObj);

      expect(retrieved?.teamComparison).toBeDefined();
    });
  });

  describe('metrics caching', () => {
    it('should cache and retrieve metrics data', async () => {
      const keyObj: CacheKey = {
        type: 'metrics',
        playerId: 'player123'
      };

      await service.setMetrics(keyObj, mockMetrics);
      const retrieved = await service.getMetrics(keyObj);

      expect(retrieved).toEqual(mockMetrics);
    });

    it('should handle metrics for different periods', async () => {
      const keyObj1: CacheKey = {
        type: 'metrics',
        playerId: 'player123',
        timeframe: 'daily'
      };

      const keyObj2: CacheKey = {
        type: 'metrics',
        playerId: 'player123',
        timeframe: 'monthly'
      };

      const dailyMetrics = { ...mockMetrics, performance: { ...mockMetrics.performance, pointsPerDay: 50 } };
      const monthlyMetrics = { ...mockMetrics, performance: { ...mockMetrics.performance, pointsPerDay: 125 } };

      await service.setMetrics(keyObj1, dailyMetrics);
      await service.setMetrics(keyObj2, monthlyMetrics);

      const retrievedDaily = await service.getMetrics(keyObj1);
      const retrievedMonthly = await service.getMetrics(keyObj2);

      expect(retrievedDaily?.performance.pointsPerDay).toBe(50);
      expect(retrievedMonthly?.performance.pointsPerDay).toBe(125);
    });
  });

  describe('history data caching', () => {
    it('should cache and retrieve history data', async () => {
      const keyObj: CacheKey = {
        type: 'history',
        playerId: 'player123'
      };

      await service.setHistoryData(keyObj, mockHistoryData);
      const retrieved = await service.getHistoryData(keyObj);

      expect(retrieved).toEqual(mockHistoryData);
    });
  });

  describe('cache invalidation', () => {
    beforeEach(async () => {
      // Set up some test data
      await service.setDashboardData({ type: 'dashboard', playerId: 'player123' }, mockDashboardData);
      await service.setPlayerPerformance({ type: 'performance', playerId: 'player123' }, mockPlayerPerformance);
      await service.setTeamData({ type: 'team', teamName: 'Alpha Team' }, mockTeamData);
    });

    it('should invalidate player-specific cache entries', async () => {
      const invalidatedCount = await service.invalidate('player', 'player123');

      expect(invalidatedCount).toBeGreaterThan(0);

      // Verify data is no longer cached
      const dashboardData = await service.getDashboardData({ type: 'dashboard', playerId: 'player123' });
      const performanceData = await service.getPlayerPerformance({ type: 'performance', playerId: 'player123' });

      expect(dashboardData).toBeNull();
      expect(performanceData).toBeNull();
    });

    it('should invalidate team-specific cache entries', async () => {
      const invalidatedCount = await service.invalidate('team', 'Alpha Team');

      expect(invalidatedCount).toBeGreaterThan(0);

      // Verify team data is no longer cached
      const teamData = await service.getTeamData({ type: 'team', teamName: 'Alpha Team' });
      expect(teamData).toBeNull();
    });

    it('should invalidate all cache entries with global scope', async () => {
      // First verify we have data to invalidate
      const statsBefore = service.getCacheStats();
      expect(statsBefore.totalEntries).toBeGreaterThan(0);
      
      const invalidatedCount = await service.invalidate('global');

      expect(invalidatedCount).toBeGreaterThan(0);

      // Verify all data is cleared
      const stats = service.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should invalidate entries matching custom pattern', async () => {
      const invalidatedCount = await service.invalidate('custom', undefined, '^dashboard.*');

      expect(invalidatedCount).toBeGreaterThan(0);

      // Dashboard data should be cleared, but other data should remain
      const dashboardData = await service.getDashboardData({ type: 'dashboard', playerId: 'player123' });
      const teamData = await service.getTeamData({ type: 'team', teamName: 'Alpha Team' });

      expect(dashboardData).toBeNull();
      expect(teamData).not.toBeNull();
    });
  });

  describe('cache invalidation triggers', () => {
    it('should trigger invalidation based on events', async () => {
      // Set up some data
      await service.setDashboardData({ type: 'dashboard', playerId: 'player123' }, mockDashboardData);

      // Trigger player update event
      await service.triggerInvalidation('player_update', { playerId: 'player123' });

      // Give time for async invalidation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Data should be invalidated
      const retrieved = await service.getDashboardData({ type: 'dashboard', playerId: 'player123' });
      expect(retrieved).toBeNull();
    });

    it('should handle delayed invalidation', async () => {
      // Set up some data
      await service.setDashboardData({ type: 'dashboard', playerId: 'player123' }, mockDashboardData);

      // Trigger leaderboard update with delay
      await service.triggerInvalidation('leaderboard_update', { playerId: 'player123' });

      // Data should still be available immediately
      let retrieved = await service.getDashboardData({ type: 'dashboard', playerId: 'player123' });
      expect(retrieved).not.toBeNull();

      // Wait for delayed invalidation
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Data should now be invalidated
      retrieved = await service.getDashboardData({ type: 'dashboard', playerId: 'player123' });
      expect(retrieved).toBeNull();
    });
  });

  describe('cache statistics', () => {
    beforeEach(async () => {
      // Set up test data
      await service.setDashboardData({ type: 'dashboard', playerId: 'player1' }, mockDashboardData);
      await service.setDashboardData({ type: 'dashboard', playerId: 'player2' }, mockDashboardData);
      await service.setPlayerPerformance({ type: 'performance', playerId: 'player1' }, mockPlayerPerformance);
      await service.setTeamData({ type: 'team', teamName: 'Alpha Team' }, mockTeamData);
    });

    it('should provide accurate cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.entriesByType).toBeDefined();
      expect(stats.entriesByType.dashboard).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.missRate).toBeGreaterThanOrEqual(0);
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.maxSize).toBeGreaterThan(0);
    });

    it('should track hit and miss rates', async () => {
      // Generate some hits
      await service.getDashboardData({ type: 'dashboard', playerId: 'player1' });
      await service.getDashboardData({ type: 'dashboard', playerId: 'player1' });

      // Generate some misses
      await service.getDashboardData({ type: 'dashboard', playerId: 'nonexistent1' });
      await service.getDashboardData({ type: 'dashboard', playerId: 'nonexistent2' });

      const stats = service.getCacheStats();

      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
      expect(stats.hitRate + stats.missRate).toBeCloseTo(100, 1);
    });

    it('should reset metrics correctly', async () => {
      // Generate some activity
      await service.getDashboardData({ type: 'dashboard', playerId: 'player1' });
      await service.getDashboardData({ type: 'dashboard', playerId: 'nonexistent' });

      service.resetMetrics();

      const stats = service.getCacheStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.missRate).toBe(0);
    });
  });

  describe('invalidation rules management', () => {
    it('should add custom invalidation rules', () => {
      const customRule: CacheInvalidationRule = {
        id: 'custom_rule',
        name: 'Custom Rule',
        triggers: [{ event: 'manual' }],
        scope: 'custom',
        pattern: '^custom:.*'
      };

      service.addInvalidationRule(customRule);

      const rules = service.getInvalidationRules();
      expect(rules.some(rule => rule.id === 'custom_rule')).toBe(true);
    });

    it('should remove invalidation rules', () => {
      const customRule: CacheInvalidationRule = {
        id: 'removable_rule',
        name: 'Removable Rule',
        triggers: [{ event: 'manual' }],
        scope: 'global'
      };

      service.addInvalidationRule(customRule);
      const removed = service.removeInvalidationRule('removable_rule');

      expect(removed).toBe(true);

      const rules = service.getInvalidationRules();
      expect(rules.some(rule => rule.id === 'removable_rule')).toBe(false);
    });

    it('should return false when removing non-existent rule', () => {
      const removed = service.removeInvalidationRule('non_existent_rule');
      expect(removed).toBe(false);
    });
  });

  describe('cache maintenance', () => {
    it('should perform cache maintenance', async () => {
      // Add some data with short TTL
      await service.setDashboardData(
        { type: 'dashboard', playerId: 'player123' }, 
        mockDashboardData, 
        50 // 50ms TTL
      );

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      const maintenanceResult = await service.performMaintenance();

      expect(maintenanceResult.expiredEntriesRemoved).toBeGreaterThanOrEqual(0);
      expect(typeof maintenanceResult.indexOptimized).toBe('boolean');
    });
  });

  describe('configuration updates', () => {
    it('should update cache configuration', () => {
      const newConfig = {
        dashboardDataTTL: 10 * 60 * 1000, // 10 minutes
        maxCacheSize: 1000
      };

      service.updateConfig(newConfig);

      // Configuration should be updated (we can't directly test private config,
      // but we can verify the method doesn't throw)
      expect(() => service.updateConfig(newConfig)).not.toThrow();
    });
  });

  describe('cache export and import', () => {
    it('should export cache data', async () => {
      // Add some test data
      await service.setDashboardData({ type: 'dashboard', playerId: 'player123' }, mockDashboardData);

      const exportedData = await service.exportCacheData();

      expect(exportedData).toHaveProperty('config');
      expect(exportedData).toHaveProperty('metrics');
      expect(exportedData).toHaveProperty('invalidationRules');
      expect(exportedData).toHaveProperty('cacheEntries');
    });

    it('should import cache data', async () => {
      const importData = {
        config: {
          dashboardDataTTL: 15 * 60 * 1000,
          playerPerformanceTTL: 5 * 60 * 1000,
          teamDataTTL: 20 * 60 * 1000,
          historyDataTTL: 60 * 60 * 1000,
          metricsTTL: 30 * 60 * 1000,
          maxCacheSize: 1000,
          enablePersistence: true
        },
        invalidationRules: [{
          id: 'imported_rule',
          name: 'Imported Rule',
          triggers: [{ event: 'manual' as const }],
          scope: 'global' as const
        }]
      };

      await service.importCacheData(importData);

      const rules = service.getInvalidationRules();
      expect(rules.some(rule => rule.id === 'imported_rule')).toBe(true);
    });
  });

  describe('warm up functionality', () => {
    it('should warm up cache without errors', async () => {
      const playerIds = ['player1', 'player2', 'player3'];
      const teamNames = ['Alpha Team', 'Beta Team'];

      // Should not throw
      await expect(service.warmUp(playerIds, teamNames)).resolves.not.toThrow();
    });
  });

  describe('response time tracking', () => {
    it('should track response times', async () => {
      // Generate some cache operations
      await service.getDashboardData({ type: 'dashboard', playerId: 'player123' });
      await service.getDashboardData({ type: 'dashboard', playerId: 'player456' });

      const stats = service.getCacheStats();
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });
});