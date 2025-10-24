/**
 * Token Storage Service - Secure client-side token storage and management
 * 
 * Provides:
 * - Encrypted token storage in localStorage
 * - Token refresh logic with automatic retry
 * - Token validation and expiration handling
 * - Secure token lifecycle management
 */

import { FunifierApiClient } from './funifier-api-client';
import { ErrorHandlerService } from './error-handler.service';
import { AuthResponse } from '@/types/funifier-api-responses';

export interface StoredTokenData {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  userId?: string;
  issuedAt: number;
  version: string;
}

export interface TokenValidationResult {
  valid: boolean;
  expired: boolean;
  needsRefresh: boolean;
  expiresIn?: number;
}

/**
 * Simple encryption/decryption for token storage
 * Note: This provides basic obfuscation. For production, consider using Web Crypto API
 */
class TokenEncryption {
  private static readonly ENCRYPTION_KEY = 'funifier_token_key_v1';

  /**
   * Encode token data to base64 with simple XOR encryption
   */
  static encrypt(data: string): string {
    try {
      const key = this.ENCRYPTION_KEY;
      let encrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(charCode);
      }
      
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      return btoa(data); // Fallback to simple base64
    }
  }

  /**
   * Decode token data from base64 with simple XOR decryption
   */
  static decrypt(encryptedData: string): string {
    try {
      const key = this.ENCRYPTION_KEY;
      const decoded = atob(encryptedData);
      let decrypted = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return atob(encryptedData); // Fallback to simple base64
    }
  }
}

/**
 * Token Storage Service
 */
export class TokenStorageService {
  private static readonly STORAGE_KEY = 'funifier_secure_token';
  private static readonly TOKEN_VERSION = '1.0';
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 minutes before expiry
  
  private apiClient: FunifierApiClient | null = null;
  private refreshPromise: Promise<AuthResponse> | null = null;

  constructor(apiClient?: FunifierApiClient) {
    this.apiClient = apiClient || null;
  }

  /**
   * Set API client for token refresh operations
   */
  setApiClient(apiClient: FunifierApiClient): void {
    this.apiClient = apiClient;
  }

  /**
   * Store authentication token securely
   */
  storeToken(
    token: string,
    expiresIn: number,
    refreshToken?: string,
    userId?: string
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    const tokenData: StoredTokenData = {
      token,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      userId,
      issuedAt: Date.now(),
      version: TokenStorageService.TOKEN_VERSION,
    };

    try {
      const serialized = JSON.stringify(tokenData);
      const encrypted = TokenEncryption.encrypt(serialized);
      localStorage.setItem(TokenStorageService.STORAGE_KEY, encrypted);
    } catch (error) {
      console.error('Failed to store token:', error);
      // Fallback to unencrypted storage
      localStorage.setItem(TokenStorageService.STORAGE_KEY, JSON.stringify(tokenData));
    }
  }

