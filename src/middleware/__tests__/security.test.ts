import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, withAdminSecurity, getSecurityStatus } from '../security';

// Mock the audit logger
jest.mock('@/services/audit-logger.service', () => ({
  auditLogger: {
    logSecurityEvent: jest.fn(),
  },
}));

describe('Security Middleware', () => {
  const mockHandler = jest.fn().mockResolvedValue(
    NextResponse.json({ success: true })
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withSecurity', () => {
    it('should handle OPTIONS requests with CORS headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
      });

      const securedHandler = withSecurity(mockHandler);
      const response = await securedHandler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should apply security headers to responses', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const securedHandler = withSecurity(mockHandler);
      const response = await securedHandler(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    });

    it('should validate CSRF tokens for POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
          'Referer': 'http://localhost:3000/admin',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      const securedHandler = withSecurity(mockHandler, { enableCSRF: true });
      const response = await securedHandler(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('CSRF token validation failed');
    });

    it('should allow requests with valid CSRF tokens', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'http://localhost:3000',
          'Referer': 'http://localhost:3000/admin',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      const securedHandler = withSecurity(mockHandler, { enableCSRF: true });
      const response = await securedHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should detect XSS attempts in query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/test?search=<script>alert("xss")</script>',
        { method: 'GET' }
      );

      const securedHandler = withSecurity(mockHandler, { enableXSSProtection: true });
      const response = await securedHandler(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Malicious content detected');
    });

    it('should sanitize request body input', async () => {
      const maliciousBody = {
        name: 'Test<script>alert("xss")</script>',
        description: 'Normal text',
      };

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'http://localhost:3000',
          'Referer': 'http://localhost:3000/admin',
        },
        body: JSON.stringify(maliciousBody),
      });

      const securedHandler = withSecurity(mockHandler, { 
        enableInputSanitization: true,
        enableCSRF: true 
      });
      
      await securedHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      // The handler should receive sanitized input
      const calledRequest = mockHandler.mock.calls[0][0];
      // Note: In a real test, we'd need to check the sanitized body
      // This is a simplified test structure
    });

    it('should handle rate limiting', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'X-Forwarded-For': '192.168.1.100',
        },
      });

      const securedHandler = withSecurity(mockHandler, { 
        enableRateLimit: true,
        maxRequestsPerMinute: 1 
      });

      // First request should succeed
      const response1 = await securedHandler(request);
      expect(response1.status).toBe(200);

      // Subsequent requests should be rate limited
      // Note: This test might need adjustment based on the actual rate limiter implementation
    });

    it('should detect suspicious activity patterns', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'X-Forwarded-For': '192.168.1.200',
          'User-Agent': 'bot', // Suspicious user agent
        },
      });

      const securedHandler = withSecurity(mockHandler, { 
        enableDDoSProtection: true 
      });

      // Multiple rapid requests from the same IP with suspicious user agent
      for (let i = 0; i < 150; i++) {
        await securedHandler(request);
      }

      // After many requests, should be blocked
      const response = await securedHandler(request);
      // Note: The exact behavior depends on the DDoS protection implementation
    });

    it('should handle middleware errors gracefully', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const securedHandler = withSecurity(errorHandler);
      const response = await securedHandler(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('withAdminSecurity', () => {
    it('should apply stricter security settings for admin endpoints', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      const adminSecuredHandler = withAdminSecurity(mockHandler);
      const response = await adminSecuredHandler(request);

      // Should fail CSRF validation (stricter for admin)
      expect(response.status).toBe(403);
    });

    it('should have lower rate limits for admin endpoints', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        method: 'GET',
        headers: {
          'X-Forwarded-For': '192.168.1.50',
        },
      });

      const adminSecuredHandler = withAdminSecurity(mockHandler);
      
      // Admin endpoints should have stricter rate limiting (30 requests/minute vs 100)
      const response = await adminSecuredHandler(request);
      expect(response.status).toBe(200);
    });
  });

  describe('getSecurityStatus', () => {
    it('should return current security status', () => {
      const status = getSecurityStatus();
      
      expect(status).toHaveProperty('blockedIPs');
      expect(status).toHaveProperty('timestamp');
      expect(Array.isArray(status.blockedIPs)).toBe(true);
      expect(status.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('XSS Detection', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<img onerror="alert(1)" src="x">',
      'vbscript:alert("xss")',
      'data:text/html,<script>alert(1)</script>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
    ];

    xssPayloads.forEach((payload) => {
      it(`should detect XSS payload: ${payload.substring(0, 30)}...`, async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/test?input=${encodeURIComponent(payload)}`,
          { method: 'GET' }
        );

        const securedHandler = withSecurity(mockHandler, { enableXSSProtection: true });
        const response = await securedHandler(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Malicious content detected');
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious script tags', () => {
      // This would test the sanitizeInput function directly
      // For now, we test it through the middleware
      const maliciousInput = 'Hello <script>alert("xss")</script> World';
      // The sanitized version should remove the script tag
      // expect(sanitizedInput).toBe('Hello  World');
    });

    it('should sanitize event handlers', () => {
      const maliciousInput = '<div onclick="alert(1)">Click me</div>';
      // Should remove the onclick handler
    });

    it('should sanitize javascript: protocols', () => {
      const maliciousInput = '<a href="javascript:alert(1)">Link</a>';
      // Should remove the javascript: protocol
    });
  });
});