import { NextRequest, NextResponse } from 'next/server';
import { z, ZodType, ZodError } from 'zod';
import { createValidationErrorResponse } from './error-handler';
import { auditLogger } from '@/services/audit-logger.service';

/**
 * Enhanced string sanitization with XSS prevention
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
    .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '') // Remove link tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/data:text\/html/gi, '') // Remove data URLs
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '') // Remove event handlers
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/url\s*\(\s*javascript:/gi, '') // Remove javascript in CSS urls
    .trim() // Trim after removing content
    .slice(0, 10000); // Limit length to prevent DoS
}

/**
 * Sanitizes object by recursively sanitizing string values
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validates request body against a Zod schema with enhanced security
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    
    // Check for potential XSS in raw body
    const bodyString = JSON.stringify(body);
    if (detectMaliciousContent(bodyString)) {
      // Log security violation
      auditLogger.logSecurityEvent({
        action: 'SECURITY_VIOLATION_XSS',
        severity: 'high',
        clientId: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        url: request.url,
        method: request.method,
        details: { detectedIn: 'request_body', bodySize: bodyString.length },
        timestamp: new Date()
      });
      
      return {
        success: false,
        response: createValidationErrorResponse('Malicious content detected in request body')
      };
    }
    
    const sanitizedBody = sanitizeObject(body);
    const validatedData = schema.parse(sanitizedBody);
    
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = error.issues
        ?.map((err: any) => `${err.path?.join('.')}: ${err.message}`)
        .join(', ') || 'Validation failed';
      
      // Log validation failure for monitoring
      auditLogger.logEvent({
        action: 'VALIDATION_FAILURE',
        severity: 'low',
        clientId: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        url: request.url,
        method: request.method,
        details: { errors: error.issues, message: errorMessage },
        timestamp: new Date()
      });
      
      return {
        success: false,
        response: createValidationErrorResponse(
          'Request validation failed',
          { errors: error.issues, message: errorMessage }
        )
      };
    }
    
    return {
      success: false,
      response: createValidationErrorResponse('Invalid request body')
    };
  }
}

/**
 * Validates query parameters against a Zod schema with security checks
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodType<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    
    searchParams.forEach((value, key) => {
      // Check for malicious content in query parameters
      if (detectMaliciousContent(value) || detectMaliciousContent(key)) {
        auditLogger.logSecurityEvent({
          action: 'SECURITY_VIOLATION_XSS',
          severity: 'medium',
          clientId: getClientIP(request),
          userAgent: request.headers.get('user-agent') || undefined,
          url: request.url,
          method: request.method,
          details: { detectedIn: 'query_parameters', key, value },
          timestamp: new Date()
        });
        
        throw new Error('Malicious content detected in query parameters');
      }
      
      params[sanitizeString(key)] = sanitizeString(value);
    });
    
    const validatedData = schema.parse(params);
    
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = error.issues
        ?.map((err: any) => `${err.path?.join('.')}: ${err.message}`)
        .join(', ') || 'Validation failed';
      
      return {
        success: false,
        response: createValidationErrorResponse(
          'Query parameter validation failed',
          { errors: error.issues, message: errorMessage }
        )
      };
    }
    
    if (error instanceof Error && error.message.includes('Malicious content')) {
      return {
        success: false,
        response: createValidationErrorResponse('Malicious content detected in query parameters')
      };
    }
    
    return {
      success: false,
      response: createValidationErrorResponse('Invalid query parameters')
    };
  }
}

/**
 * Validates route parameters against a Zod schema with security checks
 */
