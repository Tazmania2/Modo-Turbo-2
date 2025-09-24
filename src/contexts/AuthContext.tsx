'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, UseAuthReturn } from '@/hooks/useAuth';

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
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