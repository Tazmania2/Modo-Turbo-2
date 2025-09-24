import { describe, it, expect } from 'vitest';
import { demoDataService } from '../demo-data.service';

describe('DemoDataService', () => {
  describe('generatePlayers', () => {
    it('should generate the requested number of players', () => {
      const count = 25;
      const players = demoDataService.generatePlayers(count);

      expect(players).toHaveLength(count);
    });

    it('should generate players with required properties', () => {
      const players = demoDataService.generatePlayers(5);
      const player = players[0];

      expect(player._id).toBeDefined();
      expect(player.name).toBeDefined();
      expect(player.totalPoints).toBeDefined();
      expect(player.position).toBeDefined();
      expect(player.team).toBeDefined();
      expect(player.avatar).toBeDefined();
      expect(Array.isArray(player.goals)).toBe(true);
      expect(player.lastUpdated).toBeInstanceOf(Date);
    });

    it('should sort players by total points in descending order', () => {
      const players = demoDataService.generatePlayers(10);

      for (let i = 0; i < players.length - 1; i++) {
        expect(players[i].totalPoints).toBeGreaterThanOrEqual(players[i + 1].totalPoints);
      }
    });

    it('should assign correct positions based on ranking', () => {
      const players = demoDataService.generatePlayers(10);

      players.forEach((player, index) => {
        expect(player.position).toBe(index + 1);
      });
    });
  });

  describe('generateLeaderboards', () => {
    it('should generate leaderboards with required properties', () => {
      const leaderboards = demoDataService.generateLeaderboards();

      expect(Array.isArray(leaderboards)).toBe(true);
      expect(leaderboards.length).toBeGreaterThan(0);

      const leaderboard = leaderboards[0];
      expect(leaderboard._id).toBeDefined();
      expect(leaderboard.name).toBeDefined();
      expect(leaderboard.description).toBeDefined();
      expect(leaderboard.type).toBeDefined();
      expect(leaderboard.period).toBeDefined();
      expect(leaderboard.startDate).toBeInstanceOf(Date);
      expect(leaderboard.endDate).toBeInstanceOf(Date);
      expect(typeof leaderboard.isActive).toBe('boolean');
      expect(typeof leaderboard.participants).toBe('number');
    });
  });

  describe('generateSeasonHistory', () => {
    it('should generate season history for a player', () => {
      const playerId = 'test-player-1';
      const seasons = demoDataService.generateSeasonHistory(playerId);

      expect(Array.isArray(seasons)).toBe(true);
      expect(seasons.length).toBeGreaterThan(0);

      const season = seasons[0];
      expect(season._id).toBeDefined();
      expect(season.name).toBeDefined();
      expect(season.startDate).toBeInstanceOf(Date);
      expect(season.endDate).toBeInstanceOf(Date);
      expect(season.playerStats).toBeDefined();
      expect(season.playerStats.totalPoints).toBeDefined();
      expect(season.playerStats.finalPosition).toBeDefined();
      expect(Array.isArray(season.playerStats.achievements)).toBe(true);
      expect(Array.isArray(season.playerStats.goals)).toBe(true);
    });
  });

  describe('generatePlayerStatus', () => {
    it('should generate player status with Funifier structure', () => {
      const playerId = 'test-player-1';
      const status = demoDataService.generatePlayerStatus(playerId);

      expect(status._id).toBe(playerId);
      expect(status.name).toBeDefined();
      expect(status.image).toBeDefined();
      expect(status.image.small).toBeDefined();
      expect(status.image.medium).toBeDefined();
      expect(status.image.original).toBeDefined();
      expect(typeof status.total_challenges).toBe('number');
      expect(typeof status.challenges).toBe('object');
      expect(typeof status.total_points).toBe('number');
      expect(typeof status.point_categories).toBe('object');
      expect(typeof status.total_catalog_items).toBe('number');
      expect(typeof status.catalog_items).toBe('object');
      expect(status.level_progress).toBeDefined();
      expect(Array.isArray(status.challenge_progress)).toBe(true);
      expect(Array.isArray(status.teams)).toBe(true);
      expect(Array.isArray(status.positions)).toBe(true);
      expect(typeof status.time).toBe('number');
      expect(typeof status.extra).toBe('object');
      expect(typeof status.pointCategories).toBe('object');
    });
  });

  describe('generateRaceVisualization', () => {
    it('should generate race visualization data', () => {
      const players = demoDataService.generatePlayers(10);
      const raceViz = demoDataService.generateRaceVisualization(players);

      expect(raceViz.raceTrack).toBeDefined();
      expect(raceViz.raceTrack.length).toBeDefined();
      expect(raceViz.raceTrack.segments).toBeDefined();
      expect(raceViz.raceTrack.theme).toBeDefined();

      expect(Array.isArray(raceViz.participants)).toBe(true);
      expect(raceViz.participants.length).toBeLessThanOrEqual(10);

      if (raceViz.participants.length > 0) {
        const participant = raceViz.participants[0];
        expect(participant.playerId).toBeDefined();
        expect(participant.playerName).toBeDefined();
        expect(participant.position).toBeDefined();
        expect(participant.position.x).toBeDefined();
        expect(participant.position.y).toBeDefined();
        expect(participant.position.progress).toBeDefined();
        expect(participant.vehicle).toBeDefined();
        expect(typeof participant.isCurrentUser).toBe('boolean');
      }

      expect(raceViz.animations).toBeDefined();
      expect(typeof raceViz.animations.enabled).toBe('boolean');
      expect(typeof raceViz.animations.speed).toBe('number');
      expect(Array.isArray(raceViz.animations.effects)).toBe(true);
    });
  });

  describe('generatePersonalCard', () => {
    it('should generate personal card data', () => {
      const players = demoDataService.generatePlayers(10);
      const playerId = players[0]._id;
      const personalCard = demoDataService.generatePersonalCard(playerId, players);

      expect(personalCard.playerId).toBe(playerId);
      expect(personalCard.playerName).toBeDefined();
      expect(typeof personalCard.currentPosition).toBe('number');
      expect(typeof personalCard.totalPoints).toBe('number');
      expect(typeof personalCard.pointsGainedToday).toBe('number');
      expect(personalCard.team).toBeDefined();
      expect(typeof personalCard.level).toBe('number');
      expect(typeof personalCard.nextLevelPoints).toBe('number');
      expect(Array.isArray(personalCard.achievements)).toBe(true);
      expect(personalCard.streaks).toBeDefined();
      expect(typeof personalCard.streaks.current).toBe('number');
      expect(typeof personalCard.streaks.longest).toBe('number');
      expect(personalCard.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('generateContextualRanking', () => {
    it('should generate contextual ranking data', () => {
      const players = demoDataService.generatePlayers(10);
      const playerId = players[5]._id; // Middle player
      const contextual = demoDataService.generateContextualRanking(playerId, players);

      expect(Array.isArray(contextual.topThree)).toBe(true);
      expect(contextual.topThree).toHaveLength(3);

      expect(contextual.contextual).toBeDefined();
      expect(contextual.contextual.current).toBeDefined();
      expect(contextual.contextual.current._id).toBe(playerId);
      expect(contextual.contextual.above).toBeDefined(); // Should have player above
      expect(contextual.contextual.below).toBeDefined(); // Should have player below
    });

    it('should handle edge cases for top and bottom players', () => {
      const players = demoDataService.generatePlayers(10);
      
      // Test top player
      const topPlayerId = players[0]._id;
      const topContextual = demoDataService.generateContextualRanking(topPlayerId, players);
      expect(topContextual.contextual.above).toBeNull();
      expect(topContextual.contextual.below).toBeDefined();

      // Test bottom player
      const bottomPlayerId = players[players.length - 1]._id;
      const bottomContextual = demoDataService.generateContextualRanking(bottomPlayerId, players);
      expect(bottomContextual.contextual.above).toBeDefined();
      expect(bottomContextual.contextual.below).toBeNull();
    });
  });
});