export function validateRouteParams<T>(
  params: Record<string, string>,
  schema: ZodType<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    // Check for malicious content in route parameters
    for (const [key, value] of Object.entries(params)) {
      if (detectMaliciousContent(value) || detectMaliciousContent(key)) {
        auditLogger.logSecurityEvent({
          action: 'SECURITY_VIOLATION_XSS',
          severity: 'medium',
          clientId: 'route_params',
          url: '',
          details: { detectedIn: 'route_parameters', key, value },
          timestamp: new Date()
        });
        
        throw new Error('Malicious content detected in route parameters');
      }
    }
    
    const sanitizedParams = sanitizeObject(params);
    const validatedData = schema.parse(sanitizedParams);
    
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = error.issues
        ?.map((err: any) => `${err.path?.join('.')}: ${err.message}`)
        .join(', ') || 'Validation failed';
      
      return {
        success: false,
        response: createValidationErrorResponse(
          'Route parameter validation failed',
          { errors: error.issues, message: errorMessage }
        )
      };
    }
    
    if (error instanceof Error && error.message.includes('Malicious content')) {
      return {
        success: false,
        response: createValidationErrorResponse('Malicious content detected in route parameters')
      };
    }
    
    return {
      success: false,
      response: createValidationErrorResponse('Invalid route parameters')
    };
  }
}

/**
 * Detect malicious content patterns
 */
