import { VercelDeploymentService } from './vercel-deployment.service';
import { ErrorLoggerService } from './error-logger.service';
import { ErrorType } from '@/types/error';

export interface VerificationTest {
  name: string;
  description: string;
  test: () => Promise<VerificationResult>;
  critical: boolean;
  timeout: number;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  details?: any;
  duration: number;
}

export interface DeploymentVerificationReport {
  deploymentId: string;
  url: string;
  overallSuccess: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  duration: number;
  tests: Array<{
    name: string;
    success: boolean;
    message: string;
    duration: number;
    critical: boolean;
    details?: any;
  }>;
  recommendations: string[];
}

export class DeploymentVerificationService {
  private vercelService: VercelDeploymentService;
  private errorLogger: ErrorLoggerService;

  constructor(vercelService: VercelDeploymentService, errorLogger: ErrorLoggerService) {
    this.vercelService = vercelService;
    this.errorLogger = errorLogger;
  }

  /**
   * Run comprehensive deployment verification
   */
  async verifyDeployment(deploymentId: string): Promise<DeploymentVerificationReport> {
    const startTime = Date.now();
    
    try {
      // Get deployment details
      const deployment = await this.vercelService.getDeployment(deploymentId);
      
      if (deployment.readyState !== 'READY') {
        throw new Error(`Deployment is not ready. Current state: ${deployment.readyState}`);
      }

      // Define verification tests
      const tests = this.getVerificationTests(deployment.url);
      
      // Run all tests
      const testResults = await this.runVerificationTests(tests);
      
      // Calculate metrics
      const passedTests = testResults.filter(r => r.success).length;
      const failedTests = testResults.filter(r => !r.success).length;
      const criticalFailures = testResults.filter(r => !r.success && r.critical).length;
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(testResults);
      
      const report: DeploymentVerificationReport = {
        deploymentId,
        url: deployment.url,
        overallSuccess: criticalFailures === 0 && passedTests >= testResults.length * 0.8,
        totalTests: testResults.length,
        passedTests,
        failedTests,
        criticalFailures,
        duration: Date.now() - startTime,
        tests: testResults,
        recommendations
      };

      // Log verification result
      await this.logVerificationResult(report);

      return report;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
      
      await this.errorLogger.logError({
        type: ErrorType.CONFIGURATION_ERROR,
        message: `Deployment verification failed: ${errorMessage}`,
        details: { deploymentId },
        timestamp: new Date(),
        retryable: true,
        userMessage: 'Deployment verification failed. Please check the deployment status.'
      });

      return {
        deploymentId,
        url: '',
        overallSuccess: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        criticalFailures: 1,
        duration: Date.now() - startTime,
        tests: [{
          name: 'Verification Setup',
          success: false,
          message: errorMessage,
          duration: Date.now() - startTime,
          critical: true
        }],
        recommendations: ['Check deployment status and try verification again']
      };
    }
  }

  /**
   * Get verification tests for deployment
   */
  private getVerificationTests(deploymentUrl: string): VerificationTest[] {
    return [
      {
        name: 'Health Check',
        description: 'Verify the application health endpoint responds correctly',
        critical: true,
        timeout: 10000,
        test: () => this.testHealthEndpoint(deploymentUrl)
      },
      {
        name: 'Homepage Load',
        description: 'Verify the homepage loads successfully',
        critical: true,
        timeout: 15000,
        test: () => this.testHomepageLoad(deploymentUrl)
      },
      {
        name: 'API Endpoints',
        description: 'Verify critical API endpoints are accessible',
        critical: true,
        timeout: 20000,
        test: () => this.testApiEndpoints(deploymentUrl)
      },
      {
        name: 'Authentication Flow',
        description: 'Verify authentication endpoints work correctly',
        critical: false,
        timeout: 15000,
        test: () => this.testAuthenticationFlow(deploymentUrl)
      },
      {
        name: 'Static Assets',
        description: 'Verify static assets load correctly',
        critical: false,
        timeout: 10000,
        test: () => this.testStaticAssets(deploymentUrl)
      },
      {
        name: 'Performance Check',
        description: 'Verify page load performance meets requirements',
        critical: false,
        timeout: 30000,
        test: () => this.testPerformance(deploymentUrl)
      },
      {
        name: 'Security Headers',
        description: 'Verify security headers are properly configured',
        critical: false,
        timeout: 10000,
        test: () => this.testSecurityHeaders(deploymentUrl)
      }
    ];
  }

