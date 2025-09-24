import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RankingCacheService } from '../ranking-cache.service';
import { LeaderboardsResponse, PersonalRankingResponse, GlobalRankingResponse } from '../ranking-leaderboard.service';
import { FunifierLeaderboard, FunifierLeader } from '@/types/funifier';

describe('RankingCacheService', () => {
  let service: RankingCacheService;

  beforeEach(() => {
    service = new RankingCacheService({
      leaderboardsTTL: 1000, // 1 second for testing
      rankingDataTTL: 1000,
      personalDataTTL: 1000,
      globalDataTTL: 1000,
      maxCacheSize: 10,
      enableCompression: false
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('leaderboards caching', () => {
    it('should cache and retrieve leaderboards', async () => {
      const leaderboards: LeaderboardsResponse = {
        leaderboards: [
          {
            _id: 'lb1',
            name: 'Test Leaderboard',
            description: 'Test',
            type: 'daily',
            period: 'daily',
            startDate: new Date(),
            endDate: new Date(),
            isActive: true,
            participants: 10
          }
        ]
      };

      await service.cacheLeaderboards(leaderboards);
      const cached = await service.getCachedLeaderboards();

      expect(cached).toEqual(leaderboards);
    });

    it('should return null for non-existent cache', async () => {
      const cached = await service.getCachedLeaderboards();
      expect(cached).toBeNull();
    });

    it('should return null for expired cache', async () => {
      const leaderboards: LeaderboardsResponse = { leaderboards: [] };
      
      await service.cacheLeaderboards(leaderboards);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const cached = await service.getCachedLeaderboards();
      expect(cached).toBeNull();
    });
  });

  describe('leaderboard data caching', () => {
    it('should cache and retrieve leaderboard data', async () => {
      const leaderboardData: FunifierLeaderboard = {
        _id: 'lb1',
        name: 'Test Leaderboard',
        type: 'daily',
        active: true,
        leaders: []
      };

      await service.cacheLeaderboardData('lb1', leaderboardData);
      const cached = await service.getCachedLeaderboardData('lb1');

      expect(cached).toEqual(leaderboardData);
    });
  });

  describe('leaderboard aggregate caching', () => {
    it('should cache and retrieve aggregate results', async () => {
      const leaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1
        }
      ];

      const queryHash = 'test-hash';

      await service.cacheLeaderboardAggregate('lb1', queryHash, leaders);
      const cached = await service.getCachedLeaderboardAggregate('lb1', queryHash);

      expect(cached).toEqual(leaders);
    });
  });

  describe('personal ranking caching', () => {
    it('should cache and retrieve personal ranking', async () => {
      const personalRanking: PersonalRankingResponse = {
        raceData: {
          raceTrack: { length: 1000, segments: 10, theme: 'default' },
          participants: [],
          animations: { enabled: true, speed: 1.0, effects: [] }
        },
        personalCard: {
          playerId: 'player1',
          playerName: 'John Doe',
          currentPosition: 1,
          totalPoints: 1000,
          pointsGainedToday: 100,
          team: 'Team A',
          level: 5,
          nextLevelPoints: 200,
          achievements: [],
          streaks: { current: 3, longest: 10 },
          lastActivity: new Date()
        },
        topThree: [],
        contextualRanking: {
          above: null,
          current: {
            _id: 'player1',
            name: 'John Doe',
            totalPoints: 1000,
            position: 1,
            pointsGainedToday: 100,
            team: 'Team A',
            goals: [],
            lastUpdated: new Date()
          },
          below: null
        }
      };

      await service.cachePersonalRanking('lb1', 'player1', personalRanking);
      const cached = await service.getCachedPersonalRanking('lb1', 'player1');

      expect(cached).toEqual(personalRanking);
    });
  });

  describe('global ranking caching', () => {
    it('should cache and retrieve global ranking', async () => {
      const globalRanking: GlobalRankingResponse = {
        raceData: {
          raceTrack: { length: 1000, segments: 10, theme: 'default' },
          participants: [],
          animations: { enabled: true, speed: 1.0, effects: [] }
        },
        fullRanking: []
      };

      await service.cacheGlobalRanking('lb1', globalRanking);
      const cached = await service.getCachedGlobalRanking('lb1');

      expect(cached).toEqual(globalRanking);
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate leaderboard cache', async () => {
      const leaderboardData: FunifierLeaderboard = {
        _id: 'lb1',
        name: 'Test',
        type: 'daily',
        active: true,
        leaders: []
      };

      await service.cacheLeaderboardData('lb1', leaderboardData);
      await service.invalidateLeaderboard('lb1');
      
      const cached = await service.getCachedLeaderboardData('lb1');
      expect(cached).toBeNull();
    });

    it('should invalidate player ranking cache', async () => {
      const personalRanking: PersonalRankingResponse = {
        raceData: {
          raceTrack: { length: 1000, segments: 10, theme: 'default' },
          participants: [],
          animations: { enabled: true, speed: 1.0, effects: [] }
        },
        personalCard: {
          playerId: 'player1',
          playerName: 'John Doe',
          currentPosition: 1,
          totalPoints: 1000,
          pointsGainedToday: 100,
          team: 'Team A',
          level: 5,
          nextLevelPoints: 200,
          achievements: [],
          streaks: { current: 3, longest: 10 },
          lastActivity: new Date()
        },
        topThree: [],
        contextualRanking: {
          above: null,
          current: {
            _id: 'player1',
            name: 'John Doe',
            totalPoints: 1000,
            position: 1,
            pointsGainedToday: 100,
            team: 'Team A',
            goals: [],
            lastUpdated: new Date()
          },
          below: null
        }
      };

      await service.cachePersonalRanking('lb1', 'player1', personalRanking);
      await service.invalidatePlayerRanking('player1');
      
      const cached = await service.getCachedPersonalRanking('lb1', 'player1');
      expect(cached).toBeNull();
    });

    it('should clear all ranking cache', async () => {
      const leaderboards: LeaderboardsResponse = { leaderboards: [] };
      
      await service.cacheLeaderboards(leaderboards);
      
      // Verify it's cached first
      let cached = await service.getCachedLeaderboards();
      expect(cached).not.toBeNull();
      
      // Clear cache
      await service.clearRankingCache();
      
      // Verify it's cleared
      cached = await service.getCachedLeaderboards();
      expect(cached).toBeNull();
    });
  });

  describe('cache statistics', () => {
    it('should provide accurate cache statistics', async () => {
      const leaderboards: LeaderboardsResponse = { leaderboards: [] };
      
      // Cache some data
      await service.cacheLeaderboards(leaderboards);
      
      // Access cached data (hit)
      await service.getCachedLeaderboards();
      
      // Access non-existent data (miss)
      await service.getCachedLeaderboardData('nonexistent');
      
      const stats = service.getCacheStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(50);
      expect(stats.missRate).toBe(50);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('query hash generation', () => {
    it('should generate consistent hash for same query', () => {
      const query = { $sort: { points: -1 }, $limit: 10 };
      
      const hash1 = service.generateQueryHash(query);
      const hash2 = service.generateQueryHash(query);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should generate different hash for different queries', () => {
      const query1 = { $sort: { points: -1 } };
      const query2 = { $sort: { name: 1 } }; // Different field to ensure different hash
      
      const hash1 = service.generateQueryHash(query1);
      const hash2 = service.generateQueryHash(query2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('cache size limits', () => {
    it('should evict oldest entries when cache is full', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        const data: FunifierLeaderboard = {
          _id: `lb${i}`,
          name: `Leaderboard ${i}`,
          type: 'daily',
          active: true,
          leaders: []
        };
        await service.cacheLeaderboardData(`lb${i}`, data);
      }
      
      // Add one more to trigger eviction
      const newData: FunifierLeaderboard = {
        _id: 'lb10',
        name: 'Leaderboard 10',
        type: 'daily',
        active: true,
        leaders: []
      };
      await service.cacheLeaderboardData('lb10', newData);
      
      const stats = service.getCacheStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(10);
    });
  });
});