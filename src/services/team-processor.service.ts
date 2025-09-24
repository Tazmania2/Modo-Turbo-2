import { FunifierPlayerStatus } from '@/types/funifier';
import { PlayerPerformance } from '@/types/dashboard';
import { funifierPlayerService } from './funifier-player.service';
import { ConfigurationCache } from '@/utils/cache';

export interface TeamMetrics {
  teamName: string;
  memberCount: number;
  totalPoints: number;
  averagePoints: number;
  topPerformer: PlayerPerformance;
  bottomPerformer: PlayerPerformance;
  pointsDistribution: {
    min: number;
    max: number;
    median: number;
    standardDeviation: number;
  };
  growthRate: number; // Percentage growth from previous period
  activityLevel: 'low' | 'medium' | 'high';
  cohesionScore: number; // 0-100 based on point distribution
}

export interface TeamComparison {
  currentTeam: TeamMetrics;
  comparisonTeams: TeamMetrics[];
  ranking: {
    position: number;
    totalTeams: number;
    percentile: number;
  };
  insights: TeamInsight[];
}

export interface TeamInsight {
  type: 'strength' | 'opportunity' | 'warning' | 'achievement';
  title: string;
  description: string;
  metric: string;
  value: number;
  benchmark: number;
  actionable: boolean;
}

export interface TeamProcessingOptions {
  teamName: string;
  includeComparisons?: boolean;
  includeInsights?: boolean;
  cacheTTL?: number;
  historicalPeriods?: number; // Number of periods to analyze for trends
}

export interface TeamDashboardData {
  teamMetrics: TeamMetrics;
  memberPerformances: PlayerPerformance[];
  teamComparison?: TeamComparison;
  recommendations: TeamRecommendation[];
  lastUpdated: Date;
}

export interface TeamRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'engagement' | 'collaboration' | 'growth';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  timeframe: string;
}

/**
 * Team Processor Service
 * Handles team-specific data processing, analytics, and insights
 */
export class TeamProcessorService {
  private static instance: TeamProcessorService;
  private cache: ConfigurationCache;

  private constructor() {
    this.cache = new ConfigurationCache({
      ttl: 10 * 60 * 1000, // 10 minutes for team data
      maxSize: 100
    });
  }

  static getInstance(): TeamProcessorService {
    if (!TeamProcessorService.instance) {
      TeamProcessorService.instance = new TeamProcessorService();
    }
    return TeamProcessorService.instance;
  }

  /**
   * Process team data and generate comprehensive team dashboard
   */
  async processTeamData(options: TeamProcessingOptions): Promise<TeamDashboardData> {
    const cacheKey = `team:${options.teamName}:${options.includeComparisons ? 'full' : 'basic'}`;
    
    // Check cache first
    const cached = this.cache.get<TeamDashboardData>(cacheKey);
    if (cached && !options.cacheTTL) {
      return cached;
    }

    try {
      // Get team members
      const teamMembers = await funifierPlayerService.getTeamMembers(options.teamName);
      
      if (teamMembers.length === 0) {
        throw new Error(`No members found for team: ${options.teamName}`);
      }

      // Calculate team metrics
      const teamMetrics = await this.calculateTeamMetrics(options.teamName, teamMembers);
      
      // Get member performances
      const memberPerformances = await this.getMemberPerformances(teamMembers);
      
      // Generate team comparison if requested
      let teamComparison: TeamComparison | undefined;
      if (options.includeComparisons) {
        teamComparison = await this.generateTeamComparison(teamMetrics);
      }
      
      // Generate recommendations
      const recommendations = await this.generateTeamRecommendations(
        teamMetrics, 
        memberPerformances,
        teamComparison
      );

      const teamDashboardData: TeamDashboardData = {
        teamMetrics,
        memberPerformances,
        teamComparison,
        recommendations,
        lastUpdated: new Date()
      };

      // Cache the result
      this.cache.set(cacheKey, teamDashboardData, options.cacheTTL);
      
      return teamDashboardData;
    } catch (error) {
      throw new Error(`Failed to process team data: ${error}`);
    }
  }

