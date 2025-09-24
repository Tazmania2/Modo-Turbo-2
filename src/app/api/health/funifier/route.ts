import { NextRequest, NextResponse } from 'next/server';
import { funifierApiClient } from '@/services/funifier-api-client';
import { errorLogger } from '@/services/error-logger.service';
import { ErrorType } from '@/types/error';

/**
 * GET /api/health/funifier
 * Funifier API health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Test Funifier API connectivity
    await funifierApiClient.healthCheck();
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      service: 'funifier-api',
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString(),
      details: {
        endpoint: 'Funifier API',
        connectivity: 'ok'
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the health check failure
    errorLogger.logCustomError(
      ErrorType.FUNIFIER_API_ERROR,
      'Funifier health check failed',
      { error: errorMessage, responseTime },
      { healthCheck: true }
    );
    
    return NextResponse.json({
      service: 'funifier-api',
      status: 'unhealthy',
      responseTime,
      timestamp: new Date().toISOString(),
      error: errorMessage,
      details: {
        endpoint: 'Funifier API',
        connectivity: 'failed'
      }
    }, { status: 503 });
  }
}