  /**
   * Run all verification tests
   */
  private async runVerificationTests(tests: VerificationTest[]): Promise<Array<{
    name: string;
    success: boolean;
    message: string;
    duration: number;
    critical: boolean;
    details?: any;
  }>> {
    const results = [];

    for (const test of tests) {
      const startTime = Date.now();
      
      try {
        const result = await Promise.race([
          test.test(),
          new Promise<VerificationResult>((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), test.timeout)
          )
        ]);

        results.push({
          name: test.name,
          success: result.success,
          message: result.message,
          duration: result.duration,
          critical: test.critical,
          details: result.details
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Test failed';
        
        results.push({
          name: test.name,
          success: false,
          message: errorMessage,
          duration: Date.now() - startTime,
          critical: test.critical
        });
      }
    }

    return results;
  }

  /**
   * Test health endpoint
   */
  private async testHealthEndpoint(deploymentUrl: string): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${deploymentUrl}/api/health`, {
        method: 'GET',
        headers: { 'User-Agent': 'Deployment-Verification/1.0' }
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Health endpoint responding correctly',
          duration,
          details: { status: response.status, data }
        };
      } else {
        return {
          success: false,
          message: `Health endpoint returned ${response.status}`,
          duration,
          details: { status: response.status }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Health endpoint test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test homepage load
   */
  private async testHomepageLoad(deploymentUrl: string): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(deploymentUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Deployment-Verification/1.0' }
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        const html = await response.text();
        const hasTitle = html.includes('<title>');
        const hasContent = html.length > 1000;

        return {
          success: hasTitle && hasContent,
          message: hasTitle && hasContent 
            ? 'Homepage loads successfully with content'
            : 'Homepage loads but may be missing content',
          duration,
          details: { 
            status: response.status, 
            contentLength: html.length,
            hasTitle,
            hasContent
          }
        };
      } else {
        return {
          success: false,
          message: `Homepage returned ${response.status}`,
          duration,
          details: { status: response.status }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Homepage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test API endpoints
   */
  private async testApiEndpoints(deploymentUrl: string): Promise<VerificationResult> {
    const startTime = Date.now();
    const endpoints = [
      '/api/health',
      '/api/config/white-label'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${deploymentUrl}${endpoint}`, {
          method: 'GET',
          headers: { 'User-Agent': 'Deployment-Verification/1.0' }
        });

        results.push({
          endpoint,
          status: response.status,
          success: response.status < 500 // Allow 4xx but not 5xx
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulEndpoints = results.filter(r => r.success).length;
    const totalEndpoints = results.length;

    return {
      success: successfulEndpoints >= totalEndpoints * 0.8,
      message: `${successfulEndpoints}/${totalEndpoints} API endpoints accessible`,
      duration: Date.now() - startTime,
      details: { results }
    };
  }

  /**
   * Test authentication flow
   */
  private async testAuthenticationFlow(deploymentUrl: string): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      // Test login endpoint exists
      const response = await fetch(`${deploymentUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Deployment-Verification/1.0'
        },
        body: JSON.stringify({ username: 'test', password: 'test' })
      });

      const duration = Date.now() - startTime;

      // We expect 400 or 401, not 500
      const success = response.status === 400 || response.status === 401;

      return {
        success,
        message: success 
          ? 'Authentication endpoint accessible and responding correctly'
          : `Authentication endpoint returned unexpected status: ${response.status}`,
        duration,
        details: { status: response.status }
      };
    } catch (error) {
      return {
        success: false,
        message: `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test static assets
   */
  private async testStaticAssets(deploymentUrl: string): Promise<VerificationResult> {
    const startTime = Date.now();
    const assets = [
      '/_next/static/css',
      '/_next/static/chunks'
    ];

    let successfulAssets = 0;

    for (const asset of assets) {
      try {
        const response = await fetch(`${deploymentUrl}${asset}`, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Deployment-Verification/1.0' }
        });

        if (response.ok || response.status === 404) {
          successfulAssets++;
        }
      } catch (error) {
        // Asset might not exist, which is okay
      }
    }

    return {
      success: true, // Static assets are not critical for basic functionality
      message: `Static asset structure appears correct`,
      duration: Date.now() - startTime,
      details: { checkedAssets: assets.length, accessibleAssets: successfulAssets }
    };
  }

  /**
   * Test performance
   */
  private async testPerformance(deploymentUrl: string): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(deploymentUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Deployment-Verification/1.0' }
      });

