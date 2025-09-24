import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../setup/route';

// Mock dependencies
vi.mock('@/services/setup.service');
vi.mock('@/services/white-label-config.service');
vi.mock('@/services/funifier-auth.service');

describe('/api/setup Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/setup', () => {
    it('should handle demo mode setup', async () => {
      const request = new NextRequest('http://localhost:3000/api/setup', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'demo'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.mode).toBe('demo');
      expect(data.redirectTo).toBe('/dashboard');
    });

    it('should handle Funifier mode setup with valid credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/setup', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'funifier',
          funifierCredentials: {
            apiKey: 'test-api-key',
            serverUrl: 'https://test.funifier.com',
            authToken: 'test-auth-token'
          }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.mode).toBe('funifier');
      expect(data.redirectTo).toBe('/admin/login');
    });

    it('should validate required fields for Funifier setup', async () => {
      const request = new NextRequest('http://localhost:3000/api/setup', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'funifier',
          funifierCredentials: {
            apiKey: '', // Missing required field
            serverUrl: 'https://test.funifier.com'
            // Missing authToken
          }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('validation');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/setup', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request');
    });

    it('should handle unsupported setup mode', async () => {
      const request = new NextRequest('http://localhost:3000/api/setup', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'invalid-mode'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid setup mode');
    });
  });
});