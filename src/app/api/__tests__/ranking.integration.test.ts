import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getLeaderboards } from '../ranking/leaderboards/route';
import { GET as getPersonalRanking } from '../ranking/[leaderboardId]/personal/[playerId]/route';
import { GET as getGlobalRanking } from '../ranking/[leaderboardId]/global/route';

// Mock dependencies
vi.mock('@/services/ranking-integration.service');
vi.mock('@/services/ranking-cache.service');
vi.mock('@/services/ranking-leaderboard.service');

describe('/api/ranking Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ranking/leaderboards', () => {
    it('should return available leaderboards', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking/leaderboards');

      const response = await getLeaderboards(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('leaderboards');
      expect(Array.isArray(data.leaderboards)).toBe(true);
    });

    it('should handle Funifier API errors for leaderboards', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking/leaderboards');

      // Mock service to throw error
      const mockRankingService = await import('@/services/ranking-integration.service');
      vi.mocked(mockRankingService.RankingIntegrationService.prototype.getLeaderboards)
        .mockRejectedValue(new Error('Funifier API error'));

      const response = await getLeaderboards(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('service unavailable');
    });
  });

  describe('GET /api/ranking/[leaderboardId]/personal/[playerId]', () => {
    it('should return personal ranking data', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking/leaderboard-1/personal/player-1');
      const params = { leaderboardId: 'leaderboard-1', playerId: 'player-1' };

      const response = await getPersonalRanking(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('raceData');
      expect(data).toHaveProperty('personalCard');
      expect(data).toHaveProperty('topThree');
      expect(data).toHaveProperty('contextualRanking');
    });

    it('should validate leaderboard and player IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking//personal/');
      const params = { leaderboardId: '', playerId: '' };

      const response = await getPersonalRanking(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should handle player not found in leaderboard', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking/leaderboard-1/personal/nonexistent-player');
      const params = { leaderboardId: 'leaderboard-1', playerId: 'nonexistent-player' };

      // Mock service to throw not found error
      const mockRankingService = await import('@/services/ranking-integration.service');
      vi.mocked(mockRankingService.RankingIntegrationService.prototype.getPersonalRanking)
        .mockRejectedValue(new Error('Player not found in leaderboard'));

      const response = await getPersonalRanking(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return cached personal ranking when available', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking/leaderboard-1/personal/cached-player');
      const params = { leaderboardId: 'leaderboard-1', playerId: 'cached-player' };

      // Mock cache service
      const mockCacheService = await import('@/services/ranking-cache.service');
      vi.mocked(mockCacheService.RankingCacheService.prototype.getPersonalRanking)
        .mockResolvedValue({
          raceData: { totalDistance: 1000, players: [] },
          personalCard: { playerId: 'cached-player', playerName: 'Cached Player', totalPoints: 1200, position: 5 },
          topThree: [],
          contextualRanking: { current: { playerId: 'cached-player', name: 'Cached Player', points: 1200, position: 5 } }
        });

      const response = await getPersonalRanking(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.personalCard.playerName).toBe('Cached Player');
    });
  });

  describe('GET /api/ranking/[leaderboardId]/global', () => {
    it('should return global ranking data', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking/leaderboard-1/global');
      const params = { leaderboardId: 'leaderboard-1' };

      const response = await getGlobalRanking(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('raceData');
      expect(data).toHaveProperty('fullRanking');
    });

    it('should validate leaderboard ID for global ranking', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking//global');
      const params = { leaderboardId: '' };

      const response = await getGlobalRanking(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Leaderboard ID is required');
    });

    it('should handle leaderboard not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking/nonexistent-leaderboard/global');
      const params = { leaderboardId: 'nonexistent-leaderboard' };

      // Mock service to throw not found error
      const mockRankingService = await import('@/services/ranking-integration.service');
      vi.mocked(mockRankingService.RankingIntegrationService.prototype.getGlobalRanking)
        .mockRejectedValue(new Error('Leaderboard not found'));

      const response = await getGlobalRanking(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return cached global ranking when available', async () => {
      const request = new NextRequest('http://localhost:3000/api/ranking/cached-leaderboard/global');
      const params = { leaderboardId: 'cached-leaderboard' };

      // Mock cache service
      const mockCacheService = await import('@/services/ranking-cache.service');
      vi.mocked(mockCacheService.RankingCacheService.prototype.getGlobalRanking)
        .mockResolvedValue({
          raceData: { totalDistance: 1000, players: [] },
          fullRanking: [
            { playerId: 'player-1', name: 'Leader', points: 1800, position: 1 }
          ]
        });

      const response = await getGlobalRanking(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fullRanking).toHaveLength(1);
      expect(data.fullRanking[0].name).toBe('Leader');
    });
  });
});