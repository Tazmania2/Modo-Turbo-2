import { 
  FunifierLeader, 
  Player, 
  RaceVisualization, 
  PersonalCard,
  FunifierPlayerStatus 
} from '@/types/funifier';

export interface RankingCalculationResult {
  position: number;
  previousPosition?: number;
  positionChange: 'up' | 'down' | 'same' | 'new';
  pointsGainedToday: number;
  pointsGainedThisWeek: number;
  averagePointsPerDay: number;
  percentileRank: number;
}

export interface ProcessedRankingData {
  players: Player[];
  totalParticipants: number;
  averagePoints: number;
  medianPoints: number;
  topPerformer: Player | null;
  lastUpdated: Date;
  statistics: {
    totalPoints: number;
    activeParticipants: number;
    completionRate: number;
  };
}

export interface RaceVisualizationConfig {
  trackLength: number;
  maxParticipants: number;
  animationSpeed: number;
  theme: 'default' | 'space' | 'underwater' | 'forest';
  showTrails: boolean;
  showPositions: boolean;
}

export class RankingDataProcessorService {
  private readonly DEFAULT_RACE_CONFIG: RaceVisualizationConfig = {
    trackLength: 1000,
    maxParticipants: 10,
    animationSpeed: 1.0,
    theme: 'default',
    showTrails: true,
    showPositions: true
  };

  /**
   * Process raw leaderboard data into structured ranking information
   */
  processLeaderboardData(
    leaders: FunifierLeader[],
    historicalData?: FunifierLeader[]
  ): ProcessedRankingData {
    // Sort leaders by points (descending)
    const sortedLeaders = [...leaders].sort((a, b) => b.points - a.points);
    
    // Calculate positions
    const playersWithPositions = this.calculatePositions(sortedLeaders);
    
    // Transform to Player objects with additional calculations
    const players = playersWithPositions.map((leader, index) => {
      const historical = historicalData?.find(h => h.player === leader.player);
      const calculation = this.calculateRankingMetrics(leader, historical, sortedLeaders);
      
      return {
        _id: leader._id,
        name: leader.playerName,
        totalPoints: leader.points,
        position: calculation.position,
        previousPosition: calculation.previousPosition,
        pointsGainedToday: calculation.pointsGainedToday,
        avatar: leader.avatar,
        team: leader.team || '',
        goals: [], // Goals are dashboard-specific
        lastUpdated: new Date()
      };
    });

    // Calculate statistics
    const statistics = this.calculateStatistics(players);
    
    return {
      players,
      totalParticipants: players.length,
      averagePoints: statistics.averagePoints,
      medianPoints: statistics.medianPoints,
      topPerformer: players.length > 0 ? players[0] : null,
      lastUpdated: new Date(),
      statistics: {
        totalPoints: statistics.totalPoints,
        activeParticipants: statistics.activeParticipants,
        completionRate: statistics.completionRate
      }
    };
  }

  /**
   * Calculate positions handling ties correctly
   */
  calculatePositions(leaders: FunifierLeader[]): FunifierLeader[] {
    const sorted = [...leaders].sort((a, b) => b.points - a.points);
    let currentPosition = 1;
    let previousPoints = -1;
    let playersAtSamePosition = 0;

    return sorted.map((leader) => {
      if (leader.points !== previousPoints) {
        currentPosition += playersAtSamePosition;
        playersAtSamePosition = 1;
        previousPoints = leader.points;
      } else {
        playersAtSamePosition++;
      }

      return {
        ...leader,
        position: currentPosition
      };
    });
  }

