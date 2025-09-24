import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { RankingLeaderboardService } from '../ranking-leaderboard.service';
import { funifierApiClient } from '../funifier-api-client';
import { FunifierLeaderboard, FunifierLeader } from '@/types/funifier';

// Mock the funifier API client
vi.mock('../funifier-api-client', () => ({
  funifierApiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe('RankingLeaderboardService', () => {
  let service: RankingLeaderboardService;
  const mockGet = funifierApiClient.get as Mock;
  const mockPost = funifierApiClient.post as Mock;

  beforeEach(() => {
    service = new RankingLeaderboardService();
    vi.clearAllMocks();
  });

  describe('getLeaderboards', () => {
    it('should fetch and transform leaderboards correctly', async () => {
      const mockLeaderboards: FunifierLeaderboard[] = [
        {
          _id: 'lb1',
          name: 'Weekly Challenge',
          description: 'Weekly leaderboard',
          type: 'weekly',
          active: true,
          leaders: [
            {
              _id: 'leader1',
              player: 'player1',
              playerName: 'John Doe',
              points: 1000,
              position: 1,
              avatar: 'avatar1.jpg',
              team: 'Team A'
            }
          ]
        }
      ];

      mockGet.mockResolvedValue(mockLeaderboards);

      const result = await service.getLeaderboards();

      expect(mockGet).toHaveBeenCalledWith('/v3/leaderboard');
      expect(result.leaderboards).toHaveLength(1);
      expect(result.leaderboards[0]).toMatchObject({
        _id: 'lb1',
        name: 'Weekly Challenge',
        description: 'Weekly leaderboard',
        type: 'weekly',
        period: 'weekly',
        isActive: true,
        participants: 1
      });
    });

    it('should handle empty leaderboards response', async () => {
      mockGet.mockResolvedValue([]);

      const result = await service.getLeaderboards();

      expect(result.leaderboards).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockGet.mockRejectedValue(error);

      await expect(service.getLeaderboards()).rejects.toThrow('API Error');
    });
  });

  describe('getLeaderboardData', () => {
    it('should fetch specific leaderboard data', async () => {
      const mockLeaderboard: FunifierLeaderboard = {
        _id: 'lb1',
        name: 'Test Leaderboard',
        type: 'daily',
        active: true,
        leaders: []
      };

      mockGet.mockResolvedValue(mockLeaderboard);

      const result = await service.getLeaderboardData('lb1');

      expect(mockGet).toHaveBeenCalledWith('/v3/leaderboard/lb1');
      expect(result).toEqual(mockLeaderboard);
    });
  });

  describe('getLeaderboardAggregate', () => {
    it('should execute aggregate query correctly', async () => {
      const mockLeaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1
        }
      ];

      const query = {
        pipeline: [
          { $sort: { points: -1 } },
          { $limit: 3 }
        ]
      };

      mockPost.mockResolvedValue(mockLeaders);

      const result = await service.getLeaderboardAggregate('lb1', query);

      expect(mockPost).toHaveBeenCalledWith('/v3/leaderboard/lb1/leader/aggregate', query);
      expect(result).toEqual(mockLeaders);
    });
  });

  describe('getPersonalRanking', () => {
    it('should fetch and process personal ranking data', async () => {
      const mockLeaderboard: FunifierLeaderboard = {
        _id: 'lb1',
        name: 'Test Leaderboard',
        type: 'daily',
        active: true,
        leaders: [
          {
            _id: 'leader1',
            player: 'player1',
            playerName: 'John Doe',
            points: 1000,
            position: 1
          },
          {
            _id: 'leader2',
            player: 'player2',
            playerName: 'Jane Smith',
            points: 800,
            position: 2
          }
        ]
      };

      const mockCurrentPlayer: FunifierLeader[] = [
        {
          _id: 'leader2',
          player: 'player2',
          playerName: 'Jane Smith',
          points: 800,
          position: 2
        }
      ];

      const mockTopThree: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1
        }
      ];

      const mockContext: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1
        },
        {
          _id: 'leader2',
          player: 'player2',
          playerName: 'Jane Smith',
          points: 800,
          position: 2
        }
      ];

      mockGet.mockResolvedValue(mockLeaderboard);
      mockPost
        .mockResolvedValueOnce(mockTopThree) // Top 3 query
        .mockResolvedValueOnce(mockCurrentPlayer) // Current player query
        .mockResolvedValueOnce(mockContext); // Context query

      const result = await service.getPersonalRanking('lb1', 'player2');

      expect(result).toHaveProperty('raceData');
      expect(result).toHaveProperty('personalCard');
      expect(result).toHaveProperty('topThree');
      expect(result).toHaveProperty('contextualRanking');
      expect(result.personalCard.playerId).toBe('player2');
      expect(result.contextualRanking.current.name).toBe('Jane Smith');
    });

    it('should throw error when player not found', async () => {
      const mockLeaderboard: FunifierLeaderboard = {
        _id: 'lb1',
        name: 'Test Leaderboard',
        type: 'daily',
        active: true,
        leaders: []
      };

      mockGet.mockResolvedValue(mockLeaderboard);
      mockPost
        .mockResolvedValueOnce([]) // Top 3 query
        .mockResolvedValueOnce([]); // Current player query (empty)

      await expect(service.getPersonalRanking('lb1', 'nonexistent')).rejects.toThrow(
        'Player nonexistent not found in leaderboard lb1'
      );
    });
  });

  describe('getGlobalRanking', () => {
    it('should fetch and process global ranking data', async () => {
      const mockLeaderboard: FunifierLeaderboard = {
        _id: 'lb1',
        name: 'Test Leaderboard',
        type: 'daily',
        active: true,
        leaders: [
          {
            _id: 'leader1',
            player: 'player1',
            playerName: 'John Doe',
            points: 1000,
            position: 1
          }
        ]
      };

      const mockAllLeaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1
        }
      ];

      mockGet.mockResolvedValue(mockLeaderboard);
      mockPost.mockResolvedValue(mockAllLeaders);

      const result = await service.getGlobalRanking('lb1');

      expect(result).toHaveProperty('raceData');
      expect(result).toHaveProperty('fullRanking');
      expect(result.fullRanking).toHaveLength(1);
      expect(result.fullRanking[0].name).toBe('John Doe');
    });
  });

  describe('transformLeadersToPlayers', () => {
    it('should transform leaders to players correctly', async () => {
      const leaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1,
          avatar: 'avatar1.jpg',
          team: 'Team A'
        }
      ];

      // Access private method through any cast for testing
      const result = (service as any).transformLeadersToPlayers(leaders);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        _id: 'leader1',
        name: 'John Doe',
        totalPoints: 1000,
        position: 1,
        avatar: 'avatar1.jpg',
        team: 'Team A'
      });
    });
  });

  describe('buildRaceVisualization', () => {
    it('should build race visualization correctly', async () => {
      const leaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1
        },
        {
          _id: 'leader2',
          player: 'player2',
          playerName: 'Jane Smith',
          points: 800,
          position: 2
        }
      ];

      // Access private method through any cast for testing
      const result = (service as any).buildRaceVisualization(leaders, 'player1');

      expect(result).toHaveProperty('raceTrack');
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('animations');
      expect(result.participants).toHaveLength(2);
      expect(result.participants[0].isCurrentUser).toBe(true);
      expect(result.participants[1].isCurrentUser).toBe(false);
    });
  });

  describe('extractPeriodFromType', () => {
    it('should extract period correctly from type', () => {
      // Access private method through any cast for testing
      const service_any = service as any;
      
      expect(service_any.extractPeriodFromType('daily_challenge')).toBe('daily');
      expect(service_any.extractPeriodFromType('Weekly Leaderboard')).toBe('weekly');
      expect(service_any.extractPeriodFromType('Monthly Competition')).toBe('monthly');
      expect(service_any.extractPeriodFromType('Season Rankings')).toBe('seasonal');
      expect(service_any.extractPeriodFromType('general')).toBe('ongoing');
    });
  });
});