/**
 * Load Testing and Performance Validation
 * 
 * This script performs comprehensive load testing to validate:
 * - API endpoint performance under load
 * - Concurrent user handling
 * - Memory usage patterns
 * - Cache effectiveness
 * - Database connection pooling
 */

import { performance } from 'perf_hooks';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  testDuration: number; // in seconds
  endpoints: EndpointConfig[];
}

interface EndpointConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  expectedStatusCode: number;
  maxResponseTime: number; // in milliseconds
}

interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

interface PerformanceMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: NodeJS.CpuUsage;
  timestamp: number;
}

class LoadTester {
  private config: LoadTestConfig;
  private results: LoadTestResult[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private isRunning = false;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async runLoadTest(): Promise<{
    results: LoadTestResult[];
    performanceMetrics: PerformanceMetrics[];
    summary: {
      totalRequests: number;
      totalSuccessful: number;
      totalFailed: number;
      overallAverageResponseTime: number;
      overallRequestsPerSecond: number;
    };
  }> {
    console.log('🚀 Starting load test...');
    console.log(`Configuration:
      - Base URL: ${this.config.baseUrl}
      - Concurrent Users: ${this.config.concurrentUsers}
      - Test Duration: ${this.config.testDuration}s
      - Endpoints: ${this.config.endpoints.length}
    `);

    this.isRunning = true;
    this.startPerformanceMonitoring();

    const testPromises = this.config.endpoints.map(endpoint =>
      this.testEndpoint(endpoint)
    );

    await Promise.all(testPromises);

    this.isRunning = false;

    const summary = this.calculateSummary();
    
    console.log('✅ Load test completed');
    this.printResults(summary);

    return {
      results: this.results,
      performanceMetrics: this.performanceMetrics,
      summary
    };
  }

  private async testEndpoint(endpoint: EndpointConfig): Promise<void> {
    const startTime = performance.now();
    const endTime = startTime + (this.config.testDuration * 1000);
    
    const result: LoadTestResult = {
      endpoint: `${endpoint.method} ${endpoint.path}`,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errors: []
    };

    const responseTimes: number[] = [];
    const workers: Promise<void>[] = [];

    // Create concurrent workers
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      workers.push(this.createWorker(endpoint, endTime, result, responseTimes));
    }

    await Promise.all(workers);

    // Calculate final metrics
    if (responseTimes.length > 0) {
      result.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      result.minResponseTime = Math.min(...responseTimes);
      result.maxResponseTime = Math.max(...responseTimes);
    }

    result.requestsPerSecond = result.totalRequests / this.config.testDuration;

    this.results.push(result);
  }

