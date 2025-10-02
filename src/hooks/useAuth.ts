import { useState, useEffect, useCallback } from 'react';
import { FunifierPlayerStatus } from '@/types/funifier';
import { setDemoMode } from '@/utils/demo';

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
  login: (credentials: LoginCredentials, instanceId?: string | null) => Promise<void>;
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
      
      // Try to verify admin role (this will also validate authentication)
      const adminResponse = await fetch('/api/auth/verify-admin', {
        method: 'GET',
        credentials: 'include',
      });

      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        
        setState({
          user: adminData.playerData,
          isAuthenticated: true,
          isLoading: false,
          isAdmin: adminData.isAdmin,
          roles: adminData.roles,
        });
      } else {
        // Check if we're in demo mode
        const demoResponse = await fetch('/api/demo-data', {
          method: 'GET',
        });

        if (demoResponse.ok) {
          // Create a demo user for demo mode
          const demoUser: FunifierPlayerStatus = {
            _id: 'demo_user_1',
            name: 'Demo User',
            total_challenges: 15,
            challenges: { 'daily_tasks': 8, 'weekly_goals': 4, 'special_events': 3 },
            total_points: 2450,
            point_categories: { 'productivity': 1200, 'collaboration': 800, 'innovation': 450 },
            total_catalog_items: 5,
            catalog_items: { 'badges': 3, 'rewards': 2 },
            level_progress: {
              percent_completed: 75,
              next_points: 550,
              total_levels: 10,
              percent: 75
            },
            challenge_progress: [],
            teams: ['demo_team'],
            positions: [],
            time: Date.now(),
            extra: {},
            pointCategories: { 'productivity': 1200, 'collaboration': 800, 'innovation': 450 }
          };

          // Set demo mode flag
          setDemoMode(true);

          setState({
            user: demoUser,
            isAuthenticated: true,
            isLoading: false,
            isAdmin: false,
            roles: ['demo_user'],
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
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      
      // Fallback to demo mode if available
      try {
        const demoResponse = await fetch('/api/demo-data', {
          method: 'GET',
        });

        if (demoResponse.ok) {
          const demoUser: FunifierPlayerStatus = {
            _id: 'demo_user_1',
            name: 'Demo User',
            total_challenges: 15,
            challenges: { 'daily_tasks': 8, 'weekly_goals': 4, 'special_events': 3 },
            total_points: 2450,
            point_categories: { 'productivity': 1200, 'collaboration': 800, 'innovation': 450 },
            total_catalog_items: 5,
            catalog_items: { 'badges': 3, 'rewards': 2 },
            level_progress: {
              percent_completed: 75,
              next_points: 550,
              total_levels: 10,
              percent: 75
            },
            challenge_progress: [],
            teams: ['demo_team'],
            positions: [],
            time: Date.now(),
            extra: {},
            pointCategories: { 'productivity': 1200, 'collaboration': 800, 'innovation': 450 }
          };

          setState({
            user: demoUser,
            isAuthenticated: true,
            isLoading: false,
            isAdmin: false,
            roles: ['demo_user'],
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
      } catch (demoError) {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isAdmin: false,
          roles: [],
        });
      }
    }
  }, []);

  /**
   * Login with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials, instanceId?: string | null) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Build URL with instance parameter if provided
      const url = instanceId 
        ? `/api/auth/login?instance=${encodeURIComponent(instanceId)}`
        : '/api/auth/login';

      const response = await fetch(url, {
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