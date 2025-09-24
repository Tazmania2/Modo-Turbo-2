import { 
  DashboardData, 
  Goal, 
  PlayerPerformance, 
  HistoryData, 
  PerformanceGraph 
} from '@/types/dashboard';
import { 
  FunifierPlayerStatus, 
  WhiteLabelConfiguration 
} from '@/types/funifier';
import { funifierPlayerService } from './funifier-player.service';
import { funifierDatabaseService } from './funifier-database.service';
import { ConfigurationCache } from '@/utils/cache';

export interface DashboardType {
  id: string;
  name: string;
  description: string;
  goalConfiguration: GoalConfiguration;
  teamProcessingRules: TeamProcessingRule[];
}

export interface GoalConfiguration {
  primaryGoal: GoalDefinition;
  secondaryGoals: GoalDefinition[];
  boostRules: BoostRule[];
}

export interface GoalDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  targetCalculation: TargetCalculation;
  progressCalculation: ProgressCalculation;
  unit: string;
}

export interface TargetCalculation {
  type: 'fixed' | 'dynamic' | 'team_based' | 'level_based';
  baseValue?: number;
  multiplier?: number;
  source?: string; // Funifier field or calculation
}

export interface ProgressCalculation {
  type: 'points' | 'challenges' | 'custom';
  source: string; // Funifier field path
  aggregation?: 'sum' | 'average' | 'max' | 'count';
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'cycle';
}

export interface BoostRule {
  id: string;
  name: string;
  condition: string; // JavaScript expression
  multiplier: number;
  duration: number; // in days
  emoji: string;
}

export interface TeamProcessingRule {
  teamPattern: string; // regex pattern for team names
  dashboardType: string;
  goalOverrides?: Partial<GoalConfiguration>;
  customCalculations?: Record<string, string>;
}

export interface DashboardProcessingOptions {
  playerId: string;
  dashboardType?: string;
  includeHistory?: boolean;
  cacheTTL?: number;
}

export interface ProcessedDashboardData extends DashboardData {
  metadata: {
    dashboardType: string;
    processingTime: number;
    dataFreshness: Date;
    teamInfo: {
      name: string;
      memberCount: number;
      averagePoints: number;
    };
    boosts: ActiveBoost[];
  };
}

export interface ActiveBoost {
  id: string;
  name: string;
  emoji: string;
  multiplier: number;
  remainingDays: number;
  appliedToGoals: string[];
}

/**
 * Dashboard Data Processing Service
 * Handles team-specific processing, goal calculations, and data transformations
 */
export class DashboardProcessorService {
  private static instance: DashboardProcessorService;
  private cache: ConfigurationCache;
  private dashboardTypes: Map<string, DashboardType>;

  private constructor() {
    this.cache = new ConfigurationCache({
      ttl: 5 * 60 * 1000, // 5 minutes for dashboard data
      maxSize: 200
    });
    this.dashboardTypes = new Map();
    this.initializeDashboardTypes();
  }

  static getInstance(): DashboardProcessorService {
    if (!DashboardProcessorService.instance) {
      DashboardProcessorService.instance = new DashboardProcessorService();
    }
    return DashboardProcessorService.instance;
  }

