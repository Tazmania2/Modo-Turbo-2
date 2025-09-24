import { NextRequest, NextResponse } from 'next/server';
import { funifierApiClient } from '@/services/funifier-api-client';
import { whiteLabelConfigService } from '@/services/white-label-config.service';
import { healthMonitor } from '@/services/health-monitor.service';
import { errorLogger } from '@/services/error-logger.service';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    funifier: {
      status: 'up' | 'down' | 'unknown';
      responseTime?: number;
      error?: string;
    };
    database: {
      status: 'up' | 'down' | 'unknown';
      responseTime?: number;
      error?: string;
    };
    configuration: {
      status: 'up' | 'down' | 'unknown';
      isConfigured: boolean;
      error?: string;
    };
  };
  uptime: number;
}

const startTime = Date.now();

/**
 * GET /api/health
 * System health check endpoint
 * Implements requirement 10.5: Health check endpoints and monitoring
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');
  const detailed = searchParams.get('detailed') === 'true';
  const metrics = searchParams.get('metrics') === 'true';

  try {
    if (service) {
      // Check specific service
      const result = await healthMonitor.checkServiceHealth(service);
      return NextResponse.json(result);
    }

    if (metrics) {
      // Return error metrics
      const errorMetrics = errorLogger.getErrorMetrics(3600000); // Last hour
      return NextResponse.json({
        errors: errorMetrics,
        timestamp: new Date().toISOString()
      });
    }

    if (detailed) {
      // Comprehensive health check using new monitoring service
      const systemHealth = await healthMonitor.checkAllServices();
      return NextResponse.json(systemHealth);
    }
  const healthCheck: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      funifier: { status: 'unknown' },
      database: { status: 'unknown' },
      configuration: { status: 'unknown', isConfigured: false },
    },
    uptime: Date.now() - startTime,
  };

  let overallHealthy = true;

  // Check Funifier API connectivity
  try {
    const funifierStart = Date.now();
    await funifierApiClient.healthCheck();
    const funifierTime = Date.now() - funifierStart;
    
    healthCheck.services.funifier = {
      status: 'up',
      responseTime: funifierTime,
    };
  } catch (error) {
    healthCheck.services.funifier = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    overallHealthy = false;
  }

  // Check database connectivity (via Funifier database service)
  try {
    const dbStart = Date.now();
    // Try to fetch configuration to test database connectivity
    await whiteLabelConfigService.getConfiguration('default');
    const dbTime = Date.now() - dbStart;
    
    healthCheck.services.database = {
      status: 'up',
      responseTime: dbTime,
    };
  } catch (error) {
    healthCheck.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    overallHealthy = false;
  }

  // Check configuration status
  try {
    const config = await whiteLabelConfigService.getConfiguration('default');
    const isConfigured = config?.funifierIntegration?.apiKey ? true : false;
    
    healthCheck.services.configuration = {
      status: 'up',
      isConfigured,
    };
  } catch (error) {
    healthCheck.services.configuration = {
      status: 'down',
      isConfigured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    // Configuration errors don't make the system unhealthy, just degraded
    if (overallHealthy) {
      healthCheck.status = 'degraded';
    }
  }

  // Determine overall status
  if (!overallHealthy) {
    healthCheck.status = 'unhealthy';
  } else if (healthCheck.services.funifier.status === 'down' || 
             healthCheck.services.database.status === 'down') {
    healthCheck.status = 'degraded';
  }

  // Return appropriate HTTP status code
  const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                    healthCheck.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthCheck, { status: httpStatus });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: Date.now(),
        checks: {
          database: false,
          cache: false,
          funifier: false
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD /api/health
 * Readiness probe for deployment systems
 */
export async function HEAD(): Promise<NextResponse> {
  try {
    // Quick readiness check - just verify basic functionality
    await whiteLabelConfigService.getConfiguration('default');
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}