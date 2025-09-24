import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getFeatures, PUT as updateFeatures } from '../admin/features/route';
import { GET as getBranding, PUT as updateBranding } from '../admin/branding/route';
import { POST as testCredentials } from '../admin/funifier-credentials/test/route';

// Mock dependencies
vi.mock('@/services/feature-toggle.service');
vi.mock('@/services/branding.service');
vi.mock('@/services/funifier-auth.service');
vi.mock('@/middleware/auth');

describe('/api/admin Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock admin authentication by default
    const mockAuth = vi.mocked(await import('@/middleware/auth'));
    mockAuth.requireAdminAuth.mockResolvedValue({
      isAdmin: true,
      userId: 'admin-user',
      roles: ['admin']
    });
  });

  describe('Feature Management', () => {
    describe('GET /api/admin/features', () => {
      it('should return current feature configuration', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/features');

        const response = await getFeatures(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('features');
        expect(data.features).toHaveProperty('ranking');
        expect(data.features).toHaveProperty('dashboards');
      });

      it('should require admin authentication', async () => {
        const mockAuth = vi.mocked(await import('@/middleware/auth'));
        mockAuth.requireAdminAuth.mockRejectedValue(new Error('Unauthorized'));

        const request = new NextRequest('http://localhost:3000/api/admin/features');

        const response = await getFeatures(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toContain('Unauthorized');
      });
    });

    describe('PUT /api/admin/features', () => {
      it('should update feature configuration', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/features', {
          method: 'PUT',
          body: JSON.stringify({
            features: {
              ranking: false,
              dashboards: {
                carteira_i: true,
                carteira_ii: false,
                carteira_iii: false,
                carteira_iv: false
              }
            }
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await updateFeatures(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.features.ranking).toBe(false);
      });

      it('should validate feature configuration format', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/features', {
          method: 'PUT',
          body: JSON.stringify({
            features: {
              invalidFeature: true // Invalid feature
            }
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await updateFeatures(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('validation');
      });
    });
  });

  describe('Branding Management', () => {
    describe('GET /api/admin/branding', () => {
      it('should return current branding configuration', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/branding');

        const response = await getBranding(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('branding');
        expect(data.branding).toHaveProperty('primaryColor');
        expect(data.branding).toHaveProperty('secondaryColor');
        expect(data.branding).toHaveProperty('companyName');
      });
    });

    describe('PUT /api/admin/branding', () => {
      it('should update branding configuration', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/branding', {
          method: 'PUT',
          body: JSON.stringify({
            branding: {
              primaryColor: '#FF0000',
              secondaryColor: '#AA0000',
              companyName: 'Updated Company',
              logo: '/new-logo.png'
            }
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await updateBranding(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.branding.companyName).toBe('Updated Company');
      });

      it('should validate color format', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/branding', {
          method: 'PUT',
          body: JSON.stringify({
            branding: {
              primaryColor: 'invalid-color', // Invalid hex color
              secondaryColor: '#AA0000',
              companyName: 'Test Company'
            }
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await updateBranding(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid color format');
      });

      it('should validate company name length', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/branding', {
          method: 'PUT',
          body: JSON.stringify({
            branding: {
              primaryColor: '#FF0000',
              secondaryColor: '#AA0000',
              companyName: '' // Empty company name
            }
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await updateBranding(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Company name is required');
      });
    });
  });

  describe('Funifier Credentials Management', () => {
    describe('POST /api/admin/funifier-credentials/test', () => {
      it('should test Funifier connection successfully', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/funifier-credentials/test', {
          method: 'POST',
          body: JSON.stringify({
            apiKey: 'test-api-key',
            serverUrl: 'https://test.funifier.com',
            authToken: 'test-auth-token'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Mock successful connection test
        const mockFunifierAuth = await import('@/services/funifier-auth.service');
        vi.mocked(mockFunifierAuth.FunifierAuthService.prototype.testConnection)
          .mockResolvedValue({ success: true, message: 'Connection successful' });

        const response = await testCredentials(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('Connection successful');
      });

      it('should handle connection failure', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/funifier-credentials/test', {
          method: 'POST',
          body: JSON.stringify({
            apiKey: 'invalid-key',
            serverUrl: 'https://invalid.funifier.com',
            authToken: 'invalid-token'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Mock connection failure
        const mockFunifierAuth = await import('@/services/funifier-auth.service');
        vi.mocked(mockFunifierAuth.FunifierAuthService.prototype.testConnection)
          .mockRejectedValue(new Error('Connection failed'));

        const response = await testCredentials(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Connection failed');
      });

      it('should validate required credentials', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/funifier-credentials/test', {
          method: 'POST',
          body: JSON.stringify({
            apiKey: '', // Missing required field
            serverUrl: 'https://test.funifier.com'
            // Missing authToken
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await testCredentials(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('required');
      });

      it('should validate server URL format', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/funifier-credentials/test', {
          method: 'POST',
          body: JSON.stringify({
            apiKey: 'test-key',
            serverUrl: 'invalid-url', // Invalid URL format
            authToken: 'test-token'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await testCredentials(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid server URL');
      });
    });
  });
});