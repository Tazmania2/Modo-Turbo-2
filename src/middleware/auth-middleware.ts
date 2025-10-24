/**
 * Authentication Middleware Utilities
 * 
 * Provides utilities for authentication verification in middleware and API routes
 * Uses direct Funifier API integration for token validation
 */

import { NextRequest } from 'next/server';
import { FunifierApiClient } from '@/services/funifier-api-client';

export interface AuthValidationResult {
  isValid: boolean;
  userId?: string;
  isAdmin?: boolean;
  roles?: string[];
  error?: string;
}

export interface SessionState {
  userId: string;
  username: string;
  isAdmin: boolean;
  roles: string[];
  expiresAt: number;
}

/**
 * Extract authentication token from request
 */
export function extractAuthToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const tokenCookie = request.cookies.get('funifier_token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

/**
 * Validate JWT token structure (basic check)
 */
export function validateTokenStructure(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Try to decode payload
    const payload = JSON.parse(atob(parts[1]));
    return !!payload;
  } catch (error) {
    return false;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) {
      return false; // No expiration set
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    return exp <= now + 300;
  } catch (error) {
    return true; // Treat invalid tokens as expired
  }
}

/**
 * Decode token payload
 */
export function decodeToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Validate authentication token with Funifier API
 * 
 * This performs a full validation by checking with Funifier's API
 */
export async function validateAuthToken(token: string): Promise<AuthValidationResult> {
  try {
    // Basic structure check
    if (!validateTokenStructure(token)) {
      return {
        isValid: false,
        error: 'Invalid token structure',
      };
    }

    // Check expiration
    if (isTokenExpired(token)) {
      return {
        isValid: false,
        error: 'Token expired',
      };
    }

    // Decode token to get user info
    const payload = decodeToken(token);
    if (!payload) {
      return {
        isValid: false,
        error: 'Invalid token payload',
      };
    }

    // Create API client with token
    const apiClient = new FunifierApiClient();
    // Set token with a long expiration since we're just validating
    apiClient.setAccessToken(token, 3600);

    // Verify token with Funifier by getting user profile
    try {
      const userProfile = await apiClient.getCurrentUserProfile();
      
      // Verify admin role
      let isAdmin = false;
      let roles: string[] = [];
      
      try {
        const adminVerification = await apiClient.verifyAdminRole(userProfile._id);
        isAdmin = adminVerification.isAdmin;
        roles = adminVerification.roles || [];
      } catch (error) {
        // Admin verification failed, continue without admin privileges
        console.warn('Admin verification failed:', error);
      }

      return {
        isValid: true,
        userId: userProfile._id,
        isAdmin,
        roles,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Token validation failed with Funifier API',
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create session state from auth validation result
 */
export function createSessionState(
  validationResult: AuthValidationResult,
  token: string
): SessionState | null {
  if (!validationResult.isValid || !validationResult.userId) {
    return null;
  }

  const payload = decodeToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: validationResult.userId,
    username: payload.username || payload.sub || validationResult.userId,
    isAdmin: validationResult.isAdmin || false,
    roles: validationResult.roles || [],
    expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000,
  };
}

/**
 * Check if user has required role
 */
export function hasRole(sessionState: SessionState | null, requiredRole: string): boolean {
  if (!sessionState) {
    return false;
  }

  return sessionState.roles.includes(requiredRole);
}

/**
 * Check if user is admin
 */
export function isAdmin(sessionState: SessionState | null): boolean {
  if (!sessionState) {
    return false;
  }

  return sessionState.isAdmin;
}

/**
 * Middleware helper to require authentication
 */
export async function requireAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  sessionState: SessionState | null;
  error?: string;
}> {
  const token = extractAuthToken(request);

  if (!token) {
    return {
      authenticated: false,
      sessionState: null,
      error: 'No authentication token provided',
    };
  }

  const validationResult = await validateAuthToken(token);

  if (!validationResult.isValid) {
    return {
      authenticated: false,
      sessionState: null,
      error: validationResult.error || 'Invalid token',
    };
  }

  const sessionState = createSessionState(validationResult, token);

  return {
    authenticated: true,
    sessionState,
  };
}

/**
 * Middleware helper to require admin role
 */
export async function requireAdmin(request: NextRequest): Promise<{
  authenticated: boolean;
  authorized: boolean;
  sessionState: SessionState | null;
  error?: string;
}> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated) {
    return {
      authenticated: false,
      authorized: false,
      sessionState: null,
      error: authResult.error,
    };
  }

  const isAdminUser = isAdmin(authResult.sessionState);

  if (!isAdminUser) {
    return {
      authenticated: true,
      authorized: false,
      sessionState: authResult.sessionState,
      error: 'Admin role required',
    };
  }

  return {
    authenticated: true,
    authorized: true,
    sessionState: authResult.sessionState,
  };
}
