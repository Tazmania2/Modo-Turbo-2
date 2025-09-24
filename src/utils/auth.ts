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

    // For now, we'll do a simple token validation
    // In a real implementation, this would verify the JWT token
    // and fetch user data from the session or database
    if (token.length < 10) {
      return {
        isValid: false,
        error: 'Invalid token format'
      };
    }

    // Mock user data for now - in real implementation this would come from token validation
    const mockUser: FunifierPlayerStatus = {
      _id: 'admin-user',
      name: 'Admin User',
      total_points: 0,
      level_progress: { percent_completed: 0, next_points: 0, total_levels: 1, percent: 0 },
      teams: ['admin'],
      time: Date.now(),
      total_challenges: 0,
      challenges: {},
      point_categories: {},
      total_catalog_items: 0,
      catalog_items: {},
      challenge_progress: [],
      positions: [],
      extra: {},
      pointCategories: {}
    };

    return {
      isValid: true,
      user: mockUser
    };

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Token verification failed'
    };
  }
}