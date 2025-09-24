import { HealthCheckResult, SystemHealth } from '@/types/error';
import { errorLogger } from './error-logger.service';
import { ErrorType } from '@/types/error';

export interface HealthCheckConfig {
  timeout: number;
  interval: number;
  retries: number;
}

export interface ServiceHealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  config?: Partial<HealthCheckConfig>;
}

class HealthMonitorService {
  private services: Map<string, ServiceHealthCheck> = new Map();
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  private defaultConfig: HealthCheckConfig = {
    timeout: 5000,
    interval: 30000, // 30 seconds
    retries: 2
  };

  /**
   * Register a service for health monitoring
   */
  registerService(service: ServiceHealthCheck): void {
    this.services.set(service.name, service);
    this.healthHistory.set(service.name, []);
  }

  /**
   * Unregister a service
   */
  unregisterService(serviceName: string): void {
    this.services.delete(serviceName);
    this.healthHistory.delete(serviceName);
  }

  /**
   * Check health of a specific service
   */
  async checkServiceHealth(serviceName: string): Promise<HealthCheckResult> {
    const service = this.services.get(serviceName);
    if (!service) {
      return {
        service: serviceName,
        status: 'unhealthy',
        error: 'Service not registered',
        timestamp: new Date()
      };
    }

    const config = { ...this.defaultConfig, ...service.config };
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          service.check,
          config.timeout
        );
        
        this.recordHealthResult(serviceName, result);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt < config.retries) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    const failureResult: HealthCheckResult = {
      service: serviceName,
      status: 'unhealthy',
      error: lastError,
      timestamp: new Date()
    };

    this.recordHealthResult(serviceName, failureResult);
    return failureResult;
  }

  /**
   * Check health of all registered services
   */
  async checkAllServices(): Promise<SystemHealth> {
    const startTime = Date.now();
    const serviceChecks = Array.from(this.services.keys()).map(
      serviceName => this.checkServiceHealth(serviceName)
    );

    const results = await Promise.all(serviceChecks);
    const overallStatus = this.determineOverallHealth(results);

    const systemHealth: SystemHealth = {
      overall: overallStatus,
      services: results,
      timestamp: new Date(),
      uptime: process.uptime()
    };

    // Log critical health issues
    if (overallStatus === 'unhealthy') {
      errorLogger.logCustomError(
        ErrorType.CONFIGURATION_ERROR,
        'System health check failed',
        { results },
        { healthCheck: true }
      );
    }

    return systemHealth;
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllServices();
      } catch (error) {
        errorLogger.logCustomError(
          ErrorType.CONFIGURATION_ERROR,
          'Health monitoring failed',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
      }
    }, this.defaultConfig.interval);
  }

  /**
   * Stop continuous health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.monitoring = false;
  }

  /**
   * Get health history for a service
   */
  getServiceHistory(serviceName: string, limit = 50): HealthCheckResult[] {
    return this.healthHistory.get(serviceName)?.slice(-limit) || [];
  }

  /**
   * Get health metrics for a service
   */
  getServiceMetrics(serviceName: string, timeWindow = 3600000): {
    uptime: number;
    averageResponseTime: number;
    errorRate: number;
    totalChecks: number;
  } {
    const history = this.getServiceHistory(serviceName);
    const cutoffTime = new Date(Date.now() - timeWindow);
    
    const recentChecks = history.filter(
      check => check.timestamp >= cutoffTime
    );

    if (recentChecks.length === 0) {
      return {
        uptime: 0,
        averageResponseTime: 0,
        errorRate: 0,
        totalChecks: 0
      };
    }

    const healthyChecks = recentChecks.filter(
      check => check.status === 'healthy'
    );

    const responseTimes = recentChecks
      .filter(check => check.responseTime !== undefined)
      .map(check => check.responseTime!);

    return {
      uptime: (healthyChecks.length / recentChecks.length) * 100,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0,
      errorRate: ((recentChecks.length - healthyChecks.length) / recentChecks.length) * 100,
      totalChecks: recentChecks.length
    };
  }

  /**
   * Clear health history
   */
  clearHistory(serviceName?: string): void {
    if (serviceName) {
      this.healthHistory.set(serviceName, []);
    } else {
      this.healthHistory.clear();
    }
  }

  private recordHealthResult(serviceName: string, result: HealthCheckResult): void {
    const history = this.healthHistory.get(serviceName) || [];
    history.push(result);
    
    // Keep only last 100 results per service
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.healthHistory.set(serviceName, history);
  }

  private determineOverallHealth(results: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (results.length === 0) {
      return 'unhealthy';
    }

    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;

    // If any critical services are unhealthy, system is unhealthy
    if (unhealthyCount > 0) {
      return 'unhealthy';
    }

    // If more than half are degraded, system is degraded
    if (degradedCount > results.length / 2) {
      return 'degraded';
    }

    // If all are healthy, system is healthy
    if (healthyCount === results.length) {
      return 'healthy';
    }

    return 'degraded';
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      )
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const healthMonitor = new HealthMonitorService();

// Register default health checks
healthMonitor.registerService({
  name: 'funifier-api',
  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      // This would make an actual API call to Funifier
      // For now, simulate a health check
      const response = await fetch('/api/health/funifier');
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'funifier-api',
          status: 'healthy',
          responseTime,
          timestamp: new Date()
        };
      } else {
        return {
          service: 'funifier-api',
          status: 'degraded',
          responseTime,
          error: `HTTP ${response.status}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        service: 'funifier-api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
});

healthMonitor.registerService({
  name: 'database',
  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      // Check database connectivity
      const response = await fetch('/api/health/database');
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'database',
          status: 'healthy',
          responseTime,
          timestamp: new Date()
        };
      } else {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
});

healthMonitor.registerService({
  name: 'cache',
  check: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      // Check cache connectivity
      const response = await fetch('/api/health/cache');
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'cache',
          status: 'healthy',
          responseTime,
          timestamp: new Date()
        };
      } else {
        return {
          service: 'cache',
          status: 'degraded',
          responseTime,
          error: `HTTP ${response.status}`,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        service: 'cache',
        status: 'degraded', // Cache is not critical
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
});