  /**
   * Calculate comprehensive team metrics
   */
  private async calculateTeamMetrics(
    teamName: string, 
    teamMembers: FunifierPlayerStatus[]
  ): Promise<TeamMetrics> {
    const points = teamMembers.map(member => member.total_points);
    const totalPoints = points.reduce((sum, p) => sum + p, 0);
    const averagePoints = totalPoints / teamMembers.length;
    
    // Find top and bottom performers
    const sortedMembers = [...teamMembers].sort((a, b) => b.total_points - a.total_points);
    const topPerformer = await this.convertToPlayerPerformance(sortedMembers[0], 1);
    const bottomPerformer = await this.convertToPlayerPerformance(
      sortedMembers[sortedMembers.length - 1], 
      sortedMembers.length
    );

    // Calculate distribution statistics
    const sortedPoints = [...points].sort((a, b) => a - b);
    const median = this.calculateMedian(sortedPoints);
    const standardDeviation = this.calculateStandardDeviation(points, averagePoints);
    
    // Calculate activity level
    const activityLevel = this.calculateActivityLevel(teamMembers);
    
    // Calculate cohesion score (lower standard deviation = higher cohesion)
    const cohesionScore = Math.max(0, 100 - (standardDeviation / averagePoints) * 100);
    
    // Calculate growth rate (would need historical data in real implementation)
    const growthRate = this.estimateGrowthRate(teamMembers);

    return {
      teamName,
      memberCount: teamMembers.length,
      totalPoints,
      averagePoints: Math.round(averagePoints),
      topPerformer,
      bottomPerformer,
      pointsDistribution: {
        min: Math.min(...points),
        max: Math.max(...points),
        median: Math.round(median),
        standardDeviation: Math.round(standardDeviation)
      },
      growthRate,
      activityLevel,
      cohesionScore: Math.round(cohesionScore)
    };
  }

