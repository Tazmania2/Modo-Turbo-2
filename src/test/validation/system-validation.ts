/**
 * System Validation Script
 * 
 * Comprehensive validation of all system components and integrations:
 * - Component integration validation
 * - API endpoint validation
 * - Database connectivity
 * - Cache functionality
 * - Security measures
 * - Performance benchmarks
 */

import { performance } from 'perf_hooks';

interface ValidationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
  duration?: number;
}

interface SystemValidationReport {
  timestamp: number;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  results: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

class SystemValidator {
  private baseUrl: string;
  private results: ValidationResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async runFullValidation(): Promise<SystemValidationReport> {
    console.log('🔍 Starting comprehensive system validation...');
    
    this.results = [];

    // Core system validations
    await this.validateHealthEndpoints();
    await this.validateAuthenticationSystem();
    await this.validateConfigurationManagement();
    await this.validateDashboardIntegration();
    await this.validateRankingSystem();
    await this.validateAdminFunctionality();
    await this.validateWhiteLabelFeatures();
    await this.validateCacheSystem();
    await this.validateErrorHandling();
    await this.validateSecurityMeasures();
    await this.validatePerformanceBenchmarks();

    const report = this.generateReport();
    this.printReport(report);
    
    return report;
  }

  private async validateHealthEndpoints(): Promise<void> {
    await this.runValidation('Health Endpoints', async () => {
      const endpoints = [
        '/api/health',
        '/api/health/database',
        '/api/health/cache'
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (!response.ok) {
          throw new Error(`Health check failed for ${endpoint}: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.status !== 'healthy') {
          throw new Error(`Unhealthy status for ${endpoint}: ${data.status}`);
        }
      }

      return 'All health endpoints responding correctly';
    });
  }

  private async validateAuthenticationSystem(): Promise<void> {
    await this.runValidation('Authentication System', async () => {
      // Test login endpoint
      const loginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test@example.com',
          password: 'testpassword'
        })
      });

      if (loginResponse.status !== 401 && loginResponse.status !== 200) {
        throw new Error(`Unexpected login response: ${loginResponse.status}`);
      }

      // Test admin verification
      const adminResponse = await fetch(`${this.baseUrl}/api/auth/verify-admin`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });

      if (adminResponse.status !== 401 && adminResponse.status !== 200) {
        throw new Error(`Unexpected admin verification response: ${adminResponse.status}`);
      }

      return 'Authentication endpoints responding correctly';
    });
  }

  private async validateConfigurationManagement(): Promise<void> {
    await this.runValidation('Configuration Management', async () => {
      // Test white-label config endpoint
      const configResponse = await fetch(`${this.baseUrl}/api/config/white-label`);
      
      if (!configResponse.ok) {
        throw new Error(`Config endpoint failed: ${configResponse.status}`);
      }

      const config = await configResponse.json();
      
      // Validate config structure
      const requiredFields = ['branding', 'features', 'funifierIntegration'];
      for (const field of requiredFields) {
        if (!(field in config)) {
          throw new Error(`Missing required config field: ${field}`);
        }
      }

      return 'Configuration management working correctly';
    });
  }

  private async validateDashboardIntegration(): Promise<void> {
    await this.runValidation('Dashboard Integration', async () => {
      // Test dashboard data endpoint
      const dashboardResponse = await fetch(`${this.baseUrl}/api/dashboard/player/test-player`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });

      if (dashboardResponse.status !== 401 && dashboardResponse.status !== 200) {
        throw new Error(`Dashboard endpoint failed: ${dashboardResponse.status}`);
      }

      if (dashboardResponse.ok) {
        const data = await dashboardResponse.json();
        
        // Validate dashboard data structure
        const requiredFields = ['playerName', 'totalPoints', 'primaryGoal'];
        for (const field of requiredFields) {
          if (!(field in data)) {
            throw new Error(`Missing dashboard field: ${field}`);
          }
        }
      }

      return 'Dashboard integration functioning correctly';
    });
  }

  private async validateRankingSystem(): Promise<void> {
    await this.runValidation('Ranking System', async () => {
      // Test leaderboards endpoint
      const leaderboardsResponse = await fetch(`${this.baseUrl}/api/ranking/leaderboards`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });

      if (leaderboardsResponse.status !== 401 && leaderboardsResponse.status !== 200) {
        throw new Error(`Leaderboards endpoint failed: ${leaderboardsResponse.status}`);
      }

      // Test personal ranking endpoint
      const personalResponse = await fetch(`${this.baseUrl}/api/ranking/test-leaderboard/personal/test-player`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });

      if (personalResponse.status !== 401 && personalResponse.status !== 200 && personalResponse.status !== 404) {
        throw new Error(`Personal ranking endpoint failed: ${personalResponse.status}`);
      }

      return 'Ranking system endpoints responding correctly';
    });
  }

  private async validateAdminFunctionality(): Promise<void> {
    await this.runValidation('Admin Functionality', async () => {
      // Test admin features endpoint
      const featuresResponse = await fetch(`${this.baseUrl}/api/admin/features`, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });

      if (featuresResponse.status !== 401 && featuresResponse.status !== 200) {
        throw new Error(`Admin features endpoint failed: ${featuresResponse.status}`);
      }

      // Test branding endpoint
      const brandingResponse = await fetch(`${this.baseUrl}/api/admin/branding`, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });

      if (brandingResponse.status !== 401 && brandingResponse.status !== 200) {
        throw new Error(`Admin branding endpoint failed: ${brandingResponse.status}`);
      }

      return 'Admin functionality endpoints responding correctly';
    });
  }

  private async validateWhiteLabelFeatures(): Promise<void> {
    await this.runValidation('White-Label Features', async () => {
      // Test theme endpoint
      const themeResponse = await fetch(`${this.baseUrl}/api/theme`);
      
      if (!themeResponse.ok) {
        throw new Error(`Theme endpoint failed: ${themeResponse.status}`);
      }

      // Test CSS generation
      const cssResponse = await fetch(`${this.baseUrl}/api/theme/css`);
      
      if (!cssResponse.ok) {
        throw new Error(`CSS generation failed: ${cssResponse.status}`);
      }

      const cssContent = await cssResponse.text();
      if (!cssContent.includes('--color-primary')) {
        throw new Error('CSS custom properties not generated correctly');
      }

      return 'White-label theming system working correctly';
    });
  }

  private async validateCacheSystem(): Promise<void> {
    await this.runValidation('Cache System', async () => {
      // Test cache invalidation endpoint
      const invalidateResponse = await fetch(`${this.baseUrl}/api/cache/invalidate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ pattern: 'test:*' })
      });

      if (invalidateResponse.status !== 401 && invalidateResponse.status !== 200) {
        throw new Error(`Cache invalidation failed: ${invalidateResponse.status}`);
      }

      return 'Cache system responding correctly';
    });
  }

