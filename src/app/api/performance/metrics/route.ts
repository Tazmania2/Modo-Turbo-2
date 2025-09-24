import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/services/performance-monitor.service';

/**
 * GET /api/performance/metrics
 * Get performance metrics in Prometheus format or JSON
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    if (format === 'prometheus') {
      const prometheusMetrics = await performanceMonitor.getPrometheusMetrics();
      
      return new Response(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
        }
      });
    }

    // Return JSON format
    const metrics = performanceMonitor.getMetrics();
    const alerts = performanceMonitor.getAlerts();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      metrics,
      alerts: alerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        metric: alert.metric,
        message: alert.message,
        timestamp: alert.timestamp,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        resolved: alert.resolved
      })),
      summary: {
        totalAlerts: alerts.length,
        unresolvedAlerts: alerts.filter(a => !a.resolved).length,
        criticalAlerts: alerts.filter(a => a.type === 'critical' && !a.resolved).length,
        warningAlerts: alerts.filter(a => a.type === 'warning' && !a.resolved).length
      }
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}