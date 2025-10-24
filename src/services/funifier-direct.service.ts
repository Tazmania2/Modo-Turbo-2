/**
 * FunifierDirectService - Direct Funifier API integration service
 * Replaces internal API routes with direct Funifier API calls from the frontend
 * 
 * This service provides:
 * - Direct authentication with Funifier
 * - Secure token storage and management
 * - White label configuration operations
 * - User dashboard and ranking data access
 * - Admin operations
 * - Mode-aware data fetching (demo vs production)
 */

import { FunifierApiClient } from './funifier-api-client';
import { ErrorHandlerService, ErrorContext } from './error-handler.service';
import { fallbackService } from './fallback.service';
import { tokenStorageService, TokenStorageService } from './token-storage.service';
import { cacheStrategyService } from './cache-strategy.service';
import { demoModeService } from './demo-mode.service';
import { demoDataService } from './demo-data.service';
import {
  AuthResponse,
  UserProfile,
  DashboardData,
  RankingData,
  WhiteLabelConfig,
  GlobalRanking,
  PersonalizedRanking,
  AdminVerification,
  QuickAction,
  ActionResult,
  RankingFilters,
} from '@/types/funifier-api-responses';
import { FunifierCredentials } from '@/types/funifier';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  token?: string;
  expiresIn?: number;
  error?: string;
}

/**
 * FunifierDirectService - Main service for direct Funifier API integration
 */
export class FunifierDirectService {
  private apiClient: FunifierApiClient;
  private instanceId: string;
  private tokenStorage: TokenStorageService;

  constructor(credentials?: FunifierCredentials, instanceId?: string) {
    this.apiClient = new FunifierApiClient(credentials?.serverUrl);
    
    if (credentials) {
      this.apiClient.setCredentials(credentials);
    }
    
    this.instanceId = instanceId || this.getDefaultInstanceId();
    this.tokenStorage = tokenStorageService;
    this.tokenStorage.setApiClient(this.apiClient);
  }

  /**
   * Get default instance ID from environment or generate one
   */
  private getDefaultInstanceId(): string {
    if (typeof window !== 'undefined') {
      // Try to get from localStorage
      const stored = localStorage.getItem('funifier_instance_id');
      if (stored) return stored;
    }
    
    // Use environment variable or default
    return process.env.NEXT_PUBLIC_FUNIFIER_INSTANCE_ID || 'default';
  }

