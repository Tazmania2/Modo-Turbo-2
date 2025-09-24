#!/usr/bin/env tsx

/**
 * Comprehensive Integration Test Runner
 * 
 * This script orchestrates the complete testing suite for final integration validation:
 * - Unit tests
 * - Integration tests
 * - End-to-end tests
 * - System validation
 * - Load testing
 * - Performance benchmarks
 */

import { spawn, ChildProcess } from 'child_process';
import { performance } from 'perf_hooks';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suite: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  output: string;
  errors?: string[];
}

interface TestReport {
  timestamp: number;
  overallStatus: 'PASS' | 'FAIL';
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    totalDuration: number;
  };
}

class IntegrationTestRunner {
  private results: TestResult[] = [];
  private serverProcess: ChildProcess | null = null;
  private isServerReady = false;

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting comprehensive integration test suite...\n');

    const startTime = performance.now();

    try {
      // Step 1: Start development server
      await this.startDevelopmentServer();

      // Step 2: Run test suites in order
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runSystemValidation();
      await this.runEndToEndTests();
      await this.runLoadTests();
      await this.runPerformanceBenchmarks();

    } catch (error) {
      console.error('💥 Test suite execution failed:', error);
    } finally {
      // Cleanup
      await this.stopDevelopmentServer();
    }

    const totalDuration = performance.now() - startTime;
    const report = this.generateReport(totalDuration);
    
    this.printReport(report);
    this.saveReport(report);

    return report;
  }

  private async startDevelopmentServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔧 Starting development server...');

      this.serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let output = '';

      this.serverProcess.stdout?.on('data', (data) => {
        output += data.toString();
        
        // Check if server is ready
        if (output.includes('Ready') || output.includes('localhost:3000')) {
          this.isServerReady = true;
          console.log('✅ Development server started successfully');
          resolve();
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.isServerReady) {
          reject(new Error('Server startup timeout'));
        }
      }, 30000);
    });
  }

  private async stopDevelopmentServer(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping development server...');
      this.serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        this.serverProcess?.on('exit', resolve);
        setTimeout(resolve, 5000); // Force exit after 5 seconds
      });
    }
  }

  private async runUnitTests(): Promise<void> {
    await this.runTestSuite('Unit Tests', 'npm', ['run', 'test:unit']);
  }

  private async runIntegrationTests(): Promise<void> {
    await this.runTestSuite('Integration Tests', 'npm', ['run', 'test:integration']);
  }

  private async runSystemValidation(): Promise<void> {
    if (!this.isServerReady) {
      this.results.push({
        suite: 'System Validation',
        status: 'SKIP',
        duration: 0,
        output: 'Skipped - server not ready'
      });
      return;
    }

    await this.runTestSuite(
      'System Validation',
      'npx',
      ['tsx', 'src/test/validation/system-validation.ts']
    );
  }

  private async runEndToEndTests(): Promise<void> {
    if (!this.isServerReady) {
      this.results.push({
        suite: 'End-to-End Tests',
        status: 'SKIP',
        duration: 0,
        output: 'Skipped - server not ready'
      });
      return;
    }

    await this.runTestSuite('End-to-End Tests', 'npm', ['run', 'test:e2e']);
  }

  private async runLoadTests(): Promise<void> {
    if (!this.isServerReady) {
      this.results.push({
        suite: 'Load Tests',
        status: 'SKIP',
        duration: 0,
        output: 'Skipped - server not ready'
      });
      return;
    }

    await this.runTestSuite(
      'Load Tests',
      'npx',
      ['tsx', 'src/test/performance/load-test.ts', 'light']
    );
  }

  private async runPerformanceBenchmarks(): Promise<void> {
    if (!this.isServerReady) {
      this.results.push({
        suite: 'Performance Benchmarks',
        status: 'SKIP',
        duration: 0,
        output: 'Skipped - server not ready'
      });
      return;
    }

    // Run custom performance tests
    await this.runTestSuite(
      'Performance Benchmarks',
      'npm',
      ['run', 'test', '--', '--run', 'src/test/performance']
    );
  }

  private async runTestSuite(
    suiteName: string,
    command: string,
    args: string[]
  ): Promise<void> {
    return new Promise((resolve) => {
      console.log(`\n🧪 Running ${suiteName}...`);
      
      const startTime = performance.now();
      let output = '';
      let errors: string[] = [];

      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      process.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
      });

      process.stderr?.on('data', (data) => {
        const text = data.toString();
        errors.push(text);
        console.error(text);
      });

      process.on('close', (code) => {
        const duration = performance.now() - startTime;
        const status = code === 0 ? 'PASS' : 'FAIL';

        this.results.push({
          suite: suiteName,
          status,
          duration,
          output,
          errors: errors.length > 0 ? errors : undefined
        });

        console.log(`${status === 'PASS' ? '✅' : '❌'} ${suiteName} completed in ${duration.toFixed(2)}ms`);
        resolve();
      });

      process.on('error', (error) => {
        const duration = performance.now() - startTime;
        
        this.results.push({
          suite: suiteName,
          status: 'FAIL',
          duration,
          output: '',
          errors: [error.message]
        });

        console.log(`❌ ${suiteName} failed: ${error.message}`);
        resolve();
      });
    });
  }

  private generateReport(totalDuration: number): TestReport {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      skipped: this.results.filter(r => r.status === 'SKIP').length,
      totalDuration
    };

    const overallStatus = summary.failed > 0 ? 'FAIL' : 'PASS';

    return {
      timestamp: Date.now(),
      overallStatus,
      results: this.results,
      summary
    };
  }

  private printReport(report: TestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE INTEGRATION TEST REPORT');
    console.log('='.repeat(60));

    console.log(`\n🎯 Overall Status: ${report.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📅 Timestamp: ${new Date(report.timestamp).toISOString()}`);
    console.log(`⏱️  Total Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`);

    console.log(`\n📈 Summary:
      Total Test Suites: ${report.summary.total}
      ✅ Passed: ${report.summary.passed}
      ❌ Failed: ${report.summary.failed}
      ⏭️  Skipped: ${report.summary.skipped}
      Success Rate: ${((report.summary.passed / (report.summary.total - report.summary.skipped)) * 100).toFixed(2)}%
    `);

    console.log('\n📋 Test Suite Details:');
    report.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`  ${icon} ${result.suite}: ${result.status} (${(result.duration / 1000).toFixed(2)}s)`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`    Errors: ${result.errors.length}`);
        result.errors.slice(0, 2).forEach(error => {
          console.log(`      - ${error.split('\n')[0]}`);
        });
      }
    });

    if (report.summary.failed > 0) {
      console.log('\n❌ Failed Test Suites:');
      report.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`\n  📛 ${result.suite}:`);
          if (result.errors) {
            result.errors.forEach(error => {
              console.log(`    ${error}`);
            });
          }
        });
    }

    console.log('\n' + '='.repeat(60));
    
    if (report.overallStatus === 'PASS') {
      console.log('🎉 ALL INTEGRATION TESTS PASSED! System is ready for deployment.');
    } else {
      console.log('💥 INTEGRATION TESTS FAILED! Please fix issues before deployment.');
    }
    
    console.log('='.repeat(60));
  }

  private saveReport(report: TestReport): void {
    const reportPath = join(process.cwd(), 'test-reports', `integration-test-${Date.now()}.json`);
    
    try {
      // Ensure directory exists
      const { mkdirSync } = require('fs');
      mkdirSync(join(process.cwd(), 'test-reports'), { recursive: true });
      
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Test report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save test report:', error);
    }
  }
}

