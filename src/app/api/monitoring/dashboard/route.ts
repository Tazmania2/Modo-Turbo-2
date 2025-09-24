import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor } from '@/services/health-monitor.service';
import { errorLogger } from '@/services/error-logger.service';

/**
 * GET /api/monitoring/dashboard
 * Comprehensive monitoring dashboard data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // Default 1 hour

    // Get system health
    const systemHealth = await healthMonitor.checkAllServices();
    
    // Get error metrics
    const errorMetrics = errorLogger.getErrorMetrics(timeWindow);
    
    // Get service metrics for each registered service
    const serviceMetrics = Array.from(['funifier-api', 'database', 'cache']).map(serviceName => ({
      service: serviceName,
      metrics: healthMonitor.getServiceMetrics(serviceName, timeWindow),
      history: healthMonitor.getServiceHistory(serviceName, 20)
    }));

    // Calculate system-wide metrics
    const totalUptime = serviceMetrics.reduce((sum, service) => sum + service.metrics.uptime, 0) / serviceMetrics.length;
    const averageResponseTime = serviceMetrics.reduce((sum, service) => sum + service.metrics.averageResponseTime, 0) / serviceMetrics.length;
    const totalErrorRate = serviceMetrics.reduce((sum, service) => sum + service.metrics.errorRate, 0) / serviceMetrics.length;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      timeWindow,
      systemHealth,
      errorMetrics,
      serviceMetrics,
      systemMetrics: {
        overallUptime: totalUptime,
        averageResponseTime,
        errorRate: totalErrorRate,
        servicesCount: serviceMetrics.length,
        healthyServices: serviceMetrics.filter(s => s.metrics.uptime > 95).length
      },
      alerts: [
        // Generate alerts based on thresholds
        ...(totalUptime < 95 ? [{
          type: 'warning',
          message: `System uptime is below 95% (${totalUptime.toFixed(2)}%)`,
          timestamp: new Date().toISOString()
        }] : []),
        ...(errorMetrics.errorRate > 10 ? [{
          type: 'error',
          message: `High error rate detected: ${errorMetrics.errorRate.toFixed(2)} errors/minute`,
          timestamp: new Date().toISOString()
        }] : []),
        ...(averageResponseTime > 5000 ? [{
          type: 'warning',
          message: `High response times detected: ${averageResponseTime.toFixed(0)}ms average`,
          timestamp: new Date().toISOString()
        }] : [])
      ]
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to retrieve monitoring dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}