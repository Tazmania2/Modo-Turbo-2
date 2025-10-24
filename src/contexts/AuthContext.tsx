'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, UseAuthReturn } from '@/hooks/useAuth';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();
  
  // Set up automatic token refresh for authenticated users
  useTokenRefresh({
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    refreshOnFocus: true,
    onRefreshError: (error) => {
      console.error('Automatic token refresh failed:', error);
    },
  });

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    // During SSR or before mount, return a default unauthenticated state
    // This prevents build errors while maintaining type safety
    if (typeof window === 'undefined') {
      return {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        isAdmin: false,
        roles: [],
        login: async () => {},
        logout: async () => {},
        refreshToken: async () => {},
        verifyAdmin: async () => false,
        checkAuth: async () => {},
      };
    }
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}

// Higher-order component for protecting routes
export interface WithAuthProps {
  requireAdmin?: boolean;
  fallback?: ReactNode;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) {
  const { requireAdmin = false, fallback = <div>Loading...</div> } = options;

  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isAdmin, isLoading } = useAuthContext();

    if (isLoading) {
      return <>{fallback}</>;
    }

    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>;
    }

    if (requireAdmin && !isAdmin) {
      return <div>Admin access required.</div>;
    }

    return <Component {...props} />;
  };
}

// Hook for requiring authentication
export function useRequireAuth(requireAdmin: boolean = false) {
  const { isAuthenticated, isAdmin, isLoading } = useAuthContext();

  if (isLoading) {
    return { isLoading: true, hasAccess: false };
  }

  const hasAccess = isAuthenticated && (!requireAdmin || isAdmin);

  return {
    isLoading: false,
    hasAccess,
    isAuthenticated,
    isAdmin,
  };
}