  /**
   * Initialize default dashboard types (Carteira I, II, III, IV)
   */
  private initializeDashboardTypes(): void {
    // Carteira I - Basic individual performance
    this.dashboardTypes.set('carteira_i', {
      id: 'carteira_i',
      name: 'Carteira I',
      description: 'Basic individual performance dashboard',
      goalConfiguration: {
        primaryGoal: {
          id: 'total_points',
          name: 'Total Points',
          description: 'Accumulate points through activities',
          emoji: '🎯',
          targetCalculation: {
            type: 'level_based',
            baseValue: 1000,
            multiplier: 1.2
          },
          progressCalculation: {
            type: 'points',
            source: 'total_points',
            timeframe: 'cycle'
          },
          unit: 'points'
        },
        secondaryGoals: [
          {
            id: 'challenges_completed',
            name: 'Challenges',
            description: 'Complete daily challenges',
            emoji: '⚡',
            targetCalculation: {
              type: 'fixed',
              baseValue: 5
            },
            progressCalculation: {
              type: 'challenges',
              source: 'total_challenges',
              timeframe: 'daily'
            },
            unit: 'challenges'
          },
          {
            id: 'level_progress',
            name: 'Level Progress',
            description: 'Progress towards next level',
            emoji: '📈',
            targetCalculation: {
              type: 'dynamic',
              source: 'level_progress.next_points'
            },
            progressCalculation: {
              type: 'custom',
              source: 'level_progress.percent_completed'
            },
            unit: '%'
          }
        ],
        boostRules: [
          {
            id: 'daily_streak',
            name: 'Daily Streak',
            condition: 'consecutiveDays >= 3',
            multiplier: 1.5,
            duration: 1,
            emoji: '🔥'
          }
        ]
      },
      teamProcessingRules: []
    });

    // Carteira II - Team collaboration focus
    this.dashboardTypes.set('carteira_ii', {
      id: 'carteira_ii',
      name: 'Carteira II',
      description: 'Team collaboration dashboard',
      goalConfiguration: {
        primaryGoal: {
          id: 'team_contribution',
          name: 'Team Contribution',
          description: 'Contribute to team goals',
          emoji: '🤝',
          targetCalculation: {
            type: 'team_based',
            baseValue: 500,
            multiplier: 1.0
          },
          progressCalculation: {
            type: 'points',
            source: 'total_points',
            aggregation: 'sum',
            timeframe: 'cycle'
          },
          unit: 'points'
        },
        secondaryGoals: [
          {
            id: 'team_challenges',
            name: 'Team Challenges',
            description: 'Participate in team activities',
            emoji: '👥',
            targetCalculation: {
              type: 'fixed',
              baseValue: 3
            },
            progressCalculation: {
              type: 'challenges',
              source: 'challenges',
              timeframe: 'weekly'
            },
            unit: 'activities'
          },
          {
            id: 'collaboration_score',
            name: 'Collaboration',
            description: 'Help team members succeed',
            emoji: '🌟',
            targetCalculation: {
              type: 'dynamic',
              baseValue: 100
            },
            progressCalculation: {
              type: 'custom',
              source: 'extra.collaboration_points'
            },
            unit: 'points'
          }
        ],
        boostRules: [
          {
            id: 'team_boost',
            name: 'Team Boost',
            condition: 'teamRank <= 3',
            multiplier: 2.0,
            duration: 7,
            emoji: '🚀'
          }
        ]
      },
      teamProcessingRules: [
        {
          teamPattern: '.*',
          dashboardType: 'carteira_ii',
          customCalculations: {
            'team_average': 'teamMembers.reduce((sum, member) => sum + member.total_points, 0) / teamMembers.length'
          }
        }
      ]
    });

    // Add Carteira III and IV with similar patterns...
    this.initializeAdvancedDashboardTypes();
  }

  /**
   * Initialize advanced dashboard types (III and IV)
   */
  private initializeAdvancedDashboardTypes(): void {
    // Carteira III - Performance optimization
    this.dashboardTypes.set('carteira_iii', {
      id: 'carteira_iii',
      name: 'Carteira III',
      description: 'Performance optimization dashboard',
      goalConfiguration: {
        primaryGoal: {
          id: 'efficiency_score',
          name: 'Efficiency Score',
          description: 'Optimize performance metrics',
          emoji: '⚡',
          targetCalculation: {
            type: 'dynamic',
            baseValue: 85,
            multiplier: 1.1
          },
          progressCalculation: {
            type: 'custom',
            source: 'calculated_efficiency'
          },
          unit: '%'
        },
        secondaryGoals: [
          {
            id: 'consistency_rating',
            name: 'Consistency',
            description: 'Maintain steady performance',
            emoji: '📊',
            targetCalculation: {
              type: 'fixed',
              baseValue: 90
            },
            progressCalculation: {
              type: 'custom',
              source: 'consistency_score'
            },
            unit: '%'
          },
          {
            id: 'innovation_points',
            name: 'Innovation',
            description: 'Try new approaches',
            emoji: '💡',
            targetCalculation: {
              type: 'level_based',
              baseValue: 50,
              multiplier: 1.3
            },
            progressCalculation: {
              type: 'points',
              source: 'point_categories.innovation'
            },
            unit: 'points'
          }
        ],
        boostRules: [
          {
            id: 'efficiency_boost',
            name: 'Efficiency Boost',
            condition: 'efficiency >= 90',
            multiplier: 1.8,
            duration: 3,
            emoji: '⚡'
          }
        ]
      },
      teamProcessingRules: []
    });

    // Carteira IV - Leadership and mentoring
    this.dashboardTypes.set('carteira_iv', {
      id: 'carteira_iv',
      name: 'Carteira IV',
      description: 'Leadership and mentoring dashboard',
      goalConfiguration: {
        primaryGoal: {
          id: 'leadership_impact',
          name: 'Leadership Impact',
          description: 'Lead and mentor others',
          emoji: '👑',
          targetCalculation: {
            type: 'team_based',
            baseValue: 200,
            multiplier: 1.5
          },
          progressCalculation: {
            type: 'custom',
            source: 'leadership_score'
          },
          unit: 'impact'
        },
        secondaryGoals: [
          {
            id: 'mentoring_sessions',
            name: 'Mentoring',
            description: 'Mentor team members',
            emoji: '🎓',
            targetCalculation: {
              type: 'fixed',
              baseValue: 2
            },
            progressCalculation: {
              type: 'custom',
              source: 'extra.mentoring_sessions'
            },
            unit: 'sessions'
          },
          {
            id: 'team_growth',
            name: 'Team Growth',
            description: 'Help team improve',
            emoji: '📈',
            targetCalculation: {
              type: 'dynamic',
              baseValue: 15
            },
            progressCalculation: {
              type: 'custom',
              source: 'team_growth_percentage'
            },
            unit: '%'
          }
        ],
        boostRules: [
          {
            id: 'leadership_boost',
            name: 'Leadership Boost',
            condition: 'teamGrowth > 20',
            multiplier: 2.5,
            duration: 14,
            emoji: '👑'
          }
        ]
      },
      teamProcessingRules: [
        {
          teamPattern: '.*',
          dashboardType: 'carteira_iv',
          customCalculations: {
            'team_growth': '((currentTeamAverage - previousTeamAverage) / previousTeamAverage) * 100'
          }
        }
      ]
    });
  }

