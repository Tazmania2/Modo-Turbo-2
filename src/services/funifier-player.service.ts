import { FunifierPlayerStatus, FunifierLeaderboard, FunifierLeader } from '@/types/funifier';
import { funifierApiClient } from './funifier-api-client';

export interface PlayerSearchQuery {
  name?: string;
  team?: string;
  limit?: number;
  skip?: number;
}

export interface LeaderboardQuery {
  active?: boolean;
  type?: string;
  limit?: number;
  skip?: number;
}

export interface LeaderQuery {
  leaderboardId: string;
  limit?: number;
  skip?: number;
  playerId?: string;
}

export interface PlayerHistoryQuery {
  playerId: string;
  startDate?: Date;
  endDate?: Date;
  season?: string;
}

export interface PlayerPerformanceData {
  playerId: string;
  playerName: string;
  totalPoints: number;
  position: number;
  previousPosition?: number;
  pointsGainedToday: number;
  avatar?: string;
  team: string;
  lastUpdated: Date;
}

export class FunifierPlayerService {
  private static instance: FunifierPlayerService;

  private constructor() {}

  static getInstance(): FunifierPlayerService {
    if (!FunifierPlayerService.instance) {
      FunifierPlayerService.instance = new FunifierPlayerService();
    }
    return FunifierPlayerService.instance;
  }

