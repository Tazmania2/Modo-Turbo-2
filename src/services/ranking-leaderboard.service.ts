import { funifierApiClient } from './funifier-api-client';
import { 
  FunifierLeaderboard, 
  FunifierLeader, 
  Leaderboard, 
  Player,
  RaceVisualization,
  PersonalCard 
} from '@/types/funifier';

export interface LeaderboardsResponse {
  leaderboards: Leaderboard[];
}

export interface PersonalRankingResponse {
  raceData: RaceVisualization;
  personalCard: PersonalCard;
  topThree: Player[];
  contextualRanking: {
    above: Player | null;
    current: Player;
    below: Player | null;
  };
}

export interface GlobalRankingResponse {
  raceData: RaceVisualization;
  fullRanking: Player[];
}

export interface LeaderboardAggregateQuery {
  pipeline: Array<{
    $match?: Record<string, unknown>;
    $sort?: Record<string, 1 | -1>;
    $limit?: number;
    $skip?: number;
    $lookup?: {
      from: string;
      localField: string;
      foreignField: string;
      as: string;
    };
    $project?: Record<string, unknown>;
  }>;
}

export class RankingLeaderboardService {
  /**
   * Fetch all available leaderboards from Funifier
   */
  async getLeaderboards(): Promise<LeaderboardsResponse> {
    try {
      const response = await funifierApiClient.get<FunifierLeaderboard[]>('/leaderboard');
      
      const leaderboards: Leaderboard[] = response.map(lb => ({
        _id: lb._id,
        name: lb.name,
        description: lb.description || '',
        type: lb.type,
        period: this.extractPeriodFromType(lb.type),
        startDate: new Date(), // This would need to be extracted from leaderboard metadata
        endDate: new Date(), // This would need to be extracted from leaderboard metadata
        isActive: lb.active,
        participants: lb.leaders?.length || 0,
        maxParticipants: undefined // Not provided by Funifier API
      }));

      return { leaderboards };
    } catch (error) {
      console.error('Failed to fetch leaderboards:', error);
      throw error;
    }
  }

  /**
   * Fetch leaderboard data for a specific leaderboard
   */
  async getLeaderboardData(leaderboardId: string): Promise<FunifierLeaderboard> {
    try {
      return await funifierApiClient.get<FunifierLeaderboard>(`/leaderboard/${leaderboardId}`);
    } catch (error) {
      console.error(`Failed to fetch leaderboard ${leaderboardId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch leaders using aggregate query for advanced filtering and sorting
   */
  async getLeaderboardAggregate(
    leaderboardId: string, 
    query: LeaderboardAggregateQuery
  ): Promise<FunifierLeader[]> {
    try {
      const response = await funifierApiClient.post<FunifierLeader[]>(
        `/v3/leaderboard/${leaderboardId}/leader/aggregate`,
        query
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch leaderboard aggregate for ${leaderboardId}:`, error);
      throw error;
    }
  }