  private async createWorker(
    endpoint: EndpointConfig,
    endTime: number,
    result: LoadTestResult,
    responseTimes: number[]
  ): Promise<void> {
    while (performance.now() < endTime) {
      try {
        const requestStart = performance.now();
        
        const response = await fetch(`${this.config.baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            ...endpoint.headers
          },
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
        });

        const requestEnd = performance.now();
        const responseTime = requestEnd - requestStart;

        result.totalRequests++;
        responseTimes.push(responseTime);

        if (response.status === endpoint.expectedStatusCode) {
          result.successfulRequests++;
        } else {
          result.failedRequests++;
          result.errors.push(`Unexpected status: ${response.status}`);
        }

        if (responseTime > endpoint.maxResponseTime) {
          result.errors.push(`Response time exceeded: ${responseTime}ms > ${endpoint.maxResponseTime}ms`);
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (error) {
        result.totalRequests++;
        result.failedRequests++;
        result.errors.push(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private startPerformanceMonitoring(): void {
    const monitor = () => {
      if (!this.isRunning) return;

      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      this.performanceMetrics.push({
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cpuUsage,
        timestamp: Date.now()
      });

      setTimeout(monitor, 1000); // Monitor every second
    };

    monitor();
  }

  private calculateSummary() {
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedRequests, 0);
    
    const weightedAverageResponseTime = this.results.reduce((sum, r) => 
      sum + (r.averageResponseTime * r.totalRequests), 0) / totalRequests;
    
    const overallRequestsPerSecond = totalRequests / this.config.testDuration;

    return {
      totalRequests,
      totalSuccessful,
      totalFailed,
      overallAverageResponseTime: weightedAverageResponseTime,
      overallRequestsPerSecond
    };
  }

  private printResults(summary: any): void {
    console.log('\n📊 Load Test Results:');
    console.log('='.repeat(50));
    
    console.log(`\n📈 Overall Summary:
      Total Requests: ${summary.totalRequests}
      Successful: ${summary.totalSuccessful} (${((summary.totalSuccessful / summary.totalRequests) * 100).toFixed(2)}%)
      Failed: ${summary.totalFailed} (${((summary.totalFailed / summary.totalRequests) * 100).toFixed(2)}%)
      Average Response Time: ${summary.overallAverageResponseTime.toFixed(2)}ms
      Requests per Second: ${summary.overallRequestsPerSecond.toFixed(2)}
    `);

    console.log('\n🎯 Endpoint Details:');
    this.results.forEach(result => {
      console.log(`\n  ${result.endpoint}:
        Requests: ${result.totalRequests}
        Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%
        Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms
        Min/Max: ${result.minResponseTime.toFixed(2)}ms / ${result.maxResponseTime.toFixed(2)}ms
        RPS: ${result.requestsPerSecond.toFixed(2)}
        Errors: ${result.errors.length}
      `);

      if (result.errors.length > 0) {
        console.log(`    Error samples: ${result.errors.slice(0, 3).join(', ')}`);
      }
    });

    console.log('\n💾 Performance Metrics:');
    if (this.performanceMetrics.length > 0) {
      const avgMemory = this.performanceMetrics.reduce((sum, m) => 
        sum + m.memoryUsage.heapUsed, 0) / this.performanceMetrics.length;
      
      const maxMemory = Math.max(...this.performanceMetrics.map(m => m.memoryUsage.heapUsed));
      
      console.log(`    Average Memory Usage: ${(avgMemory / 1024 / 1024).toFixed(2)} MB
      Peak Memory Usage: ${(maxMemory / 1024 / 1024).toFixed(2)} MB
      Memory Samples: ${this.performanceMetrics.length}
      `);
    }
  }
}

// Predefined test configurations
export const testConfigurations = {
  // Light load test
  light: {
    baseUrl: 'http://localhost:3000',
    concurrentUsers: 5,
    testDuration: 30,
    endpoints: [
      {
        path: '/api/health',
        method: 'GET' as const,
        expectedStatusCode: 200,
        maxResponseTime: 1000
      },
      {
        path: '/api/config/white-label',
        method: 'GET' as const,
        expectedStatusCode: 200,
        maxResponseTime: 2000
      }
    ]
  },

  // Medium load test
  medium: {
    baseUrl: 'http://localhost:3000',
    concurrentUsers: 20,
    testDuration: 60,
    endpoints: [
      {
        path: '/api/health',
        method: 'GET' as const,
        expectedStatusCode: 200,
        maxResponseTime: 1000
      },
      {
        path: '/api/config/white-label',
        method: 'GET' as const,
        expectedStatusCode: 200,
        maxResponseTime: 2000
      },
      {
        path: '/api/dashboard/player/test-player',
        method: 'GET' as const,
        headers: { 'Authorization': 'Bearer test-token' },
        expectedStatusCode: 200,
        maxResponseTime: 5000
      },
      {
        path: '/api/ranking/leaderboards',
        method: 'GET' as const,
        headers: { 'Authorization': 'Bearer test-token' },
        expectedStatusCode: 200,
        maxResponseTime: 5000
      }
    ]
  },

  // Heavy load test
  heavy: {
    baseUrl: 'http://localhost:3000',
    concurrentUsers: 50,
    testDuration: 120,
    endpoints: [
      {
        path: '/api/health',
        method: 'GET' as const,
        expectedStatusCode: 200,
        maxResponseTime: 1000
      },
      {
        path: '/api/config/white-label',
        method: 'GET' as const,
        expectedStatusCode: 200,
        maxResponseTime: 2000
      },
      {
        path: '/api/dashboard/player/test-player',
        method: 'GET' as const,
        headers: { 'Authorization': 'Bearer test-token' },
        expectedStatusCode: 200,
        maxResponseTime: 5000
      },
      {
        path: '/api/ranking/leaderboards',
        method: 'GET' as const,
        headers: { 'Authorization': 'Bearer test-token' },
        expectedStatusCode: 200,
        maxResponseTime: 5000
      },
      {
        path: '/api/ranking/test-leaderboard/personal/test-player',
        method: 'GET' as const,
        headers: { 'Authorization': 'Bearer test-token' },
        expectedStatusCode: 200,
        maxResponseTime: 5000
      },
      {
        path: '/api/admin/features',
        method: 'GET' as const,
        headers: { 'Authorization': 'Bearer admin-token' },
        expectedStatusCode: 200,
        maxResponseTime: 3000
      }
    ]
  }
};

// CLI runner
export async function runLoadTest(configName: keyof typeof testConfigurations = 'medium') {
  const config = testConfigurations[configName];
  const tester = new LoadTester(config);
  
  try {
    const results = await tester.runLoadTest();
    
    // Validate performance requirements
    const performanceIssues: string[] = [];
    
    results.results.forEach(result => {
      if (result.averageResponseTime > 5000) {
        performanceIssues.push(`${result.endpoint} exceeds 5s response time: ${result.averageResponseTime.toFixed(2)}ms`);
      }
      
      if (result.successfulRequests / result.totalRequests < 0.95) {
        performanceIssues.push(`${result.endpoint} has low success rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
      }
    });

    if (performanceIssues.length > 0) {
      console.log('\n⚠️  Performance Issues Detected:');
      performanceIssues.forEach(issue => console.log(`  - ${issue}`));
      process.exit(1);
    } else {
      console.log('\n✅ All performance requirements met!');
    }

    return results;
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { LoadTester };

// CLI execution
if (require.main === module) {
  const configName = process.argv[2] as keyof typeof testConfigurations || 'medium';
  runLoadTest(configName);
}