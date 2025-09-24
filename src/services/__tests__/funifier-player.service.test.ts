import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FunifierPlayerService } from '../funifier-player.service';
import { funifierApiClient } from '../funifier-api-client';

// Mock the API client
vi.mock('../funifier-api-client', () => ({
  funifierApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('FunifierPlayerService', () => {
  let playerService: FunifierPlayerService;

  beforeEach(() => {
    vi.clearAllMocks();
    playerService = FunifierPlayerService.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FunifierPlayerService.getInstance();
      const instance2 = FunifierPlayerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPlayerStatus', () => {
    it('should get player status by ID', async () => {
      const mockPlayer = {
        _id: 'player123',
        name: 'Test Player',
        total_points: 1500,
        total_challenges: 10,
        challenges: { challenge1: 5, challenge2: 3 },
        point_categories: { category1: 800, category2: 700 },
        total_catalog_items: 5,
        catalog_items: { item1: 2, item2: 3 },
        level_progress: {
          percent_completed: 75,
          next_points: 500,
          total_levels: 10,
          percent: 0.75,
        },
        challenge_progress: [],
        teams: ['team1'],
        positions: [],
        time: 1640995200000,
        extra: {},
        pointCategories: { category1: 800, category2: 700 },
      };

      vi.mocked(funifierApiClient.get).mockResolvedValue(mockPlayer);

      const result = await playerService.getPlayerStatus('player123');

      expect(funifierApiClient.get).toHaveBeenCalledWith('/v3/player/player123/status');
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('searchPlayers', () => {
    it('should search players with query', async () => {
      const query = { name: 'Test', limit: 5 };
      const mockPlayers = [
        {
          _id: 'player1',
          name: 'Test Player 1',
          total_points: 1000,
          teams: ['team1'],
          time: 1640995200000,
        },
        {
          _id: 'player2',
          name: 'Test Player 2',
          total_points: 1200,
          teams: ['team2'],
          time: 1640995300000,
        },
      ];

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockPlayers);

      const results = await playerService.searchPlayers(query);

      expect(funifierApiClient.post).toHaveBeenCalledWith('/v3/player/search', query);
      expect(results).toEqual(mockPlayers);
    });
  });

  describe('getLeaderboards', () => {
    it('should get all leaderboards', async () => {
      const mockLeaderboards = [
        {
          _id: 'leaderboard1',
          name: 'Main Leaderboard',
          type: 'points',
          active: true,
          leaders: [],
        },
        {
          _id: 'leaderboard2',
          name: 'Weekly Leaderboard',
          type: 'weekly',
          active: true,
          leaders: [],
        },
      ];

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockLeaderboards);

      const results = await playerService.getLeaderboards();

      expect(funifierApiClient.post).toHaveBeenCalledWith('/v3/leaderboard', {});
      expect(results).toEqual(mockLeaderboards);
    });

    it('should get leaderboards with query', async () => {
      const query = { active: true, limit: 1 };
      const mockLeaderboards = [
        {
          _id: 'leaderboard1',
          name: 'Main Leaderboard',
          type: 'points',
          active: true,
          leaders: [],
        },
      ];

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockLeaderboards);

      const results = await playerService.getLeaderboards(query);

      expect(funifierApiClient.post).toHaveBeenCalledWith('/v3/leaderboard', query);
      expect(results).toEqual(mockLeaderboards);
    });
  });

  describe('getLeaders', () => {
    it('should get leaders from leaderboard', async () => {
      const query = { leaderboardId: 'leaderboard1', limit: 10 };
      const mockLeaders = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'Player 1',
          points: 2000,
          position: 1,
        },
        {
          _id: 'leader2',
          player: 'player2',
          playerName: 'Player 2',
          points: 1800,
          position: 2,
        },
      ];

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockLeaders);

      const results = await playerService.getLeaders(query);

      expect(funifierApiClient.post).toHaveBeenCalledWith(
        '/v3/leaderboard/leaderboard1/leader',
        { limit: 10 }
      );
      expect(results).toEqual(mockLeaders);
    });
  });

  describe('getPlayerPosition', () => {
    it('should get player position in leaderboard', async () => {
      const mockPosition = {
        _id: 'leader1',
        player: 'player1',
        playerName: 'Player 1',
        points: 1500,
        position: 5,
      };

      vi.mocked(funifierApiClient.get).mockResolvedValue(mockPosition);

      const result = await playerService.getPlayerPosition('leaderboard1', 'player1');

      expect(funifierApiClient.get).toHaveBeenCalledWith(
        '/v3/leaderboard/leaderboard1/leader/player1'
      );
      expect(result).toEqual(mockPosition);
    });

    it('should return null if player not found in leaderboard', async () => {
      vi.mocked(funifierApiClient.get).mockRejectedValue(new Error('Not found'));

      const result = await playerService.getPlayerPosition('leaderboard1', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPlayerPerformance', () => {
    it('should get player performance data', async () => {
      const mockPlayer = {
        _id: 'player123',
        name: 'Test Player',
        total_points: 1500,
        teams: ['team1'],
        time: 1640995200000,
        image: {
          medium: { url: 'https://example.com/avatar.jpg', size: 100, width: 100, height: 100, depth: 24 },
        },
      };

      const mockLeaderboards = [
        { _id: 'leaderboard1', name: 'Main', type: 'points', active: true, leaders: [] },
      ];

      const mockPosition = {
        _id: 'leader1',
        player: 'player123',
        playerName: 'Test Player',
        points: 1500,
        position: 3,
      };

      vi.mocked(funifierApiClient.get)
        .mockResolvedValueOnce(mockPlayer)
        .mockResolvedValueOnce(mockPosition);
      vi.mocked(funifierApiClient.post).mockResolvedValue(mockLeaderboards);

      const result = await playerService.getPlayerPerformance('player123');

      expect(result).toEqual({
        playerId: 'player123',
        playerName: 'Test Player',
        totalPoints: 1500,
        position: 3,
        pointsGainedToday: 0,
        avatar: 'https://example.com/avatar.jpg',
        team: 'team1',
        lastUpdated: new Date(1640995200000),
      });
    });
  });

  describe('getContextualRanking', () => {
    it('should get contextual ranking around player', async () => {
      const mockPlayerPosition = {
        _id: 'leader5',
        player: 'player5',
        playerName: 'Player 5',
        points: 1200,
        position: 5,
      };

      const mockTopThree = [
        { _id: 'leader1', player: 'player1', playerName: 'Player 1', points: 2000, position: 1 },
        { _id: 'leader2', player: 'player2', playerName: 'Player 2', points: 1800, position: 2 },
        { _id: 'leader3', player: 'player3', playerName: 'Player 3', points: 1600, position: 3 },
      ];

      const mockContextualPlayers = [
        { _id: 'leader3', player: 'player3', playerName: 'Player 3', points: 1600, position: 3 },
        { _id: 'leader4', player: 'player4', playerName: 'Player 4', points: 1400, position: 4 },
        { _id: 'leader5', player: 'player5', playerName: 'Player 5', points: 1200, position: 5 },
        { _id: 'leader6', player: 'player6', playerName: 'Player 6', points: 1000, position: 6 },
        { _id: 'leader7', player: 'player7', playerName: 'Player 7', points: 800, position: 7 },
      ];

      vi.mocked(funifierApiClient.get).mockResolvedValue(mockPlayerPosition);
      vi.mocked(funifierApiClient.post)
        .mockResolvedValueOnce(mockTopThree)
        .mockResolvedValueOnce(mockContextualPlayers);

      const result = await playerService.getContextualRanking('leaderboard1', 'player5');

      expect(result.current).toEqual(mockPlayerPosition);
      expect(result.topThree).toEqual(mockTopThree);
      expect(result.above).toHaveLength(2); // positions 3 and 4
      expect(result.below).toHaveLength(2); // positions 6 and 7
    });
  });
});