  /**
   * Get personal ranking data for a specific player
   */
  async getPersonalRanking(leaderboardId: string, playerId: string): Promise<PersonalRankingResponse> {
    try {
      // Fetch full leaderboard data
      const leaderboardData = await this.getLeaderboardData(leaderboardId);
      
      // Get top 3 players
      const topThreeQuery: LeaderboardAggregateQuery = {
        pipeline: [
          { $sort: { points: -1 } },
          { $limit: 3 }
        ]
      };
      const topThreeLeaders = await this.getLeaderboardAggregate(leaderboardId, topThreeQuery);
      
      // Find current player and adjacent players
      const currentPlayerQuery: LeaderboardAggregateQuery = {
        pipeline: [
          { $match: { player: playerId } }
        ]
      };
      const currentPlayerData = await this.getLeaderboardAggregate(leaderboardId, currentPlayerQuery);
      
      if (currentPlayerData.length === 0) {
        throw new Error(`Player ${playerId} not found in leaderboard ${leaderboardId}`);
      }

      const currentPlayer = currentPlayerData[0];
      const currentPosition = currentPlayer.position;

      // Get players above and below current player
      const contextQuery: LeaderboardAggregateQuery = {
        pipeline: [
          { $sort: { points: -1 } },
          { $skip: Math.max(0, currentPosition - 2) },
          { $limit: 3 }
        ]
      };
      const contextPlayers = await this.getLeaderboardAggregate(leaderboardId, contextQuery);

      // Transform data
      const topThree = this.transformLeadersToPlayers(topThreeLeaders);
      const contextualRanking = this.buildContextualRanking(contextPlayers, playerId);
      const raceData = this.buildRaceVisualization(leaderboardData.leaders, playerId);
      const personalCard = this.buildPersonalCard(currentPlayer);

      return {
        raceData,
        personalCard,
        topThree,
        contextualRanking
      };
    } catch (error) {
      console.error(`Failed to get personal ranking for player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Get global ranking data for display purposes (TVs, public screens)
   */
  async getGlobalRanking(leaderboardId: string): Promise<GlobalRankingResponse> {
    try {
      const leaderboardData = await this.getLeaderboardData(leaderboardId);
      
      // Get all players sorted by points
      const allPlayersQuery: LeaderboardAggregateQuery = {
        pipeline: [
          { $sort: { points: -1 } }
        ]
      };
      const allLeaders = await this.getLeaderboardAggregate(leaderboardId, allPlayersQuery);

      const fullRanking = this.transformLeadersToPlayers(allLeaders);
      const raceData = this.buildRaceVisualization(allLeaders);

      return {
        raceData,
        fullRanking
      };
    } catch (error) {
      console.error(`Failed to get global ranking for leaderboard ${leaderboardId}:`, error);
      throw error;
    }
  }

  /**
   * Transform Funifier leaders to Player objects
   */
  private transformLeadersToPlayers(leaders: FunifierLeader[]): Player[] {
    return leaders.map(leader => ({
      _id: leader._id,
      name: leader.playerName,
      totalPoints: leader.points,
      position: leader.position,
      previousPosition: undefined, // Would need historical data
      pointsGainedToday: 0, // Would need daily tracking
      avatar: leader.avatar,
      team: leader.team || '',
      goals: [], // Goals are dashboard-specific, not ranking-specific
      lastUpdated: new Date()
    }));
  }

  /**
   * Build contextual ranking showing players above and below current player
   */
  private buildContextualRanking(
    contextPlayers: FunifierLeader[], 
    currentPlayerId: string
  ): PersonalRankingResponse['contextualRanking'] {
    const currentIndex = contextPlayers.findIndex(p => p.player === currentPlayerId);
    
    if (currentIndex === -1) {
      throw new Error('Current player not found in context');
    }

    const current = this.transformLeadersToPlayers([contextPlayers[currentIndex]])[0];
    const above = currentIndex > 0 ? 
      this.transformLeadersToPlayers([contextPlayers[currentIndex - 1]])[0] : null;
    const below = currentIndex < contextPlayers.length - 1 ? 
      this.transformLeadersToPlayers([contextPlayers[currentIndex + 1]])[0] : null;

    return { above, current, below };
  }

  /**
   * Build race visualization data
   */
  private buildRaceVisualization(
    leaders: FunifierLeader[], 
    currentPlayerId?: string
  ): RaceVisualization {
    const maxPoints = leaders.length > 0 ? Math.max(...leaders.map(l => l.points)) : 1;
    
    return {
      raceTrack: {
        length: 1000, // Virtual track length
        segments: 10,
        theme: 'default'
      },
      participants: leaders.slice(0, 10).map((leader, index) => ({
        playerId: leader.player,
        playerName: leader.playerName,
        avatar: leader.avatar,
        position: {
          x: (leader.points / maxPoints) * 1000, // Position based on points percentage
          y: index * 50, // Vertical spacing
          progress: (leader.points / maxPoints) * 100
        },
        vehicle: {
          type: this.getVehicleType(leader.position),
          color: this.getVehicleColor(index),
          speed: this.calculateSpeed(leader.points, maxPoints)
        },
        isCurrentUser: leader.player === currentPlayerId
      })),
      animations: {
        enabled: true,
        speed: 1.0,
        effects: ['smooth-movement', 'particle-trail']
      }
    };
  }

  /**
   * Build personal card data
   */
  private buildPersonalCard(leader: FunifierLeader): PersonalCard {
    return {
      playerId: leader.player,
      playerName: leader.playerName,
      avatar: leader.avatar,
      currentPosition: leader.position,
      previousPosition: undefined, // Would need historical data
      totalPoints: leader.points,
      pointsGainedToday: 0, // Would need daily tracking
      team: leader.team || '',
      level: Math.floor(leader.points / 1000) + 1, // Simple level calculation
      nextLevelPoints: ((Math.floor(leader.points / 1000) + 1) * 1000) - leader.points,
      achievements: [], // Would need achievement data
      streaks: {
        current: 0, // Would need streak tracking
        longest: 0
      },
      lastActivity: new Date()
    };
  }

  /**
   * Extract period information from leaderboard type
   */
  private extractPeriodFromType(type: string): string {
    if (type.toLowerCase().includes('daily')) return 'daily';
    if (type.toLowerCase().includes('weekly')) return 'weekly';
    if (type.toLowerCase().includes('monthly')) return 'monthly';
    if (type.toLowerCase().includes('season')) return 'seasonal';
    return 'ongoing';
  }

  /**
   * Get vehicle type based on position
   */
  private getVehicleType(position: number): string {
    if (position <= 3) return 'race-car';
    if (position <= 10) return 'motorcycle';
    return 'bicycle';
  }

  /**
   * Get vehicle color based on index
   */
  private getVehicleColor(index: number): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    return colors[index % colors.length];
  }

  /**
   * Calculate vehicle speed based on points ratio
   */
  private calculateSpeed(points: number, maxPoints: number): number {
    return Math.max(0.5, (points / maxPoints) * 2); // Speed between 0.5 and 2.0
  }
}

// Singleton instance
export const rankingLeaderboardService = new RankingLeaderboardService();