  /**
   * Retrieve stored token
   */
  getToken(): StoredTokenData | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(TokenStorageService.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      // Try to decrypt
      let decrypted: string;
      try {
        decrypted = TokenEncryption.decrypt(stored);
      } catch {
        // If decryption fails, try to parse as plain JSON (backward compatibility)
        decrypted = stored;
      }

      const tokenData: StoredTokenData = JSON.parse(decrypted);

      // Validate token version
      if (tokenData.version !== TokenStorageService.TOKEN_VERSION) {
        console.warn('Token version mismatch, clearing token');
        this.clearToken();
        return null;
      }

      return tokenData;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      this.clearToken();
      return null;
    }
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(TokenStorageService.STORAGE_KEY);
    this.refreshPromise = null;
  }

  /**
   * Validate stored token
   */
  validateToken(): TokenValidationResult {
    const tokenData = this.getToken();

    if (!tokenData) {
      return {
        valid: false,
        expired: true,
        needsRefresh: false,
      };
    }

    const now = Date.now();
    const expired = now >= tokenData.expiresAt;
    const needsRefresh = now >= tokenData.expiresAt - TokenStorageService.REFRESH_THRESHOLD;
    const expiresIn = Math.max(0, tokenData.expiresAt - now);

    return {
      valid: !expired,
      expired,
      needsRefresh: needsRefresh && !expired,
      expiresIn,
    };
  }

  /**
   * Check if token is valid and not expired
   */
  isTokenValid(): boolean {
    const validation = this.validateToken();
    return validation.valid;
  }

  /**
   * Check if token needs refresh
   */
  shouldRefreshToken(): boolean {
    const validation = this.validateToken();
    return validation.needsRefresh;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    // If refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const tokenData = this.getToken();
    
    if (!tokenData || !tokenData.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!this.apiClient) {
      throw new Error('API client not configured');
    }

    // Create refresh promise
    this.refreshPromise = this.performTokenRefresh(tokenData.refreshToken);

    try {
      const response = await this.refreshPromise;
      
      // Store new token
      this.storeToken(
        response.access_token,
        response.expires_in,
        response.refresh_token || tokenData.refreshToken,
        tokenData.userId
      );

      return response;
    } catch (error) {
      // Clear token on refresh failure
      this.clearToken();
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform token refresh with retry logic
   */
  private async performTokenRefresh(refreshToken: string): Promise<AuthResponse> {
    if (!this.apiClient) {
      throw new Error('API client not configured');
    }

    return ErrorHandlerService.withRetry(
      () => this.apiClient!.refreshToken(refreshToken),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
      },
      {
        operation: 'refreshToken',
      }
    );
  }

  /**
   * Get token with automatic refresh if needed
   */
  async getValidToken(): Promise<string | null> {
    const validation = this.validateToken();

    if (!validation.valid) {
      // Token is expired, try to refresh
      if (this.shouldRefreshToken()) {
        try {
          const response = await this.refreshToken();
          return response.access_token;
        } catch (error) {
          console.error('Token refresh failed:', error);
          return null;
        }
      }
      return null;
    }

    // Token is valid, but check if it needs refresh
    if (validation.needsRefresh) {
      // Refresh in background without blocking
      this.refreshToken().catch((error) => {
        console.warn('Background token refresh failed:', error);
      });
    }

    const tokenData = this.getToken();
    return tokenData?.token || null;
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): Date | null {
    const tokenData = this.getToken();
    return tokenData ? new Date(tokenData.expiresAt) : null;
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiration(): number | null {
    const tokenData = this.getToken();
    if (!tokenData) {
      return null;
    }

    return Math.max(0, tokenData.expiresAt - Date.now());
  }

  /**
   * Get stored user ID
   */
  getUserId(): string | null {
    const tokenData = this.getToken();
    return tokenData?.userId || null;
  }

  /**
   * Update user ID in stored token
   */
  updateUserId(userId: string): void {
    const tokenData = this.getToken();
    if (tokenData) {
      this.storeToken(
        tokenData.token,
        Math.floor((tokenData.expiresAt - Date.now()) / 1000),
        tokenData.refreshToken,
        userId
      );
    }
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(callback?: (success: boolean) => void): NodeJS.Timeout | null {
    const validation = this.validateToken();
    
    if (!validation.valid || !validation.expiresIn) {
      return null;
    }

    // Schedule refresh 5 minutes before expiry
    const refreshTime = Math.max(0, validation.expiresIn - TokenStorageService.REFRESH_THRESHOLD);

    return setTimeout(async () => {
      try {
        await this.refreshToken();
        if (callback) callback(true);
        
        // Schedule next refresh
        this.scheduleTokenRefresh(callback);
      } catch (error) {
        console.error('Scheduled token refresh failed:', error);
        if (callback) callback(false);
      }
    }, refreshTime);
  }

  /**
   * Get token metadata
   */
  getTokenMetadata(): {
    issuedAt: Date | null;
    expiresAt: Date | null;
    age: number | null;
    timeUntilExpiry: number | null;
    version: string | null;
  } {
    const tokenData = this.getToken();
    
    if (!tokenData) {
      return {
        issuedAt: null,
        expiresAt: null,
        age: null,
        timeUntilExpiry: null,
        version: null,
      };
    }

    const now = Date.now();

    return {
      issuedAt: new Date(tokenData.issuedAt),
      expiresAt: new Date(tokenData.expiresAt),
      age: now - tokenData.issuedAt,
      timeUntilExpiry: Math.max(0, tokenData.expiresAt - now),
      version: tokenData.version,
    };
  }

  /**
   * Check if token storage is available
   */
  isStorageAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const testKey = '__token_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const tokenStorageService = new TokenStorageService();
