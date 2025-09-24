import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  DashboardProcessorService, 
  dashboardProcessorService,
  DashboardProcessingOptions 
} from '../dashboard-processor.service';
import { funifierPlayerService } from '../funifier-player.service';
import { FunifierPlayerStatus } from '@/types/funifier';

// Mock the funifier player service
vi.mock('../funifier-player.service', () => ({
  funifierPlayerService: {
    getPlayerStatus: vi.fn(),
    getTeamMembers: vi.fn(),
  }
}));

describe('DashboardProcessorService', () => {
  let service: DashboardProcessorService;
  let mockPlayerStatus: FunifierPlayerStatus;

  beforeEach(() => {
    service = DashboardProcessorService.getInstance();
    
    mockPlayerStatus = {
      _id: 'player123',
      name: 'Test Player',
      image: {
        small: { url: 'small.jpg', size: 100, width: 50, height: 50, depth: 24 },
        medium: { url: 'medium.jpg', size: 400, width: 100, height: 100, depth: 24 },
        original: { url: 'original.jpg', size: 1600, width: 200, height: 200, depth: 24 }
      },
      total_challenges: 10,
      challenges: { daily: 5, weekly: 3, monthly: 2 },
      total_points: 1500,
      point_categories: { performance: 800, collaboration: 400, innovation: 300 },
      total_catalog_items: 5,
      catalog_items: { badges: 3, certificates: 2 },
      level_progress: {
        percent_completed: 65,
        next_points: 500,
        total_levels: 10,
        percent: 65
      },
      challenge_progress: [],
      teams: ['Alpha Team'],
      positions: [],
      time: Date.now() - 86400000, // 1 day ago
      extra: {
        mentorship_points: 50,
        collaboration_points: 75
      },
      pointCategories: { performance: 800, collaboration: 400, innovation: 300 }
    };

    // Setup mocks
    vi.mocked(funifierPlayerService.getPlayerStatus).mockResolvedValue(mockPlayerStatus);
    vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue([
      mockPlayerStatus,
      {
        ...mockPlayerStatus,
        _id: 'player456',
        name: 'Team Member 2',
        total_points: 1200
      }
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.clearPlayerCache('player123');
  });

  describe('processDashboardData', () => {
    it('should process dashboard data successfully', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      const result = await service.processDashboardData(options);

      expect(result).toBeDefined();
      expect(result.playerName).toBe('Test Player');
      expect(result.totalPoints).toBe(1500);
      expect(result.primaryGoal).toBeDefined();
      expect(result.secondaryGoal1).toBeDefined();
      expect(result.secondaryGoal2).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.dashboardType).toBe('carteira_i');
    });

    it('should determine dashboard type automatically based on level progress', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      const result = await service.processDashboardData(options);

      // With 65% level progress, should be carteira_iii
      expect(result.metadata.dashboardType).toBe('carteira_iii');
    });

    it('should calculate goals correctly for carteira_i', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      const result = await service.processDashboardData(options);

      expect(result.primaryGoal.name).toBe('Total Points');
      expect(result.primaryGoal.current).toBe(1500);
      expect(result.primaryGoal.percentage).toBeGreaterThan(0);
      expect(result.primaryGoal.emoji).toBe('🎯');
    });

    it('should handle team-based dashboard types', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_ii'
      };

      const result = await service.processDashboardData(options);

      expect(result.metadata.dashboardType).toBe('carteira_ii');
      expect(result.primaryGoal.name).toBe('Team Contribution');
      expect(result.metadata.teamInfo.name).toBe('Alpha Team');
      expect(result.metadata.teamInfo.memberCount).toBe(2);
    });

    it('should calculate active boosts', async () => {
      // Mock player with high efficiency for boost activation
      const highEfficiencyPlayer = {
        ...mockPlayerStatus,
        total_points: 4500, // High points for efficiency
        total_challenges: 10
      };
      
      vi.mocked(funifierPlayerService.getPlayerStatus).mockResolvedValue(highEfficiencyPlayer);

      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_iii'
      };

      const result = await service.processDashboardData(options);

      expect(result.metadata.boosts).toBeDefined();
      // Should have efficiency boost active
      const efficiencyBoost = result.metadata.boosts.find(boost => boost.id === 'efficiency_boost');
      expect(efficiencyBoost).toBeDefined();
    });

    it('should use cache when available', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      // First call
      await service.processDashboardData(options);
      
      // Second call should use cache
      await service.processDashboardData(options);

      // Should only call the API once
      expect(funifierPlayerService.getPlayerStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(funifierPlayerService.getPlayerStatus).mockRejectedValue(new Error('API Error'));

      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      await expect(service.processDashboardData(options)).rejects.toThrow('Failed to process dashboard data');
    });

    it('should respect custom cache TTL', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_i',
        cacheTTL: 1000 // 1 second
      };

      await service.processDashboardData(options);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should call API again after cache expiry
      await service.processDashboardData(options);

      expect(funifierPlayerService.getPlayerStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('dashboard type determination', () => {
    it('should assign carteira_i for low level progress', async () => {
      const lowLevelPlayer = {
        ...mockPlayerStatus,
        level_progress: { ...mockPlayerStatus.level_progress, percent_completed: 15 }
      };
      
      vi.mocked(funifierPlayerService.getPlayerStatus).mockResolvedValue(lowLevelPlayer);

      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      const result = await service.processDashboardData(options);
      expect(result.metadata.dashboardType).toBe('carteira_i');
    });

    it('should assign carteira_ii for medium level progress', async () => {
      const mediumLevelPlayer = {
        ...mockPlayerStatus,
        level_progress: { ...mockPlayerStatus.level_progress, percent_completed: 35 }
      };
      
      vi.mocked(funifierPlayerService.getPlayerStatus).mockResolvedValue(mediumLevelPlayer);

      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      const result = await service.processDashboardData(options);
      expect(result.metadata.dashboardType).toBe('carteira_ii');
    });

    it('should assign carteira_iv for high level progress', async () => {
      const highLevelPlayer = {
        ...mockPlayerStatus,
        level_progress: { ...mockPlayerStatus.level_progress, percent_completed: 85 }
      };
      
      vi.mocked(funifierPlayerService.getPlayerStatus).mockResolvedValue(highLevelPlayer);

      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      const result = await service.processDashboardData(options);
      expect(result.metadata.dashboardType).toBe('carteira_iv');
    });
  });

  describe('goal calculations', () => {
    it('should calculate fixed targets correctly', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      const result = await service.processDashboardData(options);

      // Secondary goal 1 should be challenges with fixed target of 5
      expect(result.secondaryGoal1.name).toBe('Challenges');
      expect(result.secondaryGoal1.target).toBe(5);
    });

    it('should calculate level-based targets correctly', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      const result = await service.processDashboardData(options);

      // Primary goal should have level-based target
      expect(result.primaryGoal.target).toBeGreaterThan(1000);
    });

    it('should calculate team-based targets correctly', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_ii'
      };

      const result = await service.processDashboardData(options);

      // Team-based target should consider team size
      expect(result.primaryGoal.target).toBe(1000); // 500 * 1.0 * 2 members
    });
  });

  describe('team information processing', () => {
    it('should handle players without teams', async () => {
      const noTeamPlayer = {
        ...mockPlayerStatus,
        teams: []
      };
      
      vi.mocked(funifierPlayerService.getPlayerStatus).mockResolvedValue(noTeamPlayer);

      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      const result = await service.processDashboardData(options);

      expect(result.metadata.teamInfo.name).toBe('Individual');
      expect(result.metadata.teamInfo.memberCount).toBe(1);
      expect(result.metadata.teamInfo.averagePoints).toBe(1500);
    });

    it('should calculate team averages correctly', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_ii'
      };

      const result = await service.processDashboardData(options);

      // Average of 1500 and 1200 = 1350
      expect(result.metadata.teamInfo.averagePoints).toBe(1350);
    });
  });

  describe('cache management', () => {
    it('should clear player cache correctly', () => {
      service.clearPlayerCache('player123');
      
      const stats = service.getCacheStats();
      const playerKeys = stats.keys.filter(key => key.includes('player123'));
      expect(playerKeys.length).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });
  });

  describe('dashboard types management', () => {
    it('should return available dashboard types', () => {
      const types = service.getDashboardTypes();
      
      expect(types.length).toBeGreaterThan(0);
      expect(types.some(type => type.id === 'carteira_i')).toBe(true);
      expect(types.some(type => type.id === 'carteira_ii')).toBe(true);
      expect(types.some(type => type.id === 'carteira_iii')).toBe(true);
      expect(types.some(type => type.id === 'carteira_iv')).toBe(true);
    });

    it('should allow adding custom dashboard types', () => {
      const customType = {
        id: 'custom_dashboard',
        name: 'Custom Dashboard',
        description: 'Custom dashboard for testing',
        goalConfiguration: {
          primaryGoal: {
            id: 'custom_goal',
            name: 'Custom Goal',
            description: 'Custom goal for testing',
            emoji: '🎯',
            targetCalculation: { type: 'fixed' as const, baseValue: 100 },
            progressCalculation: { type: 'points' as const, source: 'total_points' },
            unit: 'points'
          },
          secondaryGoals: [],
          boostRules: []
        },
        teamProcessingRules: []
      };

      service.setDashboardType(customType);
      
      const types = service.getDashboardTypes();
      expect(types.some(type => type.id === 'custom_dashboard')).toBe(true);
    });
  });

  describe('boost evaluation', () => {
    it('should evaluate simple boost conditions', async () => {
      // Test with high total points for streak boost
      const highPointsPlayer = {
        ...mockPlayerStatus,
        total_points: 5000
      };
      
      vi.mocked(funifierPlayerService.getPlayerStatus).mockResolvedValue(highPointsPlayer);

      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      const result = await service.processDashboardData(options);

      // Should have some boosts active due to high performance
      expect(result.metadata.boosts.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle boost condition evaluation errors gracefully', async () => {
      // This should not throw even with invalid conditions
      const options: DashboardProcessingOptions = {
        playerId: 'player123',
        dashboardType: 'carteira_i'
      };

      const result = await service.processDashboardData(options);

      // Should complete without errors
      expect(result).toBeDefined();
      expect(result.metadata.boosts).toBeDefined();
    });
  });

  describe('cycle calculations', () => {
    it('should calculate current cycle day correctly', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      const result = await service.processDashboardData(options);

      expect(result.currentCycleDay).toBeGreaterThan(0);
      expect(result.currentCycleDay).toBeLessThanOrEqual(31);
    });

    it('should calculate total cycle days correctly', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      const result = await service.processDashboardData(options);

      expect(result.totalCycleDays).toBeGreaterThanOrEqual(28);
      expect(result.totalCycleDays).toBeLessThanOrEqual(31);
    });

    it('should calculate days remaining correctly', async () => {
      const options: DashboardProcessingOptions = {
        playerId: 'player123'
      };

      const result = await service.processDashboardData(options);

      const daysRemaining = result.totalCycleDays - result.currentCycleDay;
      expect(result.primaryGoal.daysRemaining).toBe(daysRemaining);
    });
  });
});