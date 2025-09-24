import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest, createAuthError } from '@/utils/auth';
import { funifierAuthService } from '@/services/funifier-auth.service';

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  allowRefresh?: boolean;
}

/**
 * Authentication middleware for API routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
): Promise<NextResponse> {
  const { requireAuth = true, requireAdmin = false, allowRefresh = true } = options;

  try {
    // Skip auth check if not required
    if (!requireAuth) {
      return await handler(request);
    }

    // Get authentication token
    const authToken = getAuthTokenFromRequest(request);
    
    if (!authToken) {
      return NextResponse.json(
        createAuthError('Authentication required'),
        { status: 401 }
      );
    }

    // Validate session
    const isValidSession = await funifierAuthService.validateSession();
    
    if (!isValidSession) {
      // Try to refresh token if allowed
      if (allowRefresh) {
        try {
          const refreshToken = request.cookies.get('refresh_token')?.value;
          if (refreshToken) {
            await funifierAuthService.refreshAccessToken();
          } else {
            throw new Error('No refresh token available');
          }
        } catch {
          return NextResponse.json(
            createAuthError('Session expired'),
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          createAuthError('Invalid session'),
          { status: 401 }
        );
      }
    }

    // Check admin role if required
    if (requireAdmin) {
      try {
        const adminVerification = await funifierAuthService.verifyAdminRole();
        
        if (!adminVerification.isAdmin) {
          return NextResponse.json(
            createAuthError('Admin access required'),
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          createAuthError('Failed to verify admin role'),
          { status: 403 }
        );
      }
    }

    // Add user context to request
    const currentUser = await funifierAuthService.getCurrentUser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request as any).user = currentUser;

    return await handler(request);
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    return NextResponse.json(
      createAuthError('Authentication error'),
      { status: 500 }
    );
  }
}

/**
 * Admin-only middleware wrapper
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, handler, { requireAdmin: true });
}

/**
 * Optional auth middleware (allows both authenticated and unauthenticated access)
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, handler, { requireAuth: false });
}

/**
 * Validate authentication and return result
 */
export async function validateAuth(request: NextRequest): Promise<{
  isValid: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const authToken = getAuthTokenFromRequest(request);
    
    if (!authToken) {
      return {
        isValid: false,
        error: 'No authentication token provided'
      };
    }

    // Validate session
    const isValidSession = await funifierAuthService.validateSession();
    
    if (!isValidSession) {
      return {
        isValid: false,
        error: 'Invalid or expired session'
      };
    }

    // Get current user
    const currentUser = await funifierAuthService.getCurrentUser();
    
    return {
      isValid: true,
      user: currentUser
    };

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Authentication validation failed'
    };
  }
}