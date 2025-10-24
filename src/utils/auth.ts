import { NextRequest } from 'next/server';
import { FunifierPlayerStatus } from '@/types/funifier';

/**
 * Extract authentication token from request headers or cookies
 */
export function getAuthTokenFromRequest(request: NextRequest): string | null {
  // First try to get from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  return cookieToken || null;
}

/**
 * Extract refresh token from request cookies
 */
export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get('refresh_token')?.value || null;
}

/**
 * Validate if user has admin role
 */
export function hasAdminRole(roles: string[]): boolean {
  return roles.includes('admin');
}

/**
 * Check if user is authenticated based on token presence
 */
export function isAuthenticated(token: string | null): boolean {
  return token !== null && token.length > 0;
}

/**
 * Create authentication error response
 */
export function createAuthError(message: string, status: number = 401) {
  return {
    error: message,
    status,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate session expiration
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt * 1000;
}

/**
 * Extract user ID from player data
 */
export function getUserId(playerData: FunifierPlayerStatus): string {
  return playerData._id;
}

/**
 * Check if user has required permissions
 */
export function hasPermission(
  userRoles: string[],
  requiredRoles: string[]
): boolean {
  return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * Sanitize user data for client response
 */
export function sanitizeUserData(playerData: FunifierPlayerStatus) {
  return {
    _id: playerData._id,
    name: playerData.name,
    image: playerData.image,
    total_points: playerData.total_points,
    level_progress: playerData.level_progress,
    teams: playerData.teams,
  };
}

/**
 * Generate session metadata
 */
export function createSessionMetadata(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent') || 'unknown',
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Verify authentication token and return validation result
 * This function should be used with actual Funifier token validation
 */
export async function verifyAuthToken(request: NextRequest): Promise<{
  isValid: boolean;
  user?: FunifierPlayerStatus;
  error?: string;
}> {
  try {
    const token = getAuthTokenFromRequest(request);
    
    if (!token) {
      return {
        isValid: false,
        error: 'No authentication token provided'
      };
    }

    // Validate token format
    if (token.length < 10) {
      return {
        isValid: false,
        error: 'Invalid token format'
      };
    }

    // TODO: Implement actual Funifier token validation
    // This should call Funifier API to verify the token and get user data
    // For now, we return a basic validation result
    // The actual user data should come from the Funifier API response
    
    return {
      isValid: false,
      error: 'Token validation not implemented - use FunifierDirectService for authentication'
    };

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Token verification failed'
    };
  }
}