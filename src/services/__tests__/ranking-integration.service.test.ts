import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { RankingIntegrationService } from '../ranking-integration.service';
import { rankingLeaderboardService } from '../ranking-leaderboard.service';
import { rankingDataProcessorService } from '../ranking-data-processor.service';
import { rankingCacheService } from '../ranking-cache.service';
import { funifierPlayerService } from '../funifier-player.service';

// Mock all dependencies
vi.mock('../ranking-leaderboard.service', () => ({
  rankingLeaderboardService: {
    getLeaderboards: vi.fn(),
    getPersonalRanking: vi.fn(),
    getGlobalRanking: vi.fn(),
    getLeaderboardData: vi.fn()
  }
}));

vi.mock('../ranking-data-processor.service', () => ({
  rankingDataProcessorService: {
    processLeaderboardData: vi.fn(),
    transformToRaceVisualization: vi.fn(),
    getContextualRanking: vi.fn()
  }
}));

vi.mock('../ranking-cache.service', () => ({
  rankingCacheService: {
    getCachedLeaderboards: vi.fn(),
    cacheLeaderboards: vi.fn(),
    getCachedPersonalRanking: vi.fn(),
    cachePersonalRanking: vi.fn(),
    getCachedGlobalRanking: vi.fn(),
    cacheGlobalRanking: vi.fn(),
    getCachedProcessedRankingData: vi.fn(),
    cacheProcessedRankingData: vi.fn(),
    invalidateLeaderboard: vi.fn(),
    invalidatePlayerRanking: vi.fn(),
    getCacheStats: vi.fn()
  }
}));

vi.mock('../funifier-player.service', () => ({
  funifierPlayerService: {
    getPlayerStatus: vi.fn()
  }
}));

