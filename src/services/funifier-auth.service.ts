import { FunifierCredentials, FunifierAuthResponse, FunifierPlayerStatus } from '@/types/funifier';
import { funifierApiClient } from './funifier-api-client';
import { sessionService, SessionData } from './session.service';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AdminVerificationResponse {
  isAdmin: boolean;
  roles: string[];
  playerData: FunifierPlayerStatus;
}

export interface LoginContext {
  userAgent: string;
  ip: string;
}

export class FunifierAuthService {
  private static instance: FunifierAuthService;
  private currentUser: FunifierPlayerStatus | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  private constructor() {}

  static getInstance(): FunifierAuthService {
    if (!FunifierAuthService.instance) {
      FunifierAuthService.instance = new FunifierAuthService();
    }
    return FunifierAuthService.instance;
  }

  /**
   * Initialize the auth service with Funifier credentials
   */
  initialize(credentials: FunifierCredentials): void {
    funifierApiClient.setCredentials(credentials);
  }

  /**
   * Authenticate user with username and password
   */
  async login(
    loginRequest: LoginRequest, 
    context?: LoginContext
  ): Promise<FunifierAuthResponse> {
    try {
      const response = await funifierApiClient.post<FunifierAuthResponse>(
        '/v3/auth/login',
        {
          username: loginRequest.username,
          password: loginRequest.password,
        }
      );

      // Store tokens and user data
      this.accessToken = response.access_token;
      this.refreshToken = response.refresh_token || null;
      this.currentUser = response.user || null;
      this.tokenExpiresAt = Date.now() + (response.expires_in * 1000);

      // Set token in API client
      funifierApiClient.setAccessToken(response.access_token, response.expires_in);

      // Create session if user data and context are available
      if (this.currentUser && context) {
        // Get user roles for session
        const adminVerification = await this.verifyAdminRole();
        
        sessionService.createSession(
          this.currentUser._id,
          this.currentUser,
          adminVerification.roles,
          {
            userAgent: context.userAgent,
            ip: context.ip,
          },
          {
            maxAge: response.expires_in,
          }
        );
      }

      return response;
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }

  /**
   * Verify if current user has admin role
   */
  async verifyAdminRole(): Promise<AdminVerificationResponse> {
    if (!this.accessToken) {
      throw new Error('No active session. Please login first.');
    }

    try {
      const principalData = await funifierApiClient.get<{
        roles: string[];
        player: FunifierPlayerStatus;
      }>('/v3/database/principal');

      const isAdmin = principalData.roles.includes('admin');

      return {
        isAdmin,
        roles: principalData.roles,
        playerData: principalData.player,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken(): Promise<FunifierAuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await funifierApiClient.post<FunifierAuthResponse>(
        '/v3/auth/refresh',
        {
          refresh_token: this.refreshToken,
        }
      );

      // Update tokens
      this.accessToken = response.access_token;
      this.tokenExpiresAt = Date.now() + (response.expires_in * 1000);
      
      if (response.refresh_token) {
        this.refreshToken = response.refresh_token;
      }

      // Set new token in API client
      funifierApiClient.setAccessToken(response.access_token, response.expires_in);

      // Extend session if user is available
      if (this.currentUser) {
        sessionService.extendSession(this.currentUser._id, response.expires_in);
      }

      return response;
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    const userId = this.currentUser?._id;
    
    try {
      if (this.accessToken) {
        await funifierApiClient.post('/v3/auth/logout');
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Destroy session
      if (userId) {
        sessionService.destroySession(userId);
      }
      
      this.clearSession();
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    if (!this.accessToken || !this.currentUser) {
      return false;
    }

    // Check token expiration
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt) {
      this.clearSession();
      return false;
    }

    // Validate session in session service
    const isValidSession = sessionService.validateSession(this.currentUser._id);
    if (!isValidSession) {
      this.clearSession();
      return false;
    }

    try {
      // Update activity in session
      sessionService.updateActivity(this.currentUser._id);
      
      // Try to get current user data to validate with Funifier
      await this.getCurrentUser();
      return true;
    } catch (error) {
      this.clearSession();
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<FunifierPlayerStatus> {
    if (!this.accessToken) {
      throw new Error('No active session');
    }

    try {
      const userData = await funifierApiClient.get<FunifierPlayerStatus>('/v3/player/me');
      this.currentUser = userData;
      return userData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cached current user (without API call)
   */
  getCachedUser(): FunifierPlayerStatus | null {
    return this.currentUser;
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Clear session data
   */
  private clearSession(): void {
    const userId = this.currentUser?._id;
    
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.tokenExpiresAt = null;
    
    // Clear session from session service
    if (userId) {
      sessionService.destroySession(userId);
    }
  }

  /**
   * Validate Funifier credentials by attempting to authenticate
   */
  async validateCredentials(credentials: FunifierCredentials): Promise<boolean> {
    try {
      // Temporarily set credentials
      funifierApiClient.setCredentials(credentials);

      // Try to make a simple API call to validate credentials
      await funifierApiClient.get('/v3/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get session data for current user
   */
  getSessionData(): SessionData | null {
    if (!this.currentUser) {
      return null;
    }
    
    return sessionService.getSession(this.currentUser._id);
  }

  /**
   * Check if current session needs refresh
   */
  needsTokenRefresh(): boolean {
    if (!this.currentUser) {
      return false;
    }
    
    return sessionService.needsRefresh(this.currentUser._id);
  }

  /**
   * Get token expiration time
   */
  getTokenExpiresAt(): number | null {
    return this.tokenExpiresAt;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) {
      return true;
    }
    
    return Date.now() >= this.tokenExpiresAt;
  }

  /**
   * Set access token manually (for cookie-based auth)
   */
  setAccessToken(token: string, expiresIn: number): void {
    this.accessToken = token;
    this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
    funifierApiClient.setAccessToken(token, expiresIn);
  }

  /**
   * Set refresh token manually
   */
  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }
}

// Export singleton instance
export const funifierAuthService = FunifierAuthService.getInstance();