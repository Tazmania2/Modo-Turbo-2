#!/usr/bin/env node

import { SystemValidationExecutor } from './execute-system-validation';
import { promises as fs } from 'fs';
import { join } from 'path';

interface IntegrationTestResult {
  timestamp: string;
  overallStatus: 'passed' | 'failed' | 'warning';
  phases: {
    comprehensive: any;
    security: any;
    deployment: any;
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    warnings: number;
  };
  recommendations: string[];
  nextSteps: string[];
}

class FinalIntegrationTest {
  private executor: SystemValidationExecutor;
  private results: IntegrationTestResult;

  constructor() {
    this.executor = new SystemValidationExecutor();
    this.results = {
      timestamp: new Date().toISOString(),
      overallStatus: 'passed',
      phases: {
        comprehensive: null,
        security: null,
        deployment: null
      },
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        warnings: 0
      },
      recommendations: [],
      nextSteps: []
    };
  }

  async runFinalIntegration(): Promise<void> {
    console.log('🚀 Starting Final Integration and System Validation');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${this.results.timestamp}\n`);

    try {
      // Phase 1: Comprehensive System Testing
      console.log('📋 Phase 1: Comprehensive System Testing');
      console.log('-'.repeat(40));
      
      const comprehensiveResult = await this.runComprehensiveTests();
      this.results.phases.comprehensive = comprehensiveResult;
      this.updateSummary(comprehensiveResult);
      
      console.log(`✅ Comprehensive testing completed`);
      console.log(`   Tests: ${comprehensiveResult.results.passed}/${comprehensiveResult.results.total} passed\n`);

      // Phase 2: Security and Compliance Validation
      console.log('🔒 Phase 2: Security and Compliance Validation');
      console.log('-'.repeat(40));
      
      const securityResult = await this.runSecurityValidation();
      this.results.phases.security = securityResult;
      this.updateSummary(securityResult);
      
      console.log(`✅ Security validation completed`);
      console.log(`   Tests: ${securityResult.results.passed}/${securityResult.results.total} passed\n`);

      // Phase 3: Deployment Preparation
      console.log('🚀 Phase 3: Deployment Preparation');
      console.log('-'.repeat(40));
      
      const deploymentResult = await this.runDeploymentPreparation();
      this.results.phases.deployment = deploymentResult;
      this.updateSummary(deploymentResult);
      
      console.log(`✅ Deployment preparation completed`);
      console.log(`   Checks: ${deploymentResult.summary.passed}/${deploymentResult.summary.total} passed\n`);

      // Generate final report
      await this.generateFinalReport();
      
      // Determine overall status
      this.determineOverallStatus();
      
      // Print final summary
      this.printFinalSummary();

    } catch (error) {
      console.error('❌ Final integration test failed:', error);
      this.results.overallStatus = 'failed';
      throw error;
    }
  }

  private async runComprehensiveTests(): Promise<any> {
    const options = {
      type: 'comprehensive' as const,
      verbose: false,
      includePerformance: true,
      includeSecurity: true,
      includeCompatibility: true
    };

    return await this.executor.executeValidation(options);
  }

  private async runSecurityValidation(): Promise<any> {
    const options = {
      type: 'security' as const,
      verbose: false
    };

    return await this.executor.executeValidation(options);
  }

  private async runDeploymentPreparation(): Promise<any> {
    const options = {
      type: 'deployment' as const,
      verbose: false
    };

    return await this.executor.executeValidation(options);
  }

  private updateSummary(result: any): void {
    if (result.results) {
      this.results.summary.totalTests += result.results.total || 0;
      this.results.summary.passedTests += result.results.passed || 0;
      this.results.summary.failedTests += result.results.failed || 0;
      this.results.summary.warnings += result.results.warnings || 0;
    } else if (result.summary) {
      this.results.summary.totalTests += result.summary.total || 0;
      this.results.summary.passedTests += result.summary.passed || 0;
      this.results.summary.failedTests += result.summary.failed || 0;
      this.results.summary.warnings += result.summary.warnings || 0;
    }
  }

  private determineOverallStatus(): void {
    if (this.results.summary.failedTests > 0) {
      this.results.overallStatus = 'failed';
    } else if (this.results.summary.warnings > 0) {
      this.results.overallStatus = 'warning';
    } else {
      this.results.overallStatus = 'passed';
    }

    // Generate recommendations based on results
    this.generateRecommendations();
    this.generateNextSteps();
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Check comprehensive test results
    if (this.results.phases.comprehensive?.results?.failed > 0) {
      recommendations.push('Address failed comprehensive tests before deployment');
    }

    // Check security results
    if (this.results.phases.security?.results?.failed > 0) {
      recommendations.push('Resolve security vulnerabilities before deployment');
    }

    // Check deployment readiness
    if (this.results.phases.deployment?.status === 'not_ready') {
      recommendations.push('Complete deployment preparation checklist');
    }

    // Performance recommendations
    if (this.results.summary.warnings > 5) {
      recommendations.push('Review and address performance warnings');
    }

    // General recommendations
    if (this.results.overallStatus === 'passed') {
      recommendations.push('System is ready for deployment');
      recommendations.push('Consider running load tests in staging environment');
      recommendations.push('Prepare monitoring and alerting for production');
    }

    this.results.recommendations = recommendations;
  }

  private generateNextSteps(): void {
    const nextSteps: string[] = [];

    switch (this.results.overallStatus) {
      case 'passed':
        nextSteps.push('1. Review deployment documentation');
        nextSteps.push('2. Schedule deployment window');
        nextSteps.push('3. Prepare rollback procedures');
        nextSteps.push('4. Set up production monitoring');
        nextSteps.push('5. Execute deployment plan');
        break;

      case 'warning':
        nextSteps.push('1. Review and address warnings');
        nextSteps.push('2. Re-run validation tests');
        nextSteps.push('3. Update deployment documentation');
        nextSteps.push('4. Proceed with cautious deployment');
        break;

      case 'failed':
        nextSteps.push('1. Address all failed tests');
        nextSteps.push('2. Fix security vulnerabilities');
        nextSteps.push('3. Complete deployment preparation');
        nextSteps.push('4. Re-run full validation suite');
        nextSteps.push('5. Do not deploy until all issues resolved');
        break;
    }

    this.results.nextSteps = nextSteps;
  }

  private printFinalSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    const statusIcon = this.results.overallStatus === 'passed' ? '✅' : 
                      this.results.overallStatus === 'warning' ? '⚠️' : '❌';
    
    console.log(`${statusIcon} Overall Status: ${this.results.overallStatus.toUpperCase()}`);
    console.log(`📅 Completed: ${new Date(this.results.timestamp).toLocaleString()}`);
    console.log();
    
    console.log('📈 Test Summary:');
    console.log(`   Total Tests: ${this.results.summary.totalTests}`);
    console.log(`   Passed: ${this.results.summary.passedTests}`);
    console.log(`   Failed: ${this.results.summary.failedTests}`);
    console.log(`   Warnings: ${this.results.summary.warnings}`);
    console.log(`   Success Rate: ${Math.round((this.results.summary.passedTests / this.results.summary.totalTests) * 100)}%`);
    console.log();

    if (this.results.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      console.log();
    }

    console.log('🎯 Next Steps:');
    this.results.nextSteps.forEach((step, index) => {
      console.log(`   ${step}`);
    });
    console.log();

    console.log('📄 Detailed reports saved to:');
    console.log('   - final-integration-report.json');
    console.log('   - deployment-documentation.md');
    console.log();

    if (this.results.overallStatus === 'passed') {
      console.log('🎉 System is ready for deployment!');
    } else if (this.results.overallStatus === 'warning') {
      console.log('⚠️  System has warnings but may proceed with caution');
    } else {
      console.log('🛑 System is not ready for deployment');
    }
    
    console.log('='.repeat(60));
  }

  private async generateFinalReport(): Promise<void> {
    const reportPath = join(process.cwd(), 'final-integration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2), 'utf8');
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport();
    const markdownPath = join(process.cwd(), 'final-integration-report.md');
    await fs.writeFile(markdownPath, markdownReport, 'utf8');
    
    console.log(`📄 Final integration report saved to: ${reportPath}`);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
  }

  private generateMarkdownReport(): string {
    return `# Final Integration Test Report

**Generated:** ${new Date(this.results.timestamp).toLocaleString()}  
**Overall Status:** ${this.results.overallStatus.toUpperCase()}  
**Success Rate:** ${Math.round((this.results.summary.passedTests / this.results.summary.totalTests) * 100)}%

## Executive Summary

This report summarizes the final integration and system validation performed on the White Label Gamification Platform. The validation included comprehensive system testing, security validation, and deployment preparation.

## Test Results Summary

| Metric | Count |
|--------|-------|
| Total Tests | ${this.results.summary.totalTests} |
| Passed | ${this.results.summary.passedTests} |
| Failed | ${this.results.summary.failedTests} |
| Warnings | ${this.results.summary.warnings} |

## Phase Results

### 1. Comprehensive System Testing
- **Status:** ${this.results.phases.comprehensive?.status || 'N/A'}
- **Tests Passed:** ${this.results.phases.comprehensive?.results?.passed || 0}/${this.results.phases.comprehensive?.results?.total || 0}
- **Duration:** ${this.results.phases.comprehensive?.duration || 'N/A'}

### 2. Security and Compliance Validation
- **Status:** ${this.results.phases.security?.status || 'N/A'}
- **Tests Passed:** ${this.results.phases.security?.results?.passed || 0}/${this.results.phases.security?.results?.total || 0}
- **Critical Issues:** ${this.results.phases.security?.criticalIssues || 0}

### 3. Deployment Preparation
- **Status:** ${this.results.phases.deployment?.status || 'N/A'}
- **Checks Passed:** ${this.results.phases.deployment?.summary?.passed || 0}/${this.results.phases.deployment?.summary?.total || 0}
- **Readiness:** ${this.results.phases.deployment?.status === 'ready' ? 'Ready' : 'Not Ready'}

## Recommendations

${this.results.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## Next Steps

${this.results.nextSteps.map((step, index) => `${step}`).join('\n')}

## Conclusion

${this.results.overallStatus === 'passed' 
  ? 'The system has successfully passed all validation phases and is ready for deployment.' 
  : this.results.overallStatus === 'warning'
  ? 'The system has some warnings but may proceed with deployment under careful monitoring.'
  : 'The system has critical issues that must be resolved before deployment.'}

---
*Report generated by White Label Gamification Platform - System Validation Framework*
`;
  }
}

// CLI execution
async function main() {
  const test = new FinalIntegrationTest();
  
  try {
    await test.runFinalIntegration();
    process.exit(0);
  } catch (error) {
    console.error('Final integration test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { FinalIntegrationTest };