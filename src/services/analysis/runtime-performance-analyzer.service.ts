export interface RuntimePerformanceMetrics {
  timestamp: Date;
  cpuUsage: CPUUsage;
  memoryUsage: MemoryUsage;
  networkActivity: NetworkActivity;
  responseTime: ResponseTimeMetrics;
  throughput: ThroughputMetrics;
  errorRate: number;
  activeConnections: number;
}

export interface CPUUsage {
  overall: number;
  perCore: number[];
  loadAverage: number[];
  processes: ProcessCPUUsage[];
}

export interface ProcessCPUUsage {
  pid: number;
  name: string;
  cpuPercent: number;
  priority: number;
}

export interface MemoryUsage {
  total: number;
  used: number;
  free: number;
  cached: number;
  buffers: number;
  swapTotal: number;
  swapUsed: number;
  componentMemoryUsage: ComponentMemoryUsage[];
  heapSize: number;
  gcFrequency: number;
  memoryTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface ComponentMemoryUsage {
  component: string;
  memoryUsed: number;
  memoryAllocated: number;
  memoryPeak: number;
  leakDetected: boolean;
}

export interface NetworkActivity {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connections: ConnectionMetrics[];
  bandwidth: BandwidthMetrics;
}

export interface ConnectionMetrics {
  protocol: 'http' | 'https' | 'websocket' | 'tcp' | 'udp';
  activeConnections: number;
  totalConnections: number;
  failedConnections: number;
  averageConnectionTime: number;
}

export interface BandwidthMetrics {
  upload: number;
  download: number;
  utilization: number;
  peak: number;
}

export interface ResponseTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  distribution: ResponseTimeDistribution[];
}

export interface ResponseTimeDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  transactionsPerSecond: number;
  dataProcessedPerSecond: number;
  peak: number;
  average: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'network' | 'response_time' | 'throughput' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
  component?: string;
}

export interface PerformanceBaseline {
  component: string;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  confidence: number;
  sampleSize: number;
  createdAt: Date;
  validUntil: Date;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  changeRate: number;
  confidence: number;
  timeframe: string;
  prediction: number;
}

