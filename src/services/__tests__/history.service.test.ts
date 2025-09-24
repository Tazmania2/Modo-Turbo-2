import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryService } from '../history.service';
import { demoDataService } from '../demo-data.service';
import { CacheService } from '../../utils/cache';

// Mock dependencies
vi.mock('../funifier-database.service');
vi.mock('../funifier-player.service');
vi.mock('../../utils/cache');
vi.mock('../demo-data.service');

describe('HistoryService', () => {
  let historyService: HistoryService;
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock cache service
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    };

    (CacheService as any) = vi.fn(() => mockCache);
    
    historyService = new HistoryService();
  });

  describe('getPlayerSeasonHistory', () => {
    const playerId = 'test_player_123';
    const mockSeasons = [
      {
        _id: 'season_1',
        name: 'Q1 2024',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        playerStats: {
          totalPoints: 2500,
          finalPosition: 5,
          achievements: ['First Steps', 'Team Player'],
          goals: []
        }
      }
    ];

    it('should return cached data when available', async () => {
      mockCache.get.mockResolvedValue(mockSeasons);

      const result = await historyService.getPlayerSeasonHistory(playerId);

      expect(mockCache.get).toHaveBeenCalledWith(`player_season_history_${playerId}`);
      expect(result).toEqual(mockSeasons);
    });

    it('should use demo data in demo mode', async () => {
      mockCache.get.mockResolvedValue(null);
      vi.mocked(demoDataService.generateSeasonHistory).mockReturnValue(mockSeasons);
      
      // Set demo mode
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const demoHistoryService = new HistoryService();

      const result = await demoHistoryService.getPlayerSeasonHistory(playerId);

      expect(demoDataService.generateSeasonHistory).toHaveBeenCalledWith(playerId);
      expect(result).toEqual(mockSeasons);
      expect(mockCache.set).toHaveBeenCalledWith(
        `player_season_history_${playerId}`,
        mockSeasons,
        300
      );
    });

    it('should return empty array on error', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));
      vi.mocked(demoDataService.generateSeasonHistory).mockImplementation(() => {
        throw new Error('Demo data error');
      });

      const result = await historyService.getPlayerSeasonHistory(playerId);

      expect(result).toEqual([]);
    });
  });

  describe('getCurrentSeasonPerformanceGraphs', () => {
    const playerId = 'test_player_123';
    const mockPerformanceGraphs = [
      { date: '2024-01-01', points: 100, position: 10 },
      { date: '2024-01-02', points: 150, position: 8 },
      { date: '2024-01-03', points: 200, position: 6 }
    ];

    it('should return cached performance graphs when available', async () => {
      mockCache.get.mockResolvedValue(mockPerformanceGraphs);

      const result = await historyService.getCurrentSeasonPerformanceGraphs(playerId);

      expect(mockCache.get).toHaveBeenCalledWith(`current_season_performance_${playerId}`);
      expect(result).toEqual(mockPerformanceGraphs);
    });

    it('should use demo data in demo mode', async () => {
      mockCache.get.mockResolvedValue(null);
      vi.mocked(demoDataService.generateCurrentSeasonPerformanceGraphs).mockReturnValue(mockPerformanceGraphs);
      
      // Set demo mode
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const demoHistoryService = new HistoryService();

      const result = await demoHistoryService.getCurrentSeasonPerformanceGraphs(playerId);

      expect(demoDataService.generateCurrentSeasonPerformanceGraphs).toHaveBeenCalledWith(playerId);
      expect(result).toEqual(mockPerformanceGraphs);
      expect(mockCache.set).toHaveBeenCalledWith(
        `current_season_performance_${playerId}`,
        mockPerformanceGraphs,
        180
      );
    });

    it('should return empty array on error', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));
      vi.mocked(demoDataService.generateCurrentSeasonPerformanceGraphs).mockImplementation(() => {
        throw new Error('Demo data error');
      });

      const result = await historyService.getCurrentSeasonPerformanceGraphs(playerId);

      expect(result).toEqual([]);
    });
  });

  describe('getPlayerHistoryData', () => {
    const playerId = 'test_player_123';

    it('should return combined history data', async () => {
      const mockSeasons = [{ _id: 'season_1', name: 'Q1 2024' }] as any;
      const mockGraphs = [{ date: '2024-01-01', points: 100, position: 10 }];

      vi.spyOn(historyService, 'getPlayerSeasonHistory').mockResolvedValue(mockSeasons);
      vi.spyOn(historyService, 'getCurrentSeasonPerformanceGraphs').mockResolvedValue(mockGraphs);

      const result = await historyService.getPlayerHistoryData(playerId);

      expect(result).toEqual({
        seasons: mockSeasons,
        currentSeasonGraphs: mockGraphs
      });
    });

    it('should return empty data on error', async () => {
      vi.spyOn(historyService, 'getPlayerSeasonHistory').mockRejectedValue(new Error('Error'));
      vi.spyOn(historyService, 'getCurrentSeasonPerformanceGraphs').mockRejectedValue(new Error('Error'));

      const result = await historyService.getPlayerHistoryData(playerId);

      expect(result).toEqual({
        seasons: [],
        currentSeasonGraphs: []
      });
    });
  });

  describe('getSeasonDetails', () => {
    const seasonId = 'season_123';
    const playerId = 'player_123';
    const mockSeason = {
      _id: seasonId,
      name: 'Q1 2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      playerStats: {
        totalPoints: 2500,
        finalPosition: 5,
        achievements: ['First Steps'],
        goals: []
      }
    };

    it('should return cached season details when available', async () => {
      mockCache.get.mockResolvedValue(mockSeason);

      const result = await historyService.getSeasonDetails(seasonId, playerId);

      expect(mockCache.get).toHaveBeenCalledWith(`season_details_${seasonId}_${playerId}`);
      expect(result).toEqual(mockSeason);
    });

    it('should use demo data in demo mode', async () => {
      mockCache.get.mockResolvedValue(null);
      vi.mocked(demoDataService.generateSeasonHistory).mockReturnValue([mockSeason]);
      
      // Set demo mode
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
      const demoHistoryService = new HistoryService();

      const result = await demoHistoryService.getSeasonDetails(seasonId, playerId);

      expect(result).toEqual(mockSeason);
      expect(mockCache.set).toHaveBeenCalledWith(
        `season_details_${seasonId}_${playerId}`,
        mockSeason,
        600
      );
    });

    it('should return null when season not found', async () => {
      mockCache.get.mockResolvedValue(null);
      vi.mocked(demoDataService.generateSeasonHistory).mockReturnValue([]);

      const result = await historyService.getSeasonDetails(seasonId, playerId);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      const result = await historyService.getSeasonDetails(seasonId, playerId);

      expect(result).toBeNull();
    });
  });

  describe('invalidatePlayerHistoryCache', () => {
    const playerId = 'test_player_123';

    it('should delete all history-related cache keys', async () => {
      await historyService.invalidatePlayerHistoryCache(playerId);

      expect(mockCache.delete).toHaveBeenCalledWith(`player_season_history_${playerId}`);
      expect(mockCache.delete).toHaveBeenCalledWith(`current_season_performance_${playerId}`);
    });
  });
});