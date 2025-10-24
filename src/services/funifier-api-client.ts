import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { FunifierCredentials, FunifierApiError } from '@/types/funifier';
import { FUNIFIER_ENDPOINTS, buildUrlWithParams } from '@/config/funifier-endpoints';
import {
  AuthResponse,
  TokenValidation,
  UserProfile,
  DashboardData,
  RankingData,
  HistoryData,
  WhiteLabelConfig,
  GlobalRanking,
  PersonalizedRanking,
  AdminVerification,
  QuickAction,
  ActionResult,
  RankingFilters,
  Achievement,
  ActionLog,
} from '@/types/funifier-api-responses';

export enum ErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  FUNIFIER_API_ERROR = 'FUNIFIER_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: unknown;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
}

export class FunifierApiClient {
  private axiosInstance: AxiosInstance;
  private credentials: FunifierCredentials | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(baseURL?: string) {
    this.axiosInstance = axios.create({
      baseURL: baseURL || 'https://service2.funifier.com/v3',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.accessToken && this.isTokenValid()) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        } else if (this.credentials?.authToken) {
          config.headers.Authorization = `Basic ${this.credentials.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(this.handleError(error))
    );
  }

  setCredentials(credentials: FunifierCredentials): void {
    this.credentials = credentials;
    if (credentials.serverUrl) {
      // Ensure the server URL includes /v3 if not already present
      const baseUrl = credentials.serverUrl.endsWith('/v3') 
        ? credentials.serverUrl 
        : `${credentials.serverUrl.replace(/\/$/, '')}/v3`;
      this.axiosInstance.defaults.baseURL = baseUrl;
    }
  }

  setAccessToken(token: string, expiresIn: number): void {
    this.accessToken = token;
    this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
  }

  private isTokenValid(): boolean {
    return this.tokenExpiresAt ? new Date() < this.tokenExpiresAt : false;
  }

  private handleError(error: unknown): ApiError {
    const timestamp = new Date();

    // Network errors
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        return {
          type: ErrorType.NETWORK_ERROR,
          message: `Network error: ${error.message}`,
          details: error,
          timestamp,
          retryable: true,
          userMessage: 'Connection failed. Please check your internet connection and try again.',
        };
      }

      // HTTP errors
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as FunifierApiError;

        if (status === 401 || status === 403) {
          return {
            type: ErrorType.AUTHENTICATION_ERROR,
            message: data?.message || 'Authentication failed',
            details: data,
            timestamp,
            retryable: false,
            userMessage: 'Authentication failed. Please check your credentials.',
          };
        }

        if (status >= 500) {
          return {
            type: ErrorType.FUNIFIER_API_ERROR,
            message: data?.message || 'Server error',
            details: data,
            timestamp,
            retryable: true,
            userMessage: 'Server error. Please try again in a few moments.',
          };
        }

        return {
          type: ErrorType.FUNIFIER_API_ERROR,
          message: data?.message || `HTTP ${status} error`,
          details: data,
          timestamp,
          retryable: false,
          userMessage: data?.message || 'An error occurred. Please try again.',
        };
      }
    }

    // Generic errors
    return {
      type: ErrorType.FUNIFIER_API_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
      timestamp,
      retryable: false,
      userMessage: 'An unexpected error occurred. Please try again.',
    };
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    return this.retryRequest<T>(config);
  }

  private async retryRequest<T>(
    config: AxiosRequestConfig,
    attempt: number = 1,
    maxAttempts: number = 3
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.request(config);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      
      // Log error for monitoring
      if (attempt === 1) {
        console.warn('API request failed:', {
          url: config.url,
          method: config.method,
          error: apiError.message,
          type: apiError.type,
        });
      }
      
      if (apiError.retryable && attempt < maxAttempts) {
        // Exponential backoff with jitter
        const baseDelay = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500; // Add up to 500ms jitter
        const delay = Math.min(baseDelay + jitter, 10000); // Max 10s
        
        console.info(`Retrying request (attempt ${attempt + 1}/${maxAttempts}) after ${Math.round(delay)}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest<T>(config, attempt + 1, maxAttempts);
      }
      
      throw apiError;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Health check endpoint to verify Funifier API connectivity
   */
  async healthCheck(): Promise<{ status: 'ok'; timestamp: string }> {
    try {
      // Use a lightweight endpoint to check connectivity
      // If no specific health endpoint exists, we can use a simple API call
      const response = await this.get<any>(FUNIFIER_ENDPOINTS.SYSTEM.HEALTH, { timeout: 5000 });
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // If health endpoint doesn't exist, try a basic endpoint
      try {
        await this.get<any>(FUNIFIER_ENDPOINTS.SYSTEM.VERSION, { timeout: 5000 });
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        throw this.handleError(error);
      }
    }
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  /**
   * Authenticate user with username and password
   */
  async authenticate(username: string, password: string): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>(
      FUNIFIER_ENDPOINTS.AUTH.LOGIN,
      { username, password }
    );
    
    // Automatically set the access token
    if (response.access_token) {
      this.setAccessToken(response.access_token, response.expires_in);
    }
    
    return response;
  }

  /**
   * Verify if a token is valid
   */
  async verifyToken(token: string): Promise<TokenValidation> {
    try {
      const response = await this.post<TokenValidation>(
        FUNIFIER_ENDPOINTS.AUTH.VERIFY,
        { token }
      );
      return response;
    } catch (error) {
      return {
        valid: false,
      };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>(
      FUNIFIER_ENDPOINTS.AUTH.REFRESH,
      { refresh_token: refreshToken }
    );
    
    // Update the access token
    if (response.access_token) {
      this.setAccessToken(response.access_token, response.expires_in);
    }
    
    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await this.post(FUNIFIER_ENDPOINTS.AUTH.LOGOUT);
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  // ============================================================================
  // User Data Methods
  // ============================================================================

  /**
   * Get user profile by user ID
   * Uses /v3/player/:id endpoint
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    return this.get<UserProfile>(FUNIFIER_ENDPOINTS.USER.PROFILE(userId));
  }

  /**
   * Get current user's profile (player status)
   * Uses /v3/player/me endpoint
   */
  async getCurrentUserProfile(): Promise<UserProfile> {
    return this.get<UserProfile>(FUNIFIER_ENDPOINTS.USER.ME);
  }

  /**
   * Get user dashboard data
   * Note: This may need to aggregate data from multiple endpoints
   * (player status, achievements, action logs, leaderboards)
   */
  async getUserDashboard(userId: string): Promise<DashboardData> {
    // Get player status
    const playerStatus = await this.get<UserProfile>(
      FUNIFIER_ENDPOINTS.USER.STATUS(userId)
    );
    
    // Get recent achievements
    const achievements = await this.findDocuments<Achievement>(
      'achievement',
      { player: userId, $sort: { time: -1 }, $limit: 10 }
    );
    
    // Get recent action logs
    const recentActivity = await this.findDocuments<ActionLog>(
      'action_log',
      { player: userId, $sort: { time: -1 }, $limit: 10 }
    );
    
    return {
      player: playerStatus,
      achievements: achievements || [],
      recentActivity: recentActivity || [],
    };
  }

  /**
   * Get user ranking data
   * Note: This aggregates leaderboard data for the user
   */
  async getUserRanking(userId: string): Promise<RankingData> {
    // This would need to query leaderboards and find user's position
    // For now, return a basic structure
    return {
      leaders: [],
      metadata: {
        totalParticipants: 0,
        lastUpdated: Date.now(),
      },
    };
  }

  /**
   * Get user history data
   * Uses achievement and action_log collections
   */
  async getUserHistory(userId: string, season?: string): Promise<HistoryData> {
    const query: Record<string, unknown> = { player: userId };
    
    if (season) {
      query.season = season;
    }
    
    const achievements = await this.findDocuments<Achievement>('achievement', {
      ...query,
      $sort: { time: -1 },
      $limit: 100,
    });
    
    return {
      userId,
      entries: achievements || [],
      total: achievements?.length || 0,
    };
  }

  // ============================================================================
  // White Label Configuration Methods
  // ============================================================================

  /**
   * Get white label configuration by instance ID
   */
  async getWhiteLabelConfig(instanceId: string): Promise<WhiteLabelConfig> {
    return this.get<WhiteLabelConfig>(
      FUNIFIER_ENDPOINTS.DATABASE.WHITE_LABEL.GET(instanceId)
    );
  }

  /**
   * Save white label configuration
   */
  async saveWhiteLabelConfig(config: WhiteLabelConfig): Promise<WhiteLabelConfig> {
    const { instanceId, ...configData } = config;
    
    if (config._id) {
      // Update existing configuration
      return this.put<WhiteLabelConfig>(
        FUNIFIER_ENDPOINTS.DATABASE.WHITE_LABEL.UPDATE(instanceId),
        configData
      );
    } else {
      // Create new configuration
      return this.post<WhiteLabelConfig>(
        FUNIFIER_ENDPOINTS.DATABASE.WHITE_LABEL.CREATE,
        { instanceId, ...configData }
      );
    }
  }

  /**
   * Find white label configurations with query
   */
  async findWhiteLabelConfigs(query: Record<string, unknown>): Promise<WhiteLabelConfig[]> {
    return this.post<WhiteLabelConfig[]>(
      FUNIFIER_ENDPOINTS.DATABASE.WHITE_LABEL.FIND,
      query
    );
  }

  // ============================================================================
  // Ranking Methods
  // ============================================================================

  /**
   * Get global ranking with optional filters
   */
  async getGlobalRanking(filters?: RankingFilters): Promise<GlobalRanking> {
    const url = buildUrlWithParams(FUNIFIER_ENDPOINTS.RANKING.GLOBAL, filters as any);
    return this.get<GlobalRanking>(url);
  }

  /**
   * Get personalized ranking for a user
   */
  async getPersonalizedRanking(userId: string): Promise<PersonalizedRanking> {
    return this.get<PersonalizedRanking>(
      FUNIFIER_ENDPOINTS.RANKING.PERSONALIZED(userId)
    );
  }

  /**
   * Get top N players
   */
  async getTopRanking(limit: number = 10): Promise<GlobalRanking> {
    return this.get<GlobalRanking>(FUNIFIER_ENDPOINTS.RANKING.TOP(limit));
  }

  // ============================================================================
  // Admin Operations Methods
  // ============================================================================

  /**
   * Verify if a user has admin role
   */
  async verifyAdminRole(userId: string): Promise<AdminVerification> {
    try {
      // Try to get principal data which contains role information
      const principalData = await this.get<any>(FUNIFIER_ENDPOINTS.DATABASE.PRINCIPAL);
      
      // Check if the user has admin privileges
      const isAdmin = principalData?.roles?.includes('admin') || 
                      principalData?.permissions?.includes('admin') ||
                      principalData?.valueId === userId;
      
      return {
        isAdmin,
        userId,
        roles: principalData?.roles || [],
        permissions: principalData?.permissions || [],
      };
    } catch (error) {
      // If we can't verify, assume not admin
      return {
        isAdmin: false,
        userId,
        roles: [],
        permissions: [],
      };
    }
  }

  /**
   * Execute a quick action (admin operation)
   */
  async executeQuickAction(action: QuickAction): Promise<ActionResult> {
    const response = await this.post<ActionResult>(
      FUNIFIER_ENDPOINTS.ADMIN.QUICK_ACTION(action.type),
      {
        targetUserId: action.targetUserId,
        parameters: action.parameters,
      }
    );
    
    return {
      ...response,
      timestamp: Date.now(),
    };
  }

  /**
   * Update user data (admin operation)
   */
  async adminUpdateUser(userId: string, updates: Record<string, unknown>): Promise<ActionResult> {
    return this.put<ActionResult>(
      FUNIFIER_ENDPOINTS.ADMIN.USER_MANAGEMENT.UPDATE(userId),
      updates
    );
  }

  /**
   * Bulk update users (admin operation)
   */
  async adminBulkUpdateUsers(
    userIds: string[],
    updates: Record<string, unknown>
  ): Promise<ActionResult> {
    return this.post<ActionResult>(
      FUNIFIER_ENDPOINTS.ADMIN.USER_MANAGEMENT.BULK_UPDATE,
      { userIds, updates }
    );
  }

  /**
   * Reset user progress (admin operation)
   */
  async adminResetUserProgress(userId: string): Promise<ActionResult> {
    return this.post<ActionResult>(
      FUNIFIER_ENDPOINTS.ADMIN.USER_MANAGEMENT.RESET_PROGRESS(userId)
    );
  }

  /**
   * Get system configuration (admin operation)
   */
  async getSystemConfig(): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(
      FUNIFIER_ENDPOINTS.ADMIN.SYSTEM.CONFIG
    );
  }

  /**
   * Update system configuration (admin operation)
   */
  async updateSystemConfig(config: Record<string, unknown>): Promise<ActionResult> {
    return this.put<ActionResult>(
      FUNIFIER_ENDPOINTS.ADMIN.SYSTEM.CONFIG,
      config
    );
  }

  // ============================================================================
  // Generic Database Operations
  // ============================================================================

  /**
   * Get a document from any collection
   */
  async getDocument<T>(collectionName: string, id: string): Promise<T> {
    return this.get<T>(FUNIFIER_ENDPOINTS.DATABASE.COLLECTION.GET(collectionName, id));
  }

  /**
   * Create a document in any collection
   */
  async createDocument<T>(collectionName: string, data: unknown): Promise<T> {
    return this.post<T>(FUNIFIER_ENDPOINTS.DATABASE.COLLECTION.CREATE(collectionName), data);
  }

  /**
   * Update a document in any collection
   */
  async updateDocument<T>(collectionName: string, id: string, data: unknown): Promise<T> {
    return this.put<T>(FUNIFIER_ENDPOINTS.DATABASE.COLLECTION.UPDATE(collectionName, id), data);
  }

  /**
   * Delete a document from any collection
   */
  async deleteDocument(collectionName: string, id: string): Promise<void> {
    await this.delete(FUNIFIER_ENDPOINTS.DATABASE.COLLECTION.DELETE(collectionName, id));
  }

  /**
   * Find documents in any collection
   */
  async findDocuments<T>(collectionName: string, query: Record<string, unknown>): Promise<T[]> {
    return this.post<T[]>(FUNIFIER_ENDPOINTS.DATABASE.COLLECTION.FIND(collectionName), query);
  }
}

// Singleton instance
export const funifierApiClient = new FunifierApiClient();