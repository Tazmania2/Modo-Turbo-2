import { describe, it, expect, beforeEach } from 'vitest';
import { RankingDataProcessorService } from '../ranking-data-processor.service';
import { FunifierLeader, FunifierPlayerStatus } from '@/types/funifier';

describe('RankingDataProcessorService', () => {
  let service: RankingDataProcessorService;

  beforeEach(() => {
    service = new RankingDataProcessorService();
  });

  describe('processLeaderboardData', () => {
    it('should process leaderboard data correctly', () => {
      const leaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1,
          avatar: 'avatar1.jpg',
          team: 'Team A'
        },
        {
          _id: 'leader2',
          player: 'player2',
          playerName: 'Jane Smith',
          points: 800,
          position: 2,
          team: 'Team B'
        }
      ];

      const result = service.processLeaderboardData(leaders);

      expect(result.players).toHaveLength(2);
      expect(result.totalParticipants).toBe(2);
      expect(result.averagePoints).toBe(900);
      expect(result.topPerformer?.name).toBe('John Doe');
      expect(result.statistics.totalPoints).toBe(1800);
      expect(result.statistics.activeParticipants).toBe(2);
    });

    it('should handle empty leaderboard data', () => {
      const result = service.processLeaderboardData([]);

      expect(result.players).toHaveLength(0);
      expect(result.totalParticipants).toBe(0);
      expect(result.averagePoints).toBe(0);
      expect(result.topPerformer).toBeNull();
      expect(result.statistics.totalPoints).toBe(0);
    });

    it('should process with historical data', () => {
      const current: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1
        }
      ];

      const historical: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 800,
          position: 2
        }
      ];

      const result = service.processLeaderboardData(current, historical);

      expect(result.players[0].pointsGainedToday).toBe(200);
      expect(result.players[0].previousPosition).toBe(2);
    });
  });

  describe('calculatePositions', () => {
    it('should calculate positions correctly with ties', () => {
      const leaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John',
          points: 1000,
          position: 0 // Will be recalculated
        },
        {
          _id: 'leader2',
          player: 'player2',
          playerName: 'Jane',
          points: 1000,
          position: 0 // Will be recalculated
        },
        {
          _id: 'leader3',
          player: 'player3',
          playerName: 'Bob',
          points: 800,
          position: 0 // Will be recalculated
        }
      ];

      const result = service.calculatePositions(leaders);

      expect(result[0].position).toBe(1); // First with 1000 points
      expect(result[1].position).toBe(1); // Tied for first with 1000 points
      expect(result[2].position).toBe(3); // Third with 800 points (position 2 is skipped due to tie)
    });

    it('should handle single player', () => {
      const leaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John',
          points: 1000,
          position: 0
        }
      ];

      const result = service.calculatePositions(leaders);

      expect(result[0].position).toBe(1);
    });
  });

  describe('calculateRankingMetrics', () => {
    it('should calculate metrics for new player', () => {
      const current: FunifierLeader = {
        _id: 'leader1',
        player: 'player1',
        playerName: 'John',
        points: 1000,
        position: 1
      };

      const result = service.calculateRankingMetrics(current);

      expect(result.position).toBe(1);
      expect(result.positionChange).toBe('new');
      expect(result.pointsGainedToday).toBe(0);
      expect(result.previousPosition).toBeUndefined();
    });

    it('should calculate metrics with historical data', () => {
      const current: FunifierLeader = {
        _id: 'leader1',
        player: 'player1',
        playerName: 'John',
        points: 1000,
        position: 1
      };

      const historical: FunifierLeader = {
        _id: 'leader1',
        player: 'player1',
        playerName: 'John',
        points: 800,
        position: 3
      };

      const result = service.calculateRankingMetrics(current, historical);

      expect(result.position).toBe(1);
      expect(result.previousPosition).toBe(3);
      expect(result.positionChange).toBe('up');
      expect(result.pointsGainedToday).toBe(200);
    });

    it('should calculate percentile rank', () => {
      const current: FunifierLeader = {
        _id: 'leader1',
        player: 'player1',
        playerName: 'John',
        points: 800,
        position: 2
      };

      const allPlayers: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John',
          points: 800,
          position: 2
        },
        {
          _id: 'leader2',
          player: 'player2',
          playerName: 'Jane',
          points: 600,
          position: 3
        },
        {
          _id: 'leader3',
          player: 'player3',
          playerName: 'Bob',
          points: 1000,
          position: 1
        }
      ];

      const result = service.calculateRankingMetrics(current, undefined, allPlayers);

      expect(result.percentileRank).toBeCloseTo(33.33, 2); // 1 out of 3 players below
    });
  });

  describe('transformToRaceVisualization', () => {
    it('should transform to race visualization correctly', () => {
      const leaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John Doe',
          points: 1000,
          position: 1,
          avatar: 'avatar1.jpg'
        },
        {
          _id: 'leader2',
          player: 'player2',
          playerName: 'Jane Smith',
          points: 800,
          position: 2
        }
      ];

      const result = service.transformToRaceVisualization(leaders, 'player1');

      expect(result.raceTrack.length).toBe(1000);
      expect(result.raceTrack.segments).toBe(2);
      expect(result.participants).toHaveLength(2);
      expect(result.participants[0].isCurrentUser).toBe(true);
      expect(result.participants[1].isCurrentUser).toBe(false);
      expect(result.animations.enabled).toBe(true);
    });

    it('should handle custom configuration', () => {
      const leaders: FunifierLeader[] = [
        {
          _id: 'leader1',
          player: 'player1',
          playerName: 'John',
          points: 1000,
          position: 1
        }
      ];

      const config = {
        trackLength: 2000,
        theme: 'space' as const,
        animationSpeed: 2.0
      };

      const result = service.transformToRaceVisualization(leaders, undefined, config);

      expect(result.raceTrack.length).toBe(2000);
      expect(result.raceTrack.theme).toBe('space');
      expect(result.animations.speed).toBe(2.0);
      expect(result.animations.effects).toContain('star-field');
    });

    it('should limit participants to maxParticipants', () => {
      const leaders: FunifierLeader[] = Array.from({ length: 15 }, (_, i) => ({
        _id: `leader${i}`,
        player: `player${i}`,
        playerName: `Player ${i}`,
        points: 1000 - i * 10,
        position: i + 1
      }));

      const config = { maxParticipants: 5 };
      const result = service.transformToRaceVisualization(leaders, undefined, config);

      expect(result.participants).toHaveLength(5);
    });
  });

  describe('createPersonalCard', () => {
    it('should create personal card correctly', () => {
      const playerStatus: FunifierPlayerStatus = {
        _id: 'player1',
        name: 'John Doe',
        image: {
          small: { url: 'small.jpg', size: 100, width: 50, height: 50, depth: 24 },
          medium: { url: 'medium.jpg', size: 200, width: 100, height: 100, depth: 24 },
          original: { url: 'original.jpg', size: 400, width: 200, height: 200, depth: 24 }
        },
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

      const rankingInfo = {
        position: 2,
        previousPosition: 3,
        positionChange: 'up' as const,
        pointsGainedToday: 100,
        pointsGainedThisWeek: 500,
        averagePointsPerDay: 100,
        percentileRank: 80
      };

      const teamInfo = { name: 'Team Alpha', position: 1 };

      const result = service.createPersonalCard(playerStatus, rankingInfo, teamInfo);

      expect(result.playerId).toBe('player1');
      expect(result.playerName).toBe('John Doe');
      expect(result.avatar).toBe('medium.jpg');
      expect(result.currentPosition).toBe(2);
      expect(result.previousPosition).toBe(3);
      expect(result.totalPoints).toBe(1000);
      expect(result.pointsGainedToday).toBe(100);
      expect(result.team).toBe('Team Alpha');
      expect(result.nextLevelPoints).toBe(250);
    });
  });

  describe('getContextualRanking', () => {
    it('should get contextual ranking correctly', () => {
      const players = [
        { _id: 'p1', name: 'Player 1', position: 1, totalPoints: 1000, pointsGainedToday: 0, team: '', goals: [], lastUpdated: new Date() },
        { _id: 'p2', name: 'Player 2', position: 2, totalPoints: 900, pointsGainedToday: 0, team: '', goals: [], lastUpdated: new Date() },
        { _id: 'p3', name: 'Player 3', position: 3, totalPoints: 800, pointsGainedToday: 0, team: '', goals: [], lastUpdated: new Date() },
        { _id: 'p4', name: 'Player 4', position: 4, totalPoints: 700, pointsGainedToday: 0, team: '', goals: [], lastUpdated: new Date() },
        { _id: 'p5', name: 'Player 5', position: 5, totalPoints: 600, pointsGainedToday: 0, team: '', goals: [], lastUpdated: new Date() }
      ];

      const result = service.getContextualRanking(players, 'p3', 1);

      expect(result.current.name).toBe('Player 3');
      expect(result.above).toHaveLength(1);
      expect(result.above[0].name).toBe('Player 2');
      expect(result.below).toHaveLength(1);
      expect(result.below[0].name).toBe('Player 4');
    });

    it('should handle player at top of ranking', () => {
      const players = [
        { _id: 'p1', name: 'Player 1', position: 1, totalPoints: 1000, pointsGainedToday: 0, team: '', goals: [], lastUpdated: new Date() },
        { _id: 'p2', name: 'Player 2', position: 2, totalPoints: 900, pointsGainedToday: 0, team: '', goals: [], lastUpdated: new Date() }
      ];

      const result = service.getContextualRanking(players, 'p1', 1);

      expect(result.current.name).toBe('Player 1');
      expect(result.above).toHaveLength(0);
      expect(result.below).toHaveLength(1);
      expect(result.below[0].name).toBe('Player 2');
    });

    it('should throw error for non-existent player', () => {
      const players = [
        { _id: 'p1', name: 'Player 1', position: 1, totalPoints: 1000, pointsGainedToday: 0, team: '', goals: [], lastUpdated: new Date() }
      ];

      expect(() => service.getContextualRanking(players, 'nonexistent', 1)).toThrow(
        'Player nonexistent not found in ranking'
      );
    });
  });
});