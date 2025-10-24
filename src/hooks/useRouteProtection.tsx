'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

export interface RouteProtectionOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  onUnauthorized?: () => void;
  preserveDestination?: boolean;
}

export interface RouteProtectionResult {
  isAuthorized: boolean;
  isLoading: boolean;
  isChecking: boolean;
}

/**
 * Hook for protecting routes with authentication and role-based access control
 * 
 * This hook uses direct Funifier role verification and removes authentication
 * barriers for already authenticated users
 */
export function useRouteProtection(
  options: RouteProtectionOptions = {}
): RouteProtectionResult {
  const {
    requireAuth = true,
    requireAdmin = false,
    redirectTo,
    onUnauthorized,
    preserveDestination = true,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isAdmin, isLoading } = useAuthContext();
  
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      setIsChecking(true);
      return;
    }

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      setIsAuthorized(false);
      setIsChecking(false);
      
      // Handle unauthorized access
      if (onUnauthorized) {
        onUnauthorized();
      } else if (redirectTo) {
        const loginUrl = new URL(redirectTo, window.location.origin);
        
        // Preserve destination for deep linking
        if (preserveDestination) {
          loginUrl.searchParams.set('redirect', pathname);
          // Preserve query parameters
          searchParams.forEach((value, key) => {
            loginUrl.searchParams.set(key, value);
          });
        }
        
        router.push(loginUrl.pathname + loginUrl.search);
      }
      
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isAdmin) {
      setIsAuthorized(false);
      setIsChecking(false);
      
      // Handle unauthorized access
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        // Redirect to dashboard if user is authenticated but not admin
        router.push('/dashboard');
      }
      
      return;
    }

    // User is authorized
    setIsAuthorized(true);
    setIsChecking(false);
  }, [
    isAuthenticated,
    isAdmin,
    isLoading,
    requireAuth,
    requireAdmin,
    redirectTo,
    onUnauthorized,
    preserveDestination,
    pathname,
    searchParams,
    router,
  ]);

  return {
    isAuthorized,
    isLoading,
    isChecking,
  };
}

/**
 * Hook for requiring authentication on a route
 */
export function useRequireAuth(redirectTo: string = '/admin/login') {
  return useRouteProtection({
    requireAuth: true,
    requireAdmin: false,
    redirectTo,
  });
}

/**
 * Hook for requiring admin access on a route
 */
export function useRequireAdmin(redirectTo: string = '/dashboard') {
  return useRouteProtection({
    requireAuth: true,
    requireAdmin: true,
    redirectTo,
  });
}

/**
 * Higher-order component for route protection
 */
export function withRouteProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: RouteProtectionOptions = {}
) {
  return function ProtectedComponent(props: P) {
    const { isAuthorized, isLoading, isChecking } = useRouteProtection(options);

    if (isLoading || isChecking) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthorized) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don&apos;t have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
