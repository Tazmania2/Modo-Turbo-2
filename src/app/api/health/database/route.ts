import { NextRequest, NextResponse } from 'next/server';
import { funifierDatabaseService } from '@/services/funifier-database.service';
import { errorLogger } from '@/services/error-logger.service';
import { ErrorType } from '@/types/error';

/**
 * GET /api/health/database
 * Database connectivity health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Test database connectivity by attempting to list collections
    await funifierDatabaseService.listCollections();
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      service: 'database',
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString(),
      details: {
        type: 'Funifier Database API',
        connectivity: 'ok'
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the health check failure
    errorLogger.logCustomError(
      ErrorType.FUNIFIER_API_ERROR,
      'Database health check failed',
      { error: errorMessage, responseTime },
      { healthCheck: true }
    );
    
    return NextResponse.json({
      service: 'database',
      status: 'unhealthy',
      responseTime,
      timestamp: new Date().toISOString(),
      error: errorMessage,
      details: {
        type: 'Funifier Database API',
        connectivity: 'failed'
      }
    }, { status: 503 });
  }
}