export class RuntimePerformanceAnalyzer {
  private metrics: RuntimePerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeBaselines();
  }

  /**
   * Start real-time performance monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectCurrentMetrics();
        this.metrics.push(metrics);
        
        // Keep only last 1000 metrics to prevent memory issues
        if (this.metrics.length > 1000) {
          this.metrics = this.metrics.slice(-1000);
        }

        // Check for alerts
        await this.checkPerformanceAlerts(metrics);
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get current performance metrics
   */
  async getCurrentMetrics(): Promise<RuntimePerformanceMetrics> {
    return await this.collectCurrentMetrics();
  }

  /**
   * Get performance metrics history
   */
  getMetricsHistory(timeframe?: string): RuntimePerformanceMetrics[] {
    if (!timeframe) {
      return this.metrics;
    }

    const now = new Date();
    const cutoff = new Date();
    
    switch (timeframe) {
      case '1h':
        cutoff.setHours(now.getHours() - 1);
        break;
      case '24h':
        cutoff.setDate(now.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      default:
        return this.metrics;
    }

    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Analyze performance trends
   */
  analyzePerformanceTrends(timeframe: string = '24h'): PerformanceTrend[] {
    const metrics = this.getMetricsHistory(timeframe);
    
    if (metrics.length < 2) {
      return [];
    }

    const trends: PerformanceTrend[] = [];

    // Analyze CPU trend
    const cpuValues = metrics.map(m => m.cpuUsage.overall);
    trends.push(this.calculateTrend('cpu_usage', cpuValues, timeframe));

    // Analyze memory trend
    const memoryValues = metrics.map(m => (m.memoryUsage.used / m.memoryUsage.total) * 100);
    trends.push(this.calculateTrend('memory_usage', memoryValues, timeframe));

    // Analyze response time trend
    const responseTimeValues = metrics.map(m => m.responseTime.average);
    trends.push(this.calculateTrend('response_time', responseTimeValues, timeframe));

    // Analyze throughput trend
    const throughputValues = metrics.map(m => m.throughput.requestsPerSecond);
    trends.push(this.calculateTrend('throughput', throughputValues, timeframe));

    return trends;
  }

  /**
   * Get active performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get performance baseline for component
   */
  getBaseline(component: string): PerformanceBaseline | undefined {
    return this.baselines.get(component);
  }

  /**
   * Update performance baseline
   */
  updateBaseline(component: string, metrics: RuntimePerformanceMetrics[]): void {
    if (metrics.length === 0) return;

    const baseline: PerformanceBaseline = {
      component,
      metrics: {
        cpuUsage: this.calculateAverage(metrics.map(m => m.cpuUsage.overall)),
        memoryUsage: this.calculateAverage(metrics.map(m => (m.memoryUsage.used / m.memoryUsage.total) * 100)),
        responseTime: this.calculateAverage(metrics.map(m => m.responseTime.average)),
        throughput: this.calculateAverage(metrics.map(m => m.throughput.requestsPerSecond)),
        errorRate: this.calculateAverage(metrics.map(m => m.errorRate))
      },
      confidence: Math.min(metrics.length / 100, 1), // Higher confidence with more samples
      sampleSize: metrics.length,
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Valid for 7 days
    };

    this.baselines.set(component, baseline);
  }

  private async collectCurrentMetrics(): Promise<RuntimePerformanceMetrics> {
    // Simplified implementation - in production, this would collect real system metrics
    return {
      timestamp: new Date(),
      cpuUsage: {
        overall: Math.random() * 100,
        perCore: [Math.random() * 100, Math.random() * 100],
        loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
        processes: []
      },
      memoryUsage: {
        total: 8 * 1024 * 1024 * 1024, // 8GB
        used: Math.random() * 6 * 1024 * 1024 * 1024, // Random usage up to 6GB
        free: 2 * 1024 * 1024 * 1024,
        cached: 1024 * 1024 * 1024,
        buffers: 512 * 1024 * 1024,
        swapTotal: 2 * 1024 * 1024 * 1024,
        swapUsed: Math.random() * 1024 * 1024 * 1024,
        componentMemoryUsage: [],
        heapSize: 100 * 1024 * 1024,
        gcFrequency: Math.random() * 10,
        memoryTrend: 'stable'
      },
      networkActivity: {
        bytesIn: Math.random() * 1000000,
        bytesOut: Math.random() * 1000000,
        packetsIn: Math.random() * 1000,
        packetsOut: Math.random() * 1000,
        connections: [],
        bandwidth: {
          upload: Math.random() * 100,
          download: Math.random() * 100,
          utilization: Math.random() * 100,
          peak: Math.random() * 100
        }
      },
      responseTime: {
        average: Math.random() * 1000,
        median: Math.random() * 800,
        p95: Math.random() * 2000,
        p99: Math.random() * 5000,
        min: Math.random() * 100,
        max: Math.random() * 10000,
        distribution: []
      },
      throughput: {
        requestsPerSecond: Math.random() * 1000,
        transactionsPerSecond: Math.random() * 500,
        dataProcessedPerSecond: Math.random() * 1000000,
        peak: Math.random() * 2000,
        average: Math.random() * 800
      },
      errorRate: Math.random() * 5,
      activeConnections: Math.floor(Math.random() * 100)
    };
  }

  private async checkPerformanceAlerts(metrics: RuntimePerformanceMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // Check CPU usage
    if (metrics.cpuUsage.overall > 90) {
      alerts.push({
        id: `cpu-${Date.now()}`,
        type: 'cpu',
        severity: 'critical',
        message: 'CPU usage is critically high',
        threshold: 90,
        currentValue: metrics.cpuUsage.overall,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check memory usage
    const memoryPercent = (metrics.memoryUsage.used / metrics.memoryUsage.total) * 100;
    if (memoryPercent > 85) {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory',
        severity: 'high',
        message: 'Memory usage is high',
        threshold: 85,
        currentValue: memoryPercent,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check response time
    if (metrics.responseTime.average > 2000) {
      alerts.push({
        id: `response-${Date.now()}`,
        type: 'response_time',
        severity: 'medium',
        message: 'Response time is above threshold',
        threshold: 2000,
        currentValue: metrics.responseTime.average,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Add new alerts
    this.alerts.push(...alerts);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private calculateTrend(metric: string, values: number[], timeframe: string): PerformanceTrend {
    if (values.length < 2) {
      return {
        metric,
        direction: 'stable',
        changeRate: 0,
        confidence: 0,
        timeframe,
        prediction: values[0] || 0
      };
    }

    const first = values[0];
    const last = values[values.length - 1];
    const changeRate = ((last - first) / first) * 100;

    let direction: 'improving' | 'degrading' | 'stable';
    if (Math.abs(changeRate) < 5) {
      direction = 'stable';
    } else if (changeRate > 0) {
      direction = metric === 'throughput' ? 'improving' : 'degrading';
    } else {
      direction = metric === 'throughput' ? 'degrading' : 'improving';
    }

    return {
      metric,
      direction,
      changeRate: Math.abs(changeRate),
      confidence: Math.min(values.length / 50, 1),
      timeframe,
      prediction: last + (changeRate / 100) * last
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private initializeBaselines(): void {
    // Initialize with default baselines
    const defaultBaseline: PerformanceBaseline = {
      component: 'system',
      metrics: {
        cpuUsage: 30,
        memoryUsage: 60,
        responseTime: 500,
        throughput: 100,
        errorRate: 1
      },
      confidence: 0.8,
      sampleSize: 100,
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    this.baselines.set('system', defaultBaseline);
  }
}