  /**
   * Process dashboard data for a specific player
   */
  async processDashboardData(options: DashboardProcessingOptions): Promise<ProcessedDashboardData> {
    const startTime = Date.now();
    const cacheKey = `dashboard:${options.playerId}:${options.dashboardType || 'default'}`;
    
    // Check cache first
    const cached = this.cache.get<ProcessedDashboardData>(cacheKey);
    if (cached && !options.cacheTTL) {
      return cached;
    }

    try {
      // Get player data
      const playerStatus = await funifierPlayerService.getPlayerStatus(options.playerId);
      
      // Determine dashboard type
      const dashboardType = await this.determineDashboardType(playerStatus, options.dashboardType);
      const dashboardConfig = this.dashboardTypes.get(dashboardType);
      
      if (!dashboardConfig) {
        throw new Error(`Dashboard type ${dashboardType} not found`);
      }

      // Get team information
      const teamInfo = await this.getTeamInformation(playerStatus);
      
      // Process goals
      const primaryGoal = await this.processGoal(
        dashboardConfig.goalConfiguration.primaryGoal,
        playerStatus,
        teamInfo
      );
      
      const secondaryGoals = await Promise.all(
        dashboardConfig.goalConfiguration.secondaryGoals.map(goalDef =>
          this.processGoal(goalDef, playerStatus, teamInfo)
        )
      );

      // Calculate active boosts
      const activeBoosts = await this.calculateActiveBoosts(
        dashboardConfig.goalConfiguration.boostRules,
        playerStatus,
        teamInfo
      );

      // Build processed dashboard data
      const processedData: ProcessedDashboardData = {
        playerName: playerStatus.name,
        totalPoints: playerStatus.total_points,
        pointsLocked: false, // This would be determined by business rules
        currentCycleDay: this.getCurrentCycleDay(),
        totalCycleDays: this.getTotalCycleDays(),
        primaryGoal,
        secondaryGoal1: secondaryGoals[0] || this.getDefaultGoal(),
        secondaryGoal2: secondaryGoals[1] || this.getDefaultGoal(),
        metadata: {
          dashboardType,
          processingTime: Date.now() - startTime,
          dataFreshness: new Date(),
          teamInfo,
          boosts: activeBoosts
        }
      };

      // Cache the result
      this.cache.set(cacheKey, processedData, options.cacheTTL);
      
      return processedData;
    } catch (error) {
      throw new Error(`Failed to process dashboard data: ${error}`);
    }
  }

  /**
   * Determine the appropriate dashboard type for a player
   */
  private async determineDashboardType(
    playerStatus: FunifierPlayerStatus, 
    requestedType?: string
  ): Promise<string> {
    if (requestedType && this.dashboardTypes.has(requestedType)) {
      return requestedType;
    }

    // Default based on player level/experience first
    const levelProgress = playerStatus.level_progress?.percent_completed || 0;
    
    if (levelProgress < 25) return 'carteira_i';
    if (levelProgress < 50) return 'carteira_ii';
    if (levelProgress < 75) return 'carteira_iii';
    return 'carteira_iv';

    // Note: Team-based rules would be applied in a real implementation
    // where specific teams have specific dashboard requirements
    // For now, we prioritize level-based assignment for consistency
  }

