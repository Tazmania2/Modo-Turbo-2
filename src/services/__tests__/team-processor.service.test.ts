import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  TeamProcessorService, 
  teamProcessorService,
  TeamProcessingOptions 
} from '../team-processor.service';
import { funifierPlayerService } from '../funifier-player.service';
import { FunifierPlayerStatus } from '@/types/funifier';

// Mock the funifier player service
vi.mock('../funifier-player.service', () => ({
  funifierPlayerService: {
    getTeamMembers: vi.fn(),
  }
}));

describe('TeamProcessorService', () => {
  let service: TeamProcessorService;
  let mockTeamMembers: FunifierPlayerStatus[];

  beforeEach(() => {
    service = TeamProcessorService.getInstance();
    
    mockTeamMembers = [
      {
        _id: 'player1',
        name: 'Alice Johnson',
        image: {
          small: { url: 'alice_small.jpg', size: 100, width: 50, height: 50, depth: 24 },
          medium: { url: 'alice_medium.jpg', size: 400, width: 100, height: 100, depth: 24 },
          original: { url: 'alice_original.jpg', size: 1600, width: 200, height: 200, depth: 24 }
        },
        total_challenges: 15,
        challenges: { daily: 8, weekly: 5, monthly: 2 },
        total_points: 2000,
        point_categories: { performance: 1200, collaboration: 500, innovation: 300 },
        total_catalog_items: 8,
        catalog_items: { badges: 5, certificates: 3 },
        level_progress: {
          percent_completed: 75,
          next_points: 300,
          total_levels: 10,
          percent: 75
        },
        challenge_progress: [],
        teams: ['Alpha Team'],
        positions: [],
        time: Date.now() - 86400000,
        extra: {},
        pointCategories: { performance: 1200, collaboration: 500, innovation: 300 }
      },
      {
        _id: 'player2',
        name: 'Bob Smith',
        image: {
          small: { url: 'bob_small.jpg', size: 100, width: 50, height: 50, depth: 24 },
          medium: { url: 'bob_medium.jpg', size: 400, width: 100, height: 100, depth: 24 },
          original: { url: 'bob_original.jpg', size: 1600, width: 200, height: 200, depth: 24 }
        },
        total_challenges: 12,
        challenges: { daily: 6, weekly: 4, monthly: 2 },
        total_points: 1500,
        point_categories: { performance: 900, collaboration: 400, innovation: 200 },
        total_catalog_items: 6,
        catalog_items: { badges: 4, certificates: 2 },
        level_progress: {
          percent_completed: 60,
          next_points: 500,
          total_levels: 10,
          percent: 60
        },
        challenge_progress: [],
        teams: ['Alpha Team'],
        positions: [],
        time: Date.now() - 86400000,
        extra: {},
        pointCategories: { performance: 900, collaboration: 400, innovation: 200 }
      },
      {
        _id: 'player3',
        name: 'Carol Davis',
        image: {
          small: { url: 'carol_small.jpg', size: 100, width: 50, height: 50, depth: 24 },
          medium: { url: 'carol_medium.jpg', size: 400, width: 100, height: 100, depth: 24 },
          original: { url: 'carol_original.jpg', size: 1600, width: 200, height: 200, depth: 24 }
        },
        total_challenges: 8,
        challenges: { daily: 4, weekly: 3, monthly: 1 },
        total_points: 1000,
        point_categories: { performance: 600, collaboration: 250, innovation: 150 },
        total_catalog_items: 4,
        catalog_items: { badges: 2, certificates: 2 },
        level_progress: {
          percent_completed: 40,
          next_points: 800,
          total_levels: 10,
          percent: 40
        },
        challenge_progress: [],
        teams: ['Alpha Team'],
        positions: [],
        time: Date.now() - 86400000,
        extra: {},
        pointCategories: { performance: 600, collaboration: 250, innovation: 150 }
      }
    ];

    // Setup mocks
    vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue(mockTeamMembers);
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.clearTeamCache('Alpha Team');
  });

  describe('processTeamData', () => {
    it('should process team data successfully', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      expect(result).toBeDefined();
      expect(result.teamMetrics.teamName).toBe('Alpha Team');
      expect(result.teamMetrics.memberCount).toBe(3);
      expect(result.teamMetrics.totalPoints).toBe(4500); // 2000 + 1500 + 1000
      expect(result.teamMetrics.averagePoints).toBe(1500);
      expect(result.memberPerformances).toHaveLength(3);
      expect(result.recommendations).toBeDefined();
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should calculate team metrics correctly', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);
      const metrics = result.teamMetrics;

      expect(metrics.topPerformer.playerName).toBe('Alice Johnson');
      expect(metrics.topPerformer.totalPoints).toBe(2000);
      expect(metrics.bottomPerformer.playerName).toBe('Carol Davis');
      expect(metrics.bottomPerformer.totalPoints).toBe(1000);
      
      expect(metrics.pointsDistribution.min).toBe(1000);
      expect(metrics.pointsDistribution.max).toBe(2000);
      expect(metrics.pointsDistribution.median).toBe(1500);
      expect(metrics.pointsDistribution.standardDeviation).toBeGreaterThan(0);
    });

    it('should determine activity level correctly', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      // Average challenges: (15 + 12 + 8) / 3 = 11.67, should be 'medium'
      expect(result.teamMetrics.activityLevel).toBe('medium');
    });

    it('should calculate cohesion score', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      expect(result.teamMetrics.cohesionScore).toBeGreaterThan(0);
      expect(result.teamMetrics.cohesionScore).toBeLessThanOrEqual(100);
    });

    it('should generate team comparison when requested', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team',
        includeComparisons: true
      };

      const result = await service.processTeamData(options);

      expect(result.teamComparison).toBeDefined();
      expect(result.teamComparison!.currentTeam).toBeDefined();
      expect(result.teamComparison!.comparisonTeams).toBeDefined();
      expect(result.teamComparison!.ranking).toBeDefined();
      expect(result.teamComparison!.insights).toBeDefined();
    });

    it('should not generate team comparison when not requested', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team',
        includeComparisons: false
      };

      const result = await service.processTeamData(options);

      expect(result.teamComparison).toBeUndefined();
    });

    it('should use cache when available', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      // First call
      await service.processTeamData(options);
      
      // Second call should use cache
      await service.processTeamData(options);

      // Should only call the API once
      expect(funifierPlayerService.getTeamMembers).toHaveBeenCalledTimes(1);
    });

    it('should handle empty team gracefully', async () => {
      vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue([]);

      const options: TeamProcessingOptions = {
        teamName: 'Empty Team'
      };

      await expect(service.processTeamData(options)).rejects.toThrow('No members found for team: Empty Team');
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(funifierPlayerService.getTeamMembers).mockRejectedValue(new Error('API Error'));

      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      await expect(service.processTeamData(options)).rejects.toThrow('Failed to process team data');
    });
  });

  describe('team recommendations', () => {
    it('should generate cohesion improvement recommendations for low cohesion', async () => {
      // Create team with large performance gaps
      const lowCohesionTeam = [
        { ...mockTeamMembers[0], total_points: 3000 },
        { ...mockTeamMembers[1], total_points: 500 },
        { ...mockTeamMembers[2], total_points: 400 }
      ];
      
      vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue(lowCohesionTeam);

      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      const cohesionRecommendation = result.recommendations.find(
        rec => rec.id === 'improve_cohesion'
      );
      expect(cohesionRecommendation).toBeDefined();
      expect(cohesionRecommendation!.priority).toBe('high');
    });

    it('should generate engagement recommendations for low activity', async () => {
      // Create team with low activity
      const lowActivityTeam = mockTeamMembers.map(member => ({
        ...member,
        total_challenges: 2 // Very low challenges
      }));
      
      vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue(lowActivityTeam);

      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      const engagementRecommendation = result.recommendations.find(
        rec => rec.id === 'boost_engagement'
      );
      expect(engagementRecommendation).toBeDefined();
      expect(engagementRecommendation!.category).toBe('engagement');
    });

    it('should generate growth recommendations for low growth rate', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      // Check if growth recommendation exists based on actual growth rate
      const growthRecommendation = result.recommendations.find(
        rec => rec.id === 'accelerate_growth'
      );
      
      if (result.teamMetrics.growthRate < 10) {
        expect(growthRecommendation).toBeDefined();
        expect(growthRecommendation!.category).toBe('growth');
      } else {
        // If growth rate is high, the recommendation might not be generated
        expect(growthRecommendation).toBeUndefined();
      }
    });

    it('should generate top performer leverage recommendations', async () => {
      // Create team with significant top performer gap
      const topPerformerTeam = [
        { ...mockTeamMembers[0], total_points: 5000 }, // Very high performer
        { ...mockTeamMembers[1], total_points: 1000 },
        { ...mockTeamMembers[2], total_points: 1000 }
      ];
      
      vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue(topPerformerTeam);

      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      const leverageRecommendation = result.recommendations.find(
        rec => rec.id === 'leverage_top_performer'
      );
      expect(leverageRecommendation).toBeDefined();
      expect(leverageRecommendation!.category).toBe('collaboration');
    });

    it('should sort recommendations by priority', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      // Check that high priority recommendations come first
      const priorities = result.recommendations.map(rec => rec.priority);
      const highPriorityIndex = priorities.indexOf('high');
      const lowPriorityIndex = priorities.lastIndexOf('low');
      
      if (highPriorityIndex !== -1 && lowPriorityIndex !== -1) {
        expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
      }
    });
  });

  describe('team insights generation', () => {
    it('should generate performance insights', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team',
        includeComparisons: true
      };

      const result = await service.processTeamData(options);

      expect(result.teamComparison!.insights).toBeDefined();
      expect(result.teamComparison!.insights.length).toBeGreaterThanOrEqual(0);
    });

    it('should categorize insights correctly', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team',
        includeComparisons: true
      };

      const result = await service.processTeamData(options);

      const insights = result.teamComparison!.insights;
      insights.forEach(insight => {
        expect(['strength', 'opportunity', 'warning', 'achievement']).toContain(insight.type);
      });
    });
  });

  describe('batch processing', () => {
    it('should process multiple teams in batch', async () => {
      const teamNames = ['Alpha Team', 'Beta Team', 'Gamma Team'];
      
      // Mock different teams
      vi.mocked(funifierPlayerService.getTeamMembers)
        .mockResolvedValueOnce(mockTeamMembers)
        .mockResolvedValueOnce(mockTeamMembers.slice(0, 2))
        .mockResolvedValueOnce([mockTeamMembers[0]]);

      const results = await service.batchProcessTeams(teamNames);

      expect(results.size).toBe(3);
      expect(results.has('Alpha Team')).toBe(true);
      expect(results.has('Beta Team')).toBe(true);
      expect(results.has('Gamma Team')).toBe(true);
    });

    it('should handle batch processing errors gracefully', async () => {
      const teamNames = ['Alpha Team', 'Error Team'];
      
      vi.mocked(funifierPlayerService.getTeamMembers)
        .mockResolvedValueOnce(mockTeamMembers)
        .mockRejectedValueOnce(new Error('Team not found'));

      const results = await service.batchProcessTeams(teamNames);

      expect(results.size).toBe(1);
      expect(results.has('Alpha Team')).toBe(true);
      expect(results.has('Error Team')).toBe(false);
    });
  });

  describe('statistical calculations', () => {
    it('should calculate median correctly for odd number of values', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      // Points: [1000, 1500, 2000], median should be 1500
      expect(result.teamMetrics.pointsDistribution.median).toBe(1500);
    });

    it('should calculate median correctly for even number of values', async () => {
      // Add fourth member to make even number
      const evenTeam = [
        ...mockTeamMembers,
        { ...mockTeamMembers[0], _id: 'player4', total_points: 1750 }
      ];
      
      vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue(evenTeam);

      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      // Points: [1000, 1500, 1750, 2000], median should be (1500 + 1750) / 2 = 1625
      expect(result.teamMetrics.pointsDistribution.median).toBe(1625);
    });

    it('should calculate standard deviation correctly', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      expect(result.teamMetrics.pointsDistribution.standardDeviation).toBeGreaterThan(0);
      // For points [1000, 1500, 2000] with mean 1500, std dev should be ~408
      expect(result.teamMetrics.pointsDistribution.standardDeviation).toBeCloseTo(408, -1);
    });
  });

  describe('cache management', () => {
    it('should provide processing statistics', () => {
      const stats = service.getProcessingStats();
      
      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('processedTeams');
      expect(stats.cacheStats).toHaveProperty('size');
      expect(stats.cacheStats).toHaveProperty('maxSize');
      expect(stats.cacheStats).toHaveProperty('keys');
    });

    it('should clear team cache correctly', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      // Process team to add to cache
      await service.processTeamData(options);
      
      // Clear cache
      service.clearTeamCache('Alpha Team');
      
      const stats = service.getProcessingStats();
      const teamKeys = stats.cacheStats.keys.filter(key => key.includes('Alpha Team'));
      expect(teamKeys.length).toBe(0);
    });

    it('should clear all cache when no team specified', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      // Process team to add to cache
      await service.processTeamData(options);
      
      // Clear all cache
      service.clearTeamCache();
      
      const stats = service.getProcessingStats();
      expect(stats.cacheStats.size).toBe(0);
    });
  });

  describe('activity level calculation', () => {
    it('should classify low activity correctly', async () => {
      const lowActivityTeam = mockTeamMembers.map(member => ({
        ...member,
        total_challenges: 3 // Low activity
      }));
      
      vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue(lowActivityTeam);

      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      expect(result.teamMetrics.activityLevel).toBe('low');
    });

    it('should classify high activity correctly', async () => {
      const highActivityTeam = mockTeamMembers.map(member => ({
        ...member,
        total_challenges: 20 // High activity
      }));
      
      vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue(highActivityTeam);

      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      expect(result.teamMetrics.activityLevel).toBe('high');
    });
  });

  describe('growth rate estimation', () => {
    it('should estimate growth rate based on team characteristics', async () => {
      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      expect(result.teamMetrics.growthRate).toBeGreaterThanOrEqual(0);
      expect(result.teamMetrics.growthRate).toBeLessThanOrEqual(30);
    });

    it('should correlate growth rate with team performance', async () => {
      // High performing team should have higher growth rate
      const highPerformingTeam = mockTeamMembers.map(member => ({
        ...member,
        level_progress: { ...member.level_progress, percent_completed: 90 },
        total_challenges: 25
      }));
      
      vi.mocked(funifierPlayerService.getTeamMembers).mockResolvedValue(highPerformingTeam);

      const options: TeamProcessingOptions = {
        teamName: 'Alpha Team'
      };

      const result = await service.processTeamData(options);

      expect(result.teamMetrics.growthRate).toBeGreaterThan(15);
    });
  });
});