  /**
   * Get performance data for all team members
   */
  private async getMemberPerformances(teamMembers: FunifierPlayerStatus[]): Promise<PlayerPerformance[]> {
    const performances: PlayerPerformance[] = [];
    
    for (let i = 0; i < teamMembers.length; i++) {
      const member = teamMembers[i];
      const performance = await this.convertToPlayerPerformance(member, i + 1);
      performances.push(performance);
    }
    
    return performances.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  /**
   * Convert FunifierPlayerStatus to PlayerPerformance
   */
  private async convertToPlayerPerformance(
    player: FunifierPlayerStatus, 
    position: number
  ): Promise<PlayerPerformance> {
    return {
      playerId: player._id,
      playerName: player.name,
      totalPoints: player.total_points,
      position,
      pointsGainedToday: 0, // Would be calculated from historical data
      avatar: player.image?.medium?.url,
      team: player.teams?.[0] || '',
      goals: [], // Would be populated from dashboard processor
      lastUpdated: new Date(player.time)
    };
  }

  /**
   * Generate team comparison with other teams
   */
  private async generateTeamComparison(currentTeam: TeamMetrics): Promise<TeamComparison> {
    try {
      // In a real implementation, this would query all teams
      // For now, we'll simulate comparison data
      const comparisonTeams = await this.getComparisonTeams(currentTeam.teamName);
      
      // Calculate ranking
      const allTeams = [currentTeam, ...comparisonTeams];
      const sortedTeams = allTeams.sort((a, b) => b.averagePoints - a.averagePoints);
      const position = sortedTeams.findIndex(team => team.teamName === currentTeam.teamName) + 1;
      const percentile = Math.round(((allTeams.length - position + 1) / allTeams.length) * 100);
      
      // Generate insights
      const insights = this.generateTeamInsights(currentTeam, comparisonTeams);

      return {
        currentTeam,
        comparisonTeams,
        ranking: {
          position,
          totalTeams: allTeams.length,
          percentile
        },
        insights
      };
    } catch (error) {
      throw new Error(`Failed to generate team comparison: ${error}`);
    }
  }

  /**
   * Get comparison teams (simulated for now)
   */
  private async getComparisonTeams(excludeTeam: string): Promise<TeamMetrics[]> {
    // In a real implementation, this would query other teams from Funifier
    // For now, return simulated data
    return [
      {
        teamName: 'Alpha Team',
        memberCount: 8,
        totalPoints: 12000,
        averagePoints: 1500,
        topPerformer: {} as PlayerPerformance,
        bottomPerformer: {} as PlayerPerformance,
        pointsDistribution: { min: 800, max: 2200, median: 1450, standardDeviation: 350 },
        growthRate: 15,
        activityLevel: 'high' as const,
        cohesionScore: 85
      },
      {
        teamName: 'Beta Squad',
        memberCount: 6,
        totalPoints: 8400,
        averagePoints: 1400,
        topPerformer: {} as PlayerPerformance,
        bottomPerformer: {} as PlayerPerformance,
        pointsDistribution: { min: 900, max: 1900, median: 1350, standardDeviation: 280 },
        growthRate: 8,
        activityLevel: 'medium' as const,
        cohesionScore: 92
      }
    ].filter(team => team.teamName !== excludeTeam);
  }

  /**
   * Generate insights by comparing team with others
   */
  private generateTeamInsights(currentTeam: TeamMetrics, comparisonTeams: TeamMetrics[]): TeamInsight[] {
    const insights: TeamInsight[] = [];
    
    if (comparisonTeams.length === 0) return insights;
    
    const avgComparison = comparisonTeams.reduce((sum, team) => sum + team.averagePoints, 0) / comparisonTeams.length;
    const cohesionComparison = comparisonTeams.reduce((sum, team) => sum + team.cohesionScore, 0) / comparisonTeams.length;
    
    // Performance insight
    if (currentTeam.averagePoints > avgComparison * 1.1) {
      insights.push({
        type: 'strength',
        title: 'Above Average Performance',
        description: 'Your team is performing significantly better than similar teams',
        metric: 'averagePoints',
        value: currentTeam.averagePoints,
        benchmark: avgComparison,
        actionable: false
      });
    } else if (currentTeam.averagePoints < avgComparison * 0.9) {
      insights.push({
        type: 'opportunity',
        title: 'Performance Gap',
        description: 'There\'s room for improvement compared to similar teams',
        metric: 'averagePoints',
        value: currentTeam.averagePoints,
        benchmark: avgComparison,
        actionable: true
      });
    }
    
    // Cohesion insight
    if (currentTeam.cohesionScore > cohesionComparison * 1.1) {
      insights.push({
        type: 'strength',
        title: 'Excellent Team Cohesion',
        description: 'Your team shows great consistency in performance',
        metric: 'cohesionScore',
        value: currentTeam.cohesionScore,
        benchmark: cohesionComparison,
        actionable: false
      });
    } else if (currentTeam.cohesionScore < cohesionComparison * 0.8) {
      insights.push({
        type: 'warning',
        title: 'Performance Disparity',
        description: 'Large gaps between top and bottom performers',
        metric: 'cohesionScore',
        value: currentTeam.cohesionScore,
        benchmark: cohesionComparison,
        actionable: true
      });
    }
    
    // Growth insight
    if (currentTeam.growthRate > 20) {
      insights.push({
        type: 'achievement',
        title: 'Rapid Growth',
        description: 'Your team is showing exceptional growth',
        metric: 'growthRate',
        value: currentTeam.growthRate,
        benchmark: 15,
        actionable: false
      });
    } else if (currentTeam.growthRate < 5) {
      insights.push({
        type: 'opportunity',
        title: 'Growth Opportunity',
        description: 'Consider strategies to accelerate team progress',
        metric: 'growthRate',
        value: currentTeam.growthRate,
        benchmark: 15,
        actionable: true
      });
    }
    
    return insights;
  }

  /**
   * Generate actionable recommendations for the team
   */
  private async generateTeamRecommendations(
    teamMetrics: TeamMetrics,
    memberPerformances: PlayerPerformance[],
    teamComparison?: TeamComparison
  ): Promise<TeamRecommendation[]> {
    const recommendations: TeamRecommendation[] = [];
    
    // Performance-based recommendations
    if (teamMetrics.cohesionScore < 70) {
      recommendations.push({
        id: 'improve_cohesion',
        priority: 'high',
        category: 'collaboration',
        title: 'Improve Team Cohesion',
        description: 'Large performance gaps detected between team members',
        actionItems: [
          'Pair high performers with those needing support',
          'Implement peer mentoring program',
          'Set team-based goals alongside individual ones',
          'Regular team check-ins and collaboration sessions'
        ],
        expectedImpact: 'Reduce performance gaps by 20-30%',
        timeframe: '2-4 weeks'
      });
    }
    
    // Activity level recommendations
    if (teamMetrics.activityLevel === 'low') {
      recommendations.push({
        id: 'boost_engagement',
        priority: 'high',
        category: 'engagement',
        title: 'Boost Team Engagement',
        description: 'Team activity levels are below optimal',
        actionItems: [
          'Introduce team challenges and competitions',
          'Recognize and celebrate small wins',
          'Implement gamification elements',
          'Regular team building activities'
        ],
        expectedImpact: 'Increase activity by 40-50%',
        timeframe: '1-2 weeks'
      });
    }
    
    // Growth recommendations
    if (teamMetrics.growthRate < 10) {
      recommendations.push({
        id: 'accelerate_growth',
        priority: 'medium',
        category: 'growth',
        title: 'Accelerate Team Growth',
        description: 'Team growth rate is below average',
        actionItems: [
          'Set progressive skill development goals',
          'Provide additional training resources',
          'Implement stretch assignments',
          'Create innovation time for new approaches'
        ],
        expectedImpact: 'Increase growth rate to 15-20%',
        timeframe: '4-6 weeks'
      });
    }
    
    // Top performer recommendations
    const topPerformerGap = teamMetrics.topPerformer.totalPoints - teamMetrics.averagePoints;
    if (topPerformerGap > teamMetrics.averagePoints * 0.5) {
      recommendations.push({
        id: 'leverage_top_performer',
        priority: 'medium',
        category: 'collaboration',
        title: 'Leverage Top Performer',
        description: 'Utilize your top performer to elevate the entire team',
        actionItems: [
          'Have top performer lead training sessions',
          'Create knowledge sharing opportunities',
          'Assign mentoring responsibilities',
          'Document and share best practices'
        ],
        expectedImpact: 'Lift team average by 10-15%',
        timeframe: '2-3 weeks'
      });
    }
    
    // Comparison-based recommendations
    if (teamComparison) {
      const performanceGap = teamComparison.currentTeam.averagePoints - 
        (teamComparison.comparisonTeams.reduce((sum, team) => sum + team.averagePoints, 0) / teamComparison.comparisonTeams.length);
      
      if (performanceGap < -200) {
        recommendations.push({
          id: 'close_performance_gap',
          priority: 'high',
          category: 'performance',
          title: 'Close Performance Gap',
          description: 'Team is underperforming compared to similar teams',
          actionItems: [
            'Analyze top-performing teams\' strategies',
            'Implement proven best practices',
            'Focus on high-impact activities',
            'Increase frequency of performance reviews'
          ],
          expectedImpact: 'Close gap by 50-70%',
          timeframe: '3-5 weeks'
        });
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate median value
   */
  private calculateMedian(sortedNumbers: number[]): number {
    const mid = Math.floor(sortedNumbers.length / 2);
    return sortedNumbers.length % 2 !== 0 
      ? sortedNumbers[mid] 
      : (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(numbers: number[], mean: number): number {
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    const avgSquaredDiff = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate activity level based on team member data
   */
  private calculateActivityLevel(teamMembers: FunifierPlayerStatus[]): 'low' | 'medium' | 'high' {
    const avgChallenges = teamMembers.reduce((sum, member) => sum + member.total_challenges, 0) / teamMembers.length;
    
    if (avgChallenges < 5) return 'low';
    if (avgChallenges < 15) return 'medium';
    return 'high';
  }

  /**
   * Estimate growth rate (simplified calculation)
   */
  private estimateGrowthRate(teamMembers: FunifierPlayerStatus[]): number {
    // In a real implementation, this would compare with historical data
    // For now, estimate based on level progress and activity
    const avgLevelProgress = teamMembers.reduce((sum, member) => 
      sum + (member.level_progress?.percent_completed || 0), 0) / teamMembers.length;
    
    const avgActivity = teamMembers.reduce((sum, member) => sum + member.total_challenges, 0) / teamMembers.length;
    
    // Adjusted formula to better correlate with performance
    // High level progress and activity should result in higher growth rates
    const baseGrowth = (avgLevelProgress / 10) + (avgActivity / 2);
    return Math.min(30, Math.max(5, baseGrowth));
  }

  /**
   * Get team processing statistics
   */
  getProcessingStats(): {
    cacheStats: { size: number; maxSize: number; keys: string[] };
    processedTeams: number;
  } {
    const cacheStats = this.cache.getStats();
    const processedTeams = cacheStats.keys.filter(key => key.startsWith('team:')).length;
    
    return {
      cacheStats,
      processedTeams
    };
  }

  /**
   * Clear team cache
   */
  clearTeamCache(teamName?: string): void {
    if (teamName) {
      const keys = this.cache.getStats().keys.filter(key => key.includes(teamName));
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Batch process multiple teams
   */
  async batchProcessTeams(teamNames: string[], options: Omit<TeamProcessingOptions, 'teamName'> = {}): Promise<Map<string, TeamDashboardData>> {
    const results = new Map<string, TeamDashboardData>();
    
    // Process teams in parallel with concurrency limit
    const concurrencyLimit = 3;
    const chunks = this.chunkArray(teamNames, concurrencyLimit);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (teamName) => {
        try {
          const data = await this.processTeamData({ ...options, teamName });
          return { teamName, data };
        } catch (error) {
          console.error(`Failed to process team ${teamName}:`, error);
          return null;
        }
      });
      
      const chunkResults = await Promise.all(promises);
      chunkResults.forEach(result => {
        if (result) {
          results.set(result.teamName, result.data);
        }
      });
    }
    
    return results;
  }

  /**
   * Helper method to chunk array
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const teamProcessorService = TeamProcessorService.getInstance();