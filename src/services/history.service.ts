import { FunifierDatabaseService } from './funifier-database.service';
import { FunifierPlayerService } from './funifier-player.service';
import { ConfigurationCache } from '../utils/cache';
import { Season, PerformanceGraph, HistoryData } from '../types/dashboard';
import { FunifierPlayerStatus } from '../types/funifier';
import { demoDataService } from './demo-data.service';

export class HistoryService {
  private databaseService: FunifierDatabaseService;
  private playerService: FunifierPlayerService;
  private cache: ConfigurationCache;
  private isDemoMode: boolean;

  constructor() {
    this.databaseService = new FunifierDatabaseService();
    this.playerService = new FunifierPlayerService();
    this.cache = new ConfigurationCache();
    this.isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || false;
  }

  /**
   * Retrieves season history data for a specific player
   * Implements requirement 3.1: Display data from previous seasons
   */
  async getPlayerSeasonHistory(playerId: string): Promise<Season[]> {
    const cacheKey = `player_season_history_${playerId}`;
    
    try {
      // Check cache first for performance (requirement 3.5)
      const cachedData = await this.cache.get<Season[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      let seasons: Season[];

      if (this.isDemoMode) {
        // Use demo data
        seasons = demoDataService.generateSeasonHistory(playerId);
      } else {
        // Query Funifier database for season data
        const seasonQuery = {
          collection: 'seasons__c',
          pipeline: [
            {
              $match: {
                'participants.playerId': playerId,
                status: 'completed'
              }
            },
            {
              $sort: { endDate: -1 }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                startDate: 1,
                endDate: 1,
                'participants.$': 1
              }
            }
          ]
        };

        const seasonData = await this.databaseService.aggregate(seasonQuery);
        
        seasons = seasonData.map((season: any) => ({
          _id: season._id,
          name: season.name,
          startDate: new Date(season.startDate),
          endDate: new Date(season.endDate),
          playerStats: {
            totalPoints: season.participants[0]?.totalPoints || 0,
            finalPosition: season.participants[0]?.finalPosition || 0,
            achievements: season.participants[0]?.achievements || [],
            goals: season.participants[0]?.goals || []
          }
        }));
      }

      // Cache results for improved performance (requirement 3.5)
      await this.cache.set(cacheKey, seasons, 300); // 5 minutes cache

      return seasons;
    } catch (error) {
      console.error('Error fetching season history:', error);
      
      // Return empty array if historical data is unavailable (requirement 3.4)
      return [];
    }
  }

  /**
   * Generates performance graphs for the current season
   * Implements requirement 3.3: Display performance trends and progress visualization
   */
  async getCurrentSeasonPerformanceGraphs(playerId: string): Promise<PerformanceGraph[]> {
    const cacheKey = `current_season_performance_${playerId}`;
    
    try {
      // Check cache first
      const cachedData = await this.cache.get<PerformanceGraph[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      let performanceGraphs: PerformanceGraph[];

      if (this.isDemoMode) {
        // Use demo data
        performanceGraphs = demoDataService.generateCurrentSeasonPerformanceGraphs(playerId);
      } else {
        // Get current season data from Funifier
        const currentSeasonQuery = {
          collection: 'player_daily_stats__c',
          pipeline: [
            {
              $match: {
                playerId: playerId,
                seasonId: { $exists: true },
                date: {
                  $gte: this.getCurrentSeasonStartDate(),
                  $lte: new Date()
                }
              }
            },
            {
              $sort: { date: 1 }
            },
            {
              $project: {
                date: 1,
                totalPoints: 1,
                position: 1
              }
            }
          ]
        };

        const dailyStats = await this.databaseService.aggregate(currentSeasonQuery);
        
        performanceGraphs = dailyStats.map((stat: any) => ({
          date: stat.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          points: stat.totalPoints || 0,
          position: stat.position || 0
        }));
      }

      // Cache results
      await this.cache.set(cacheKey, performanceGraphs, 180); // 3 minutes cache

      return performanceGraphs;
    } catch (error) {
      console.error('Error fetching current season performance:', error);
      
      // Return empty array if data is unavailable (requirement 3.4)
      return [];
    }
  }

  /**
   * Retrieves complete history data for a player
   * Implements requirement 3.1: Display historical data and current season performance graphs
   */
  async getPlayerHistoryData(playerId: string): Promise<HistoryData> {
    try {
      const [seasons, currentSeasonGraphs] = await Promise.all([
        this.getPlayerSeasonHistory(playerId),
        this.getCurrentSeasonPerformanceGraphs(playerId)
      ]);

      return {
        seasons,
        currentSeasonGraphs
      };
    } catch (error) {
      console.error('Error fetching player history data:', error);
      
      // Return empty data structure if error occurs
      return {
        seasons: [],
        currentSeasonGraphs: []
      };
    }
  }

  /**
   * Gets season-specific metrics and achievements
   * Implements requirement 3.2: Show season-specific metrics and achievements
   */
  async getSeasonDetails(seasonId: string, playerId: string): Promise<Season | null> {
    const cacheKey = `season_details_${seasonId}_${playerId}`;
    
    try {
      // Check cache first
      const cachedData = await this.cache.get<Season>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      let seasonDetails: Season | null = null;

      if (this.isDemoMode) {
        // Use demo data - find the season from generated history
        const seasons = demoDataService.generateSeasonHistory(playerId);
        seasonDetails = seasons.find(season => season._id === seasonId) || null;
      } else {
        // Query Funifier database
        const seasonQuery = {
          collection: 'seasons__c',
          pipeline: [
            {
              $match: {
                _id: seasonId,
                'participants.playerId': playerId
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                startDate: 1,
                endDate: 1,
                'participants.$': 1
              }
            }
          ]
        };

        const seasonData = await this.databaseService.aggregate(seasonQuery);
        
        if (seasonData && seasonData.length > 0) {
          const season = seasonData[0];
          const playerData = season.participants[0];

          seasonDetails = {
            _id: season._id,
            name: season.name,
            startDate: new Date(season.startDate),
            endDate: new Date(season.endDate),
            playerStats: {
              totalPoints: playerData?.totalPoints || 0,
              finalPosition: playerData?.finalPosition || 0,
              achievements: playerData?.achievements || [],
              goals: playerData?.goals || []
            }
          };
        }
      }

      if (seasonDetails) {
        // Cache results
        await this.cache.set(cacheKey, seasonDetails, 600); // 10 minutes cache
      }

      return seasonDetails;
    } catch (error) {
      console.error('Error fetching season details:', error);
      return null;
    }
  }

  /**
   * Invalidates history cache for a specific player
   * Used when new data is available
   */
  async invalidatePlayerHistoryCache(playerId: string): Promise<void> {
    const cacheKeys = [
      `player_season_history_${playerId}`,
      `current_season_performance_${playerId}`
    ];

    await Promise.all(
      cacheKeys.map(key => this.cache.delete(key))
    );
  }

  /**
   * Helper method to get current season start date
   * This would typically be configured based on business logic
   */
  private getCurrentSeasonStartDate(): Date {
    // For now, assume current season started at the beginning of the current year
    // This should be configurable based on actual season definitions
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1); // January 1st of current year
  }
}