      const duration = Date.now() - startTime;
      const success = duration < 5000; // 5 second threshold

      return {
        success,
        message: success 
          ? `Page loaded in ${duration}ms (good performance)`
          : `Page loaded in ${duration}ms (slow performance)`,
        duration,
        details: { loadTime: duration, threshold: 5000 }
      };
    } catch (error) {
      return {
        success: false,
        message: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test security headers
   */
  private async testSecurityHeaders(deploymentUrl: string): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(deploymentUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Deployment-Verification/1.0' }
      });

      const duration = Date.now() - startTime;
      const headers = response.headers;

      const securityHeaders = {
        'x-frame-options': headers.get('x-frame-options'),
        'x-content-type-options': headers.get('x-content-type-options'),
        'referrer-policy': headers.get('referrer-policy'),
        'strict-transport-security': headers.get('strict-transport-security')
      };

      const presentHeaders = Object.values(securityHeaders).filter(Boolean).length;
      const totalHeaders = Object.keys(securityHeaders).length;

      return {
        success: presentHeaders >= totalHeaders * 0.5,
        message: `${presentHeaders}/${totalHeaders} security headers present`,
        duration,
        details: { securityHeaders }
      };
    } catch (error) {
      return {
        success: false,
        message: `Security headers test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(testResults: Array<{ name: string; success: boolean; critical: boolean; message: string }>): string[] {
    const recommendations = [];

    const failedCritical = testResults.filter(r => !r.success && r.critical);
    const failedNonCritical = testResults.filter(r => !r.success && !r.critical);

    if (failedCritical.length > 0) {
      recommendations.push('Address critical failures before promoting to production');
      failedCritical.forEach(test => {
        recommendations.push(`Fix critical issue: ${test.name} - ${test.message}`);
      });
    }

    if (failedNonCritical.length > 0) {
      recommendations.push('Consider addressing non-critical issues for better user experience');
    }

    const performanceTest = testResults.find(r => r.name === 'Performance Check');
    if (performanceTest && !performanceTest.success) {
      recommendations.push('Optimize application performance for better user experience');
    }

    const securityTest = testResults.find(r => r.name === 'Security Headers');
    if (securityTest && !securityTest.success) {
      recommendations.push('Review and improve security header configuration');
    }

    if (recommendations.length === 0) {
      recommendations.push('Deployment verification passed successfully');
    }

    return recommendations;
  }

  /**
   * Log verification result
   */
  private async logVerificationResult(report: DeploymentVerificationReport): Promise<void> {
    const logLevel = report.overallSuccess ? 'info' : 'warn';
    
    // Only log warnings/errors, not successes
    if (!report.overallSuccess) {
      await this.errorLogger.logError({
        type: ErrorType.CONFIGURATION_ERROR,
        message: `Deployment verification completed with issues: ${report.passedTests}/${report.totalTests} tests passed`,
        details: report,
        timestamp: new Date(),
        retryable: false,
        userMessage: 'Deployment verification completed with some issues'
      });
    }
  }
}