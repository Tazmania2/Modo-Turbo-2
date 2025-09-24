import { NextRequest } from 'next/server';
import {
  getAuthTokenFromRequest,
  getRefreshTokenFromRequest,
  hasAdminRole,
  isAuthenticated,
  createAuthError,
  isTokenExpired,
  getUserId,
  hasPermission,
  sanitizeUserData,
  createSessionMetadata,
} from '../auth';
import { FunifierPlayerStatus } from '@/types/funifier';

// Mock player data
const mockPlayerData: FunifierPlayerStatus = {
  _id: 'player123',
  name: 'Test User',
  image: {
    small: { url: 'small.jpg', size: 100, width: 50, height: 50, depth: 24 },
    medium: { url: 'medium.jpg', size: 200, width: 100, height: 100, depth: 24 },
    original: { url: 'original.jpg', size: 500, width: 200, height: 200, depth: 24 },
  },
  total_challenges: 5,
  challenges: {},
  total_points: 1000,
  point_categories: { xp: 500, coins: 500 },
  total_catalog_items: 0,
  catalog_items: {},
  level_progress: {
    percent_completed: 50,
    next_points: 500,
    total_levels: 10,
    percent: 50,
  },
  challenge_progress: [],
  teams: ['team1'],
  positions: [],
  time: Date.now(),
  extra: { customField: 'value' },
  pointCategories: { xp: 500, coins: 500 },
};

describe('Auth Utils', () => {
  describe('getAuthTokenFromRequest', () => {
    it('should extract token from Authorization header', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer test-token-123',
        },
      });

      const token = getAuthTokenFromRequest(request);
      expect(token).toBe('test-token-123');
    });

    it('should extract token from cookie when no Authorization header', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: 'auth_token=cookie-token-456',
        },
      });

      const token = getAuthTokenFromRequest(request);
      expect(token).toBe('cookie-token-456');
    });

    it('should return null when no token is present', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const token = getAuthTokenFromRequest(request);
      expect(token).toBeNull();
    });

    it('should prefer Authorization header over cookie', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer header-token',
          cookie: 'auth_token=cookie-token',
        },
      });

      const token = getAuthTokenFromRequest(request);
      expect(token).toBe('header-token');
    });
  });

  describe('getRefreshTokenFromRequest', () => {
    it('should extract refresh token from cookie', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: 'refresh_token=refresh-token-123',
        },
      });

      const token = getRefreshTokenFromRequest(request);
      expect(token).toBe('refresh-token-123');
    });

    it('should return null when no refresh token cookie', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const token = getRefreshTokenFromRequest(request);
      expect(token).toBeNull();
    });
  });

  describe('hasAdminRole', () => {
    it('should return true when admin role is present', () => {
      const roles = ['user', 'admin', 'moderator'];
      expect(hasAdminRole(roles)).toBe(true);
    });

    it('should return false when admin role is not present', () => {
      const roles = ['user', 'moderator'];
      expect(hasAdminRole(roles)).toBe(false);
    });

    it('should return false for empty roles array', () => {
      expect(hasAdminRole([])).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid token', () => {
      expect(isAuthenticated('valid-token')).toBe(true);
    });

    it('should return false for null token', () => {
      expect(isAuthenticated(null)).toBe(false);
    });

    it('should return false for empty token', () => {
      expect(isAuthenticated('')).toBe(false);
    });
  });

  describe('createAuthError', () => {
    it('should create error object with default status', () => {
      const error = createAuthError('Test error');
      
      expect(error.error).toBe('Test error');
      expect(error.status).toBe(401);
      expect(error.timestamp).toBeDefined();
    });

    it('should create error object with custom status', () => {
      const error = createAuthError('Forbidden', 403);
      
      expect(error.error).toBe('Forbidden');
      expect(error.status).toBe(403);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      expect(isTokenExpired(pastTimestamp)).toBe(true);
    });

    it('should return false for valid token', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(isTokenExpired(futureTimestamp)).toBe(false);
    });
  });

  describe('getUserId', () => {
    it('should extract user ID from player data', () => {
      const userId = getUserId(mockPlayerData);
      expect(userId).toBe('player123');
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has required role', () => {
      const userRoles = ['user', 'admin'];
      const requiredRoles = ['admin'];
      
      expect(hasPermission(userRoles, requiredRoles)).toBe(true);
    });

    it('should return true when user has any of the required roles', () => {
      const userRoles = ['user', 'moderator'];
      const requiredRoles = ['admin', 'moderator'];
      
      expect(hasPermission(userRoles, requiredRoles)).toBe(true);
    });

    it('should return false when user lacks required roles', () => {
      const userRoles = ['user'];
      const requiredRoles = ['admin', 'moderator'];
      
      expect(hasPermission(userRoles, requiredRoles)).toBe(false);
    });

    it('should return false for empty user roles', () => {
      const userRoles: string[] = [];
      const requiredRoles = ['admin'];
      
      expect(hasPermission(userRoles, requiredRoles)).toBe(false);
    });
  });

  describe('sanitizeUserData', () => {
    it('should return only safe user data fields', () => {
      const sanitized = sanitizeUserData(mockPlayerData);
      
      expect(sanitized).toEqual({
        _id: 'player123',
        name: 'Test User',
        image: mockPlayerData.image,
        total_points: 1000,
        level_progress: mockPlayerData.level_progress,
        teams: ['team1'],
      });
      
      // Should not include sensitive fields
      expect(sanitized).not.toHaveProperty('extra');
      expect(sanitized).not.toHaveProperty('challenges');
      expect(sanitized).not.toHaveProperty('point_categories');
    });
  });

  describe('createSessionMetadata', () => {
    it('should extract session metadata from request', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const metadata = createSessionMetadata(request);
      
      expect(metadata.userAgent).toBe('Mozilla/5.0 Test Browser');
      expect(metadata.ip).toBe('192.168.1.1');
      expect(metadata.timestamp).toBeDefined();
    });

    it('should handle missing headers gracefully', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const metadata = createSessionMetadata(request);
      
      expect(metadata.userAgent).toBe('unknown');
      expect(metadata.ip).toBe('unknown');
      expect(metadata.timestamp).toBeDefined();
    });

    it('should use request.ip when x-forwarded-for is not available', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      // Mock request.ip
      Object.defineProperty(request, 'ip', {
        value: '127.0.0.1',
        writable: false,
      });

      const metadata = createSessionMetadata(request);
      
      expect(metadata.ip).toBe('127.0.0.1');
    });
  });
});