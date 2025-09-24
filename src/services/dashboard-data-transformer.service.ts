import { 
  DashboardData, 
  Goal, 
  PlayerPerformance, 
  HistoryData, 
  PerformanceGraph,
  Season 
} from '@/types/dashboard';
import { 
  FunifierPlayerStatus, 
  FunifierLeaderboard, 
  FunifierLeader 
} from '@/types/funifier';
import { ConfigurationCache } from '@/utils/cache';

export interface TransformationRule {
  id: string;
  name: string;
  sourceField: string;
  targetField: string;
  transformation: TransformationType;
  parameters?: Record<string, any>;
}

export interface TransformationType {
  type: 'normalize' | 'scale' | 'categorize' | 'aggregate' | 'calculate' | 'format';
  config: TransformationConfig;
}

export interface TransformationConfig {
  // Normalization
  minValue?: number;
  maxValue?: number;
  targetMin?: number;
  targetMax?: number;
  
  // Scaling
  factor?: number;
  offset?: number;
  
  // Categorization
  categories?: Array<{
    min: number;
    max: number;
    label: string;
    value: any;
  }>;
  
  // Aggregation
  operation?: 'sum' | 'average' | 'min' | 'max' | 'count';
  groupBy?: string;
  
  // Calculation
  formula?: string;
  variables?: Record<string, string>;
  
  // Formatting
  format?: 'number' | 'percentage' | 'currency' | 'date' | 'duration';
  precision?: number;
  locale?: string;
}

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'engagement' | 'progress' | 'social' | 'achievement';
  dataType: 'number' | 'percentage' | 'boolean' | 'string' | 'date';
  source: string; // Path to source data
  transformations: TransformationRule[];
  displayConfig: {
    format: string;
    unit: string;
    icon: string;
    color: string;
    trend: boolean;
  };
}

export interface DashboardMetrics {
  performance: {
    totalPoints: number;
    pointsPerDay: number;
    efficiency: number;
    consistency: number;
    trend: 'up' | 'down' | 'stable';
  };
  engagement: {
    activeDays: number;
    challengesCompleted: number;
    streakDays: number;
    participationRate: number;
  };
  progress: {
    levelProgress: number;
    goalsCompleted: number;
    milestones: number;
    timeToNextLevel: number;
  };
  social: {
    teamRank: number;
    teamContribution: number;
    collaborationScore: number;
    mentorshipPoints: number;
  };
  achievements: {
    badgesEarned: number;
    certificationsCompleted: number;
    specialRecognitions: number;
    leaderboardAppearances: number;
  };
}

export interface TransformationContext {
  playerId: string;
  playerData: FunifierPlayerStatus;
  teamData?: FunifierPlayerStatus[];
  leaderboardData?: FunifierLeaderboard[];
  historicalData?: Record<string, any>[];
  timeframe: {
    start: Date;
    end: Date;
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  };
}

/**
 * Dashboard Data Transformer Service
 * Handles complex data transformations and metric calculations
 */
export class DashboardDataTransformerService {
  private static instance: DashboardDataTransformerService;
  private cache: ConfigurationCache;
  private metricDefinitions: Map<string, MetricDefinition>;
  private transformationRules: Map<string, TransformationRule>;

  private constructor() {
    this.cache = new ConfigurationCache({
      ttl: 15 * 60 * 1000, // 15 minutes for transformed data
      maxSize: 150
    });
    this.metricDefinitions = new Map();
    this.transformationRules = new Map();
    this.initializeMetricDefinitions();
  }

  static getInstance(): DashboardDataTransformerService {
    if (!DashboardDataTransformerService.instance) {
      DashboardDataTransformerService.instance = new DashboardDataTransformerService();
    }
    return DashboardDataTransformerService.instance;
  }

