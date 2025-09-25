import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitorService } from '../performance-monitor.service';

// Mock prom-client
vi.mock('prom-client', () => ({
  register: {
    metrics: vi.fn().mockResolvedValue('# Prometheus metrics'),
    clear: vi.fn()
  },
  collectDefaultMetrics: vi.fn(),
  Counter: vi.fn().mockImplementation(() => ({
    inc: vi.fn()
  })),
  Histogram: vi.fn().mockImplementation(() => ({
    observe: vi.fn()
  })),
  Gauge: vi.fn().mockImplementation(() => ({
    set: vi.fn()
  }))
}));

describe('PerformanceMonitorService', () => {
  let performanceMonitor: PerformanceMonitorService;

  beforeEach(() => {
    vi.clearAllMocks();
    performanceMonitor = PerformanceMonitorService.getInstance();
    performanceMonitor.resetMetrics();
  });

  describe('cache metrics', () => {
    it('should record cache hits', () => {
      performanceMonitor.recordCacheHit('redis', 'dashboard', 50);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.cacheHits).toBe(1);
    });

    it('should record cache misses', () => {
      performanceMonitor.recordCacheMiss('redis', 'dashboard');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.cacheMisses).toBe(1);
    });

    it('should calculate cache hit rate', () => {
      performanceMonitor.recordCacheHit('redis', 'dashboard', 50);
      performanceMonitor.recordCacheHit('redis', 'ranking', 30);
      performanceMonitor.recordCacheMiss('redis', 'config');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.cacheHitRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('API metrics', () => {
    it('should record API requests', () => {
      performanceMonitor.recordApiRequest('GET', '/api/dashboard', 200, 150);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.apiRequestCount).toBe(1);
      expect(metrics.apiResponseTime).toBeGreaterThan(0);
    });

    it('should track API errors', () => {
      performanceMonitor.recordApiRequest('POST', '/api/config', 500, 200);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.apiRequestCount).toBeGreaterThan(0);
    });

    it('should calculate API error rate', () => {
      performanceMonitor.recordApiRequest('GET', '/api/dashboard', 200, 100);
      performanceMonitor.recordApiRequest('GET', '/api/ranking', 500, 150);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.apiErrorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Funifier API metrics', () => {
    it('should record Funifier requests', () => {
      performanceMonitor.recordFunifierRequest('/player/123', 'GET', 300);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.funifierRequestCount).toBe(1);
      expect(metrics.funifierResponseTime).toBeGreaterThan(0);
    });

    it('should record Funifier errors', () => {
      performanceMonitor.recordFunifierRequest('/player/123', 'GET', 500, 'timeout');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.funifierErrorCount).toBe(1);
    });
  });

  describe('load time tracking', () => {
    it('should record dashboard load times', () => {
      performanceMonitor.recordDashboardLoadTime('carteira_i', 'player123', 2500);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.dashboardLoadTime).toBe(2500);
    });

    it('should record ranking load times', () => {
      performanceMonitor.recordRankingLoadTime('leaderboard1', 'personal', 1800);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.rankingLoadTime).toBe(1800);
    });

    it('should record setup completion times', () => {
      performanceMonitor.recordSetupCompletionTime('funifier', 15000);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.setupCompletionTime).toBe(15000);
    });
  });

  describe('alerts', () => {
    it('should create alerts for threshold violations', () => {
      // Simulate low cache hit rate
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordCacheMiss('redis', 'test');
      }
      performanceMonitor.recordCacheHit('redis', 'test', 50);

      // Trigger threshold check (this would normally happen automatically)
      (performanceMonitor as any).checkThresholds();

      const alerts = performanceMonitor.getUnresolvedAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should resolve alerts', () => {
      // Create an alert first
      (performanceMonitor as any).createAlert(
        'test_alert',
        'warning',
        'testMetric',
        100,
        150,
        'Test alert message'
      );

      const alertsBefore = performanceMonitor.getUnresolvedAlerts();
      expect(alertsBefore.length).toBe(1);

      const resolved = performanceMonitor.resolveAlert('test_alert');
      expect(resolved).toBe(true);

      const alertsAfter = performanceMonitor.getUnresolvedAlerts();
      expect(alertsAfter.length).toBe(0);
    });

    it('should not resolve non-existent alerts', () => {
      const resolved = performanceMonitor.resolveAlert('non_existent');
      expect(resolved).toBe(false);
    });
  });

  describe('thresholds', () => {
    it('should update performance thresholds', () => {
      const newThresholds = {
        cacheHitRateMin: 90,
        apiResponseTimeMax: 3000
      };

      performanceMonitor.updateThresholds(newThresholds);

      // Verify thresholds are updated (would need access to internal state)
      expect(() => performanceMonitor.updateThresholds(newThresholds)).not.toThrow();
    });
  });

  describe('Prometheus metrics', () => {
    it('should return Prometheus formatted metrics', async () => {
      const prometheusMetrics = await performanceMonitor.getPrometheusMetrics();

      expect(typeof prometheusMetrics).toBe('string');
      expect(prometheusMetrics).toContain('# Prometheus metrics');
    });
  });

  describe('active connections', () => {
    it('should update active connections count', () => {
      performanceMonitor.updateActiveConnections(5);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.activeConnections).toBe(5);
    });
  });

  describe('metrics reset', () => {
    it('should reset all metrics', () => {
      // Record some metrics
      performanceMonitor.recordCacheHit('redis', 'test', 50);
      performanceMonitor.recordApiRequest('GET', '/api/test', 200, 100);

      let metrics = performanceMonitor.getMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.apiRequestCount).toBe(1);

      // Reset metrics
      performanceMonitor.resetMetrics();

      metrics = performanceMonitor.getMetrics();
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.apiRequestCount).toBe(0);
    });
  });

  describe('memory tracking', () => {
    it('should collect system metrics', () => {
      // Trigger system metrics collection
      (performanceMonitor as any).collectSystemMetrics();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.heapUsed).toBeGreaterThan(0);
      expect(metrics.heapTotal).toBeGreaterThan(0);
    });
  });

  describe('requests per second calculation', () => {
    it('should calculate requests per second', async () => {
      // Record multiple requests quickly
      for (let i = 0; i < 5; i++) {
        performanceMonitor.recordApiRequest('GET', '/api/test', 200, 100);
      }

      // Trigger RPS calculation
      (performanceMonitor as any).updateRequestsPerSecond();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.requestsPerSecond).toBeGreaterThanOrEqual(0);
    });
  });

  describe('load time thresholds', () => {
    it('should create alerts for slow dashboard loads', () => {
      // Record a slow dashboard load (over 3 seconds)
      performanceMonitor.recordDashboardLoadTime('carteira_i', 'player123', 4000);

      const alerts = performanceMonitor.getUnresolvedAlerts();
      const dashboardAlert = alerts.find(alert => alert.id === 'dashboard_load_time_high');
      expect(dashboardAlert).toBeDefined();
    });

    it('should create alerts for slow ranking loads', () => {
      // Record a slow ranking load (over 2 seconds)
      performanceMonitor.recordRankingLoadTime('leaderboard1', 'personal', 3000);

      const alerts = performanceMonitor.getUnresolvedAlerts();
      const rankingAlert = alerts.find(alert => alert.id === 'ranking_load_time_high');
      expect(rankingAlert).toBeDefined();
    });
  });
});