// Validation functions for specific requirements
class RequirementValidator {
  static validateAllRequirements(report: TestReport): {
    validated: string[];
    missing: string[];
  } {
    const validated: string[] = [];
    const missing: string[] = [];

    // Map test results to requirements
    const requirementMap = {
      'Requirement 1: Unified User Dashboard Integration': ['Unit Tests', 'Integration Tests', 'End-to-End Tests'],
      'Requirement 2: Personalized Ranking System': ['Integration Tests', 'End-to-End Tests'],
      'Requirement 3: User History Functionality': ['Integration Tests', 'End-to-End Tests'],
      'Requirement 4: Funifier Data Integration': ['Integration Tests', 'System Validation'],
      'Requirement 5: Initial System Setup and Demo Mode': ['End-to-End Tests'],
      'Requirement 6: Funifier-Based White Label Configuration': ['Integration Tests', 'System Validation'],
      'Requirement 7: Headless Architecture Maintenance': ['Integration Tests', 'System Validation'],
      'Requirement 8: Performance and Loading Experience': ['Performance Benchmarks', 'Load Tests'],
      'Requirement 9: Security and Access Control': ['System Validation', 'Integration Tests'],
      'Requirement 10: Error Handling and Monitoring': ['System Validation', 'Integration Tests'],
      'Requirement 11: Feature Toggle Management': ['Integration Tests', 'End-to-End Tests'],
      'Requirement 12: Neutral Default Configuration': ['Integration Tests', 'End-to-End Tests']
    };

    Object.entries(requirementMap).forEach(([requirement, requiredTests]) => {
      const allTestsPassed = requiredTests.every(testSuite => {
        const result = report.results.find(r => r.suite === testSuite);
        return result && result.status === 'PASS';
      });

      if (allTestsPassed) {
        validated.push(requirement);
      } else {
        missing.push(requirement);
      }
    });

    return { validated, missing };
  }
}

// Main execution
async function main() {
  const runner = new IntegrationTestRunner();
  
  try {
    const report = await runner.runAllTests();
    
    // Validate requirements coverage
    const requirementValidation = RequirementValidator.validateAllRequirements(report);
    
    console.log('\n🎯 Requirements Validation:');
    console.log(`✅ Validated: ${requirementValidation.validated.length}/12`);
    
    if (requirementValidation.missing.length > 0) {
      console.log('\n❌ Missing requirement validation:');
      requirementValidation.missing.forEach(req => {
        console.log(`  - ${req}`);
      });
    }

    // Exit with appropriate code
    if (report.overallStatus === 'FAIL' || requirementValidation.missing.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Integration test runner failed:', error);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  main();
}

export { IntegrationTestRunner, RequirementValidator };