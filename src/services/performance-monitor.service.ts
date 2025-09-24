import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export interface PerformanceMetrics {
  // Cache metrics
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  cacheResponseTime: number;
  
  // API metrics
  apiRequestCount: number;
  apiResponseTime: number;
  apiErrorRate: number;
  
  // Funifier API metrics
  funifierRequestCount: number;
  funifierResponseTime: number;
  funifierErrorCount: number;
  
  // Memory metrics
  memoryUsage: number;
  heapUsed: number;
  heapTotal: number;
  
  // Application metrics
  activeConnections: number;
  requestsPerSecond: number;
  
  // Custom metrics
  dashboardLoadTime: number;
  rankingLoadTime: number;
  setupCompletionTime: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceThresholds {
  cacheHitRateMin: number;
  apiResponseTimeMax: number;
  apiErrorRateMax: number;
  memoryUsageMax: number;
  dashboardLoadTimeMax: number;
  rankingLoadTimeMax: number;
}

/**
 * Performance Monitoring Service
 * Tracks application performance metrics and provides alerting
 */
export class PerformanceMonitorService {
  private static instance: PerformanceMonitorService;
  
  // Prometheus metrics
  private cacheHitsCounter: Counter<string>;
  private cacheMissesCounter: Counter<string>;
  private cacheResponseTimeHistogram: Histogram<string>;
  
  private apiRequestCounter: Counter<string>;
  private apiResponseTimeHistogram: Histogram<string>;
  private apiErrorCounter: Counter<string>;
  
  private funifierRequestCounter: Counter<string>;
  private funifierResponseTimeHistogram: Histogram<string>;
  private funifierErrorCounter: Counter<string>;
  
  private memoryUsageGauge: Gauge<string>;
  private activeConnectionsGauge: Gauge<string>;
  
  private dashboardLoadTimeHistogram: Histogram<string>;
  private rankingLoadTimeHistogram: Histogram<string>;
  private setupCompletionTimeHistogram: Histogram<string>;
  
  // Internal tracking
  private metrics: PerformanceMetrics;
  private alerts: Map<string, PerformanceAlert>;
  private thresholds: PerformanceThresholds;
  private startTime: Date;
  private requestCounts: { timestamp: number; count: number }[];

  private constructor() {
    this.startTime = new Date();
    this.requestCounts = [];
    this.alerts = new Map();
    
    this.thresholds = {
      cacheHitRateMin: 80, // 80%
      apiResponseTimeMax: 5000, // 5 seconds
      apiErrorRateMax: 5, // 5%
      memoryUsageMax: 512 * 1024 * 1024, // 512MB
      dashboardLoadTimeMax: 3000, // 3 seconds
      rankingLoadTimeMax: 2000 // 2 seconds
    };

    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      cacheResponseTime: 0,
      apiRequestCount: 0,
      apiResponseTime: 0,
      apiErrorRate: 0,
      funifierRequestCount: 0,
      funifierResponseTime: 0,
      funifierErrorCount: 0,
      memoryUsage: 0,
      heapUsed: 0,
      heapTotal: 0,
      activeConnections: 0,
      requestsPerSecond: 0,
      dashboardLoadTime: 0,
      rankingLoadTime: 0,
      setupCompletionTime: 0
    };

    this.initializePrometheusMetrics();
    this.startPeriodicCollection();
  }

  static getInstance(): PerformanceMonitorService {
    if (!PerformanceMonitorService.instance) {
      PerformanceMonitorService.instance = new PerformanceMonitorService();
    }
    return PerformanceMonitorService.instance;
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializePrometheusMetrics(): void {
    // Enable default metrics collection
    collectDefaultMetrics({ register });

    // Cache metrics
    this.cacheHitsCounter = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type', 'key_pattern']
    });

    this.cacheMissesCounter = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type', 'key_pattern']
    });

    this.cacheResponseTimeHistogram = new Histogram({
      name: 'cache_response_time_seconds',
      help: 'Cache response time in seconds',
      labelNames: ['cache_type', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // API metrics
    this.apiRequestCounter = new Counter({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'route', 'status_code']
    });

    this.apiResponseTimeHistogram = new Histogram({
      name: 'api_response_time_seconds',
      help: 'API response time in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    this.apiErrorCounter = new Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['method', 'route', 'error_type']
    });

    // Funifier API metrics
    this.funifierRequestCounter = new Counter({
      name: 'funifier_requests_total',
      help: 'Total number of Funifier API requests',
      labelNames: ['endpoint', 'method']
    });

    this.funifierResponseTimeHistogram = new Histogram({
      name: 'funifier_response_time_seconds',
      help: 'Funifier API response time in seconds',
      labelNames: ['endpoint', 'method'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    this.funifierErrorCounter = new Counter({
      name: 'funifier_errors_total',
      help: 'Total number of Funifier API errors',
      labelNames: ['endpoint', 'error_type']
    });

    // System metrics
    this.memoryUsageGauge = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Current memory usage in bytes',
      labelNames: ['type']
    });

    this.activeConnectionsGauge = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections'
    });

    // Application metrics
    this.dashboardLoadTimeHistogram = new Histogram({
      name: 'dashboard_load_time_seconds',
      help: 'Dashboard load time in seconds',
      labelNames: ['dashboard_type', 'player_id'],
      buckets: [0.5, 1, 2, 3, 5, 10]
    });

    this.rankingLoadTimeHistogram = new Histogram({
      name: 'ranking_load_time_seconds',
      help: 'Ranking load time in seconds',
      labelNames: ['leaderboard_id', 'view_type'],
      buckets: [0.5, 1, 2, 3, 5, 10]
    });

    this.setupCompletionTimeHistogram = new Histogram({
      name: 'setup_completion_time_seconds',
      help: 'Setup completion time in seconds',
      labelNames: ['setup_type'],
      buckets: [1, 5, 10, 30, 60, 120]
    });
  }

  /**
   * Start periodic metrics collection
   */
  private startPeriodicCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
      this.calculateDerivedMetrics();
      this.checkThresholds();
      this.cleanupOldData();
    }, 30000);

    // Collect request rate every 5 seconds
    setInterval(() => {
      this.updateRequestsPerSecond();
    }, 5000);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheType: string, keyPattern: string, responseTime: number): void {
    this.cacheHitsCounter.inc({ cache_type: cacheType, key_pattern: keyPattern });
    this.cacheResponseTimeHistogram.observe(
      { cache_type: cacheType, operation: 'get' },
      responseTime / 1000
    );
    
    this.metrics.cacheHits++;
    this.updateCacheMetrics();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheType: string, keyPattern: string): void {
    this.cacheMissesCounter.inc({ cache_type: cacheType, key_pattern: keyPattern });
    this.metrics.cacheMisses++;
    this.updateCacheMetrics();
  }

  /**
   * Record API request
   */
  recordApiRequest(method: string, route: string, statusCode: number, responseTime: number): void {
    this.apiRequestCounter.inc({ method, route, status_code: statusCode.toString() });
    this.apiResponseTimeHistogram.observe({ method, route }, responseTime / 1000);
    
    if (statusCode >= 400) {
      this.apiErrorCounter.inc({ method, route, error_type: statusCode >= 500 ? 'server_error' : 'client_error' });
    }
    
    this.metrics.apiRequestCount++;
    this.updateApiMetrics(responseTime);
    this.recordRequestForRateCalculation();
  }

  /**
   * Record Funifier API request
   */
  recordFunifierRequest(endpoint: string, method: string, responseTime: number, error?: string): void {
    this.funifierRequestCounter.inc({ endpoint, method });
    this.funifierResponseTimeHistogram.observe({ endpoint, method }, responseTime / 1000);
    
    if (error) {
      this.funifierErrorCounter.inc({ endpoint, error_type: error });
      this.metrics.funifierErrorCount++;
    }
    
    this.metrics.funifierRequestCount++;
    this.updateFunifierMetrics(responseTime);
  }

  /**
   * Record dashboard load time
   */
  recordDashboardLoadTime(dashboardType: string, playerId: string, loadTime: number): void {
    this.dashboardLoadTimeHistogram.observe(
      { dashboard_type: dashboardType, player_id: playerId },
      loadTime / 1000
    );
    
    this.metrics.dashboardLoadTime = loadTime;
    this.checkLoadTimeThreshold('dashboard', loadTime);
  }

  /**
   * Record ranking load time
   */
  recordRankingLoadTime(leaderboardId: string, viewType: string, loadTime: number): void {
    this.rankingLoadTimeHistogram.observe(
      { leaderboard_id: leaderboardId, view_type: viewType },
      loadTime / 1000
    );
    
    this.metrics.rankingLoadTime = loadTime;
    this.checkLoadTimeThreshold('ranking', loadTime);
  }

  /**
   * Record setup completion time
   */
  recordSetupCompletionTime(setupType: string, completionTime: number): void {
    this.setupCompletionTimeHistogram.observe(
      { setup_type: setupType },
      completionTime / 1000
    );
    
    this.metrics.setupCompletionTime = completionTime;
  }

  /**
   * Update active connections count
   */
  updateActiveConnections(count: number): void {
    this.activeConnectionsGauge.set(count);
    this.metrics.activeConnections = count;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): PerformanceAlert[] {
    return this.getAlerts().filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Get Prometheus metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    register.clear();
    this.initializePrometheusMetrics();
    
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      cacheResponseTime: 0,
      apiRequestCount: 0,
      apiResponseTime: 0,
      apiErrorRate: 0,
      funifierRequestCount: 0,
      funifierResponseTime: 0,
      funifierErrorCount: 0,
      memoryUsage: 0,
      heapUsed: 0,
      heapTotal: 0,
      activeConnections: 0,
      requestsPerSecond: 0,
      dashboardLoadTime: 0,
      rankingLoadTime: 0,
      setupCompletionTime: 0
    };
    
    this.alerts.clear();
    this.requestCounts = [];
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    
    this.memoryUsageGauge.set({ type: 'heap_used' }, memUsage.heapUsed);
    this.memoryUsageGauge.set({ type: 'heap_total' }, memUsage.heapTotal);
    this.memoryUsageGauge.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsageGauge.set({ type: 'external' }, memUsage.external);
    
    this.metrics.memoryUsage = memUsage.rss;
    this.metrics.heapUsed = memUsage.heapUsed;
    this.metrics.heapTotal = memUsage.heapTotal;
  }

  /**
   * Calculate derived metrics
   */
  private calculateDerivedMetrics(): void {
    // Calculate cache hit rate
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = totalCacheRequests > 0 ? 
      (this.metrics.cacheHits / totalCacheRequests) * 100 : 0;

    // Calculate API error rate
    this.metrics.apiErrorRate = this.metrics.apiRequestCount > 0 ? 
      (this.metrics.funifierErrorCount / this.metrics.apiRequestCount) * 100 : 0;
  }

  /**
   * Update cache metrics
   */
  private updateCacheMetrics(): void {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = totalRequests > 0 ? 
      (this.metrics.cacheHits / totalRequests) * 100 : 0;
  }

  /**
   * Update API metrics
   */
  private updateApiMetrics(responseTime: number): void {
    // Simple moving average for response time
    this.metrics.apiResponseTime = (this.metrics.apiResponseTime + responseTime) / 2;
  }

  /**
   * Update Funifier metrics
   */
  private updateFunifierMetrics(responseTime: number): void {
    // Simple moving average for response time
    this.metrics.funifierResponseTime = (this.metrics.funifierResponseTime + responseTime) / 2;
  }

  /**
   * Record request for rate calculation
   */
  private recordRequestForRateCalculation(): void {
    const now = Date.now();
    this.requestCounts.push({ timestamp: now, count: 1 });
  }

  /**
   * Update requests per second calculation
   */
  private updateRequestsPerSecond(): void {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Count requests in the last second
    const recentRequests = this.requestCounts.filter(req => req.timestamp > oneSecondAgo);
    this.metrics.requestsPerSecond = recentRequests.length;
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkThresholds(): void {
    // Check cache hit rate
    if (this.metrics.cacheHitRate < this.thresholds.cacheHitRateMin) {
      this.createAlert(
        'cache_hit_rate_low',
        'warning',
        'cacheHitRate',
        this.thresholds.cacheHitRateMin,
        this.metrics.cacheHitRate,
        `Cache hit rate is below threshold: ${this.metrics.cacheHitRate.toFixed(2)}%`
      );
    }

    // Check API response time
    if (this.metrics.apiResponseTime > this.thresholds.apiResponseTimeMax) {
      this.createAlert(
        'api_response_time_high',
        'warning',
        'apiResponseTime',
        this.thresholds.apiResponseTimeMax,
        this.metrics.apiResponseTime,
        `API response time is above threshold: ${this.metrics.apiResponseTime.toFixed(2)}ms`
      );
    }

    // Check memory usage
    if (this.metrics.memoryUsage > this.thresholds.memoryUsageMax) {
      this.createAlert(
        'memory_usage_high',
        'error',
        'memoryUsage',
        this.thresholds.memoryUsageMax,
        this.metrics.memoryUsage,
        `Memory usage is above threshold: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // Check API error rate
    if (this.metrics.apiErrorRate > this.thresholds.apiErrorRateMax) {
      this.createAlert(
        'api_error_rate_high',
        'error',
        'apiErrorRate',
        this.thresholds.apiErrorRateMax,
        this.metrics.apiErrorRate,
        `API error rate is above threshold: ${this.metrics.apiErrorRate.toFixed(2)}%`
      );
    }
  }

  /**
   * Check load time thresholds
   */
  private checkLoadTimeThreshold(type: 'dashboard' | 'ranking', loadTime: number): void {
    const threshold = type === 'dashboard' ? 
      this.thresholds.dashboardLoadTimeMax : 
      this.thresholds.rankingLoadTimeMax;

    if (loadTime > threshold) {
      this.createAlert(
        `${type}_load_time_high`,
        'warning',
        `${type}LoadTime`,
        threshold,
        loadTime,
        `${type} load time is above threshold: ${loadTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    id: string,
    type: 'warning' | 'error' | 'critical',
    metric: string,
    threshold: number,
    currentValue: number,
    message: string
  ): void {
    // Don't create duplicate alerts
    if (this.alerts.has(id) && !this.alerts.get(id)!.resolved) {
      return;
    }

    const alert: PerformanceAlert = {
      id,
      type,
      metric,
      threshold,
      currentValue,
      message,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(id, alert);
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Clean up old request counts
    this.requestCounts = this.requestCounts.filter(req => req.timestamp > fiveMinutesAgo);
    
    // Clean up old resolved alerts (keep for 1 hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.timestamp.getTime() < oneHourAgo) {
        this.alerts.delete(id);
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitorService.getInstance();