  /**
   * Calculate ranking metrics for a player
   */
  calculateRankingMetrics(
    current: FunifierLeader,
    historical?: FunifierLeader,
    allPlayers?: FunifierLeader[]
  ): RankingCalculationResult {
    const position = current.position;
    const previousPosition = historical?.position;
    
    let positionChange: 'up' | 'down' | 'same' | 'new' = 'new';
    if (previousPosition !== undefined) {
      if (position < previousPosition) positionChange = 'up';
      else if (position > previousPosition) positionChange = 'down';
      else positionChange = 'same';
    }

    const pointsGainedToday = historical ? 
      Math.max(0, current.points - historical.points) : 0;
    
    // Estimate weekly gains (would need more historical data in real implementation)
    const pointsGainedThisWeek = pointsGainedToday * 7;
    const averagePointsPerDay = pointsGainedToday;

    // Calculate percentile rank
    const percentileRank = allPlayers ? 
      this.calculatePercentileRank(current, allPlayers) : 0;

    return {
      position,
      previousPosition,
      positionChange,
      pointsGainedToday,
      pointsGainedThisWeek,
      averagePointsPerDay,
      percentileRank
    };
  }

  /**
   * Calculate percentile rank for a player
   */
  private calculatePercentileRank(player: FunifierLeader, allPlayers: FunifierLeader[]): number {
    const playersBelow = allPlayers.filter(p => p.points < player.points).length;
    return (playersBelow / allPlayers.length) * 100;
  }

  /**
   * Calculate overall statistics for the leaderboard
   */
  private calculateStatistics(players: Player[]): {
    averagePoints: number;
    medianPoints: number;
    totalPoints: number;
    activeParticipants: number;
    completionRate: number;
  } {
    if (players.length === 0) {
      return {
        averagePoints: 0,
        medianPoints: 0,
        totalPoints: 0,
        activeParticipants: 0,
        completionRate: 0
      };
    }

    const points = players.map(p => p.totalPoints).sort((a, b) => a - b);
    const totalPoints = points.reduce((sum, p) => sum + p, 0);
    const averagePoints = totalPoints / players.length;
    const medianPoints = points[Math.floor(points.length / 2)];
    
    // Consider players with points > 0 as active
    const activeParticipants = players.filter(p => p.totalPoints > 0).length;
    const completionRate = (activeParticipants / players.length) * 100;

    return {
      averagePoints,
      medianPoints,
      totalPoints,
      activeParticipants,
      completionRate
    };
  }

  /**
   * Transform leaderboard data into race visualization
   */
  transformToRaceVisualization(
    leaders: FunifierLeader[],
    currentPlayerId?: string,
    config: Partial<RaceVisualizationConfig> = {}
  ): RaceVisualization {
    const raceConfig = { ...this.DEFAULT_RACE_CONFIG, ...config };
    const maxPoints = leaders.length > 0 ? Math.max(...leaders.map(l => l.points)) : 1;
    
    // Take only the top participants for visualization
    const topParticipants = leaders
      .slice(0, raceConfig.maxParticipants)
      .sort((a, b) => b.points - a.points);

    return {
      raceTrack: {
        length: raceConfig.trackLength,
        segments: Math.min(10, topParticipants.length),
        theme: raceConfig.theme
      },
      participants: topParticipants.map((leader, index) => {
        const progress = maxPoints > 0 ? (leader.points / maxPoints) * 100 : 0;
        
        return {
          playerId: leader.player,
          playerName: leader.playerName,
          avatar: leader.avatar,
          position: {
            x: (progress / 100) * raceConfig.trackLength,
            y: this.calculateTrackPosition(index, topParticipants.length),
            progress
          },
          vehicle: {
            type: this.getVehicleTypeByPosition(leader.position),
            color: this.getVehicleColorByIndex(index),
            speed: this.calculateVehicleSpeed(progress, raceConfig.animationSpeed)
          },
          isCurrentUser: leader.player === currentPlayerId
        };
      }),
      animations: {
        enabled: true,
        speed: raceConfig.animationSpeed,
        effects: this.getAnimationEffects(raceConfig)
      }
    };
  }