  /**
   * Initialize standard metric definitions
   */
  private initializeMetricDefinitions(): void {
    // Performance metrics
    this.metricDefinitions.set('total_points', {
      id: 'total_points',
      name: 'Total Points',
      description: 'Cumulative points earned',
      category: 'performance',
      dataType: 'number',
      source: 'total_points',
      transformations: [
        {
          id: 'format_points',
          name: 'Format Points',
          sourceField: 'total_points',
          targetField: 'formattedPoints',
          transformation: {
            type: 'format',
            config: { format: 'number', precision: 0 }
          }
        }
      ],
      displayConfig: {
        format: '{value} pts',
        unit: 'points',
        icon: '🎯',
        color: '#3B82F6',
        trend: true
      }
    });

    this.metricDefinitions.set('efficiency_score', {
      id: 'efficiency_score',
      name: 'Efficiency Score',
      description: 'Points per challenge ratio',
      category: 'performance',
      dataType: 'percentage',
      source: 'calculated',
      transformations: [
        {
          id: 'calculate_efficiency',
          name: 'Calculate Efficiency',
          sourceField: 'total_points,total_challenges',
          targetField: 'efficiency',
          transformation: {
            type: 'calculate',
            config: {
              formula: '(total_points / total_challenges) / 50 * 100',
              variables: {
                total_points: 'total_points',
                total_challenges: 'total_challenges'
              }
            }
          }
        },
        {
          id: 'normalize_efficiency',
          name: 'Normalize Efficiency',
          sourceField: 'efficiency',
          targetField: 'normalizedEfficiency',
          transformation: {
            type: 'normalize',
            config: { minValue: 0, maxValue: 200, targetMin: 0, targetMax: 100 }
          }
        }
      ],
      displayConfig: {
        format: '{value}%',
        unit: '%',
        icon: '⚡',
        color: '#10B981',
        trend: true
      }
    });

    this.metricDefinitions.set('level_progress', {
      id: 'level_progress',
      name: 'Level Progress',
      description: 'Progress towards next level',
      category: 'progress',
      dataType: 'percentage',
      source: 'level_progress.percent_completed',
      transformations: [
        {
          id: 'format_progress',
          name: 'Format Progress',
          sourceField: 'level_progress.percent_completed',
          targetField: 'formattedProgress',
          transformation: {
            type: 'format',
            config: { format: 'percentage', precision: 1 }
          }
        }
      ],
      displayConfig: {
        format: '{value}%',
        unit: '%',
        icon: '📈',
        color: '#8B5CF6',
        trend: true
      }
    });

    // Add more metric definitions...
    this.initializeEngagementMetrics();
    this.initializeSocialMetrics();
  }

  /**
   * Initialize engagement metric definitions
   */
  private initializeEngagementMetrics(): void {
    this.metricDefinitions.set('challenges_completed', {
      id: 'challenges_completed',
      name: 'Challenges Completed',
      description: 'Total challenges completed',
      category: 'engagement',
      dataType: 'number',
      source: 'total_challenges',
      transformations: [],
      displayConfig: {
        format: '{value}',
        unit: 'challenges',
        icon: '🏆',
        color: '#F59E0B',
        trend: true
      }
    });

    this.metricDefinitions.set('participation_rate', {
      id: 'participation_rate',
      name: 'Participation Rate',
      description: 'Active participation in activities',
      category: 'engagement',
      dataType: 'percentage',
      source: 'calculated',
      transformations: [
        {
          id: 'calculate_participation',
          name: 'Calculate Participation',
          sourceField: 'challenges,available_challenges',
          targetField: 'participation',
          transformation: {
            type: 'calculate',
            config: {
              formula: '(completed_challenges / available_challenges) * 100',
              variables: {
                completed_challenges: 'total_challenges',
                available_challenges: '30' // Would be dynamic
              }
            }
          }
        }
      ],
      displayConfig: {
        format: '{value}%',
        unit: '%',
        icon: '📊',
        color: '#06B6D4',
        trend: true
      }
    });
  }

  /**
   * Initialize social metric definitions
   */
  private initializeSocialMetrics(): void {
    this.metricDefinitions.set('team_contribution', {
      id: 'team_contribution',
      name: 'Team Contribution',
      description: 'Contribution to team success',
      category: 'social',
      dataType: 'percentage',
      source: 'calculated',
      transformations: [
        {
          id: 'calculate_team_contribution',
          name: 'Calculate Team Contribution',
          sourceField: 'total_points,team_total_points',
          targetField: 'teamContribution',
          transformation: {
            type: 'calculate',
            config: {
              formula: '(player_points / team_total_points) * 100',
              variables: {
                player_points: 'total_points',
                team_total_points: 'team_total_points'
              }
            }
          }
        }
      ],
      displayConfig: {
        format: '{value}%',
        unit: '%',
        icon: '🤝',
        color: '#EF4444',
        trend: true
      }
    });
  }