describe('RankingIntegrationService', () => {
  let service: RankingIntegrationService;
  
  const mockLeaderboardService = rankingLeaderboardService as {
    getLeaderboards: Mock;
    getPersonalRanking: Mock;
    getGlobalRanking: Mock;
    getLeaderboardData: Mock;
  };
  
  const mockDataProcessor = rankingDataProcessorService as {
    processLeaderboardData: Mock;
    transformToRaceVisualization: Mock;
    getContextualRanking: Mock;
  };
  
  const mockCacheService = rankingCacheService as {
    getCachedLeaderboards: Mock;
    cacheLeaderboards: Mock;
    getCachedPersonalRanking: Mock;
    cachePersonalRanking: Mock;
    getCachedGlobalRanking: Mock;
    cacheGlobalRanking: Mock;
    getCachedProcessedRankingData: Mock;
    cacheProcessedRankingData: Mock;
    invalidateLeaderboard: Mock;
    invalidatePlayerRanking: Mock;
    getCacheStats: Mock;
  };
  
  const mockPlayerService = funifierPlayerService as {
    getPlayerStatus: Mock;
  };

  beforeEach(() => {
    service = new RankingIntegrationService();
    vi.clearAllMocks();
  });

  describe('getLeaderboards', () => {
    it('should return cached leaderboards when available', async () => {
      const mockLeaderboards = {
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

      mockCacheService.getCachedLeaderboards.mockResolvedValue(mockLeaderboards);

      const result = await service.getLeaderboards();

      expect(mockCacheService.getCachedLeaderboards).toHaveBeenCalled();
      expect(mockLeaderboardService.getLeaderboards).not.toHaveBeenCalled();
      expect(result).toEqual(mockLeaderboards);
    });

    it('should fetch from API when cache is empty', async () => {
      const mockLeaderboards = {
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

      mockCacheService.getCachedLeaderboards.mockResolvedValue(null);
      mockLeaderboardService.getLeaderboards.mockResolvedValue(mockLeaderboards);

      const result = await service.getLeaderboards();

      expect(mockCacheService.getCachedLeaderboards).toHaveBeenCalled();
      expect(mockLeaderboardService.getLeaderboards).toHaveBeenCalled();
      expect(mockCacheService.cacheLeaderboards).toHaveBeenCalledWith(mockLeaderboards);
      expect(result).toEqual(mockLeaderboards);
    });

    it('should force refresh when requested', async () => {
      const mockLeaderboards = {
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

      mockLeaderboardService.getLeaderboards.mockResolvedValue(mockLeaderboards);

      const result = await service.getLeaderboards(true);

      expect(mockCacheService.getCachedLeaderboards).not.toHaveBeenCalled();
      expect(mockLeaderboardService.getLeaderboards).toHaveBeenCalled();
      expect(result).toEqual(mockLeaderboards);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockCacheService.getCachedLeaderboards.mockResolvedValue(null);
      mockLeaderboardService.getLeaderboards.mockRejectedValue(error);

      await expect(service.getLeaderboards()).rejects.toThrow('API Error');
    });
  });

  describe('getPersonalRanking', () => {
    it('should return cached personal ranking when available', async () => {
      const mockPersonalRanking = {
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

      mockCacheService.getCachedPersonalRanking.mockResolvedValue(mockPersonalRanking);

      const result = await service.getPersonalRanking('lb1', 'player1');

      expect(mockCacheService.getCachedPersonalRanking).toHaveBeenCalledWith('lb1', 'player1');
      expect(mockLeaderboardService.getPersonalRanking).not.toHaveBeenCalled();
      expect(result).toEqual(mockPersonalRanking);
    });

    it('should fetch from API and enhance when cache is empty', async () => {
      const mockPersonalRanking = {
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

      const mockPlayerStatus = {
        _id: 'player1',
        name: 'John Doe',
        total_challenges: 10,
        challenges: {},
        total_points: 1000,
        point_categories: {},
        total_catalog_items: 5,
        catalog_items: {},
        level_progress: {
          percent_completed: 75,
          next_points: 250,
          total_levels: 10,
          percent: 75
        },
        challenge_progress: [],
        teams: ['team1'],
        positions: [],
        time: Date.now(),
        extra: {},
        pointCategories: {}
      };

      mockCacheService.getCachedPersonalRanking.mockResolvedValue(null);
      mockLeaderboardService.getPersonalRanking.mockResolvedValue(mockPersonalRanking);
      mockPlayerService.getPlayerStatus.mockResolvedValue(mockPlayerStatus);

      const result = await service.getPersonalRanking('lb1', 'player1');

      expect(mockLeaderboardService.getPersonalRanking).toHaveBeenCalledWith('lb1', 'player1');
      expect(mockPlayerService.getPlayerStatus).toHaveBeenCalledWith('player1');
      expect(mockCacheService.cachePersonalRanking).toHaveBeenCalled();
      expect(result.personalCard.nextLevelPoints).toBe(250);
    });
  });

  describe('getGlobalRanking', () => {
    it('should return cached global ranking when available', async () => {
      const mockGlobalRanking = {
        raceData: {
          raceTrack: { length: 1000, segments: 10, theme: 'default' },
          participants: [],
          animations: { enabled: true, speed: 1.0, effects: [] }
        },
        fullRanking: []
      };

      mockCacheService.getCachedGlobalRanking.mockResolvedValue(mockGlobalRanking);

      const result = await service.getGlobalRanking('lb1');

      expect(mockCacheService.getCachedGlobalRanking).toHaveBeenCalledWith('lb1');
      expect(mockLeaderboardService.getGlobalRanking).not.toHaveBeenCalled();
      expect(result).toEqual(mockGlobalRanking);
    });

    it('should fetch from API when cache is empty', async () => {
      const mockGlobalRanking = {
        raceData: {
          raceTrack: { length: 1000, segments: 10, theme: 'default' },
          participants: [],
          animations: { enabled: true, speed: 1.0, effects: [] }
        },
        fullRanking: []
      };

      mockCacheService.getCachedGlobalRanking.mockResolvedValue(null);
      mockLeaderboardService.getGlobalRanking.mockResolvedValue(mockGlobalRanking);

      const result = await service.getGlobalRanking('lb1');

      expect(mockLeaderboardService.getGlobalRanking).toHaveBeenCalledWith('lb1');
      expect(mockCacheService.cacheGlobalRanking).toHaveBeenCalledWith('lb1', mockGlobalRanking);
      expect(result).toEqual(mockGlobalRanking);
    });
  });

  describe('getProcessedRankingData', () => {
    it('should return cached processed data when available', async () => {
      const mockProcessedData = {
        players: [],
        totalParticipants: 0,
        averagePoints: 0,
        medianPoints: 0,
        topPerformer: null,
        lastUpdated: new Date(),
        statistics: {
          totalPoints: 0,
          activeParticipants: 0,
          completionRate: 0
        }
      };

      mockCacheService.getCachedProcessedRankingData.mockResolvedValue(mockProcessedData);

      const result = await service.getProcessedRankingData('lb1');

      expect(mockCacheService.getCachedProcessedRankingData).toHaveBeenCalledWith('lb1');
      expect(mockLeaderboardService.getLeaderboardData).not.toHaveBeenCalled();
      expect(result).toEqual(mockProcessedData);
    });

    it('should fetch and process data when cache is empty', async () => {
      const mockLeaderboardData = {
        _id: 'lb1',
        name: 'Test Leaderboard',
        type: 'daily',
        active: true,
        leaders: []
      };

      const mockProcessedData = {
        players: [],
        totalParticipants: 0,
        averagePoints: 0,
        medianPoints: 0,
        topPerformer: null,
        lastUpdated: new Date(),
        statistics: {
          totalPoints: 0,
          activeParticipants: 0,
          completionRate: 0
        }
      };

      mockCacheService.getCachedProcessedRankingData.mockResolvedValue(null);
      mockLeaderboardService.getLeaderboardData.mockResolvedValue(mockLeaderboardData);
      mockDataProcessor.processLeaderboardData.mockReturnValue(mockProcessedData);

      const result = await service.getProcessedRankingData('lb1');

      expect(mockLeaderboardService.getLeaderboardData).toHaveBeenCalledWith('lb1');
      expect(mockDataProcessor.processLeaderboardData).toHaveBeenCalledWith([], undefined);
      expect(mockCacheService.cacheProcessedRankingData).toHaveBeenCalledWith('lb1', mockProcessedData);
      expect(result).toEqual(mockProcessedData);
    });
  });

  describe('getRankingDashboardData', () => {
    it('should fetch complete dashboard data successfully', async () => {
      const mockLeaderboards = {
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

      const mockPersonalRanking = {
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

      const mockGlobalRanking = {
        raceData: {
          raceTrack: { length: 1000, segments: 10, theme: 'default' },
          participants: [],
          animations: { enabled: true, speed: 1.0, effects: [] }
        },
        fullRanking: []
      };

      const mockProcessedData = {
        players: [],
        totalParticipants: 0,
        averagePoints: 0,
        medianPoints: 0,
        topPerformer: null,
        lastUpdated: new Date(),
        statistics: {
          totalPoints: 0,
          activeParticipants: 0,
          completionRate: 0
        }
      };

      // Mock cache returns null to force API calls
      mockCacheService.getCachedLeaderboards.mockResolvedValue(null);
      mockCacheService.getCachedPersonalRanking.mockResolvedValue(null);
      mockCacheService.getCachedGlobalRanking.mockResolvedValue(null);
      mockCacheService.getCachedProcessedRankingData.mockResolvedValue(null);

      // Mock API calls
      mockLeaderboardService.getLeaderboards.mockResolvedValue(mockLeaderboards);
      mockLeaderboardService.getPersonalRanking.mockResolvedValue(mockPersonalRanking);
      mockLeaderboardService.getGlobalRanking.mockResolvedValue(mockGlobalRanking);
      mockLeaderboardService.getLeaderboardData.mockResolvedValue({
        _id: 'lb1',
        name: 'Test',
        type: 'daily',
        active: true,
        leaders: []
      });
      mockDataProcessor.processLeaderboardData.mockReturnValue(mockProcessedData);

      const result = await service.getRankingDashboardData('player1');

      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.leaderboards).toEqual(mockLeaderboards.leaderboards);
      expect(result.activeLeaderboard).toEqual(mockLeaderboards.leaderboards[0]);
      expect(result.personalRanking).toBeDefined();
      expect(result.personalRanking?.personalCard.playerId).toBe('player1');
      expect(result.personalRanking?.personalCard.nextLevelPoints).toBe(250); // Enhanced value
      expect(result.globalRanking).toEqual(mockGlobalRanking);
      expect(result.processedData).toEqual(mockProcessedData);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('API Error');
      mockCacheService.getCachedLeaderboards.mockResolvedValue(null);
      mockLeaderboardService.getLeaderboards.mockRejectedValue(error);

      const result = await service.getRankingDashboardData('player1');

      expect(result.isLoading).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.leaderboards).toEqual([]);
    });
  });

  describe('createRaceVisualization', () => {
    it('should create race visualization', async () => {
      const mockLeaderboardData = {
        _id: 'lb1',
        name: 'Test',
        type: 'daily',
        active: true,
        leaders: []
      };

      const mockRaceVisualization = {
        raceTrack: { length: 1000, segments: 10, theme: 'default' },
        participants: [],
        animations: { enabled: true, speed: 1.0, effects: [] }
      };

      mockLeaderboardService.getLeaderboardData.mockResolvedValue(mockLeaderboardData);
      mockDataProcessor.transformToRaceVisualization.mockReturnValue(mockRaceVisualization);

      const result = await service.createRaceVisualization('lb1', 'player1');

      expect(mockLeaderboardService.getLeaderboardData).toHaveBeenCalledWith('lb1');
      expect(mockDataProcessor.transformToRaceVisualization).toHaveBeenCalledWith(
        [],
        'player1',
        undefined
      );
      expect(result).toEqual(mockRaceVisualization);
    });
  });

  describe('cache management', () => {
    it('should invalidate leaderboard cache', async () => {
      await service.invalidateLeaderboardCache('lb1');
      expect(mockCacheService.invalidateLeaderboard).toHaveBeenCalledWith('lb1');
    });

    it('should invalidate player cache', async () => {
      await service.invalidatePlayerCache('player1');
      expect(mockCacheService.invalidatePlayerRanking).toHaveBeenCalledWith('player1');
    });

    it('should get cache stats', () => {
      const mockStats = {
        totalEntries: 10,
        hitRate: 75,
        missRate: 25,
        totalHits: 30,
        totalMisses: 10,
        memoryUsage: 1024,
        oldestEntry: Date.now() - 1000,
        newestEntry: Date.now()
      };

      mockCacheService.getCacheStats.mockReturnValue(mockStats);

      const result = service.getCacheStats();
      expect(result).toEqual(mockStats);
    });
  });

  describe('retry logic', () => {
    it('should retry failed operations', async () => {
      const mockLeaderboards = {
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

      mockCacheService.getCachedLeaderboards.mockResolvedValue(null);
      mockLeaderboardService.getLeaderboards
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(mockLeaderboards);

      const result = await service.getLeaderboards();

      expect(mockLeaderboardService.getLeaderboards).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockLeaderboards);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Persistent error');
      mockCacheService.getCachedLeaderboards.mockResolvedValue(null);
      mockLeaderboardService.getLeaderboards.mockRejectedValue(error);

      await expect(service.getLeaderboards()).rejects.toThrow('Persistent error');
      expect(mockLeaderboardService.getLeaderboards).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});