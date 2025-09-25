import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, SecurityEvent } from '@/services/audit-logger.service';

export interface SecurityOptions {
  enableCORS?: boolean;
  corsOrigins?: string[];
  enableCSRF?: boolean;
  enableRateLimit?: boolean;
  maxRequestsPerMinute?: number;
  enableSecurityHeaders?: boolean;
  enableXSSProtection?: boolean;
  enableInputSanitization?: boolean;
  enableDDoSProtection?: boolean;
}

export interface SecurityViolation {
  type: 'rate_limit' | 'csrf' | 'xss' | 'ddos' | 'invalid_input';
  severity: 'low' | 'medium' | 'high' | 'critical';
  clientId: string;
  userAgent?: string;
  url: string;
  timestamp: Date;
  details?: any;
}

/**
 * Enhanced security headers configuration
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://service2.funifier.com; frame-ancestors 'none';",
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

/**
 * CORS configuration
 */
function setCORSHeaders(
  response: NextResponse,
  origins: string[] = ['http://localhost:3000']
): void {
  const origin = origins.includes('*') ? '*' : origins.join(', ');
  
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
}

/**
 * Set security headers on response
 */
function setSecurityHeaders(response: NextResponse): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

/**
 * Enhanced rate limiter with DDoS protection
 */
class EnhancedRateLimiter {
  private requests: Map<string, { count: number; resetTime: number; violations: number }> = new Map();
  private blockedIPs: Map<string, { until: number; reason: string }> = new Map();
  private suspiciousActivity: Map<string, { count: number; firstSeen: number }> = new Map();
  
  isAllowed(identifier: string, maxRequests: number, windowMs: number): { allowed: boolean; violation?: SecurityViolation } {
    const now = Date.now();
    
    // Check if IP is blocked
    const blocked = this.blockedIPs.get(identifier);
    if (blocked && now < blocked.until) {
      return {
        allowed: false,
        violation: {
          type: 'ddos',
          severity: 'critical',
          clientId: identifier,
          url: '',
          timestamp: new Date(),
          details: { reason: blocked.reason, blockedUntil: new Date(blocked.until) }
        }
      };
    }
    
    // Clean up expired blocks
    if (blocked && now >= blocked.until) {
      this.blockedIPs.delete(identifier);
    }
    
    const record = this.requests.get(identifier);
    
    if (!record || now > record.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
        violations: record?.violations || 0
      });
      return { allowed: true };
    }
    
    if (record.count >= maxRequests) {
      record.violations++;
      
      // Escalate blocking based on violations
      if (record.violations >= 5) {
        this.blockIP(identifier, 'Repeated rate limit violations', 24 * 60 * 60 * 1000); // 24 hours
      } else if (record.violations >= 3) {
        this.blockIP(identifier, 'Multiple rate limit violations', 60 * 60 * 1000); // 1 hour
      }
      
      return {
        allowed: false,
        violation: {
          type: 'rate_limit',
          severity: record.violations >= 3 ? 'high' : 'medium',
          clientId: identifier,
          url: '',
          timestamp: new Date(),
          details: { violations: record.violations, maxRequests, windowMs }
        }
      };
    }
    
    record.count++;
    return { allowed: true };
  }
  
  detectSuspiciousActivity(identifier: string, userAgent?: string): boolean {
    const now = Date.now();
    const activity = this.suspiciousActivity.get(identifier);
    
    if (!activity) {
      this.suspiciousActivity.set(identifier, { count: 1, firstSeen: now });
      return false;
    }
    
    // Reset if more than 1 hour has passed
    if (now - activity.firstSeen > 60 * 60 * 1000) {
      this.suspiciousActivity.set(identifier, { count: 1, firstSeen: now });
      return false;
    }
    
    activity.count++;
    
    // Detect patterns that might indicate DDoS or bot activity
    const isSuspicious = 
      activity.count > 1000 || // Too many requests in short time
      !userAgent || // No user agent
      userAgent.includes('bot') || // Bot in user agent
      userAgent.length < 10; // Suspiciously short user agent
    
    if (isSuspicious && activity.count > 100) {
      this.blockIP(identifier, 'Suspicious activity detected', 60 * 60 * 1000); // 1 hour
      return true;
    }
    
    return false;
  }
  
  private blockIP(identifier: string, reason: string, durationMs: number): void {
    this.blockedIPs.set(identifier, {
      until: Date.now() + durationMs,
      reason
    });
    
    // Log the blocking action
    auditLogger.logSecurityEvent({
      action: 'IP_BLOCKED',
      severity: 'high',
      clientId: identifier,
      details: { reason, duration: durationMs },
      timestamp: new Date()
    });
  }
  
  cleanup(): void {
    const now = Date.now();
    
    // Clean up expired requests
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
    
    // Clean up expired blocks
    for (const [key, block] of this.blockedIPs.entries()) {
      if (now >= block.until) {
        this.blockedIPs.delete(key);
      }
    }
    
    // Clean up old suspicious activity records
    for (const [key, activity] of this.suspiciousActivity.entries()) {
      if (now - activity.firstSeen > 24 * 60 * 60 * 1000) { // 24 hours
        this.suspiciousActivity.delete(key);
      }
    }
  }
  
  getBlockedIPs(): Array<{ ip: string; until: Date; reason: string }> {
    return Array.from(this.blockedIPs.entries()).map(([ip, block]) => ({
      ip,
      until: new Date(block.until),
      reason: block.reason
    }));
  }
}