  /**
   * Transform player data into comprehensive dashboard metrics
   */
  async transformPlayerData(context: TransformationContext): Promise<DashboardMetrics> {
    const cacheKey = `metrics:${context.playerId}:${context.timeframe.period}`;
    
    // Check cache first
    const cached = this.cache.get<DashboardMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const metrics: DashboardMetrics = {
        performance: await this.calculatePerformanceMetrics(context),
        engagement: await this.calculateEngagementMetrics(context),
        progress: await this.calculateProgressMetrics(context),
        social: await this.calculateSocialMetrics(context),
        achievements: await this.calculateAchievementMetrics(context)
      };

      // Cache the result
      this.cache.set(cacheKey, metrics);
      
      return metrics;
    } catch (error) {
      throw new Error(`Failed to transform player data: ${error}`);
    }
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(context: TransformationContext): Promise<DashboardMetrics['performance']> {
    const { playerData } = context;
    
    // Calculate points per day (simplified)
    const daysSinceStart = Math.max(1, Math.floor((Date.now() - playerData.time) / (1000 * 60 * 60 * 24)));
    const pointsPerDay = playerData.total_points / daysSinceStart;
    
    // Calculate efficiency
    const efficiency = playerData.total_challenges > 0 
      ? Math.min(100, (playerData.total_points / playerData.total_challenges / 50) * 100)
      : 0;
    
    // Calculate consistency (simplified - would need historical data)
    const consistency = this.calculateConsistencyScore(playerData);
    
    // Determine trend (simplified)
    const trend = this.determineTrend(playerData, context.historicalData);

    return {
      totalPoints: playerData.total_points,
      pointsPerDay: Math.round(pointsPerDay),
      efficiency: Math.round(efficiency),
      consistency: Math.round(consistency),
      trend
    };
  }

  /**
   * Calculate engagement metrics
   */
  private async calculateEngagementMetrics(context: TransformationContext): Promise<DashboardMetrics['engagement']> {
    const { playerData } = context;
    
    // Calculate active days (simplified)
    const activeDays = Math.min(30, Math.floor((Date.now() - playerData.time) / (1000 * 60 * 60 * 24)));
    
    // Calculate participation rate
    const availableChallenges = 30; // Would be dynamic based on timeframe
    const participationRate = Math.min(100, (playerData.total_challenges / availableChallenges) * 100);
    
    // Calculate streak (simplified - would need historical data)
    const streakDays = this.calculateStreakDays(playerData, context.historicalData);

    return {
      activeDays,
      challengesCompleted: playerData.total_challenges,
      streakDays,
      participationRate: Math.round(participationRate)
    };
  }

  /**
   * Calculate progress metrics
   */
  private async calculateProgressMetrics(context: TransformationContext): Promise<DashboardMetrics['progress']> {
    const { playerData } = context;
    
    const levelProgress = playerData.level_progress?.percent_completed || 0;
    const nextLevelPoints = playerData.level_progress?.next_points || 0;
    
    // Calculate goals completed (simplified)
    const goalsCompleted = Math.floor(levelProgress / 25); // Assume 4 major goals per level
    
    // Calculate milestones (every 10% progress)
    const milestones = Math.floor(levelProgress / 10);
    
    // Estimate time to next level (simplified)
    const currentPointsPerDay = playerData.total_points / Math.max(1, Math.floor((Date.now() - playerData.time) / (1000 * 60 * 60 * 24)));
    const timeToNextLevel = currentPointsPerDay > 0 ? Math.ceil(nextLevelPoints / currentPointsPerDay) : 0;

    return {
      levelProgress: Math.round(levelProgress),
      goalsCompleted,
      milestones,
      timeToNextLevel
    };
  }

  /**
   * Calculate social metrics
   */
  private async calculateSocialMetrics(context: TransformationContext): Promise<DashboardMetrics['social']> {
    const { playerData, teamData, leaderboardData } = context;
    
    // Calculate team rank (simplified)
    let teamRank = 1;
    if (teamData && teamData.length > 1) {
      const sortedTeam = [...teamData].sort((a, b) => b.total_points - a.total_points);
      teamRank = sortedTeam.findIndex(member => member._id === playerData._id) + 1;
    }
    
    // Calculate team contribution
    const teamTotalPoints = teamData?.reduce((sum, member) => sum + member.total_points, 0) || playerData.total_points;
    const teamContribution = teamTotalPoints > 0 ? (playerData.total_points / teamTotalPoints) * 100 : 100;
    
    // Calculate collaboration score (simplified)
    const collaborationScore = this.calculateCollaborationScore(playerData, teamData);
    
    // Calculate mentorship points (from extra data)
    const mentorshipPoints = this.getNestedValue(playerData, 'extra.mentorship_points') || 0;

    return {
      teamRank,
      teamContribution: Math.round(teamContribution),
      collaborationScore: Math.round(collaborationScore),
      mentorshipPoints
    };
  }