  /**
   * Calculate track position for participant
   */
  private calculateTrackPosition(index: number, totalParticipants: number): number {
    const trackHeight = 400; // Virtual track height
    const spacing = trackHeight / Math.max(1, totalParticipants - 1);
    return index * spacing;
  }

  /**
   * Get vehicle type based on ranking position
   */
  private getVehicleTypeByPosition(position: number): string {
    if (position === 1) return 'formula-1';
    if (position <= 3) return 'race-car';
    if (position <= 5) return 'sports-car';
    if (position <= 10) return 'motorcycle';
    return 'bicycle';
  }

  /**
   * Get vehicle color by index
   */
  private getVehicleColorByIndex(index: number): string {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Light Yellow
      '#BB8FCE', // Light Purple
      '#85C1E9'  // Light Blue
    ];
    return colors[index % colors.length];
  }

  /**
   * Calculate vehicle speed based on progress and animation speed
   */
  private calculateVehicleSpeed(progress: number, baseSpeed: number): number {
    // Higher progress = faster speed, with minimum speed
    const speedMultiplier = Math.max(0.3, progress / 100);
    return baseSpeed * speedMultiplier;
  }

  /**
   * Get animation effects based on configuration
   */
  private getAnimationEffects(config: RaceVisualizationConfig): string[] {
    const effects = ['smooth-movement'];
    
    if (config.showTrails) {
      effects.push('particle-trail');
    }
    
    if (config.showPositions) {
      effects.push('position-indicators');
    }
    
    switch (config.theme) {
      case 'space':
        effects.push('star-field', 'rocket-boost');
        break;
      case 'underwater':
        effects.push('bubble-trail', 'water-ripples');
        break;
      case 'forest':
        effects.push('leaf-particles', 'wind-effects');
        break;
      default:
        effects.push('dust-trail');
    }
    
    return effects;
  }

  /**
   * Create personal card data from player status and ranking info
   */
  createPersonalCard(
    playerStatus: FunifierPlayerStatus,
    rankingInfo: RankingCalculationResult,
    teamInfo?: { name: string; position: number }
  ): PersonalCard {
    return {
      playerId: playerStatus._id,
      playerName: playerStatus.name,
      avatar: playerStatus.image?.medium?.url,
      currentPosition: rankingInfo.position,
      previousPosition: rankingInfo.previousPosition,
      totalPoints: playerStatus.total_points,
      pointsGainedToday: rankingInfo.pointsGainedToday,
      team: teamInfo?.name || '',
      level: Math.floor(playerStatus.level_progress.percent / 10) + 1,
      nextLevelPoints: playerStatus.level_progress.next_points,
      achievements: [], // Would need to fetch from achievements API
      streaks: {
        current: 0, // Would need streak tracking
        longest: 0
      },
      lastActivity: new Date(playerStatus.time)
    };
  }

  /**
   * Filter and sort players for contextual ranking display
   */
  getContextualRanking(
    allPlayers: Player[],
    currentPlayerId: string,
    contextSize: number = 3
  ): {
    above: Player[];
    current: Player;
    below: Player[];
  } {
    const sortedPlayers = [...allPlayers].sort((a, b) => a.position - b.position);
    const currentIndex = sortedPlayers.findIndex(p => p._id === currentPlayerId);
    
    if (currentIndex === -1) {
      throw new Error(`Player ${currentPlayerId} not found in ranking`);
    }

    const current = sortedPlayers[currentIndex];
    const startIndex = Math.max(0, currentIndex - contextSize);
    const endIndex = Math.min(sortedPlayers.length, currentIndex + contextSize + 1);
    
    const contextPlayers = sortedPlayers.slice(startIndex, endIndex);
    const currentInContext = contextPlayers.findIndex(p => p._id === currentPlayerId);
    
    return {
      above: contextPlayers.slice(0, currentInContext),
      current,
      below: contextPlayers.slice(currentInContext + 1)
    };
  }
}

// Singleton instance
export const rankingDataProcessorService = new RankingDataProcessorService();