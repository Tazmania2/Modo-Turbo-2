import { bundleSizeAnalyzerService } from './bundle-size-analyzer.service';
import { runtimePerformanceAnalyzerService } from './runtime-performance-analyzer.service';

export interface PerformanceMetrics {
  timestamp: number;
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'regression' | 'improvement' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
}

export interface PerformanceTrend {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
  period: string;
}

export interface PerformanceThresholds {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface PerformanceReport {
  metrics: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  trends: PerformanceTrend[];
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    regressions: number;
    improvements: number;
  };
}

export class PerformanceMonitoringService {
  private readonly defaultThresholds: PerformanceThresholds = {
    bundleSize: 3 * 1024 * 1024, // 3MB
    loadTime: 2000, // 2 seconds
    renderTime: 1000, // 1 second
    memoryUsage: 100 * 1024 * 1024, // 100MB
    cpuUsage: 70 // 70%
  };

  /**
   * Collects current performance metrics
   */
  async collectMetrics(projectPath: string): Promise<PerformanceMetrics> {
    try {
      // Collect bundle size metrics
      const bundleAnalysis = await bundleSizeAnalyzerService.analyzeBundleSize(projectPath);
      
      // Collect runtime performance metrics
      const runtimeAnalysis = await runtimePerformanceAnalyzerService.analyzeRuntimePerformance(
        projectPath,
        {
          duration: 10,
          sampleRate: 1,
          includeMemory: true,
          includeCpu: true,
          includeNetwork: false,
          includeRendering: true,
          components: []
        }
      );

      return {
        timestamp: Date.now(),
        bundleSize: bundleAnalysis.totalSize,
        loadTime: this.estimateLoadTime(bundleAnalysis.totalSize),
        renderTime: this.estimateRenderTime(runtimeAnalysis.renderingPerformance.frameRate),
        memoryUsage: runtimeAnalysis.memoryUsage.totalMemory,
        cpuUsage: runtimeAnalysis.cpuUsage.averageUsage
      };
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
      throw new Error(`Performance metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Analyzes performance trends from historical data
   */
  analyzeTrends(historicalData: PerformanceMetrics[], period: string = '24h'): PerformanceTrend[] {
    if (historicalData.length < 2) {
      return [];
    }

    const trends: PerformanceTrend[] = [];
    const metrics: (keyof Omit<PerformanceMetrics, 'timestamp'>)[] = [
      'bundleSize', 'loadTime', 'renderTime', 'memoryUsage', 'cpuUsage'
    ];

    for (const metric of metrics) {
      const trend = this.calculateTrend(historicalData, metric, period);
      trends.push(trend);
    }

    return trends;
  }

  /**
   * Detects performance regressions and generates alerts
   */
  detectRegressions(
    currentMetrics: PerformanceMetrics,
    historicalData: PerformanceMetrics[],
    thresholds: Partial<PerformanceThresholds> = {}
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const mergedThresholds = { ...this.defaultThresholds, ...thresholds };

    // Check absolute thresholds
    alerts.push(...this.checkAbsoluteThresholds(currentMetrics, mergedThresholds));

    // Check relative regressions
    if (historicalData.length > 0) {
      alerts.push(...this.checkRelativeRegressions(currentMetrics, historicalData, mergedThresholds));
    }

    return alerts;
  }

  /**
   * Generates a comprehensive performance report
   */
  async generateReport(
    projectPath: string,
    historicalData: PerformanceMetrics[],
    period: string = '24h'
  ): Promise<PerformanceReport> {
    try {
      const currentMetrics = await this.collectMetrics(projectPath);
      const trends = this.analyzeTrends(historicalData, period);
      const alerts = this.detectRegressions(currentMetrics, historicalData);

      const summary = {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        regressions: alerts.filter(a => a.type === 'regression').length,
        improvements: alerts.filter(a => a.type === 'improvement').length
      };

      return {
        metrics: [...historicalData, currentMetrics],
        alerts,
        trends,
        summary
      };
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw new Error(`Performance report generation failed: ${error.message}`);
    }
  }

  /**
   * Estimates load time based on bundle size
   */
  private estimateLoadTime(bundleSize: number): number {
    // Rough estimation: 1MB takes ~500ms on average connection
    const baseTime = 500;
    const sizeInMB = bundleSize / (1024 * 1024);
    return Math.round(baseTime * sizeInMB);
  }

  /**
   * Estimates render time based on frame rate
   */
  private estimateRenderTime(frameRate: number): number {
    // Convert frame rate to render time
    if (frameRate <= 0) return 1000; // 1 second fallback
    return Math.round(1000 / frameRate);
  }

  /**
   * Calculates trend for a specific metric
   */
  private calculateTrend(
    data: PerformanceMetrics[],
    metric: keyof Omit<PerformanceMetrics, 'timestamp'>,
    period: string
  ): PerformanceTrend {
    if (data.length < 2) {
      return {
        metric: this.formatMetricName(metric),
        trend: 'stable',
        change: 0,
        period
      };
    }

    // Simple linear regression to calculate trend
    const values = data.map(d => d[metric]);
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const percentChange = (slope / (sumY / n)) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(percentChange) < 2) {
      trend = 'stable';
    } else if (percentChange > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      metric: this.formatMetricName(metric),
      trend,
      change: percentChange,
      period
    };
  }

  /**
   * Checks metrics against absolute thresholds
   */
  private checkAbsoluteThresholds(
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    const checks = [
      {
        metric: 'bundleSize',
        value: metrics.bundleSize,
        threshold: thresholds.bundleSize,
        message: `Bundle size (${this.formatBytes(metrics.bundleSize)}) exceeds threshold`
      },
      {
        metric: 'loadTime',
        value: metrics.loadTime,
        threshold: thresholds.loadTime,
        message: `Load time (${metrics.loadTime}ms) exceeds threshold`
      },
      {
        metric: 'renderTime',
        value: metrics.renderTime,
        threshold: thresholds.renderTime,
        message: `Render time (${metrics.renderTime}ms) exceeds threshold`
      },
      {
        metric: 'memoryUsage',
        value: metrics.memoryUsage,
        threshold: thresholds.memoryUsage,
        message: `Memory usage (${this.formatBytes(metrics.memoryUsage)}) exceeds threshold`
      },
      {
        metric: 'cpuUsage',
        value: metrics.cpuUsage,
        threshold: thresholds.cpuUsage,
        message: `CPU usage (${metrics.cpuUsage.toFixed(1)}%) exceeds threshold`
      }
    ];

    for (const check of checks) {
      if (check.value > check.threshold) {
        const severity = this.calculateSeverity(check.value, check.threshold);
        
        alerts.push({
          id: `threshold_${check.metric}_${Date.now()}`,
          type: 'warning',
          severity,
          message: check.message,
          timestamp: Date.now(),
          metric: check.metric,
          value: check.value,
          threshold: check.threshold
        });
      }
    }

    return alerts;
  }

  /**
   * Checks for relative performance regressions
   */
  private checkRelativeRegressions(
    currentMetrics: PerformanceMetrics,
    historicalData: PerformanceMetrics[],
    thresholds: PerformanceThresholds
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    
    if (historicalData.length < 5) return alerts; // Need enough data for comparison

    const recentAverage = this.calculateRecentAverage(historicalData.slice(-10));
    const regressionThreshold = 0.1; // 10% regression threshold

    const checks = [
      {
        metric: 'bundleSize',
        current: currentMetrics.bundleSize,
        baseline: recentAverage.bundleSize,
        formatter: this.formatBytes
      },
      {
        metric: 'loadTime',
        current: currentMetrics.loadTime,
        baseline: recentAverage.loadTime,
        formatter: (v: number) => `${v}ms`
      },
      {
        metric: 'renderTime',
        current: currentMetrics.renderTime,
        baseline: recentAverage.renderTime,
        formatter: (v: number) => `${v}ms`
      },
      {
        metric: 'memoryUsage',
        current: currentMetrics.memoryUsage,
        baseline: recentAverage.memoryUsage,
        formatter: this.formatBytes
      },
      {
        metric: 'cpuUsage',
        current: currentMetrics.cpuUsage,
        baseline: recentAverage.cpuUsage,
        formatter: (v: number) => `${v.toFixed(1)}%`
      }
    ];

    for (const check of checks) {
      const change = (check.current - check.baseline) / check.baseline;
      
      if (Math.abs(change) > regressionThreshold) {
        const type = change > 0 ? 'regression' : 'improvement';
        const severity = this.calculateRegressionSeverity(Math.abs(change));
        
        alerts.push({
          id: `regression_${check.metric}_${Date.now()}`,
          type,
          severity,
          message: `${this.formatMetricName(check.metric)} ${type}: ${check.formatter(check.current)} (${(change * 100).toFixed(1)}% change)`,
          timestamp: Date.now(),
          metric: check.metric,
          value: check.current,
          threshold: check.baseline
        });
      }
    }

    return alerts;
  }

  /**
   * Calculates recent average for comparison
   */
  private calculateRecentAverage(data: PerformanceMetrics[]): PerformanceMetrics {
    const avg = data.reduce(
      (acc, metrics) => ({
        timestamp: 0, // Not used for average
        bundleSize: acc.bundleSize + metrics.bundleSize,
        loadTime: acc.loadTime + metrics.loadTime,
        renderTime: acc.renderTime + metrics.renderTime,
        memoryUsage: acc.memoryUsage + metrics.memoryUsage,
        cpuUsage: acc.cpuUsage + metrics.cpuUsage
      }),
      { timestamp: 0, bundleSize: 0, loadTime: 0, renderTime: 0, memoryUsage: 0, cpuUsage: 0 }
    );

    const count = data.length;
    return {
      timestamp: 0,
      bundleSize: avg.bundleSize / count,
      loadTime: avg.loadTime / count,
      renderTime: avg.renderTime / count,
      memoryUsage: avg.memoryUsage / count,
      cpuUsage: avg.cpuUsage / count
    };
  }

  /**
   * Calculates alert severity based on threshold exceedance
   */
  private calculateSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    
    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'high';
    if (ratio > 1.2) return 'medium';
    return 'low';
  }

  /**
   * Calculates regression severity based on change magnitude
   */
  private calculateRegressionSeverity(change: number): 'low' | 'medium' | 'high' | 'critical' {
    if (change > 0.5) return 'critical'; // 50% change
    if (change > 0.3) return 'high';     // 30% change
    if (change > 0.2) return 'medium';   // 20% change
    return 'low';
  }

  /**
   * Formats metric names for display
   */
  private formatMetricName(metric: string): string {
    const names: Record<string, string> = {
      bundleSize: 'Bundle Size',
      loadTime: 'Load Time',
      renderTime: 'Render Time',
      memoryUsage: 'Memory Usage',
      cpuUsage: 'CPU Usage'
    };
    
    return names[metric] || metric;
  }

  /**
   * Formats bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();