import { NextRequest, NextResponse } from 'next/server';
import { enhancedCacheManager } from '@/services/enhanced-cache-manager.service';
import { redisCacheService } from '@/services/redis-cache.service';
import { performanceMonitor } from '@/services/performance-monitor.service';

/**
 * GET /api/cache/stats
 * Get comprehensive cache statistics and performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Get performance report from cache manager
    const performanceReport = await enhancedCacheManager.getPerformanceReport();
    
    // Get Redis health check
    const redisHealth = await redisCacheService.healthCheck();
    
    // Get performance metrics
    const performanceMetrics = performanceMonitor.getMetrics();
    
    // Get performance alerts
    const alerts = performanceMonitor.getUnresolvedAlerts();

    const response = {
      timestamp: new Date().toISOString(),
      cache: performanceReport,
      redis: {
        health: redisHealth,
        metrics: redisCacheService.getMetrics()
      },
      performance: performanceMetrics,
      alerts: alerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        metric: alert.metric,
        message: alert.message,
        timestamp: alert.timestamp,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      })),
      summary: {
        overallHealth: redisHealth.redis.connected ? 'healthy' : 'degraded',
        cacheHitRate: performanceReport.overall.hitRate,
        averageResponseTime: performanceReport.overall.averageResponseTime,
        activeAlerts: alerts.length,
        recommendations: performanceReport.recommendations
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}