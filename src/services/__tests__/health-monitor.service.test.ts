import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { healthMonitor } from '../health-monitor.service';
import type { HealthCheckResult } from '../health-monitor.service';

describe('HealthMonitorService', () => {
  beforeEach(() => {
    // Clear any existing services and history
    healthMonitor.stopMonitoring();
    healthMonitor.clearHistory();
  });

  afterEach(() => {
    healthMonitor.stopMonitoring();
  });

  describe('service registration', () => {
    it('should register and unregister services', async () => {
      const mockService = {
        name: 'test-service',
        check: vi.fn().mockResolvedValue({
          service: 'test-service',
          status: 'healthy' as const,
          timestamp: new Date()
        })
      };

      healthMonitor.registerService(mockService);

      const result = await healthMonitor.checkServiceHealth('test-service');
      expect(result.service).toBe('test-service');
      expect(result.status).toBe('healthy');

      healthMonitor.unregisterService('test-service');

      const unregisteredResult = await healthMonitor.checkServiceHealth('test-service');
      expect(unregisteredResult.status).toBe('unhealthy');
      expect(unregisteredResult.error).toBe('Service not registered');
    });
  });

  describe('health checks', () => {
    beforeEach(() => {
      const healthyService = {
        name: 'healthy-service',
        check: vi.fn().mockResolvedValue({
          service: 'healthy-service',
          status: 'healthy' as const,
          responseTime: 100,
          timestamp: new Date()
        })
      };

      const unhealthyService = {
        name: 'unhealthy-service',
        check: vi.fn().mockRejectedValue(new Error('Service down'))
      };

      healthMonitor.registerService(healthyService);
      healthMonitor.registerService(unhealthyService);
    });

    it('should check individual service health', async () => {
      const result = await healthMonitor.checkServiceHealth('healthy-service');
      
      expect(result.service).toBe('healthy-service');
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBe(100);
    });

    it('should handle service check failures', async () => {
      const result = await healthMonitor.checkServiceHealth('unhealthy-service');
      
      expect(result.service).toBe('unhealthy-service');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Service down');
    });

    it('should check all services and determine overall health', async () => {
      const systemHealth = await healthMonitor.checkAllServices();
      
      expect(systemHealth.overall).toBe('unhealthy'); // One service is unhealthy
      expect(systemHealth.services).toHaveLength(2);
      expect(systemHealth.uptime).toBeGreaterThan(0);
    });
  });

  describe('retry logic', () => {
    it('should retry failed health checks', async () => {
      const mockCheck = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValue({
          service: 'retry-service',
          status: 'healthy' as const,
          timestamp: new Date()
        });

      const retryService = {
        name: 'retry-service',
        check: mockCheck,
        config: { retries: 2, timeout: 1000 }
      };

      healthMonitor.registerService(retryService);

      const result = await healthMonitor.checkServiceHealth('retry-service');
      
      expect(result.status).toBe('healthy');
      expect(mockCheck).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should fail after max retries', async () => {
      const mockCheck = vi.fn().mockRejectedValue(new Error('Always fails'));

      const failingService = {
        name: 'failing-service',
        check: mockCheck,
        config: { retries: 1, timeout: 1000 }
      };

      healthMonitor.registerService(failingService);

      const result = await healthMonitor.checkServiceHealth('failing-service');
      
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Always fails');
      expect(mockCheck).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running health checks', async () => {
      const slowService = {
        name: 'slow-service',
        check: () => new Promise(resolve => setTimeout(resolve, 2000)), // 2 second delay
        config: { timeout: 500 } // 500ms timeout
      };

      healthMonitor.registerService(slowService);

      const result = await healthMonitor.checkServiceHealth('slow-service');
      
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Health check timeout');
    });
  });

  describe('health history and metrics', () => {
    beforeEach(async () => {
      const testService = {
        name: 'metrics-service',
        check: vi.fn().mockResolvedValue({
          service: 'metrics-service',
          status: 'healthy' as const,
          responseTime: 150,
          timestamp: new Date()
        })
      };

      healthMonitor.registerService(testService);

      // Generate some history
      for (let i = 0; i < 5; i++) {
        await healthMonitor.checkServiceHealth('metrics-service');
      }
    });

    it('should track service history', () => {
      const history = healthMonitor.getServiceHistory('metrics-service');
      
      expect(history).toHaveLength(5);
      expect(history.every(check => check.service === 'metrics-service')).toBe(true);
    });

    it('should calculate service metrics', () => {
      const metrics = healthMonitor.getServiceMetrics('metrics-service');
      
      expect(metrics.uptime).toBe(100); // All checks were healthy
      expect(metrics.averageResponseTime).toBe(150);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.totalChecks).toBe(5);
    });

    it('should limit history size', async () => {
      // Add more checks to exceed limit
      for (let i = 0; i < 100; i++) {
        await healthMonitor.checkServiceHealth('metrics-service');
      }

      const history = healthMonitor.getServiceHistory('metrics-service');
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('continuous monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(() => healthMonitor.startMonitoring()).not.toThrow();
      expect(() => healthMonitor.stopMonitoring()).not.toThrow();
    });

    it('should not start monitoring twice', () => {
      healthMonitor.startMonitoring();
      healthMonitor.startMonitoring(); // Should not throw or create duplicate intervals
      healthMonitor.stopMonitoring();
    });
  });

  describe('overall health determination', () => {
    it('should determine system is healthy when all services are healthy', async () => {
      const service1 = {
        name: 'service1',
        check: vi.fn().mockResolvedValue({
          service: 'service1',
          status: 'healthy' as const,
          timestamp: new Date()
        })
      };

      const service2 = {
        name: 'service2',
        check: vi.fn().mockResolvedValue({
          service: 'service2',
          status: 'healthy' as const,
          timestamp: new Date()
        })
      };

      healthMonitor.registerService(service1);
      healthMonitor.registerService(service2);

      const systemHealth = await healthMonitor.checkAllServices();
      expect(systemHealth.overall).toBe('healthy');
    });

    it('should determine system is degraded when some services are degraded', async () => {
      const healthyService = {
        name: 'healthy',
        check: vi.fn().mockResolvedValue({
          service: 'healthy',
          status: 'healthy' as const,
          timestamp: new Date()
        })
      };

      const degradedService = {
        name: 'degraded',
        check: vi.fn().mockResolvedValue({
          service: 'degraded',
          status: 'degraded' as const,
          timestamp: new Date()
        })
      };

      healthMonitor.registerService(healthyService);
      healthMonitor.registerService(degradedService);

      const systemHealth = await healthMonitor.checkAllServices();
      expect(systemHealth.overall).toBe('degraded');
    });

    it('should determine system is unhealthy when any service is unhealthy', async () => {
      const healthyService = {
        name: 'healthy',
        check: vi.fn().mockResolvedValue({
          service: 'healthy',
          status: 'healthy' as const,
          timestamp: new Date()
        })
      };

      const unhealthyService = {
        name: 'unhealthy',
        check: vi.fn().mockRejectedValue(new Error('Service failed'))
      };

      healthMonitor.registerService(healthyService);
      healthMonitor.registerService(unhealthyService);

      const systemHealth = await healthMonitor.checkAllServices();
      expect(systemHealth.overall).toBe('unhealthy');
    });
  });
});