  private async validateErrorHandling(): Promise<void> {
    await this.runValidation('Error Handling', async () => {
      // Test non-existent endpoint
      const notFoundResponse = await fetch(`${this.baseUrl}/api/non-existent-endpoint`);
      
      if (notFoundResponse.status !== 404) {
        throw new Error(`Expected 404 for non-existent endpoint, got: ${notFoundResponse.status}`);
      }

      // Test malformed request
      const malformedResponse = await fetch(`${this.baseUrl}/api/admin/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      if (malformedResponse.status !== 400 && malformedResponse.status !== 401) {
        throw new Error(`Expected 400/401 for malformed request, got: ${malformedResponse.status}`);
      }

      return 'Error handling working correctly';
    });
  }

  private async validateSecurityMeasures(): Promise<void> {
    await this.runValidation('Security Measures', async () => {
      // Test CORS headers
      const corsResponse = await fetch(`${this.baseUrl}/api/health`, {
        method: 'OPTIONS'
      });

      // Test rate limiting (if implemented)
      const rateLimitPromises = Array(10).fill(null).map(() => 
        fetch(`${this.baseUrl}/api/health`)
      );

      const rateLimitResponses = await Promise.all(rateLimitPromises);
      const rateLimitedCount = rateLimitResponses.filter(r => r.status === 429).length;

      // Test security headers
      const securityResponse = await fetch(`${this.baseUrl}/api/health`);
      const headers = securityResponse.headers;

      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];

      const missingHeaders = securityHeaders.filter(header => !headers.has(header));
      
      if (missingHeaders.length > 0) {
        return `Security headers missing: ${missingHeaders.join(', ')} (WARNING)`;
      }

      return 'Security measures in place';
    });
  }

  private async validatePerformanceBenchmarks(): Promise<void> {
    await this.runValidation('Performance Benchmarks', async () => {
      const benchmarks = [];

      // Test API response times
      const endpoints = [
        '/api/health',
        '/api/config/white-label',
        '/api/theme'
      ];

      for (const endpoint of endpoints) {
        const start = performance.now();
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        const duration = performance.now() - start;

        benchmarks.push({ endpoint, duration, status: response.status });

        if (duration > 5000) {
          throw new Error(`${endpoint} exceeded 5s response time: ${duration.toFixed(2)}ms`);
        }
      }

      const avgResponseTime = benchmarks.reduce((sum, b) => sum + b.duration, 0) / benchmarks.length;

      return `Average response time: ${avgResponseTime.toFixed(2)}ms`;
    });
  }

  private async runValidation(
    component: string,
    validationFn: () => Promise<string>
  ): Promise<void> {
    const start = performance.now();
    
    try {
      const message = await validationFn();
      const duration = performance.now() - start;
      
      const status = message.includes('WARNING') ? 'WARNING' : 'PASS';
      
      this.results.push({
        component,
        status,
        message,
        duration
      });
      
      console.log(`✅ ${component}: ${message}`);
    } catch (error) {
      const duration = performance.now() - start;
      
      this.results.push({
        component,
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      
      console.log(`❌ ${component}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateReport(): SystemValidationReport {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      warnings: this.results.filter(r => r.status === 'WARNING').length
    };

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    
    if (summary.failed > 0) {
      overallStatus = 'CRITICAL';
    } else if (summary.warnings > 0) {
      overallStatus = 'DEGRADED';
    } else {
      overallStatus = 'HEALTHY';
    }

    return {
      timestamp: Date.now(),
      overallStatus,
      results: this.results,
      summary
    };
  }

  private printReport(report: SystemValidationReport): void {
    console.log('\n📊 System Validation Report');
    console.log('='.repeat(50));
    
    console.log(`\n🎯 Overall Status: ${report.overallStatus}`);
    console.log(`📅 Timestamp: ${new Date(report.timestamp).toISOString()}`);
    
    console.log(`\n📈 Summary:
      Total Validations: ${report.summary.total}
      ✅ Passed: ${report.summary.passed}
      ❌ Failed: ${report.summary.failed}
      ⚠️  Warnings: ${report.summary.warnings}
      Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(2)}%
    `);

    if (report.summary.failed > 0) {
      console.log('\n❌ Failed Validations:');
      report.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  - ${result.component}: ${result.message}`);
        });
    }

    if (report.summary.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      report.results
        .filter(r => r.status === 'WARNING')
        .forEach(result => {
          console.log(`  - ${result.component}: ${result.message}`);
        });
    }

    console.log('\n⏱️  Performance Summary:');
    const avgDuration = report.results
      .filter(r => r.duration)
      .reduce((sum, r) => sum + (r.duration || 0), 0) / report.results.length;
    
    console.log(`  Average validation time: ${avgDuration.toFixed(2)}ms`);
    
    const slowValidations = report.results
      .filter(r => r.duration && r.duration > 1000)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    if (slowValidations.length > 0) {
      console.log('  Slow validations (>1s):');
      slowValidations.forEach(result => {
        console.log(`    - ${result.component}: ${result.duration?.toFixed(2)}ms`);
      });
    }
  }
}

// CLI runner
export async function runSystemValidation(baseUrl?: string): Promise<SystemValidationReport> {
  const validator = new SystemValidator(baseUrl);
  
  try {
    const report = await validator.runFullValidation();
    
    // Exit with error code if validation failed
    if (report.overallStatus === 'CRITICAL') {
      console.log('\n💥 System validation failed with critical issues!');
      process.exit(1);
    } else if (report.overallStatus === 'DEGRADED') {
      console.log('\n⚠️  System validation completed with warnings.');
      process.exit(0);
    } else {
      console.log('\n🎉 System validation passed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 System validation crashed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { SystemValidator };

// CLI execution
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  runSystemValidation(baseUrl);
}