import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FunifierAuthService } from '../funifier-auth.service';
import { funifierApiClient } from '../funifier-api-client';

// Mock the API client
vi.mock('../funifier-api-client', () => ({
  funifierApiClient: {
    setCredentials: vi.fn(),
    setAccessToken: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('FunifierAuthService', () => {
  let authService: FunifierAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = FunifierAuthService.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FunifierAuthService.getInstance();
      const instance2 = FunifierAuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should set credentials in API client', () => {
      const credentials = {
        apiKey: 'test-key',
        serverUrl: 'https://test.funifier.com',
        authToken: 'test-token',
      };

      authService.initialize(credentials);
      expect(funifierApiClient.setCredentials).toHaveBeenCalledWith(credentials);
    });
  });

  describe('login', () => {
    it('should authenticate user and store tokens', async () => {
      const loginRequest = {
        username: 'testuser',
        password: 'testpass',
      };

      const mockResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        user: {
          _id: 'user123',
          name: 'Test User',
          total_points: 100,
        },
      };

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.login(loginRequest);

      expect(funifierApiClient.post).toHaveBeenCalledWith('/v3/auth/login', loginRequest);
      expect(funifierApiClient.setAccessToken).toHaveBeenCalledWith('test-access-token', 3600);
      expect(result).toEqual(mockResponse);
    });

    it('should clear session on login failure', async () => {
      const loginRequest = {
        username: 'testuser',
        password: 'wrongpass',
      };

      vi.mocked(funifierApiClient.post).mockRejectedValue(new Error('Authentication failed'));

      await expect(authService.login(loginRequest)).rejects.toThrow('Authentication failed');
    });
  });

  describe('verifyAdminRole', () => {
    it('should verify admin role successfully', async () => {
      const mockPrincipalData = {
        roles: ['admin', 'user'],
        player: {
          _id: 'user123',
          name: 'Admin User',
          total_points: 500,
        },
      };

      // First login to set access token
      const mockLoginResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };
      vi.mocked(funifierApiClient.post).mockResolvedValue(mockLoginResponse);
      await authService.login({ username: 'admin', password: 'pass' });

      vi.mocked(funifierApiClient.get).mockResolvedValue(mockPrincipalData);

      const result = await authService.verifyAdminRole();

      expect(result.isAdmin).toBe(true);
      expect(result.roles).toEqual(['admin', 'user']);
      expect(result.playerData).toEqual(mockPrincipalData.player);
    });

    it('should throw error when not authenticated', async () => {
      // Ensure we start with a fresh auth service instance
      await authService.logout(); // Clear any existing session
      await expect(authService.verifyAdminRole()).rejects.toThrow('No active session');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', async () => {
      // Ensure we start with a fresh auth service instance
      await authService.logout(); // Clear any existing session
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true when authenticated', async () => {
      const mockResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockResponse);
      await authService.login({ username: 'user', password: 'pass' });

      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('logout', () => {
    it('should logout and clear session', async () => {
      // First login
      const mockResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockResponse);
      await authService.login({ username: 'user', password: 'pass' });

      // Then logout
      vi.mocked(funifierApiClient.post).mockResolvedValue({});
      await authService.logout();

      expect(funifierApiClient.post).toHaveBeenCalledWith('/v3/auth/logout');
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});