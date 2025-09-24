import { useState, useEffect, useCallback } from 'react';
import { FunifierPlayerStatus } from '@/types/funifier';

export interface AuthState {
  user: FunifierPlayerStatus | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  roles: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UseAuthReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  verifyAdmin: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isAdmin: false,
    roles: [],
  });

  /**
   * Check current authentication status
   */
  const checkAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Verify admin role
        const adminResponse = await fetch('/api/auth/verify-admin', {
          method: 'GET',
          credentials: 'include',
        });

        let isAdmin = false;
        let roles: string[] = [];

        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          isAdmin = adminData.isAdmin;
          roles = adminData.roles;
        }

        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          isAdmin,
          roles,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isAdmin: false,
          roles: [],
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isAdmin: false,
        roles: [],
      });
    }
  }, []);

  /**
   * Login with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      // Refresh auth state after successful login
      await checkAuth();
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [checkAuth]);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isAdmin: false,
        roles: [],
      });
    }
  }, []);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      // Refresh auth state after token refresh
      await checkAuth();
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear auth state on refresh failure
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isAdmin: false,
        roles: [],
      });
      throw error;
    }
  }, [checkAuth]);

  /**
   * Verify admin role
   */
  const verifyAdmin = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify-admin', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        setState(prev => ({
          ...prev,
          isAdmin: data.isAdmin,
          roles: data.roles,
        }));

        return data.isAdmin;
      }

      return false;
    } catch (error) {
      console.error('Admin verification failed:', error);
      return false;
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set up token refresh interval
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(() => {
        refreshToken().catch(() => {
          // Token refresh failed, user will be logged out
        });
      }, 15 * 60 * 1000); // Refresh every 15 minutes

      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated, refreshToken]);

  return {
    ...state,
    login,
    logout,
    refreshToken,
    verifyAdmin,
    checkAuth,
  };
}