  /**
   * Get player status by ID
   */
  async getPlayerStatus(playerId: string): Promise<FunifierPlayerStatus> {
    try {
      const result = await funifierApiClient.get<FunifierPlayerStatus>(
        `/v3/player/${playerId}/status`
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get multiple players' status
   */
  async getPlayersStatus(playerIds: string[]): Promise<FunifierPlayerStatus[]> {
    try {
      const result = await funifierApiClient.post<FunifierPlayerStatus[]>(
        '/v3/player/status/batch',
        { playerIds }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search for players
   */
  async searchPlayers(query: PlayerSearchQuery): Promise<FunifierPlayerStatus[]> {
    try {
      const result = await funifierApiClient.post<FunifierPlayerStatus[]>(
        '/v3/player/search',
        query
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get player by name
   */
  async getPlayerByName(name: string): Promise<FunifierPlayerStatus | null> {
    try {
      const players = await this.searchPlayers({ name, limit: 1 });
      return players.length > 0 ? players[0] : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all leaderboards
   */
  async getLeaderboards(query: LeaderboardQuery = {}): Promise<FunifierLeaderboard[]> {
    try {
      const result = await funifierApiClient.post<FunifierLeaderboard[]>(
        '/v3/leaderboard',
        query
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leaderboard by ID
   */
  async getLeaderboard(leaderboardId: string): Promise<FunifierLeaderboard> {
    try {
      const result = await funifierApiClient.get<FunifierLeaderboard>(
        `/v3/leaderboard/${leaderboardId}`
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leaders from a leaderboard
   */
  async getLeaders(query: LeaderQuery): Promise<FunifierLeader[]> {
    try {
      const { leaderboardId, ...params } = query;
      const result = await funifierApiClient.post<FunifierLeader[]>(
        `/v3/leaderboard/${leaderboardId}/leader`,
        params
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leaders with aggregation (for complex queries)
   */
  async getLeadersAggregate(
    leaderboardId: string,
    pipeline: Record<string, unknown>[]
  ): Promise<FunifierLeader[]> {
    try {
      const result = await funifierApiClient.post<FunifierLeader[]>(
        `/v3/leaderboard/${leaderboardId}/leader/aggregate`,
        { pipeline }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get player's position in leaderboard
   */
  async getPlayerPosition(leaderboardId: string, playerId: string): Promise<FunifierLeader | null> {
    try {
      const result = await funifierApiClient.get<FunifierLeader>(
        `/v3/leaderboard/${leaderboardId}/leader/${playerId}`
      );
      return result;
    } catch (error) {
      // Return null if player not found in leaderboard
      return null;
    }
  }

  /**
   * Get contextual ranking around a player
   */
  async getContextualRanking(
    leaderboardId: string,
    playerId: string,
    context: number = 3
  ): Promise<{
    above: FunifierLeader[];
    current: FunifierLeader | null;
    below: FunifierLeader[];
    topThree: FunifierLeader[];
  }> {
    try {
      const playerPosition = await this.getPlayerPosition(leaderboardId, playerId);
      
      if (!playerPosition) {
        const topThree = await this.getLeaders({ leaderboardId, limit: 3 });
        return {
          above: [],
          current: null,
          below: [],
          topThree,
        };
      }

      const position = playerPosition.position;
      
      // Get top 3
      const topThree = await this.getLeaders({ leaderboardId, limit: 3 });
      
      // Get contextual players around current player
      const startPosition = Math.max(1, position - context);
      const endPosition = position + context;
      
      const contextualPlayers = await this.getLeadersAggregate(leaderboardId, [
        { $match: { position: { $gte: startPosition, $lte: endPosition } } },
        { $sort: { position: 1 } }
      ]);

      const above = contextualPlayers.filter(p => p.position < position);
      const below = contextualPlayers.filter(p => p.position > position);

      return {
        above,
        current: playerPosition,
        below,
        topThree,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get player teams
   */
  async getPlayerTeams(playerId: string): Promise<string[]> {
    try {
      const playerStatus = await this.getPlayerStatus(playerId);
      return playerStatus.teams || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamName: string): Promise<FunifierPlayerStatus[]> {
    try {
      const result = await this.searchPlayers({ team: teamName });
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get player performance data for dashboard
   */
  async getPlayerPerformance(playerId: string): Promise<PlayerPerformanceData> {
    try {
      const playerStatus = await this.getPlayerStatus(playerId);
      
      // Get player's position from active leaderboards
      const leaderboards = await this.getLeaderboards({ active: true, limit: 1 });
      let position = 0;
      
      if (leaderboards.length > 0) {
        const playerPosition = await this.getPlayerPosition(leaderboards[0]._id, playerId);
        position = playerPosition?.position || 0;
      }

      return {
        playerId: playerStatus._id,
        playerName: playerStatus.name,
        totalPoints: playerStatus.total_points,
        position,
        pointsGainedToday: 0, // This would need to be calculated from historical data
        avatar: playerStatus.image?.medium?.url,
        team: playerStatus.teams?.[0] || '',
        lastUpdated: new Date(playerStatus.time),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get player historical data
   */
  async getPlayerHistory(query: PlayerHistoryQuery): Promise<Record<string, unknown>[]> {
    try {
      // This would typically query a historical data collection
      // For now, we'll use the database service to query historical collections
      const { playerId, startDate, endDate, season } = query;
      
      const filter: Record<string, unknown> = { playerId };
      
      if (startDate && endDate) {
        filter.time = {
          $gte: startDate.getTime(),
          $lte: endDate.getTime(),
        };
      }
      
      if (season) {
        filter.season = season;
      }

      // This assumes there's a historical data collection
      // The actual collection name would depend on Funifier's setup
      const result = await funifierApiClient.post<Record<string, unknown>[]>(
        '/v3/database/player_history/find',
        { filter }
      );
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get player statistics summary
   */
  async getPlayerStats(playerId: string): Promise<{
    totalChallenges: number;
    completedChallenges: number;
    totalPoints: number;
    levelProgress: number;
    catalogItems: number;
  }> {
    try {
      const playerStatus = await this.getPlayerStatus(playerId);
      
      return {
        totalChallenges: playerStatus.total_challenges,
        completedChallenges: Object.values(playerStatus.challenges).reduce((sum, count) => sum + count, 0),
        totalPoints: playerStatus.total_points,
        levelProgress: playerStatus.level_progress.percent_completed,
        catalogItems: playerStatus.total_catalog_items,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch get player performance data
   */
  async getBatchPlayerPerformance(playerIds: string[]): Promise<PlayerPerformanceData[]> {
    try {
      const playersStatus = await this.getPlayersStatus(playerIds);
      const leaderboards = await this.getLeaderboards({ active: true, limit: 1 });
      
      const performanceData: PlayerPerformanceData[] = [];
      
      for (const playerStatus of playersStatus) {
        let position = 0;
        
        if (leaderboards.length > 0) {
          const playerPosition = await this.getPlayerPosition(leaderboards[0]._id, playerStatus._id);
          position = playerPosition?.position || 0;
        }

        performanceData.push({
          playerId: playerStatus._id,
          playerName: playerStatus.name,
          totalPoints: playerStatus.total_points,
          position,
          pointsGainedToday: 0,
          avatar: playerStatus.image?.medium?.url,
          team: playerStatus.teams?.[0] || '',
          lastUpdated: new Date(playerStatus.time),
        });
      }
      
      return performanceData;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const funifierPlayerService = FunifierPlayerService.getInstance();