const rateLimiter = new EnhancedRateLimiter();

// Cleanup rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Enhanced XSS protection
 */
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=\s*[^>\s]+/gi, '') // Remove event handlers
      .replace(/data:text\/html/gi, '') // Remove data URLs
      .replace(/vbscript:/gi, '') // Remove vbscript
      .replace(/expression\s*\(/gi, '') // Remove CSS expressions
      .trim()
      .slice(0, 10000); // Limit length to prevent DoS
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeInput(key);
      sanitized[sanitizedKey] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Enhanced CSRF token validation
 */
function validateCSRFToken(request: NextRequest): { valid: boolean; violation?: SecurityViolation } {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true };
  }
  
  const csrfToken = request.headers.get('X-CSRF-Token') || 
                   request.headers.get('X-Requested-With');
  
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Check for CSRF token
  const hasValidToken = csrfToken === 'XMLHttpRequest' || !!csrfToken;
  
  // Check origin/referer for additional protection
  const hasValidOrigin = origin && origin.includes(host || '');
  const hasValidReferer = referer && referer.includes(host || '');
  
  const isValid = hasValidToken && (hasValidOrigin || hasValidReferer);
  
  if (!isValid) {
    return {
      valid: false,
      violation: {
        type: 'csrf',
        severity: 'high',
        clientId: getClientIdentifier(request),
        url: request.url,
        timestamp: new Date(),
        details: { 
          hasToken: !!csrfToken, 
          origin, 
          referer, 
          host,
          method: request.method 
        }
      }
    };
  }
  
  return { valid: true };
}

/**
 * Detect potential XSS attempts
 */
function detectXSSAttempt(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /data:text\/html/i,
    /vbscript:/i,
    /expression\s*\(/i,
    /<object/i,
    /<embed/i,
    /<link.*href.*javascript:/i
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Get client identifier for rate limiting and security tracking
 */
function getClientIdentifier(request: NextRequest): string {
  // Try multiple headers to get real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  const xClientIP = request.headers.get('x-client-ip');
  
  // Parse x-forwarded-for header (can contain multiple IPs)
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0]; // First IP is usually the original client
  }
  
  return cfConnectingIP || realIP || xClientIP || 'unknown';
}

/**
 * Map violation types to security event actions
 */
function getSecurityEventAction(violationType: SecurityViolation['type']): SecurityEvent['action'] {
  const actionMap: Record<SecurityViolation['type'], SecurityEvent['action']> = {
    'rate_limit': 'SECURITY_VIOLATION_RATE_LIMIT',
    'csrf': 'SECURITY_VIOLATION_CSRF',
    'xss': 'SECURITY_VIOLATION_XSS',
    'ddos': 'SECURITY_VIOLATION_DDOS',
    'invalid_input': 'SUSPICIOUS_ACTIVITY'
  };
  
  return actionMap[violationType] || 'SUSPICIOUS_ACTIVITY';
}

/**
 * Log security violations
 */
function logSecurityViolation(violation: SecurityViolation, request: NextRequest): void {
  auditLogger.logSecurityEvent({
    action: getSecurityEventAction(violation.type),
    severity: violation.severity,
    clientId: violation.clientId,
    userAgent: request.headers.get('user-agent') || undefined,
    url: violation.url,
    method: request.method,
    details: violation.details,
    timestamp: violation.timestamp
  });
}

/**
 * Enhanced security middleware wrapper
 */