  /**
   * Get team information for a player
   */
  private async getTeamInformation(playerStatus: FunifierPlayerStatus): Promise<{
    name: string;
    memberCount: number;
    averagePoints: number;
  }> {
    const teams = playerStatus.teams || [];
    
    if (teams.length === 0) {
      return {
        name: 'Individual',
        memberCount: 1,
        averagePoints: playerStatus.total_points
      };
    }

    const primaryTeam = teams[0];
    
    try {
      const teamMembers = await funifierPlayerService.getTeamMembers(primaryTeam);
      const averagePoints = teamMembers.reduce((sum, member) => sum + member.total_points, 0) / teamMembers.length;
      
      return {
        name: primaryTeam,
        memberCount: teamMembers.length,
        averagePoints: Math.round(averagePoints)
      };
    } catch (error) {
      return {
        name: primaryTeam,
        memberCount: 1,
        averagePoints: playerStatus.total_points
      };
    }
  }

  /**
   * Process a single goal definition into a Goal object
   */
  private async processGoal(
    goalDef: GoalDefinition,
    playerStatus: FunifierPlayerStatus,
    teamInfo: { name: string; memberCount: number; averagePoints: number }
  ): Promise<Goal> {
    // Calculate target
    const target = await this.calculateTarget(goalDef.targetCalculation, playerStatus, teamInfo);
    
    // Calculate current progress
    const current = await this.calculateProgress(goalDef.progressCalculation, playerStatus, teamInfo);
    
    // Calculate percentage
    const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    
    return {
      name: goalDef.name,
      percentage: Math.round(percentage),
      description: goalDef.description,
      emoji: goalDef.emoji,
      target,
      current,
      unit: goalDef.unit,
      hasBoost: false, // Will be updated by boost calculation
      isBoostActive: false,
      daysRemaining: this.getDaysRemainingInCycle()
    };
  }

  /**
   * Calculate target value based on target calculation rules
   */
  private async calculateTarget(
    targetCalc: TargetCalculation,
    playerStatus: FunifierPlayerStatus,
    teamInfo: { name: string; memberCount: number; averagePoints: number }
  ): Promise<number> {
    switch (targetCalc.type) {
      case 'fixed':
        return targetCalc.baseValue || 0;
        
      case 'level_based':
        const level = Math.floor((playerStatus.level_progress?.percent_completed || 0) / 10) + 1;
        return Math.round((targetCalc.baseValue || 0) * Math.pow(targetCalc.multiplier || 1, level - 1));
        
      case 'team_based':
        return Math.round((targetCalc.baseValue || 0) * (targetCalc.multiplier || 1) * teamInfo.memberCount);
        
      case 'dynamic':
        if (targetCalc.source) {
          return this.getNestedValue(playerStatus, targetCalc.source) || targetCalc.baseValue || 0;
        }
        return targetCalc.baseValue || 0;
        
      default:
        return targetCalc.baseValue || 0;
    }
  }

  /**
   * Calculate current progress based on progress calculation rules
   */
  private async calculateProgress(
    progressCalc: ProgressCalculation,
    playerStatus: FunifierPlayerStatus,
    teamInfo: { name: string; memberCount: number; averagePoints: number }
  ): Promise<number> {
    const sourceValue = this.getNestedValue(playerStatus, progressCalc.source);
    
    switch (progressCalc.type) {
      case 'points':
        return sourceValue || 0;
        
      case 'challenges':
        if (typeof sourceValue === 'object') {
          return Object.values(sourceValue as Record<string, number>).reduce((sum, val) => sum + val, 0);
        }
        return sourceValue || 0;
        
      case 'custom':
        // Handle custom calculations
        if (progressCalc.source.includes('efficiency')) {
          return this.calculateEfficiencyScore(playerStatus);
        }
        if (progressCalc.source.includes('consistency')) {
          return this.calculateConsistencyScore(playerStatus);
        }
        if (progressCalc.source.includes('leadership')) {
          return this.calculateLeadershipScore(playerStatus, teamInfo);
        }
        return sourceValue || 0;
        
      default:
        return sourceValue || 0;
    }
  }

