import { NextRequest, NextResponse } from 'next/server';
import { redisCacheService } from '@/services/redis-cache.service';
import { errorLogger } from '@/services/error-logger.service';
import { ErrorType } from '@/types/error';

/**
 * GET /api/health/cache
 * Cache service health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Test cache connectivity with a simple ping
    const testKey = 'health_check_test';
    const testValue = Date.now().toString();
    
    await redisCacheService.set(testKey, testValue, 10); // 10 second TTL
    const retrieved = await redisCacheService.get(testKey);
    
    if (retrieved !== testValue) {
      throw new Error('Cache read/write test failed');
    }
    
    // Clean up test key
    await redisCacheService.delete(testKey);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      service: 'cache',
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString(),
      details: {
        type: 'Redis Cache',
        connectivity: 'ok',
        operations: ['set', 'get', 'delete']
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the health check failure (cache is not critical, so use lower severity)
    errorLogger.logCustomError(
      ErrorType.NETWORK_ERROR,
      'Cache health check failed',
      { error: errorMessage, responseTime },
      { healthCheck: true }
    );
    
    return NextResponse.json({
      service: 'cache',
      status: 'degraded', // Cache failure is degraded, not unhealthy
      responseTime,
      timestamp: new Date().toISOString(),
      error: errorMessage,
      details: {
        type: 'Redis Cache',
        connectivity: 'failed',
        impact: 'Performance may be reduced'
      }
    }, { status: 200 }); // Return 200 since cache is not critical
  }
}