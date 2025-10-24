import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

export interface AuthGuardOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  onUnauthorized?: () => void;
}

export interface AuthGuardResult {
  isAuthorized: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * Hook for route protection with authentication and authorization checks
 * 
 * @example
 * // Require authentication
 * const { isAuthorized, isLoading } = useAuthGuard({ requireAuth: true });
 * 
 * @example
 * // Require admin role
 * const { isAuthorized, isLoading } = useAuthGuard({ 
 *   requireAuth: true, 
 *   requireAdmin: true 
 * });
 * 
 * @example
 * // Custom redirect
 * const { isAuthorized, isLoading } = useAuthGuard({ 
 *   requireAuth: true,
 *   redirectTo: '/login'
 * });
 */
export function useAuthGuard(options: AuthGuardOptions = {}): AuthGuardResult {
  const {
    requireAuth = false,
    requireAdmin = false,
    redirectTo,
    onUnauthorized,
  } = options;

  const router = useRouter();
  const { isAuthenticated, isAdmin, isLoading } = useAuthContext();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) {
      return;
    }

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      setIsAuthorized(false);
      
      if (onUnauthorized) {
        onUnauthorized();
      } else if (redirectTo) {
        router.push(redirectTo);
      }
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isAdmin) {
      setIsAuthorized(false);
      
      if (onUnauthorized) {
        onUnauthorized();
      } else if (redirectTo) {
        router.push(redirectTo);
      }
      return;
    }

    // User is authorized
    setIsAuthorized(true);
  }, [isLoading, isAuthenticated, isAdmin, requireAuth, requireAdmin, redirectTo, onUnauthorized, router]);

  return {
    isAuthorized,
    isLoading,
    isAuthenticated,
    isAdmin,
  };
}

/**
 * Higher-order component for protecting pages with authentication
 * 
 * @example
 * export default withAuthGuard(MyPage, { requireAuth: true });
 * 
 * @example
 * export default withAuthGuard(AdminPage, { 
 *   requireAuth: true, 
 *   requireAdmin: true 
 * });
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: AuthGuardOptions = {}
) {
  return function AuthGuardedComponent(props: P) {
    const { isAuthorized, isLoading } = useAuthGuard(options);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthorized) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
