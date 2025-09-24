import { NextRequest, NextResponse } from 'next/server';
import { errorLogger } from '@/services/error-logger.service';
import { ErrorType } from '@/types/error';

/**
 * GET /api/monitoring/errors
 * Error monitoring and metrics endpoint
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ErrorType | null;
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // Default 1 hour
    const limit = parseInt(searchParams.get('limit') || '50');

    if (type) {
      // Get errors by specific type
      const errors = errorLogger.getErrorsByType(type, limit);
      return NextResponse.json({
        type,
        errors,
        count: errors.length,
        timestamp: new Date().toISOString()
      });
    }

    // Get comprehensive error metrics
    const metrics = errorLogger.getErrorMetrics(timeWindow);
    const recentErrors = errorLogger.getRecentErrors(limit);

    return NextResponse.json({
      metrics,
      recentErrors,
      timeWindow,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to retrieve error metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monitoring/errors
 * Clear error log (admin only)
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    errorLogger.clearLog();
    
    return NextResponse.json({
      message: 'Error log cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to clear error log',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/errors
 * Log a custom error (for client-side error reporting)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { type, message, details, context } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: 'Type and message are required' },
        { status: 400 }
      );
    }

    const errorId = errorLogger.logCustomError(type, message, details, {
      ...context,
      userAgent: request.headers.get('user-agent') || undefined,
      url: request.url
    });

    return NextResponse.json({
      errorId,
      message: 'Error logged successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to log error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}