  /**
   * Calculate active boosts for a player
   */
  private async calculateActiveBoosts(
    boostRules: BoostRule[],
    playerStatus: FunifierPlayerStatus,
    teamInfo: { name: string; memberCount: number; averagePoints: number }
  ): Promise<ActiveBoost[]> {
    const activeBoosts: ActiveBoost[] = [];
    
    for (const rule of boostRules) {
      const isActive = await this.evaluateBoostCondition(rule.condition, playerStatus, teamInfo);
      
      if (isActive) {
        activeBoosts.push({
          id: rule.id,
          name: rule.name,
          emoji: rule.emoji,
          multiplier: rule.multiplier,
          remainingDays: rule.duration,
          appliedToGoals: ['primary'] // This would be configurable
        });
      }
    }
    
    return activeBoosts;
  }

  /**
   * Evaluate boost condition
   */
  private async evaluateBoostCondition(
    condition: string,
    playerStatus: FunifierPlayerStatus,
    teamInfo: { name: string; memberCount: number; averagePoints: number }
  ): Promise<boolean> {
    try {
      // Create evaluation context
      const context = {
        totalPoints: playerStatus.total_points,
        levelProgress: playerStatus.level_progress?.percent_completed || 0,
        consecutiveDays: 3, // This would be calculated from historical data
        teamRank: 1, // This would be calculated from leaderboard data
        efficiency: this.calculateEfficiencyScore(playerStatus),
        teamGrowth: 15, // This would be calculated from team historical data
        teamMembers: teamInfo.memberCount,
        teamAverage: teamInfo.averagePoints
      };
      
      // Simple condition evaluation (in production, use a safer evaluation method)
      const func = new Function(...Object.keys(context), `return ${condition}`);
      return func(...Object.values(context));
    } catch (error) {
      console.warn(`Failed to evaluate boost condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Helper method to get nested object values
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Calculate efficiency score (custom metric)
   */
  private calculateEfficiencyScore(playerStatus: FunifierPlayerStatus): number {
    const pointsPerChallenge = playerStatus.total_challenges > 0 
      ? playerStatus.total_points / playerStatus.total_challenges 
      : 0;
    
    // Normalize to 0-100 scale (assuming 50 points per challenge is 100% efficient)
    return Math.min(100, (pointsPerChallenge / 50) * 100);
  }

  /**
   * Calculate consistency score (custom metric)
   */
  private calculateConsistencyScore(playerStatus: FunifierPlayerStatus): number {
    // This would typically analyze historical data
    // For now, return a calculated value based on available data
    const levelProgress = playerStatus.level_progress?.percent_completed || 0;
    return Math.min(100, levelProgress + 20); // Simplified calculation
  }

  /**
   * Calculate leadership score (custom metric)
   */
  private calculateLeadershipScore(
    playerStatus: FunifierPlayerStatus, 
    teamInfo: { name: string; memberCount: number; averagePoints: number }
  ): number {
    // Leadership score based on points relative to team average
    if (teamInfo.averagePoints === 0) return 0;
    
    const relativePerformance = (playerStatus.total_points / teamInfo.averagePoints) * 100;
    return Math.min(200, relativePerformance); // Cap at 200 for leadership impact
  }

  /**
   * Get default goal when no secondary goals are available
   */
  private getDefaultGoal(): Goal {
    return {
      name: 'Coming Soon',
      percentage: 0,
      description: 'New goals will be available soon',
      emoji: '⏳',
      target: 0,
      current: 0,
      unit: '',
      hasBoost: false,
      isBoostActive: false,
      daysRemaining: 0
    };
  }

  /**
   * Get current cycle day (would be configurable)
   */
  private getCurrentCycleDay(): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return Math.floor((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Get total cycle days (would be configurable)
   */
  private getTotalCycleDays(): number {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDayOfMonth.getDate();
  }

  /**
   * Get days remaining in current cycle
   */
  private getDaysRemainingInCycle(): number {
    return this.getTotalCycleDays() - this.getCurrentCycleDay();
  }

  /**
   * Get available dashboard types
   */
  getDashboardTypes(): DashboardType[] {
    return Array.from(this.dashboardTypes.values());
  }

  /**
   * Add or update a dashboard type
   */
  setDashboardType(dashboardType: DashboardType): void {
    this.dashboardTypes.set(dashboardType.id, dashboardType);
  }

  /**
   * Clear dashboard cache for a specific player
   */
  clearPlayerCache(playerId: string): void {
    const keys = this.cache.getStats().keys.filter(key => key.includes(playerId));
    keys.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; keys: string[] } {
    return this.cache.getStats();
  }
}

// Export singleton instance
export const dashboardProcessorService = DashboardProcessorService.getInstance();