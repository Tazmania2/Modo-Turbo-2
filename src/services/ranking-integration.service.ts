import { 
  rankingLeaderboardService, 
  LeaderboardsResponse, 
  PersonalRankingResponse, 
  GlobalRankingResponse 
} from './ranking-leaderboard.service';
import { 
  rankingDataProcessorService, 
  ProcessedRankingData, 
  RaceVisualizationConfig 
} from './ranking-data-processor.service';
import { rankingCacheService } from './ranking-cache.service';
import { funifierPlayerService } from './funifier-player.service';
import { 
  FunifierLeaderboard, 
  FunifierLeader, 
  Leaderboard, 
  Player, 
  RaceVisualization, 
  PersonalCard 
} from '@/types/funifier';

export interface RankingIntegrationConfig {
  enableCaching: boolean;
  cacheConfig?: {
    leaderboardsTTL?: number;
    rankingDataTTL?: number;
    personalDataTTL?: number;
  };
  raceVisualizationConfig?: Partial<RaceVisualizationConfig>;
  maxRetries: number;
  retryDelay: number;
}

export interface RankingDashboardData {
  leaderboards: Leaderboard[];
  activeLeaderboard: Leaderboard | null;
  personalRanking: PersonalRankingResponse | null;
  globalRanking: GlobalRankingResponse | null;
  processedData: ProcessedRankingData | null;
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export class RankingIntegrationService {
  private config: RankingIntegrationConfig = {
    enableCaching: true,
    maxRetries: 3,
    retryDelay: 1000
  };

  constructor(customConfig?: Partial<RankingIntegrationConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Get all available leaderboards with caching
   */
  async getLeaderboards(forceRefresh: boolean = false): Promise<LeaderboardsResponse> {
    try {
      // Check cache first if enabled and not forcing refresh
      if (this.config.enableCaching && !forceRefresh) {
        const cached = await rankingCacheService.getCachedLeaderboards();
        if (cached) {
          return cached;
        }
      }

      // Fetch from API with retry logic
      const leaderboards = await this.retryOperation(
        () => rankingLeaderboardService.getLeaderboards()
      );

      // Cache the result
      if (this.config.enableCaching) {
        await rankingCacheService.cacheLeaderboards(leaderboards);
      }

      return leaderboards;
    } catch (error) {
      console.error('Failed to get leaderboards:', error);
      throw error;
    }
  }

  /**
   * Get personal ranking data for a player
   */
  async getPersonalRanking(
    leaderboardId: string, 
    playerId: string, 
    forceRefresh: boolean = false
  ): Promise<PersonalRankingResponse> {
    try {
      // Check cache first
      if (this.config.enableCaching && !forceRefresh) {
        const cached = await rankingCacheService.getCachedPersonalRanking(leaderboardId, playerId);
        if (cached) {
          return cached;
        }
      }

      // Fetch from API
      const personalRanking = await this.retryOperation(
        () => rankingLeaderboardService.getPersonalRanking(leaderboardId, playerId)
      );

      // Enhance with additional processing
      const enhancedRanking = await this.enhancePersonalRanking(personalRanking, playerId);

      // Cache the result
      if (this.config.enableCaching) {
        await rankingCacheService.cachePersonalRanking(leaderboardId, playerId, enhancedRanking);
      }

      return enhancedRanking;
    } catch (error) {
      console.error(`Failed to get personal ranking for player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Get global ranking data
   */
  async getGlobalRanking(
    leaderboardId: string, 
    forceRefresh: boolean = false
  ): Promise<GlobalRankingResponse> {
    try {
      // Check cache first
      if (this.config.enableCaching && !forceRefresh) {
        const cached = await rankingCacheService.getCachedGlobalRanking(leaderboardId);
        if (cached) {
          return cached;
        }
      }

      // Fetch from API
      const globalRanking = await this.retryOperation(
        () => rankingLeaderboardService.getGlobalRanking(leaderboardId)
      );

      // Cache the result
      if (this.config.enableCaching) {
        await rankingCacheService.cacheGlobalRanking(leaderboardId, globalRanking);
      }

      return globalRanking;
    } catch (error) {
      console.error(`Failed to get global ranking for leaderboard ${leaderboardId}:`, error);
      throw error;
    }
  }

  /**
   * Get processed ranking data with advanced analytics
   */
  async getProcessedRankingData(
    leaderboardId: string, 
    includeHistorical: boolean = false,
    forceRefresh: boolean = false
  ): Promise<ProcessedRankingData> {
    try {
      // Check cache first
      if (this.config.enableCaching && !forceRefresh) {
        const cached = await rankingCacheService.getCachedProcessedRankingData(leaderboardId);
        if (cached) {
          return cached;
        }
      }

      // Fetch leaderboard data
      const leaderboardData = await this.retryOperation(
        () => rankingLeaderboardService.getLeaderboardData(leaderboardId)
      );

      // Get historical data if requested
      let historicalData: FunifierLeader[] | undefined;
      if (includeHistorical) {
        // This would fetch historical data from a previous time period
        // For now, we'll skip this as it requires additional API endpoints
        historicalData = undefined;
      }

      // Process the data
      const processedData = rankingDataProcessorService.processLeaderboardData(
        leaderboardData.leaders,
        historicalData
      );

      // Cache the result
      if (this.config.enableCaching) {
        await rankingCacheService.cacheProcessedRankingData(leaderboardId, processedData);
      }

      return processedData;
    } catch (error) {
      console.error(`Failed to get processed ranking data for leaderboard ${leaderboardId}:`, error);
      throw error;
    }
  }

  /**
   * Get complete ranking dashboard data for a player
   */
  async getRankingDashboardData(
    playerId: string,
    leaderboardId?: string,
    forceRefresh: boolean = false
  ): Promise<RankingDashboardData> {
    const dashboardData: RankingDashboardData = {
      leaderboards: [],
      activeLeaderboard: null,
      personalRanking: null,
      globalRanking: null,
      processedData: null,
      lastUpdated: new Date(),
      isLoading: true,
      error: null
    };

    try {
      // Get all leaderboards
      const leaderboardsResponse = await this.getLeaderboards(forceRefresh);
      dashboardData.leaderboards = leaderboardsResponse.leaderboards;

      // Determine active leaderboard
      const activeLeaderboard = leaderboardId ? 
        leaderboardsResponse.leaderboards.find(lb => lb._id === leaderboardId) :
        leaderboardsResponse.leaderboards.find(lb => lb.isActive) ||
        leaderboardsResponse.leaderboards[0];

      if (!activeLeaderboard) {
        throw new Error('No active leaderboard found');
      }

      dashboardData.activeLeaderboard = activeLeaderboard;

      // Fetch data in parallel
      const [personalRanking, globalRanking, processedData] = await Promise.all([
        this.getPersonalRanking(activeLeaderboard._id, playerId, forceRefresh),
        this.getGlobalRanking(activeLeaderboard._id, forceRefresh),
        this.getProcessedRankingData(activeLeaderboard._id, true, forceRefresh)
      ]);

      dashboardData.personalRanking = personalRanking;
      dashboardData.globalRanking = globalRanking;
      dashboardData.processedData = processedData;
      dashboardData.isLoading = false;

    } catch (error) {
      console.error('Failed to get ranking dashboard data:', error);
      dashboardData.error = error instanceof Error ? error.message : 'Unknown error';
      dashboardData.isLoading = false;
    }

    return dashboardData;
  }

  /**
   * Create custom race visualization
   */
  async createRaceVisualization(
    leaderboardId: string,
    currentPlayerId?: string,
    config?: Partial<RaceVisualizationConfig>
  ): Promise<RaceVisualization> {
    try {
      const leaderboardData = await rankingLeaderboardService.getLeaderboardData(leaderboardId);
      
      return rankingDataProcessorService.transformToRaceVisualization(
        leaderboardData.leaders,
        currentPlayerId,
        config
      );
    } catch (error) {
      console.error(`Failed to create race visualization for leaderboard ${leaderboardId}:`, error);
      throw error;
    }
  }

  /**
   * Get contextual ranking around a specific player
   */
  async getContextualRanking(
    leaderboardId: string,
    playerId: string,
    contextSize: number = 3
  ): Promise<{
    above: Player[];
    current: Player;
    below: Player[];
  }> {
    try {
      const processedData = await this.getProcessedRankingData(leaderboardId);
      
      return rankingDataProcessorService.getContextualRanking(
        processedData.players,
        playerId,
        contextSize
      );
    } catch (error) {
      console.error(`Failed to get contextual ranking for player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific leaderboard
   */
  async invalidateLeaderboardCache(leaderboardId: string): Promise<void> {
    if (this.config.enableCaching) {
      await rankingCacheService.invalidateLeaderboard(leaderboardId);
    }
  }

  /**
   * Invalidate cache for specific player
   */
  async invalidatePlayerCache(playerId: string): Promise<void> {
    if (this.config.enableCaching) {
      await rankingCacheService.invalidatePlayerRanking(playerId);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return rankingCacheService.getCacheStats();
  }

  /**
   * Enhance personal ranking with additional player data
   */
  private async enhancePersonalRanking(
    personalRanking: PersonalRankingResponse,
    playerId: string
  ): Promise<PersonalRankingResponse> {
    try {
      // Get additional player status data
      const playerStatus = await funifierPlayerService.getPlayerStatus(playerId);
      
      // Enhance personal card with additional data
      const enhancedPersonalCard: PersonalCard = {
        ...personalRanking.personalCard,
        level: Math.floor(playerStatus.level_progress.percent / 10) + 1,
        nextLevelPoints: playerStatus.level_progress.next_points,
        lastActivity: new Date(playerStatus.time)
      };

      return {
        ...personalRanking,
        personalCard: enhancedPersonalCard
      };
    } catch (error) {
      console.warn('Failed to enhance personal ranking data:', error);
      return personalRanking; // Return original data if enhancement fails
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        throw error;
      }

      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.retryOperation(operation, attempt + 1);
    }
  }
}

// Singleton instance
export const rankingIntegrationService = new RankingIntegrationService();