  /**
   * Calculate achievement metrics
   */
  private async calculateAchievementMetrics(context: TransformationContext): Promise<DashboardMetrics['achievements']> {
    const { playerData } = context;
    
    // Extract achievement data from player extra data
    const badgesEarned = this.getNestedValue(playerData, 'extra.badges') || 0;
    const certificationsCompleted = this.getNestedValue(playerData, 'extra.certifications') || 0;
    const specialRecognitions = this.getNestedValue(playerData, 'extra.recognitions') || 0;
    const leaderboardAppearances = this.getNestedValue(playerData, 'extra.leaderboard_appearances') || 0;

    return {
      badgesEarned,
      certificationsCompleted,
      specialRecognitions,
      leaderboardAppearances
    };
  }

  /**
   * Apply transformation rule to data
   */
  async applyTransformation(
    data: any, 
    rule: TransformationRule, 
    context?: TransformationContext
  ): Promise<any> {
    const { transformation } = rule;
    const sourceValue = this.getNestedValue(data, rule.sourceField);
    
    switch (transformation.type) {
      case 'normalize':
        return this.normalizeValue(sourceValue, transformation.config);
        
      case 'scale':
        return this.scaleValue(sourceValue, transformation.config);
        
      case 'categorize':
        return this.categorizeValue(sourceValue, transformation.config);
        
      case 'aggregate':
        return this.aggregateValue(data, transformation.config);
        
      case 'calculate':
        return this.calculateValue(data, transformation.config, context);
        
      case 'format':
        return this.formatValue(sourceValue, transformation.config);
        
      default:
        return sourceValue;
    }
  }

  /**
   * Normalize value to a specific range
   */
  private normalizeValue(value: number, config: TransformationConfig): number {
    const { minValue = 0, maxValue = 100, targetMin = 0, targetMax = 100 } = config;
    
    if (maxValue === minValue) return targetMin;
    
    const normalized = ((value - minValue) / (maxValue - minValue)) * (targetMax - targetMin) + targetMin;
    return Math.max(targetMin, Math.min(targetMax, normalized));
  }

  /**
   * Scale value by factor and offset
   */
  private scaleValue(value: number, config: TransformationConfig): number {
    const { factor = 1, offset = 0 } = config;
    return (value * factor) + offset;
  }

  /**
   * Categorize value based on ranges
   */
  private categorizeValue(value: number, config: TransformationConfig): any {
    const { categories = [] } = config;
    
    for (const category of categories) {
      if (value >= category.min && value <= category.max) {
        return category.value;
      }
    }
    
    return null;
  }

  /**
   * Aggregate values based on operation
   */
  private aggregateValue(data: any, config: TransformationConfig): number {
    const { operation = 'sum', groupBy } = config;
    
    // Simplified aggregation - would be more complex in real implementation
    if (Array.isArray(data)) {
      switch (operation) {
        case 'sum':
          return data.reduce((sum, item) => sum + (typeof item === 'number' ? item : 0), 0);
        case 'average':
          return data.length > 0 ? data.reduce((sum, item) => sum + (typeof item === 'number' ? item : 0), 0) / data.length : 0;
        case 'min':
          return Math.min(...data.filter(item => typeof item === 'number'));
        case 'max':
          return Math.max(...data.filter(item => typeof item === 'number'));
        case 'count':
          return data.length;
        default:
          return 0;
      }
    }
    
    return 0;
  }

  /**
   * Calculate value using formula
   */
  private calculateValue(data: any, config: TransformationConfig, context?: TransformationContext): number {
    const { formula = '', variables = {} } = config;
    
    try {
      // Replace variables in formula
      let processedFormula = formula;
      
      for (const [varName, varPath] of Object.entries(variables)) {
        const value = this.getNestedValue(data, varPath) || 0;
        processedFormula = processedFormula.replace(new RegExp(varName, 'g'), value.toString());
      }
      
      // Evaluate formula (in production, use a safer evaluation method)
      const result = new Function(`return ${processedFormula}`)();
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.warn(`Failed to calculate formula: ${formula}`, error);
      return 0;
    }
  }

