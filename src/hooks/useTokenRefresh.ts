import { useEffect, useRef, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getFunifierDirectService } from '@/services/funifier-direct.service';

export interface TokenRefreshOptions {
  /**
   * Interval in milliseconds to refresh the token
   * Default: 15 minutes (900000ms)
   */
  refreshInterval?: number;
  
  /**
   * Whether to refresh token on mount
   * Default: false
   */
  refreshOnMount?: boolean;
  
  /**
   * Whether to refresh token on window focus
   * Default: true
   */
  refreshOnFocus?: boolean;
  
  /**
   * Callback when token refresh succeeds
   */
  onRefreshSuccess?: () => void;
  
  /**
   * Callback when token refresh fails
   */
  onRefreshError?: (error: Error) => void;
}

export interface TokenRefreshResult {
  /**
   * Manually trigger token refresh
   */
  refresh: () => Promise<void>;
  
  /**
   * Whether a refresh is currently in progress
   */
  isRefreshing: boolean;
  
  /**
   * Last refresh timestamp
   */
  lastRefresh: number | null;
  
  /**
   * Last refresh error
   */
  lastError: Error | null;
}

/**
 * Hook for automatic token refresh management
 * 
 * Features:
 * - Automatic periodic token refresh
 * - Refresh on window focus
 * - Manual refresh trigger
 * - Error handling and callbacks
 * 
 * @example
 * // Basic usage with default settings
 * useTokenRefresh();
 * 
 * @example
 * // Custom refresh interval (10 minutes)
 * useTokenRefresh({ refreshInterval: 10 * 60 * 1000 });
 * 
 * @example
 * // With callbacks
 * useTokenRefresh({
 *   onRefreshSuccess: () => console.log('Token refreshed'),
 *   onRefreshError: (error) => console.error('Refresh failed:', error)
 * });
 */
export function useTokenRefresh(options: TokenRefreshOptions = {}): TokenRefreshResult {
  const {
    refreshInterval = 15 * 60 * 1000, // 15 minutes
    refreshOnMount = false,
    refreshOnFocus = true,
    onRefreshSuccess,
    onRefreshError,
  } = options;

  const { isAuthenticated, refreshToken: contextRefreshToken } = useAuthContext();
  const isRefreshingRef = useRef(false);
  const lastRefreshRef = useRef<number | null>(null);
  const lastErrorRef = useRef<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Perform token refresh
   */
  const refresh = useCallback(async () => {
    // Don't refresh if not authenticated or already refreshing
    if (!isAuthenticated || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    lastErrorRef.current = null;

    try {
      const funifierService = getFunifierDirectService();
      
      // Check if token needs refresh
      const token = await funifierService.getValidToken();
      if (!token) {
        throw new Error('No valid token available');
      }

      // Perform refresh using context method
      await contextRefreshToken();
      
      lastRefreshRef.current = Date.now();
      
      if (onRefreshSuccess) {
        onRefreshSuccess();
      }
    } catch (error) {
      const refreshError = error instanceof Error ? error : new Error('Token refresh failed');
      lastErrorRef.current = refreshError;
      
      if (onRefreshError) {
        onRefreshError(refreshError);
      }
      
      console.error('Token refresh failed:', refreshError);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [isAuthenticated, contextRefreshToken, onRefreshSuccess, onRefreshError]);

  /**
   * Handle window focus event
   */
  const handleFocus = useCallback(() => {
    if (refreshOnFocus && isAuthenticated) {
      // Only refresh if last refresh was more than 5 minutes ago
      const now = Date.now();
      const timeSinceLastRefresh = lastRefreshRef.current 
        ? now - lastRefreshRef.current 
        : Infinity;
      
      if (timeSinceLastRefresh > 5 * 60 * 1000) {
        refresh();
      }
    }
  }, [refreshOnFocus, isAuthenticated, refresh]);

  /**
   * Set up periodic refresh interval
   */
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval if not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Refresh on mount if requested
    if (refreshOnMount) {
      refresh();
    }

    // Set up periodic refresh
    intervalRef.current = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, refreshInterval, refreshOnMount, refresh]);

  /**
   * Set up window focus listener
   */
  useEffect(() => {
    if (!refreshOnFocus || !isAuthenticated) {
      return;
    }

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshOnFocus, isAuthenticated, handleFocus]);

  return {
    refresh,
    isRefreshing: isRefreshingRef.current,
    lastRefresh: lastRefreshRef.current,
    lastError: lastErrorRef.current,
  };
}

/**
 * Hook for checking token validity and triggering refresh if needed
 * 
 * @example
 * const { isTokenValid, checkAndRefresh } = useTokenValidity();
 * 
 * // Before making an API call
 * await checkAndRefresh();
 */
export function useTokenValidity() {
  const { isAuthenticated, refreshToken } = useAuthContext();

  const checkAndRefresh = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      const funifierService = getFunifierDirectService();
      const token = await funifierService.getValidToken();
      
      if (!token) {
        // Token is invalid or expired, try to refresh
        await refreshToken();
        const newToken = await funifierService.getValidToken();
        return !!newToken;
      }

      return true;
    } catch (error) {
      console.error('Token validity check failed:', error);
      return false;
    }
  }, [isAuthenticated, refreshToken]);

  return {
    isTokenValid: isAuthenticated,
    checkAndRefresh,
  };
}