function detectMaliciousContent(input: string): boolean {
  const maliciousPatterns = [
    /<script\b/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /on\w+\s*=/i,
    /expression\s*\(/i,
    /url\s*\(\s*javascript:/i,
    /<link\b[^>]*href[^>]*javascript:/i,
    /&#x?[0-9a-f]+;/i, // HTML entities that might be used for obfuscation
    /\\u[0-9a-f]{4}/i, // Unicode escapes
    /eval\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    /Function\s*\(/i,
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }
  
  return cfConnectingIP || realIP || 'unknown';
}

/**
 * Enhanced validation schemas with security constraints
 */
export const commonSchemas = {
  playerId: z.string()
    .min(1, 'Player ID is required')
    .max(100, 'Player ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Player ID contains invalid characters'),
    
  leaderboardId: z.string()
    .min(1, 'Leaderboard ID is required')
    .max(100, 'Leaderboard ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Leaderboard ID contains invalid characters'),
    
  seasonId: z.string()
    .min(1, 'Season ID is required')
    .max(100, 'Season ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Season ID contains invalid characters'),
  
  paginationQuery: z.object({
    page: z.string()
      .optional()
      .transform(val => val ? Math.max(1, Math.min(1000, parseInt(val, 10))) : 1),
    limit: z.string()
      .optional()
      .transform(val => val ? Math.max(1, Math.min(100, parseInt(val, 10))) : 20),
  }),
  
  refreshQuery: z.object({
    refresh: z.string().optional().transform(val => val === 'true'),
  }),
  
  dashboardQuery: z.object({
    type: z.string()
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid dashboard type')
      .optional()
      .default('default'),
    refresh: z.string().optional().transform(val => val === 'true'),
  }),
  
  loginBody: z.object({
    username: z.string()
      .min(1, 'Username is required')
      .max(100, 'Username too long')
      .regex(/^[a-zA-Z0-9@._-]+$/, 'Username contains invalid characters'),
    password: z.string()
      .min(1, 'Password is required')
      .max(200, 'Password too long'),
  }),
  
  setupBody: z.object({
    mode: z.enum(['demo', 'funifier']),
    funifierCredentials: z.object({
      apiKey: z.string()
        .min(1, 'API key is required')
        .max(500, 'API key too long'),
      serverUrl: z.string()
        .min(1, 'Server URL is required')
        .max(500, 'Server URL too long')
        .refine(val => {
          try {
            const url = new URL(val);
            return url.protocol === 'https:' || url.hostname === 'localhost';
          } catch {
            return false;
          }
        }, 'Invalid or insecure server URL'),
      authToken: z.string()
        .min(1, 'Auth token is required')
        .max(1000, 'Auth token too long'),
    }).optional(),
  }),
  
  brandingBody: z.object({
    primaryColor: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
      .optional(),
    secondaryColor: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
      .optional(),
    accentColor: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
      .optional(),
    companyName: z.string()
      .max(100, 'Company name too long')
      .regex(/^[a-zA-Z0-9\s&.-]+$/, 'Company name contains invalid characters')
      .optional(),
    tagline: z.string()
      .max(200, 'Tagline too long')
      .optional(),
  }),
  
  featureToggleBody: z.object({
    enabled: z.boolean(),
  }),
  
  // Security-specific schemas
  ipAddress: z.string()
    .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address'),
    
  userAgent: z.string()
    .max(500, 'User agent too long')
    .optional(),
    
  auditQuery: z.object({
    action: z.string().max(100).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.string()
      .optional()
      .transform(val => val ? Math.max(1, Math.min(1000, parseInt(val, 10))) : 100),
  }),
};

/**
 * Enhanced middleware wrapper for request validation with security
 */
export function withValidation<T>(
  bodySchema?: ZodType<T>,
  querySchema?: ZodType<any>,
  paramsSchema?: ZodType<any>
) {
  return function (
    handler: (
      request: NextRequest,
      context: any,
      validatedData?: {
        body?: T;
        query?: any;
        params?: any;
      }
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, context: any): Promise<NextResponse> => {
      const validatedData: any = {};
      const clientId = getClientIP(request);
      
      // Log validation attempt for monitoring
      auditLogger.logEvent({
        action: 'VALIDATION_ATTEMPT',
        severity: 'low',
        clientId,
        userAgent: request.headers.get('user-agent') || undefined,
        url: request.url,
        method: request.method,
        details: { 
          hasBodySchema: !!bodySchema,
          hasQuerySchema: !!querySchema,
          hasParamsSchema: !!paramsSchema
        },
        timestamp: new Date()
      });
      
      // Validate body if schema provided
      if (bodySchema && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
        const bodyValidation = await validateRequestBody(request, bodySchema);
        if (!bodyValidation.success) {
          return bodyValidation.response;
        }
        validatedData.body = bodyValidation.data;
      }
      
      // Validate query parameters if schema provided
      if (querySchema) {
        const queryValidation = validateQueryParams(request, querySchema);
        if (!queryValidation.success) {
          return queryValidation.response;
        }
        validatedData.query = queryValidation.data;
      }
      
      // Validate route parameters if schema provided
      if (paramsSchema && context.params) {
        const resolvedParams = await context.params;
        const paramsValidation = validateRouteParams(resolvedParams, paramsSchema);
        if (!paramsValidation.success) {
          return paramsValidation.response;
        }
        validatedData.params = paramsValidation.data;
      }
      
      return handler(request, context, validatedData);
    };
  };
}

/**
 * Enhanced rate limiting validation with security logging
 */
export function validateRateLimit(
  request: NextRequest,
  maxRequests = 100,
  windowMs = 60000
): { success: true } | { success: false; response: NextResponse } {
  const clientId = getClientIP(request);
  
  // This is integrated with the security middleware's rate limiter
  // The actual rate limiting is handled by the security middleware
  // This function is kept for backward compatibility
  
  auditLogger.logEvent({
    action: 'RATE_LIMIT_CHECK',
    severity: 'low',
    clientId,
    userAgent: request.headers.get('user-agent') || undefined,
    url: request.url,
    method: request.method,
    details: { maxRequests, windowMs },
    timestamp: new Date()
  });
  
  return { success: true };
}

/**
 * Request validation middleware
 */
export async function validateRequest(
  request: NextRequest,
  options: {
    requireContentType?: string;
    maxBodySize?: number;
    allowedMethods?: string[];
  } = {}
): Promise<NextResponse | null> {
  const {
    requireContentType,
    maxBodySize = 1024 * 1024, // 1MB default
    allowedMethods,
  } = options;
  
  // Check allowed methods
  if (allowedMethods && !allowedMethods.includes(request.method)) {
    return NextResponse.json(
      { error: `Method ${request.method} not allowed` },
      { status: 405 }
    );
  }
  
  // Check content type for POST/PUT/PATCH requests
  if (requireContentType && (
    request.method === 'POST' || 
    request.method === 'PUT' || 
    request.method === 'PATCH'
  )) {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes(requireContentType)) {
      return createValidationErrorResponse(
        `Content-Type must be ${requireContentType}`
      );
    }
  }
  
  // Check body size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
    return createValidationErrorResponse(
      'Request body too large'
    );
  }
  
  // Rate limiting check
  const rateLimitResult = validateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }
  
  return null; // No validation errors
}