import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/services/performance-monitor.service';

export interface PerformanceMiddlewareOptions {
  enableMetrics: boolean;
  enableTracing: boolean;
  excludePaths: string[];
  slowRequestThreshold: number; // milliseconds
}

/**
 * Performance monitoring middleware
 * Tracks API request metrics and performance
 */
export function createPerformanceMiddleware(options: PerformanceMiddlewareOptions = {
  enableMetrics: true,
  enableTracing: true,
  excludePaths: ['/api/health', '/api/performance/metrics'],
  slowRequestThreshold: 5000
}) {
  return async function performanceMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const { pathname } = new URL(request.url);
    const method = request.method;

    // Skip monitoring for excluded paths
    if (options.excludePaths.some(path => pathname.startsWith(path))) {
      return next();
    }

    // Add request ID for tracing
    const requestId = generateRequestId();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', requestId);

    let response: NextResponse;
    let error: Error | null = null;

    try {
      // Execute the request
      response = await next();
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      response = NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500 }
      );
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const statusCode = response.status;

    // Record metrics if enabled
    if (options.enableMetrics) {
      performanceMonitor.recordApiRequest(method, pathname, statusCode, responseTime);

      // Record slow requests
      if (responseTime > options.slowRequestThreshold) {
        console.warn(`Slow request detected: ${method} ${pathname} - ${responseTime}ms`);
      }

      // Record errors
      if (error) {
        console.error(`API error: ${method} ${pathname}`, error);
      }
    }

    // Add performance headers to response
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('x-request-id', requestId);
    responseHeaders.set('x-response-time', `${responseTime}ms`);
    
    if (options.enableTracing) {
      responseHeaders.set('x-trace-start', startTime.toString());
      responseHeaders.set('x-trace-end', endTime.toString());
    }

    // Create new response with updated headers
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware for tracking Funifier API calls
 */
export function trackFunifierApiCall(
  endpoint: string,
  method: string,
  startTime: number,
  error?: string
): void {
  const responseTime = Date.now() - startTime;
  performanceMonitor.recordFunifierRequest(endpoint, method, responseTime, error);
}

/**
 * Middleware for tracking dashboard load times
 */
export function trackDashboardLoad(
  dashboardType: string,
  playerId: string,
  loadTime: number
): void {
  performanceMonitor.recordDashboardLoadTime(dashboardType, playerId, loadTime);
}

/**
 * Middleware for tracking ranking load times
 */
export function trackRankingLoad(
  leaderboardId: string,
  viewType: string,
  loadTime: number
): void {
  performanceMonitor.recordRankingLoadTime(leaderboardId, viewType, loadTime);
}

/**
 * Middleware for tracking setup completion times
 */
export function trackSetupCompletion(
  setupType: string,
  completionTime: number
): void {
  performanceMonitor.recordSetupCompletionTime(setupType, completionTime);
}

/**
 * Higher-order function to wrap API handlers with performance tracking
 */
export function withPerformanceTracking<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      
      // Log successful operations
      if (duration > 1000) {
        console.log(`${operationName} completed in ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  };
}

/**
 * Performance tracking decorator for class methods
 */
export function PerformanceTrack(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const trackingName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        if (duration > 500) {
          console.log(`${trackingName} completed in ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`${trackingName} failed after ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Memory usage tracking utility
 */
export function trackMemoryUsage(operation: string): void {
  const memUsage = process.memoryUsage();
  const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  if (memoryMB > 256) { // Alert if over 256MB
    console.warn(`High memory usage during ${operation}: ${memoryMB}MB`);
  }
}

/**
 * Connection tracking for active connections
 */
export class ConnectionTracker {
  private static activeConnections = 0;

  static increment(): void {
    this.activeConnections++;
    performanceMonitor.updateActiveConnections(this.activeConnections);
  }

  static decrement(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    performanceMonitor.updateActiveConnections(this.activeConnections);
  }

  static getCount(): number {
    return this.activeConnections;
  }
}

/**
 * Request rate limiting based on performance
 */
export class PerformanceBasedRateLimit {
  private static requestCounts = new Map<string, number[]>();
  private static readonly WINDOW_SIZE = 60000; // 1 minute
  private static readonly MAX_REQUESTS_PER_MINUTE = 100;

  static shouldLimit(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE;
    
    // Get or create request history for client
    let requests = this.requestCounts.get(clientId) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (requests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return true;
    }
    
    // Add current request
    requests.push(now);
    this.requestCounts.set(clientId, requests);
    
    return false;
  }

  static cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE;
    
    for (const [clientId, requests] of this.requestCounts.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length === 0) {
        this.requestCounts.delete(clientId);
      } else {
        this.requestCounts.set(clientId, validRequests);
      }
    }
  }
}

// Start cleanup interval for rate limiting
setInterval(() => {
  PerformanceBasedRateLimit.cleanup();
}, 60000); // Clean up every minute