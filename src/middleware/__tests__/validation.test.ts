import { NextRequest } from 'next/server';
import { z } from 'zod';
import { vi, describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeObject,
  validateRequestBody,
  validateQueryParams,
  validateRouteParams,
  commonSchemas,
} from '../validation';

// Mock NextRequest
const createMockRequest = (
  url: string,
  method = 'GET',
  body?: any,
  headers?: Record<string, string>
): NextRequest => {
  const request = {
    url,
    method,
    json: vi.fn().mockResolvedValue(body),
    headers: new Map(Object.entries(headers || {})),
  } as unknown as NextRequest;

  return request;
};

describe('Validation Middleware', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).toBe('scriptalert("xss")/scriptHello');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeString(input);
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss") Hello';
      const result = sanitizeString(input);
      expect(result).toBe('Hello');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should limit string length', () => {
      const input = 'a'.repeat(1500);
      const result = sanitizeString(input);
      expect(result.length).toBe(1000);
    });

    it('should handle non-string input', () => {
      const result = sanitizeString(123 as any);
      expect(result).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values in objects', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        age: 25,
        nested: {
          value: 'javascript:alert("xss")',
        },
      };

      const result = sanitizeObject(input);

      expect(result).toEqual({
        name: 'scriptalert("xss")/scriptJohn',
        age: 25,
        nested: {
          value: 'alert("xss")',
        },
      });
    });

    it('should sanitize arrays', () => {
      const input = ['<script>test</script>', 'normal', 123];
      const result = sanitizeObject(input);
      expect(result).toEqual(['scripttest/script', 'normal', 123]);
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should sanitize object keys', () => {
      const input = {
        '<script>key</script>': 'value',
      };
      const result = sanitizeObject(input);
      expect(result).toEqual({
        'scriptkey/script': 'value',
      });
    });
  });

  describe('validateRequestBody', () => {
    const schema = z.object({
      username: z.string().min(1),
      age: z.number().optional(),
    });

    it('should validate and sanitize valid request body', async () => {
      const request = createMockRequest(
        'http://localhost/api/test',
        'POST',
        { username: '  <script>john</script>  ', age: 25 }
      );

      const result = await validateRequestBody(request, schema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          username: 'scriptjohn/script',
          age: 25,
        });
      }
    });

    it('should return validation error for invalid data', async () => {
      const request = createMockRequest(
        'http://localhost/api/test',
        'POST',
        { username: '', age: 'invalid' }
      );

      const result = await validateRequestBody(request, schema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });

    it('should handle JSON parsing errors', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest;

      const result = await validateRequestBody(request, schema);

      expect(result.success).toBe(false);
    });
  });

  describe('validateQueryParams', () => {
    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    it('should validate and sanitize query parameters', () => {
      const request = createMockRequest(
        'http://localhost/api/test?page=1&limit=<script>20</script>'
      );

      const result = validateQueryParams(request, schema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: '1',
          limit: 'script20/script',
        });
      }
    });

    it('should return validation error for invalid params', () => {
      const request = createMockRequest('http://localhost/api/test?invalid=true');
      const strictSchema = z.object({
        required: z.string(),
      });

      const result = validateQueryParams(request, strictSchema);

      expect(result.success).toBe(false);
    });
  });

  describe('validateRouteParams', () => {
    const schema = z.object({
      id: z.string().min(1),
      type: z.string().optional(),
    });

    it('should validate and sanitize route parameters', () => {
      const params = {
        id: '<script>123</script>',
        type: 'user',
      };

      const result = validateRouteParams(params, schema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          id: 'script123/script',
          type: 'user',
        });
      }
    });

    it('should return validation error for invalid params', () => {
      const params = {
        id: '',
      };

      const result = validateRouteParams(params, schema);

      expect(result.success).toBe(false);
    });
  });

  describe('commonSchemas', () => {
    it('should validate playerId schema', () => {
      const validId = 'player123';
      const result = commonSchemas.playerId.safeParse(validId);
      expect(result.success).toBe(true);

      const invalidId = '';
      const invalidResult = commonSchemas.playerId.safeParse(invalidId);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate loginBody schema', () => {
      const validLogin = {
        username: 'john',
        password: 'secret123',
      };
      const result = commonSchemas.loginBody.safeParse(validLogin);
      expect(result.success).toBe(true);

      const invalidLogin = {
        username: '',
        password: '',
      };
      const invalidResult = commonSchemas.loginBody.safeParse(invalidLogin);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate paginationQuery schema with transformation', () => {
      const query = {
        page: '2',
        limit: '50',
      };
      const result = commonSchemas.paginationQuery.safeParse(query);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: 2,
          limit: 50,
        });
      }
    });

    it('should validate brandingBody schema', () => {
      const validBranding = {
        primaryColor: '#FF0000',
        companyName: 'Test Company',
      };
      const result = commonSchemas.brandingBody.safeParse(validBranding);
      expect(result.success).toBe(true);

      const invalidBranding = {
        primaryColor: 'invalid-color',
      };
      const invalidResult = commonSchemas.brandingBody.safeParse(invalidBranding);
      expect(invalidResult.success).toBe(false);
    });
  });
});