  /**
   * Format value according to format specification
   */
  private formatValue(value: any, config: TransformationConfig): string {
    const { format = 'number', precision = 0, locale = 'en-US' } = config;
    
    // Handle null/undefined values
    if (value === null || value === undefined) {
      switch (format) {
        case 'number':
          return '';
        case 'percentage':
          return '';
        case 'currency':
          return '';
        case 'date':
          return '';
        case 'duration':
          return '';
        default:
          return '';
      }
    }
    
    switch (format) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString(locale, { maximumFractionDigits: precision }) : '0';
        
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(precision)}%` : '0%';
        
      case 'currency':
        return typeof value === 'number' ? value.toLocaleString(locale, { style: 'currency', currency: 'USD' }) : '$0';
        
      case 'date':
        return value instanceof Date ? value.toLocaleDateString(locale) : new Date().toLocaleDateString(locale);
        
      case 'duration':
        return this.formatDuration(value);
        
      default:
        return value?.toString() || '';
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  }

  /**
   * Helper method to get nested object values
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Calculate consistency score (simplified)
   */
  private calculateConsistencyScore(playerData: FunifierPlayerStatus): number {
    // In a real implementation, this would analyze historical performance data
    const levelProgress = playerData.level_progress?.percent_completed || 0;
    const challengeRatio = playerData.total_challenges > 0 ? playerData.total_points / playerData.total_challenges : 0;
    
    // Simple heuristic: consistent players have steady progress and good challenge completion
    return Math.min(100, (levelProgress + challengeRatio) / 2);
  }

  /**
   * Determine performance trend
   */
  private determineTrend(playerData: FunifierPlayerStatus, historicalData?: Record<string, any>[]): 'up' | 'down' | 'stable' {
    // In a real implementation, this would compare with historical data
    // For now, use a simple heuristic based on level progress
    const levelProgress = playerData.level_progress?.percent_completed || 0;
    
    if (levelProgress > 75) return 'up';
    if (levelProgress < 25) return 'down';
    return 'stable';
  }

  /**
   * Calculate streak days (simplified)
   */
  private calculateStreakDays(playerData: FunifierPlayerStatus, historicalData?: Record<string, any>[]): number {
    // In a real implementation, this would analyze daily activity data
    // For now, return a calculated value based on activity level
    const activityLevel = playerData.total_challenges / Math.max(1, Math.floor((Date.now() - playerData.time) / (1000 * 60 * 60 * 24)));
    return Math.floor(activityLevel * 7); // Estimate based on activity
  }

  /**
   * Calculate collaboration score
   */
  private calculateCollaborationScore(playerData: FunifierPlayerStatus, teamData?: FunifierPlayerStatus[]): number {
    // In a real implementation, this would analyze collaboration activities
    // For now, use team participation as a proxy
    if (!teamData || teamData.length <= 1) return 0;
    
    const teamAverage = teamData.reduce((sum, member) => sum + member.total_points, 0) / teamData.length;
    const playerContribution = playerData.total_points / teamAverage;
    
    // Score based on how well the player contributes relative to team average
    return Math.min(100, playerContribution * 50);
  }

  /**
   * Get metric definition by ID
   */
  getMetricDefinition(metricId: string): MetricDefinition | undefined {
    return this.metricDefinitions.get(metricId);
  }

  /**
   * Get all metric definitions
   */
  getAllMetricDefinitions(): MetricDefinition[] {
    return Array.from(this.metricDefinitions.values());
  }

  /**
   * Add or update metric definition
   */
  setMetricDefinition(metric: MetricDefinition): void {
    this.metricDefinitions.set(metric.id, metric);
  }

  /**
   * Clear transformation cache
   */
  clearCache(playerId?: string): void {
    if (playerId) {
      const keys = this.cache.getStats().keys.filter(key => key.includes(playerId));
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get transformation statistics
   */
  getTransformationStats(): {
    cacheStats: { size: number; maxSize: number; keys: string[] };
    metricCount: number;
    transformationRuleCount: number;
  } {
    return {
      cacheStats: this.cache.getStats(),
      metricCount: this.metricDefinitions.size,
      transformationRuleCount: this.transformationRules.size
    };
  }
}

// Export singleton instance
export const dashboardDataTransformerService = DashboardDataTransformerService.getInstance();