import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  DashboardDataTransformerService, 
  dashboardDataTransformerService,
  TransformationContext,
  TransformationRule,
  MetricDefinition
} from '../dashboard-data-transformer.service';
import { FunifierPlayerStatus } from '@/types/funifier';

describe('DashboardDataTransformerService', () => {
  let service: DashboardDataTransformerService;
  let mockPlayerData: FunifierPlayerStatus;
  let mockTeamData: FunifierPlayerStatus[];
  let mockContext: TransformationContext;

  beforeEach(() => {
    service = DashboardDataTransformerService.getInstance();
    
    mockPlayerData = {
      _id: 'player123',
      name: 'Test Player',
      image: {
        small: { url: 'small.jpg', size: 100, width: 50, height: 50, depth: 24 },
        medium: { url: 'medium.jpg', size: 400, width: 100, height: 100, depth: 24 },
        original: { url: 'original.jpg', size: 1600, width: 200, height: 200, depth: 24 }
      },
      total_challenges: 20,
      challenges: { daily: 10, weekly: 7, monthly: 3 },
      total_points: 2500,
      point_categories: { performance: 1500, collaboration: 600, innovation: 400 },
      total_catalog_items: 8,
      catalog_items: { badges: 5, certificates: 3 },
      level_progress: {
        percent_completed: 75,
        next_points: 400,
        total_levels: 10,
        percent: 75
      },
      challenge_progress: [],
      teams: ['Alpha Team'],
      positions: [],
      time: Date.now() - 86400000 * 7, // 7 days ago
      extra: {
        mentorship_points: 100,
        collaboration_points: 150,
        badges: 5,
        certifications: 2,
        recognitions: 1,
        leaderboard_appearances: 3
      },
      pointCategories: { performance: 1500, collaboration: 600, innovation: 400 }
    };

    mockTeamData = [
      mockPlayerData,
      {
        ...mockPlayerData,
        _id: 'player456',
        name: 'Team Member 2',
        total_points: 2000
      },
      {
        ...mockPlayerData,
        _id: 'player789',
        name: 'Team Member 3',
        total_points: 1800
      }
    ];

    mockContext = {
      playerId: 'player123',
      playerData: mockPlayerData,
      teamData: mockTeamData,
      leaderboardData: [],
      historicalData: [],
      timeframe: {
        start: new Date(Date.now() - 86400000 * 30), // 30 days ago
        end: new Date(),
        period: 'monthly'
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.clearCache('player123');
  });

  describe('transformPlayerData', () => {
    it('should transform player data into comprehensive metrics', async () => {
      const result = await service.transformPlayerData(mockContext);

      expect(result).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.engagement).toBeDefined();
      expect(result.progress).toBeDefined();
      expect(result.social).toBeDefined();
      expect(result.achievements).toBeDefined();
    });

    it('should calculate performance metrics correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      expect(result.performance.totalPoints).toBe(2500);
      expect(result.performance.pointsPerDay).toBeGreaterThan(0);
      expect(result.performance.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.performance.efficiency).toBeLessThanOrEqual(100);
      expect(result.performance.consistency).toBeGreaterThanOrEqual(0);
      expect(result.performance.consistency).toBeLessThanOrEqual(100);
      expect(['up', 'down', 'stable']).toContain(result.performance.trend);
    });

    it('should calculate engagement metrics correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      expect(result.engagement.challengesCompleted).toBe(20);
      expect(result.engagement.activeDays).toBeGreaterThan(0);
      expect(result.engagement.participationRate).toBeGreaterThanOrEqual(0);
      expect(result.engagement.participationRate).toBeLessThanOrEqual(100);
      expect(result.engagement.streakDays).toBeGreaterThanOrEqual(0);
    });

    it('should calculate progress metrics correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      expect(result.progress.levelProgress).toBe(75);
      expect(result.progress.goalsCompleted).toBeGreaterThanOrEqual(0);
      expect(result.progress.milestones).toBeGreaterThanOrEqual(0);
      expect(result.progress.timeToNextLevel).toBeGreaterThanOrEqual(0);
    });

    it('should calculate social metrics correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      expect(result.social.teamRank).toBeGreaterThan(0);
      expect(result.social.teamRank).toBeLessThanOrEqual(3);
      expect(result.social.teamContribution).toBeGreaterThan(0);
      expect(result.social.teamContribution).toBeLessThanOrEqual(100);
      expect(result.social.collaborationScore).toBeGreaterThanOrEqual(0);
      expect(result.social.collaborationScore).toBeLessThanOrEqual(100);
      expect(result.social.mentorshipPoints).toBe(100);
    });

    it('should calculate achievement metrics correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      expect(result.achievements.badgesEarned).toBe(5);
      expect(result.achievements.certificationsCompleted).toBe(2);
      expect(result.achievements.specialRecognitions).toBe(1);
      expect(result.achievements.leaderboardAppearances).toBe(3);
    });

    it('should use cache when available', async () => {
      // First call
      const result1 = await service.transformPlayerData(mockContext);
      
      // Second call should use cache
      const result2 = await service.transformPlayerData(mockContext);

      expect(result1).toEqual(result2);
    });

    it('should handle players without teams', async () => {
      const contextWithoutTeam = {
        ...mockContext,
        playerData: { ...mockPlayerData, teams: [] },
        teamData: undefined
      };

      const result = await service.transformPlayerData(contextWithoutTeam);

      expect(result.social.teamRank).toBe(1);
      expect(result.social.teamContribution).toBe(100);
      expect(result.social.collaborationScore).toBe(0);
    });
  });

  describe('transformation rules', () => {
    it('should apply normalization transformation', async () => {
      const rule: TransformationRule = {
        id: 'test_normalize',
        name: 'Test Normalize',
        sourceField: 'total_points',
        targetField: 'normalized_points',
        transformation: {
          type: 'normalize',
          config: {
            minValue: 0,
            maxValue: 5000,
            targetMin: 0,
            targetMax: 100
          }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule, mockContext);

      expect(result).toBe(50); // 2500 normalized to 0-100 scale from 0-5000
    });

    it('should apply scaling transformation', async () => {
      const rule: TransformationRule = {
        id: 'test_scale',
        name: 'Test Scale',
        sourceField: 'total_points',
        targetField: 'scaled_points',
        transformation: {
          type: 'scale',
          config: {
            factor: 2,
            offset: 100
          }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule, mockContext);

      expect(result).toBe(5100); // 2500 * 2 + 100
    });

    it('should apply categorization transformation', async () => {
      const rule: TransformationRule = {
        id: 'test_categorize',
        name: 'Test Categorize',
        sourceField: 'total_points',
        targetField: 'performance_category',
        transformation: {
          type: 'categorize',
          config: {
            categories: [
              { min: 0, max: 1000, label: 'Beginner', value: 'beginner' },
              { min: 1001, max: 3000, label: 'Intermediate', value: 'intermediate' },
              { min: 3001, max: 10000, label: 'Advanced', value: 'advanced' }
            ]
          }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule, mockContext);

      expect(result).toBe('intermediate');
    });

    it('should apply calculation transformation', async () => {
      const rule: TransformationRule = {
        id: 'test_calculate',
        name: 'Test Calculate',
        sourceField: 'total_points,total_challenges',
        targetField: 'points_per_challenge',
        transformation: {
          type: 'calculate',
          config: {
            formula: 'total_points / total_challenges',
            variables: {
              total_points: 'total_points',
              total_challenges: 'total_challenges'
            }
          }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule, mockContext);

      expect(result).toBe(125); // 2500 / 20
    });

    it('should apply formatting transformation', async () => {
      const rule: TransformationRule = {
        id: 'test_format',
        name: 'Test Format',
        sourceField: 'level_progress.percent_completed',
        targetField: 'formatted_progress',
        transformation: {
          type: 'format',
          config: {
            format: 'percentage',
            precision: 1
          }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule, mockContext);

      expect(result).toBe('75.0%');
    });

    it('should handle transformation errors gracefully', async () => {
      const rule: TransformationRule = {
        id: 'test_error',
        name: 'Test Error',
        sourceField: 'nonexistent_field',
        targetField: 'error_result',
        transformation: {
          type: 'calculate',
          config: {
            formula: 'invalid_formula /',
            variables: {}
          }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule, mockContext);

      expect(result).toBe(0); // Should return 0 on error
    });
  });

  describe('metric definitions', () => {
    it('should return all metric definitions', () => {
      const definitions = service.getAllMetricDefinitions();

      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions.some(def => def.id === 'total_points')).toBe(true);
      expect(definitions.some(def => def.id === 'efficiency_score')).toBe(true);
      expect(definitions.some(def => def.id === 'level_progress')).toBe(true);
    });

    it('should get specific metric definition', () => {
      const definition = service.getMetricDefinition('total_points');

      expect(definition).toBeDefined();
      expect(definition!.id).toBe('total_points');
      expect(definition!.name).toBe('Total Points');
      expect(definition!.category).toBe('performance');
    });

    it('should allow adding custom metric definitions', () => {
      const customMetric: MetricDefinition = {
        id: 'custom_metric',
        name: 'Custom Metric',
        description: 'A custom metric for testing',
        category: 'performance',
        dataType: 'number',
        source: 'total_points',
        transformations: [],
        displayConfig: {
          format: '{value}',
          unit: 'points',
          icon: '🎯',
          color: '#3B82F6',
          trend: true
        }
      };

      service.setMetricDefinition(customMetric);

      const retrieved = service.getMetricDefinition('custom_metric');
      expect(retrieved).toEqual(customMetric);
    });

    it('should return undefined for non-existent metric', () => {
      const definition = service.getMetricDefinition('non_existent_metric');

      expect(definition).toBeUndefined();
    });
  });

  describe('efficiency calculations', () => {
    it('should calculate efficiency score correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      // Efficiency = (total_points / total_challenges) / 50 * 100
      // (2500 / 20) / 50 * 100 = 125 / 50 * 100 = 250, capped at 100
      expect(result.performance.efficiency).toBe(100);
    });

    it('should handle zero challenges in efficiency calculation', async () => {
      const contextWithZeroChallenges = {
        ...mockContext,
        playerData: { ...mockPlayerData, total_challenges: 0 }
      };

      const result = await service.transformPlayerData(contextWithZeroChallenges);

      expect(result.performance.efficiency).toBe(0);
    });
  });

  describe('consistency calculations', () => {
    it('should calculate consistency score', async () => {
      const result = await service.transformPlayerData(mockContext);

      expect(result.performance.consistency).toBeGreaterThan(0);
      expect(result.performance.consistency).toBeLessThanOrEqual(100);
    });

    it('should correlate consistency with level progress', async () => {
      const highProgressContext = {
        ...mockContext,
        playerData: {
          ...mockPlayerData,
          level_progress: { ...mockPlayerData.level_progress, percent_completed: 95 }
        }
      };

      const result = await service.transformPlayerData(highProgressContext);

      expect(result.performance.consistency).toBeGreaterThan(90);
    });
  });

  describe('trend determination', () => {
    it('should determine upward trend for high level progress', async () => {
      const highProgressContext = {
        ...mockContext,
        playerData: {
          ...mockPlayerData,
          level_progress: { ...mockPlayerData.level_progress, percent_completed: 85 }
        }
      };

      const result = await service.transformPlayerData(highProgressContext);

      expect(result.performance.trend).toBe('up');
    });

    it('should determine downward trend for low level progress', async () => {
      const lowProgressContext = {
        ...mockContext,
        playerData: {
          ...mockPlayerData,
          level_progress: { ...mockPlayerData.level_progress, percent_completed: 15 }
        }
      };

      const result = await service.transformPlayerData(lowProgressContext);

      expect(result.performance.trend).toBe('down');
    });

    it('should determine stable trend for medium level progress', async () => {
      const mediumProgressContext = {
        ...mockContext,
        playerData: {
          ...mockPlayerData,
          level_progress: { ...mockPlayerData.level_progress, percent_completed: 50 }
        }
      };

      const result = await service.transformPlayerData(mediumProgressContext);

      expect(result.performance.trend).toBe('stable');
    });
  });

  describe('team ranking calculations', () => {
    it('should calculate team rank correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      // Player has 2500 points, team members have 2500, 2000, 1800
      // So player should be rank 1
      expect(result.social.teamRank).toBe(1);
    });

    it('should calculate team contribution correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      // Total team points: 2500 + 2000 + 1800 = 6300
      // Player contribution: 2500 / 6300 * 100 ≈ 39.68%
      expect(result.social.teamContribution).toBeCloseTo(40, 0);
    });

    it('should handle single-member teams', async () => {
      const singleMemberContext = {
        ...mockContext,
        teamData: [mockPlayerData]
      };

      const result = await service.transformPlayerData(singleMemberContext);

      expect(result.social.teamRank).toBe(1);
      expect(result.social.teamContribution).toBe(100);
    });
  });

  describe('participation rate calculations', () => {
    it('should calculate participation rate correctly', async () => {
      const result = await service.transformPlayerData(mockContext);

      // 20 challenges completed out of 30 available = 66.67%
      expect(result.engagement.participationRate).toBeCloseTo(67, 0);
    });

    it('should cap participation rate at 100%', async () => {
      const highParticipationContext = {
        ...mockContext,
        playerData: { ...mockPlayerData, total_challenges: 50 }
      };

      const result = await service.transformPlayerData(highParticipationContext);

      expect(result.engagement.participationRate).toBe(100);
    });
  });

  describe('cache management', () => {
    it('should provide transformation statistics', () => {
      const stats = service.getTransformationStats();

      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('metricCount');
      expect(stats).toHaveProperty('transformationRuleCount');
      expect(stats.cacheStats).toHaveProperty('size');
      expect(stats.cacheStats).toHaveProperty('maxSize');
      expect(stats.cacheStats).toHaveProperty('keys');
    });

    it('should clear cache for specific player', async () => {
      // Add data to cache
      await service.transformPlayerData(mockContext);
      
      // Clear cache
      service.clearCache('player123');
      
      const stats = service.getTransformationStats();
      const playerKeys = stats.cacheStats.keys.filter(key => key.includes('player123'));
      expect(playerKeys.length).toBe(0);
    });

    it('should clear all cache when no player specified', async () => {
      // Add data to cache
      await service.transformPlayerData(mockContext);
      
      // Clear all cache
      service.clearCache();
      
      const stats = service.getTransformationStats();
      expect(stats.cacheStats.size).toBe(0);
    });
  });

  describe('format value function', () => {
    it('should format numbers correctly', async () => {
      const rule: TransformationRule = {
        id: 'test_number_format',
        name: 'Test Number Format',
        sourceField: 'total_points',
        targetField: 'formatted_points',
        transformation: {
          type: 'format',
          config: { format: 'number', precision: 0 }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule);

      expect(result).toBe('2,500');
    });

    it('should format percentages correctly', async () => {
      const rule: TransformationRule = {
        id: 'test_percentage_format',
        name: 'Test Percentage Format',
        sourceField: 'level_progress.percent_completed',
        targetField: 'formatted_percentage',
        transformation: {
          type: 'format',
          config: { format: 'percentage', precision: 2 }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule);

      expect(result).toBe('75.00%');
    });

    it('should format currency correctly', async () => {
      const rule: TransformationRule = {
        id: 'test_currency_format',
        name: 'Test Currency Format',
        sourceField: 'total_points',
        targetField: 'formatted_currency',
        transformation: {
          type: 'format',
          config: { format: 'currency' }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule);

      expect(result).toMatch(/^\$2,500/);
    });

    it('should format duration correctly', async () => {
      const testData = { minutes: 125 };
      const rule: TransformationRule = {
        id: 'test_duration_format',
        name: 'Test Duration Format',
        sourceField: 'minutes',
        targetField: 'formatted_duration',
        transformation: {
          type: 'format',
          config: { format: 'duration' }
        }
      };

      const result = await service.applyTransformation(testData, rule);

      expect(result).toBe('2h 5m');
    });
  });

  describe('nested value extraction', () => {
    it('should extract nested values correctly', async () => {
      const rule: TransformationRule = {
        id: 'test_nested',
        name: 'Test Nested',
        sourceField: 'level_progress.percent_completed',
        targetField: 'nested_value',
        transformation: {
          type: 'format',
          config: { format: 'number' }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule);

      expect(result).toBe('75');
    });

    it('should handle missing nested values', async () => {
      const rule: TransformationRule = {
        id: 'test_missing_nested',
        name: 'Test Missing Nested',
        sourceField: 'nonexistent.nested.value',
        targetField: 'missing_value',
        transformation: {
          type: 'format',
          config: { format: 'number' }
        }
      };

      const result = await service.applyTransformation(mockPlayerData, rule);

      expect(result).toBe('');
    });
  });
});