import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../dashboard/player/[playerId]/route';

// Mock dependencies
vi.mock('@/services/dashboard-processor.service');
vi.mock('@/services/funifier-player.service');
vi.mock('@/services/dashboard-cache.service');
vi.mock('@/middleware/auth');

describe('/api/dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/dashboard/player/[playerId]', () => {
    it('should return dashboard data for valid player', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard/player/test-player-id');
      const params = { playerId: 'test-player-id' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('playerName');
      expect(data).toHaveProperty('totalPoints');
      expect(data).toHaveProperty('primaryGoal');
      expect(data).toHaveProperty('secondaryGoal1');
      expect(data).toHaveProperty('secondaryGoal2');
    });

    it('should handle player not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard/player/nonexistent-player');
      const params = { playerId: 'nonexistent-player' };

      // Mock service to throw not found error
      const mockDashboardProcessor = await import('@/services/dashboard-processor.service');
      vi.mocked(mockDashboardProcessor.DashboardProcessorService.prototype.getPlayerDashboard)
        .mockRejectedValue(new Error('Player not found'));

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Player not found');
    });

    it('should handle Funifier API errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard/player/test-player-id');
      const params = { playerId: 'test-player-id' };

      // Mock service to throw Funifier API error
      const mockDashboardProcessor = await import('@/services/dashboard-processor.service');
      vi.mocked(mockDashboardProcessor.DashboardProcessorService.prototype.getPlayerDashboard)
        .mockRejectedValue(new Error('Funifier API unavailable'));

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('service unavailable');
    });

    it('should return cached data when available', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard/player/cached-player');
      const params = { playerId: 'cached-player' };

      // Mock cache service to return cached data
      const mockCacheService = await import('@/services/dashboard-cache.service');
      vi.mocked(mockCacheService.DashboardCacheService.prototype.get)
        .mockResolvedValue({
          playerName: 'Cached Player',
          totalPoints: 1500,
          primaryGoal: { name: 'Cached Goal', percentage: 80, description: '', emoji: '🎯' },
          secondaryGoal1: { name: 'Cached Goal 2', percentage: 60, description: '', emoji: '🏆' },
          secondaryGoal2: { name: 'Cached Goal 3', percentage: 40, description: '', emoji: '📈' }
        });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.playerName).toBe('Cached Player');
      expect(data.totalPoints).toBe(1500);
    });

    it('should validate player ID parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard/player/');
      const params = { playerId: '' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Player ID is required');
    });

    it('should handle authentication errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard/player/test-player-id');
      const params = { playerId: 'test-player-id' };

      // Mock auth middleware to reject
      const mockAuth = await import('@/middleware/auth');
      vi.mocked(mockAuth.requireAuth).mockRejectedValue(new Error('Unauthorized'));

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });
});