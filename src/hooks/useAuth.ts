import { useState, useEffect, useCallback } from 'react';
import { FunifierPlayerStatus } from '@/types/funifier';
import { setDemoMode } from '@/utils/demo';
import { getFunifierDirectService } from '@/services/funifier-direct.service';
import { UserProfile } from '@/types/funifier-api-responses';

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

/**
 * Convert UserProfile from Funifier API to FunifierPlayerStatus
 * Since UserProfile is already FunifierPlayerStatus, this is a pass-through
 */
function convertUserProfileToPlayerStatus(profile: UserProfile): FunifierPlayerStatus {
  // UserProfile is already FunifierPlayerStatus, just return it
  return profile;
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
   * Check current authentication status using direct Funifier integration
   */
  const checkAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const funifierService = getFunifierDirectService();
      
      // Check if user is authenticated via token storage
      if (!funifierService.isAuthenticated()) {
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
        return;
      }

      // Get user profile directly from Funifier
      const userId = funifierService.getUserId();
      if (!userId) {
        throw new Error('User ID not found in token storage');
      }

      const userProfile = await funifierService.getUserProfile(userId);
      const playerStatus = convertUserProfileToPlayerStatus(userProfile);

      // Verify admin role directly with Funifier
      const adminVerification = await funifierService.verifyAdminRole(userId);

      setState({
        user: playerStatus,
        isAuthenticated: true,
        isLoading: false,
        isAdmin: adminVerification.isAdmin,
        roles: adminVerification.roles || [],
      });
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
   * Login with credentials using direct Funifier authentication
   */
  const login = useCallback(async (credentials: LoginCredentials, instanceId?: string | null) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const funifierService = getFunifierDirectService();
      
      // Set instance ID if provided
      if (instanceId) {
        funifierService.setInstanceId(instanceId);
      }

      // Authenticate directly with Funifier
      const authResult = await funifierService.authenticateUser(credentials);

      if (!authResult.success) {
        throw new Error(authResult.error || 'Login failed');
      }

      // Convert user profile to player status
      const playerStatus = authResult.user 
        ? convertUserProfileToPlayerStatus(authResult.user)
        : null;

      // Verify admin role
      let isAdmin = false;
      let roles: string[] = [];
      
      if (authResult.user) {
        try {
          const adminVerification = await funifierService.verifyAdminRole(authResult.user._id);
          isAdmin = adminVerification.isAdmin;
          roles = adminVerification.roles || [];
        } catch (error) {
          console.warn('Admin verification failed:', error);
          // Continue without admin privileges
        }
      }

      setState({
        user: playerStatus,
        isAuthenticated: true,
        isLoading: false,
        isAdmin,
        roles,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * Logout user using direct Funifier service
   */
  const logout = useCallback(async () => {
    try {
      const funifierService = getFunifierDirectService();
      await funifierService.logout();
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
   * Refresh authentication token using direct Funifier service
   */
  const refreshToken = useCallback(async () => {
    try {
      const funifierService = getFunifierDirectService();
      await funifierService.refreshToken();

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
   * Verify admin role using direct Funifier service
   */
  const verifyAdmin = useCallback(async (): Promise<boolean> => {
    try {
      const funifierService = getFunifierDirectService();
      const userId = funifierService.getUserId();
      
      if (!userId) {
        return false;
      }

      const adminVerification = await funifierService.verifyAdminRole(userId);
      
      setState(prev => ({
        ...prev,
        isAdmin: adminVerification.isAdmin,
        roles: adminVerification.roles || [],
      }));

      return adminVerification.isAdmin;
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