export function withSecurity(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: SecurityOptions = {}
) {
  const {
    enableCORS = true,
    corsOrigins = ['http://localhost:3000', 'https://*.vercel.app'],
    enableCSRF = true,
    enableRateLimit = true,
    maxRequestsPerMinute = 100,
    enableSecurityHeaders = true,
    enableXSSProtection = true,
    enableInputSanitization = true,
    enableDDoSProtection = true,
  } = options;

  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const clientId = getClientIdentifier(request);
    const userAgent = request.headers.get('user-agent');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      
      if (enableCORS) {
        setCORSHeaders(response, corsOrigins);
      }
      
      if (enableSecurityHeaders) {
        setSecurityHeaders(response);
      }
      
      return response;
    }

    // DDoS protection - detect suspicious activity
    if (enableDDoSProtection) {
      const isSuspicious = rateLimiter.detectSuspiciousActivity(clientId, userAgent || undefined);
      if (isSuspicious) {
        const violation: SecurityViolation = {
          type: 'ddos',
          severity: 'critical',
          clientId,
          userAgent: userAgent || undefined,
          url: request.url,
          timestamp: new Date(),
          details: { reason: 'Suspicious activity pattern detected' }
        };
        
        logSecurityViolation(violation, request);
        
        return NextResponse.json(
          { error: 'Access denied due to suspicious activity' },
          { status: 403 }
        );
      }
    }

    // Rate limiting check
    if (enableRateLimit) {
      const rateLimitResult = rateLimiter.isAllowed(
        clientId,
        maxRequestsPerMinute,
        60 * 1000 // 1 minute window
      );
      
      if (!rateLimitResult.allowed) {
        if (rateLimitResult.violation) {
          rateLimitResult.violation.url = request.url;
          rateLimitResult.violation.userAgent = userAgent || undefined;
          logSecurityViolation(rateLimitResult.violation, request);
        }
        
        const response = NextResponse.json(
          { 
            error: 'Too many requests',
            retryAfter: 60 
          },
          { status: 429 }
        );
        
        response.headers.set('Retry-After', '60');
        return response;
      }
    }

    // CSRF protection
    if (enableCSRF) {
      const csrfResult = validateCSRFToken(request);
      if (!csrfResult.valid) {
        if (csrfResult.violation) {
          logSecurityViolation(csrfResult.violation, request);
        }
        
        return NextResponse.json(
          { error: 'CSRF token validation failed' },
          { status: 403 }
        );
      }
    }

    // XSS protection - scan request for malicious content
    if (enableXSSProtection) {
      const url = new URL(request.url);
      const queryString = url.search;
      
      if (queryString && detectXSSAttempt(queryString)) {
        const violation: SecurityViolation = {
          type: 'xss',
          severity: 'high',
          clientId,
          userAgent: userAgent || undefined,
          url: request.url,
          timestamp: new Date(),
          details: { queryString, detectedIn: 'query_parameters' }
        };
        
        logSecurityViolation(violation, request);
        
        return NextResponse.json(
          { error: 'Malicious content detected' },
          { status: 400 }
        );
      }
    }

    try {
      // Input sanitization for request body
      if (enableInputSanitization && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          const sanitizedBody = sanitizeInput(body);
          
          // Create new request with sanitized body
          const sanitizedRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(sanitizedBody)
          });
          
          // Execute the handler with sanitized request
          const response = await handler(sanitizedRequest, ...args);

          // Apply security headers
          if (enableSecurityHeaders) {
            setSecurityHeaders(response);
          }

          // Apply CORS headers
          if (enableCORS) {
            setCORSHeaders(response, corsOrigins);
          }

          return response;
        } catch (jsonError) {
          // If not JSON, proceed with original request
          const response = await handler(request, ...args);

          if (enableSecurityHeaders) {
            setSecurityHeaders(response);
          }

          if (enableCORS) {
            setCORSHeaders(response, corsOrigins);
          }

          return response;
        }
      } else {
        // Execute the handler
        const response = await handler(request, ...args);

        // Apply security headers
        if (enableSecurityHeaders) {
          setSecurityHeaders(response);
        }

        // Apply CORS headers
        if (enableCORS) {
          setCORSHeaders(response, corsOrigins);
        }

        return response;
      }
    } catch (error) {
      console.error('Security middleware error:', error);
      
      // Log the error as a security event
      auditLogger.logSecurityEvent({
        action: 'MIDDLEWARE_ERROR',
        severity: 'medium',
        clientId,
        userAgent: userAgent || undefined,
        url: request.url,
        method: request.method,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      });
      
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );

      if (enableSecurityHeaders) {
        setSecurityHeaders(errorResponse);
      }

      if (enableCORS) {
        setCORSHeaders(errorResponse, corsOrigins);
      }

      return errorResponse;
    }
  };
}

/**
 * Admin-only security middleware with enhanced protection
 */
export function withAdminSecurity(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return withSecurity(handler, {
    enableCSRF: true,
    enableRateLimit: true,
    maxRequestsPerMinute: 30, // Stricter rate limiting for admin endpoints
    enableSecurityHeaders: true,
    enableXSSProtection: true,
    enableInputSanitization: true,
    enableDDoSProtection: true,
  });
}

/**
 * Public API security middleware with relaxed settings
 */
export function withPublicSecurity(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return withSecurity(handler, {
    enableCSRF: false, // Relaxed for public APIs
    enableRateLimit: true,
    maxRequestsPerMinute: 200, // Higher limit for public endpoints
    enableSecurityHeaders: true,
    enableXSSProtection: true,
    enableInputSanitization: true,
    enableDDoSProtection: false, // Less strict for public endpoints
  });
}

/**
 * Get current security status and blocked IPs
 */
export function getSecurityStatus() {
  return {
    blockedIPs: rateLimiter.getBlockedIPs(),
    timestamp: new Date()
  };
}

/**
 * Manually block an IP address
 */
export function blockIP(ip: string, reason: string, durationMs: number = 60 * 60 * 1000) {
  rateLimiter['blockIP'](ip, reason, durationMs);
}