  /**
   * Set instance ID for white label operations
   */
  setInstanceId(instanceId: string): void {
    this.instanceId = instanceId;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('funifier_instance_id', instanceId);
    }
  }

  /**
   * Get current instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Check if system is in demo mode
   */
  isDemoMode(): boolean {
    return demoModeService.isDemoMode();
  }

  /**
   * Get data source information
   */
  getDataSourceInfo() {
    return demoModeService.getDataSourceInfo();
  }

  /**
   * Validate that data is from the correct source
   */
  private validateDataSource(data: any, operation: string): void {
    const expectedSource = this.isDemoMode() ? 'demo' : 'funifier';
    const isValid = demoModeService.validateDataSource(data, expectedSource);
    
    if (!isValid) {
      console.warn(
        `[FunifierDirectService] Data source validation failed for ${operation}`,
        { expectedSource, isDemoMode: this.isDemoMode() }
      );
    }
  }

  /**
   * Execute operation with mode-aware data fetching
   * In demo mode, returns demo data. In production, calls Funifier API
   */
  private async executeWithModeAwareness<T>(
    operation: string,
    funifierOperation: () => Promise<T>,
    demoDataGenerator: () => T
  ): Promise<T> {
    if (this.isDemoMode()) {
      console.log(`[FunifierDirectService] Using demo data for ${operation}`);
      const demoData = demoDataGenerator();
      this.validateDataSource(demoData, operation);
      return demoData;
    }

    console.log(`[FunifierDirectService] Using Funifier API for ${operation}`);
    const data = await funifierOperation();
    this.validateDataSource(data, operation);
    return data;
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  /**
   * Authenticate user with Funifier and store tokens securely
   * In demo mode, uses demo authentication
   */
  async authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
    // Handle demo mode authentication
    if (this.isDemoMode()) {
      try {
        const demoAuth = await demoDataService.authenticateDemo(
          credentials.username,
          credentials.password
        );
        
        const demoUser: UserProfile = {
          _id: `demo_user_${credentials.username}`,
          name: credentials.username.charAt(0).toUpperCase() + credentials.username.slice(1),
          total_challenges: 0,
          challenges: {},
          total_points: 0,
          point_categories: {},
          total_catalog_items: 0,
          catalog_items: {},
          level_progress: {
            percent_completed: 0,
            next_points: 100,
            total_levels: 10,
            percent: 0
          },
          challenge_progress: [],
          teams: demoAuth.user_type === 'admin' ? ['admin'] : ['user'],
          positions: [],
          time: Date.now(),
          extra: {
            username: credentials.username,
            email: `${credentials.username}@demo.local`,
            roles: demoAuth.user_type === 'admin' ? ['admin', 'user'] : ['user']
          },
          pointCategories: {}
        };

        // Store demo token
        this.tokenStorage.storeToken(
          demoAuth.access_token,
          demoAuth.expires_in,
          undefined,
          demoUser._id
        );

        console.log('[FunifierDirectService] Demo authentication successful');
        return {
          success: true,
          user: demoUser,
          token: demoAuth.access_token,
          expiresIn: demoAuth.expires_in,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Demo authentication failed',
        };
      }
    }

    // Production mode - use real Funifier authentication
    const errorContext: ErrorContext = {
      operation: 'authenticateUser',
      username: credentials.username,
    };

    try {
      const response = await ErrorHandlerService.withRetry(
        () => this.apiClient.authenticate(credentials.username, credentials.password),
        { maxAttempts: 2 }, // Only retry once for auth
        errorContext
      );

      // Get user profile
      const userProfile = await this.apiClient.getCurrentUserProfile();

      // Store token securely using TokenStorageService
      this.tokenStorage.storeToken(
        response.access_token,
        response.expires_in,
        response.refresh_token,
        userProfile._id
      );

      console.log('[FunifierDirectService] Funifier authentication successful');
      return {
        success: true,
        user: userProfile,
        token: response.access_token,
        expiresIn: response.expires_in,
      };
    } catch (error) {
      const userError = ErrorHandlerService.handleFunifierError(error as any, errorContext);
      
      return {
        success: false,
        error: userError.message,
      };
    }
  }

  /**
   * Get valid authentication token (with automatic refresh if needed)
   */
  async getValidToken(): Promise<string | null> {
    return this.tokenStorage.getValidToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.tokenStorage.isTokenValid();
  }

  /**
   * Get stored user ID
   */
  getUserId(): string | null {
    return this.tokenStorage.getUserId();
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    return this.tokenStorage.refreshToken();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await this.apiClient.logout();
    } catch (error) {
      // Log error but continue with local cleanup
      console.warn('Logout API call failed:', error);
    } finally {
      this.tokenStorage.clearToken();
      
      // Clear any cached data
      fallbackService.clearCache();
    }
  }

  // ============================================================================
  // White Label Configuration Methods
  // ============================================================================

  /**
   * Get white label configuration for current instance
   */
  async getWhiteLabelConfig(): Promise<WhiteLabelConfig> {
    const cacheKey = `white_label_config_${this.instanceId}`;
    const errorContext: ErrorContext = {
      operation: 'getWhiteLabelConfig',
      instanceId: this.instanceId,
    };

    return fallbackService.getWithFallback(
      () => this.apiClient.getWhiteLabelConfig(this.instanceId),
      {
        cacheKey,
        cacheDuration: 10 * 60 * 1000, // Cache for 10 minutes
        errorContext,
        retryOnError: true,
      }
    );
  }

  /**
   * Save white label configuration
   */
  async saveWhiteLabelConfig(config: WhiteLabelConfig): Promise<WhiteLabelConfig> {
    const errorContext: ErrorContext = {
      operation: 'saveWhiteLabelConfig',
      instanceId: this.instanceId,
    };

    try {
      // Ensure instanceId is set
      const configToSave = {
        ...config,
        instanceId: this.instanceId,
        updatedAt: Date.now(),
      };

      const result = await ErrorHandlerService.withRetry(
        () => this.apiClient.saveWhiteLabelConfig(configToSave),
        {},
        errorContext
      );

      // Invalidate cache after successful save
      fallbackService.invalidateCache(`white_label_config_${this.instanceId}`);
      
      // Trigger cache invalidation event
      cacheStrategyService.invalidateByEvent('whiteLabelUpdate');

      return result;
    } catch (error) {
      ErrorHandlerService.logError(error as any, errorContext);
      throw error;
    }
  }

  // ============================================================================
  // User Dashboard Methods
  // ============================================================================

  /**
   * Get user dashboard data
   */
  async getUserDashboard(userId: string): Promise<DashboardData> {
    const cacheKey = `user_dashboard_${userId}`;
    const errorContext: ErrorContext = {
      operation: 'getUserDashboard',
      userId,
    };

    return fallbackService.getWithFallback(
      () => this.apiClient.getUserDashboard(userId),
      {
        cacheKey,
        cacheDuration: 2 * 60 * 1000, // Cache for 2 minutes
        errorContext,
        retryOnError: true,
        staleWhileRevalidate: true, // Return cached data while fetching fresh data
      }
    );
  }

  /**
   * Get current user's dashboard
   */
  async getCurrentUserDashboard(): Promise<DashboardData> {
    const userId = this.getUserId();
    if (!userId) {
      // Try to get from current user profile
      const profile = await this.apiClient.getCurrentUserProfile();
      this.tokenStorage.updateUserId(profile._id);
      return this.getUserDashboard(profile._id);
    }

    return this.getUserDashboard(userId);
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const cacheKey = `user_profile_${userId}`;
    const errorContext: ErrorContext = {
      operation: 'getUserProfile',
      userId,
    };

    return fallbackService.getWithFallback(
      () => this.apiClient.getUserProfile(userId),
      {
        cacheKey,
        cacheDuration: 5 * 60 * 1000, // Cache for 5 minutes
        errorContext,
        retryOnError: true,
      }
    );
  }

  // ============================================================================
  // Ranking Methods
  // ============================================================================

  /**
   * Get global ranking data
   */
  async getRankingData(filters?: RankingFilters): Promise<GlobalRanking> {
    const cacheKey = `global_ranking_${JSON.stringify(filters || {})}`;
    const errorContext: ErrorContext = {
      operation: 'getRankingData',
      filters,
    };

    return fallbackService.getWithFallback(
      () => this.apiClient.getGlobalRanking(filters),
      {
        cacheKey,
        cacheDuration: 1 * 60 * 1000, // Cache for 1 minute (ranking changes frequently)
        errorContext,
        retryOnError: true,
        staleWhileRevalidate: true,
      }
    );
  }

  /**
   * Get personalized ranking for a user
   */
  async getPersonalizedRanking(userId: string): Promise<PersonalizedRanking> {
    const cacheKey = `personalized_ranking_${userId}`;
    const errorContext: ErrorContext = {
      operation: 'getPersonalizedRanking',
      userId,
    };

    return fallbackService.getWithFallback(
      () => this.apiClient.getPersonalizedRanking(userId),
      {
        cacheKey,
        cacheDuration: 1 * 60 * 1000, // Cache for 1 minute
        errorContext,
        retryOnError: true,
        staleWhileRevalidate: true,
      }
    );
  }

  /**
   * Get top ranking players
   */
  async getTopRanking(limit: number = 10): Promise<GlobalRanking> {
    const cacheKey = `top_ranking_${limit}`;
    const errorContext: ErrorContext = {
      operation: 'getTopRanking',
      limit,
    };

    return fallbackService.getWithFallback(
      () => this.apiClient.getTopRanking(limit),
      {
        cacheKey,
        cacheDuration: 1 * 60 * 1000, // Cache for 1 minute
        errorContext,
        retryOnError: true,
        staleWhileRevalidate: true,
      }
    );
  }

  // ============================================================================
  // Admin Operations Methods
  // ============================================================================

  /**
   * Verify if a user has admin role
   */
  async verifyAdminRole(userId: string): Promise<AdminVerification> {
    const cacheKey = `admin_verification_${userId}`;
    const errorContext: ErrorContext = {
      operation: 'verifyAdminRole',
      userId,
    };

    return fallbackService.getWithFallback(
      () => this.apiClient.verifyAdminRole(userId),
      {
        cacheKey,
        cacheDuration: 5 * 60 * 1000, // Cache for 5 minutes
        errorContext,
        retryOnError: true,
      }
    );
  }

  /**
   * Execute a quick action (admin operation)
   */
  async executeQuickAction(action: QuickAction): Promise<ActionResult> {
    const errorContext: ErrorContext = {
      operation: 'executeQuickAction',
      actionType: action.type,
      targetUserId: action.targetUserId,
    };

    try {
      const result = await ErrorHandlerService.withRetry(
        () => this.apiClient.executeQuickAction(action),
        {},
        errorContext
      );

      // Invalidate relevant caches after action
      if (action.targetUserId) {
        cacheStrategyService.invalidateUserCaches(action.targetUserId);
      }
      
      // Trigger appropriate cache invalidation events
      cacheStrategyService.invalidateByEvent('userUpdate');

      return result;
    } catch (error) {
      ErrorHandlerService.logError(error as any, errorContext);
      throw error;
    }
  }

  /**
   * Update user data (admin operation)
   */
  async adminUpdateUser(userId: string, updates: Record<string, unknown>): Promise<ActionResult> {
    const errorContext: ErrorContext = {
      operation: 'adminUpdateUser',
      userId,
    };

    try {
      const result = await ErrorHandlerService.withRetry(
        () => this.apiClient.adminUpdateUser(userId, updates),
        {},
        errorContext
      );

      // Invalidate user caches
      cacheStrategyService.invalidateUserCaches(userId);
      
      // Trigger cache invalidation events
      cacheStrategyService.invalidateByEvent('userUpdate');

      return result;
    } catch (error) {
      ErrorHandlerService.logError(error as any, errorContext);
      throw error;
    }
  }

  // ============================================================================
  // Health Check Methods
  // ============================================================================

  /**
   * Check Funifier API connectivity
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: string; error?: string }> {
    try {
      const result = await this.apiClient.healthCheck();
      return result;
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // Cache Management Methods
  // ============================================================================

  /**
   * Invalidate all user-related caches
   */
  invalidateUserCache(userId: string): void {
    cacheStrategyService.invalidateUserCaches(userId);
  }

  /**
   * Invalidate all ranking caches
   */
  invalidateRankingCache(): void {
    fallbackService.invalidateCachePattern('.*ranking.*');
    cacheStrategyService.invalidateByEvent('rankingUpdate');
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    cacheStrategyService.clearAllCaches();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheStrategyService.getCacheStats();
  }

  /**
   * Get cache health metrics
   */
  getCacheHealth() {
    return cacheStrategyService.getCacheHealth();
  }

  /**
   * Preload critical data for user
   */
  async preloadUserData(userId: string): Promise<void> {
    await cacheStrategyService.preloadCriticalData(userId, {
      getUserProfile: () => this.getUserProfile(userId),
      getUserDashboard: () => this.getUserDashboard(userId),
      getWhiteLabelConfig: () => this.getWhiteLabelConfig(),
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let funifierDirectServiceInstance: FunifierDirectService | null = null;

/**
 * Get or create singleton instance of FunifierDirectService
 */
export function getFunifierDirectService(
  credentials?: FunifierCredentials,
  instanceId?: string
): FunifierDirectService {
  if (!funifierDirectServiceInstance) {
    funifierDirectServiceInstance = new FunifierDirectService(credentials, instanceId);
  } else if (credentials) {
    // Update credentials if provided
    funifierDirectServiceInstance = new FunifierDirectService(credentials, instanceId);
  }
  
  return funifierDirectServiceInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetFunifierDirectService(): void {
  funifierDirectServiceInstance = null;
}

// Export singleton instance
export const funifierDirectService = getFunifierDirectService();
