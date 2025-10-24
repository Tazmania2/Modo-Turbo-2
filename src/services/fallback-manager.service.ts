import { FallbackMechanism, ErrorType } from '@/types/error';
import { errorLogger } from './error-logger.service';
import { demoDataService } from './demo-data.service';
import { demoModeService } from './demo-mode.service';

export interface FallbackConfig {
  [key: string]: FallbackMechanism;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class FallbackManagerService {
  private fallbackConfig: FallbackConfig = {
    funifierApi: {
      type: 'retry',
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000
    },
    dashboardData: {
      type: 'cache',
      enabled: true,
      fallbackData: null
    },
    rankingData: {
      type: 'cache',
      enabled: true,
      fallbackData: null
    },
    configuration: {
      type: 'demo',
      enabled: true,
      fallbackData: null
    }
  };

  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  /**
   * Execute a function with fallback mechanisms
   */
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    context?: Record<string, any>
  ): Promise<T> {
    const fallback = this.fallbackConfig[fallbackKey];
    
    if (!fallback?.enabled) {
      return operation();
    }

    try {
      if (fallback.type === 'retry') {
        return await this.executeWithRetry(operation, fallback, context);
      } else {
        return await operation();
      }
    } catch (error) {
      return this.handleFallback(error as Error, fallback, fallbackKey, context);
    }
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    fallback: FallbackMechanism,
    context?: Record<string, any>
  ): Promise<T> {
    const maxRetries = fallback.maxRetries || this.retryConfig.maxRetries;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = this.calculateRetryDelay(attempt, fallback.retryDelay);
        
        errorLogger.logCustomError(
          ErrorType.NETWORK_ERROR,
          `Retry attempt ${attempt + 1}/${maxRetries} failed`,
          { error: lastError.message, attempt },
          context
        );

        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Handle fallback when operation fails
   */
  private async handleFallback<T>(
    error: Error,
    fallback: FallbackMechanism,
    fallbackKey: string,
    context?: Record<string, any>
  ): Promise<T> {
    errorLogger.logCustomError(
      ErrorType.FUNIFIER_API_ERROR,
      `Operation failed, using fallback: ${fallback.type}`,
      { originalError: error.message, fallbackKey },
      context
    );

    switch (fallback.type) {
      case 'cache':
        return this.getCachedData(fallbackKey);
      
      case 'demo':
        return this.getDemoData(fallbackKey);
      
      case 'offline':
        return this.getOfflineData(fallbackKey);
      
      default:
        throw error;
    }
  }

  /**
   * Get cached data as fallback
   */
  private async getCachedData<T>(fallbackKey: string): Promise<T> {
    try {
      // Try to get from cache (Redis or local storage)
      const cached = await this.getFromCache(fallbackKey);
      if (cached) {
        return cached;
      }
    } catch (err) {
      console.warn('Cache fallback failed:', err);
    }

    // If cache fails, try demo data
    return this.getDemoData(fallbackKey);
  }

  /**
   * Get demo data as fallback
   * Only returns demo data if demo mode is active
   */
  private async getDemoData<T>(fallbackKey: string): Promise<T> {
    // Verify demo mode is active before returning demo data
    if (!demoModeService.isDemoMode()) {
      throw new Error('Demo data requested but demo mode is not active');
    }

    switch (fallbackKey) {
      case 'dashboardData':
        // Generate demo dashboard data using available methods
        const players = demoDataService.generatePlayers(50);
        const playerStatus = demoDataService.generatePlayerStatus('demo_player_1');
        const data = {
          player: playerStatus,
          goals: playerStatus.challenges,
          leaderboards: demoDataService.generateLeaderboards(),
          performanceGraphs: demoDataService.generateCurrentSeasonPerformanceGraphs('demo_player_1'),
          source: 'demo' // Mark as demo data
        };
        return data as T;
      
      case 'rankingData':
        // Generate demo ranking data
        const rankingPlayers = demoDataService.generatePlayers(50);
        const rankingData = {
          players: rankingPlayers,
          leaderboards: demoDataService.generateLeaderboards(),
          raceVisualization: demoDataService.generateRaceVisualization(rankingPlayers),
          personalCard: demoDataService.generatePersonalCard('demo_player_1', rankingPlayers),
          contextualRanking: demoDataService.generateContextualRanking('demo_player_1', rankingPlayers),
          source: 'demo' // Mark as demo data
        };
        return rankingData as T;
      
      case 'configuration':
        // Generate demo white label configuration
        return {
          branding: {
            companyName: 'Demo Company',
            logo: 'https://via.placeholder.com/200x80',
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981'
          },
          features: {
            dashboard: true,
            ranking: true,
            history: true,
            admin: true
          },
          source: 'demo' // Mark as demo data
        } as T;
      
      default:
        throw new Error(`No demo data available for ${fallbackKey}`);
    }
  }

  /**
   * Get offline data as fallback
   */
  private async getOfflineData<T>(fallbackKey: string): Promise<T> {
    // Try local storage or IndexedDB
    try {
      const stored = localStorage.getItem(`offline_${fallbackKey}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Offline data retrieval failed:', err);
    }

    // Fallback to demo data
    return this.getDemoData(fallbackKey);
  }

  /**
   * Update fallback configuration
   */
  updateFallbackConfig(key: string, config: Partial<FallbackMechanism>): void {
    this.fallbackConfig[key] = {
      ...this.fallbackConfig[key],
      ...config
    };
  }

  /**
   * Enable/disable fallback for a specific key
   */
  setFallbackEnabled(key: string, enabled: boolean): void {
    if (this.fallbackConfig[key]) {
      this.fallbackConfig[key].enabled = enabled;
    }
  }

  /**
   * Get current fallback configuration
   */
  getFallbackConfig(): FallbackConfig {
    return { ...this.fallbackConfig };
  }

  /**
   * Check if fallback is available for a key
   */
  isFallbackAvailable(key: string): boolean {
    return this.fallbackConfig[key]?.enabled || false;
  }

  /**
   * Store data for offline fallback
   */
  async storeOfflineData(key: string, data: any): Promise<void> {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to store offline data:', err);
    }
  }

  private calculateRetryDelay(attempt: number, baseDelay?: number): number {
    const base = baseDelay || this.retryConfig.baseDelay;
    const delay = base * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getFromCache(key: string): Promise<any> {
    // This would integrate with the actual cache service
    // For now, return null to indicate cache miss
    return null;
  }
}

export const fallbackManager = new FallbackManagerService();