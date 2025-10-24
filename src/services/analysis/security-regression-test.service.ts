import { 
  SecurityIssue,
  SecurityAnalysis
} from '@/types/analysis.types';
import { SecurityVulnerability } from './system-validation.service';
import { Feature } from './feature-identification.service';
import { securityValidationTestService } from './security-validation-test.service';
import { vulnerabilityScanningAutomationService } from './vulnerability-scanning-automation.service';

export interface SecurityBaseline {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  securityScore: number;
  vulnerabilityCount: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  testResults: SecurityTestBaseline[];
  features: string[];
}

export interface SecurityTestBaseline {
  testId: string;
  testName: string;
  category: string;
  passed: boolean;
  score: number;
  issues: SecurityIssue[];
  executionTime: number;
}

export interface SecurityRegressionResult {
  testId: string;
  testName: string;
  category: string;
  baseline: SecurityTestBaseline;
  current: SecurityTestBaseline;
  regressed: boolean;
  regressionType: 'score-decrease' | 'new-vulnerabilities' | 'test-failure' | 'performance-degradation';
  regressionSeverity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  recommendations: string[];
}

export interface SecurityRegressionReport {
  reportId: string;
  timestamp: Date;
  feature: Feature;
  baseline: SecurityBaseline;
  currentResults: SecurityTestBaseline[];
  regressions: SecurityRegressionResult[];
  overallRegression: boolean;
  regressionSummary: {
    totalTests: number;
    regressedTests: number;
    newVulnerabilities: number;
    scoreDecrease: number;
    criticalRegressions: number;
  };
  recommendations: string[];
  actionRequired: boolean;
}

export interface RegressionTestConfig {
  scoreThreshold: number; // Minimum acceptable score decrease (%)
  vulnerabilityThreshold: number; // Maximum acceptable new vulnerabilities
  performanceThreshold: number; // Maximum acceptable performance degradation (%)
  testCategories: string[]; // Categories to test for regression
  excludeTests: string[]; // Tests to exclude from regression analysis
  alertOnRegression: boolean;
  autoRollbackOnCritical: boolean;
}

export interface SecurityMetricsComparison {
  metric: string;
  baseline: number;
  current: number;
  change: number;
  changePercentage: number;
  regressed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityRegressionTestService {
  private baselines: Map<string, SecurityBaseline> = new Map();
  private regressionHistory: SecurityRegressionReport[] = [];
  private defaultConfig: RegressionTestConfig = {
    scoreThreshold: 5, // 5% score decrease threshold
    vulnerabilityThreshold: 0, // No new vulnerabilities allowed
    performanceThreshold: 20, // 20% performance degradation threshold
    testCategories: ['authentication', 'authorization', 'input-validation', 'data-protection'],
    excludeTests: [],
    alertOnRegression: true,
    autoRollbackOnCritical: false
  };

  /**
   * Creates a security baseline for a feature or system state
   */
  async createSecurityBaseline(
    id: string,
    name: string,
    description: string,
    features: Feature[]
  ): Promise<SecurityBaseline> {
    try {
      // Run comprehensive security tests to establish baseline
      const testResults: SecurityTestBaseline[] = [];
      let totalScore = 0;
      let totalVulnerabilities = 0;
      let criticalIssues = 0;
      let highIssues = 0;
      let mediumIssues = 0;
      let lowIssues = 0;

      // Run security validation tests for each feature
      for (const feature of features) {
        const validationResult = await securityValidationTestService.validateFeatureSecurity(feature);
        
        const testBaseline: SecurityTestBaseline = {
          testId: `validation-${feature.id}`,
          testName: `Security Validation - ${feature.name}`,
          category: 'validation',
          passed: validationResult.passed,
          score: this.calculateScoreFromValidation(validationResult),
          issues: this.convertVulnerabilitiesToIssues(validationResult.vulnerabilities),
          executionTime: 0
        };

        testResults.push(testBaseline);
        totalScore += testBaseline.score;
        totalVulnerabilities += validationResult.vulnerabilities.length;

        // Count issues by severity
        validationResult.vulnerabilities.forEach((vuln: SecurityVulnerability) => {
          switch (vuln.severity) {
            case 'critical': criticalIssues++; break;
            case 'high': highIssues++; break;
            case 'medium': mediumIssues++; break;
            case 'low': lowIssues++; break;
          }
        });
      }

      // Run automated security scans
      const scanResult = await vulnerabilityScanningAutomationService.runImmediateScan(
        [
          { type: 'dependencies', enabled: true, config: {} },
          { type: 'code', enabled: true, config: {} },
          { type: 'secrets', enabled: true, config: {} }
        ],
        {
          projectPath: process.cwd(),
          excludePatterns: ['node_modules/**', '**/*.test.ts'],
          includePatterns: ['**/*.ts', '**/*.js'],
          severityThreshold: 'medium',
          maxExecutionTime: 300000,
          retryAttempts: 3,
          customRules: []
        }
      );

      // Add scan results to baseline
      const scanBaseline: SecurityTestBaseline = {
        testId: 'automated-scan',
        testName: 'Automated Security Scan',
        category: 'scanning',
        passed: scanResult.status === 'completed',
        score: this.calculateScoreFromScan(scanResult),
        issues: scanResult.issues,
        executionTime: scanResult.executionTime
      };

      testResults.push(scanBaseline);
      totalScore += scanBaseline.score;
      totalVulnerabilities += scanResult.vulnerabilities.length;

      // Update issue counts from scan
      criticalIssues += scanResult.summary.criticalCount;
      highIssues += scanResult.summary.highCount;
      mediumIssues += scanResult.summary.mediumCount;
      lowIssues += scanResult.summary.lowCount;

      const averageScore = testResults.length > 0 ? totalScore / testResults.length : 0;

      const baseline: SecurityBaseline = {
        id,
        name,
        description,
        timestamp: new Date(),
        securityScore: averageScore,
        vulnerabilityCount: totalVulnerabilities,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        testResults,
        features: features.map(f => f.id)
      };

      this.baselines.set(id, baseline);
      return baseline;
    } catch (error) {
      throw new Error(`Failed to create security baseline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Runs security regression tests against a baseline
   */
  async runSecurityRegressionTests(
    feature: Feature,
    baselineId: string,
    config: Partial<RegressionTestConfig> = {}
  ): Promise<SecurityRegressionReport> {
    const testConfig = { ...this.defaultConfig, ...config };
    const baseline = this.baselines.get(baselineId);

    if (!baseline) {
      throw new Error(`Security baseline ${baselineId} not found`);
    }

    try {
      const reportId = `regression-${Date.now()}`;
      const currentResults: SecurityTestBaseline[] = [];
      const regressions: SecurityRegressionResult[] = [];

      // Run current security tests
      const validationResult = await securityValidationTestService.validateFeatureSecurity(feature);
      
      const currentValidation: SecurityTestBaseline = {
        testId: `validation-${feature.id}`,
        testName: `Security Validation - ${feature.name}`,
        category: 'validation',
        passed: validationResult.passed,
        score: this.calculateScoreFromValidation(validationResult),
        issues: this.convertVulnerabilitiesToIssues(validationResult.vulnerabilities),
        executionTime: 0
      };

      currentResults.push(currentValidation);

      // Run automated scan
      const scanResult = await vulnerabilityScanningAutomationService.runImmediateScan(
        [
          { type: 'dependencies', enabled: true, config: {} },
          { type: 'code', enabled: true, config: {} },
          { type: 'secrets', enabled: true, config: {} }
        ],
        {
          projectPath: process.cwd(),
          excludePatterns: ['node_modules/**', '**/*.test.ts'],
          includePatterns: ['**/*.ts', '**/*.js'],
          severityThreshold: 'medium',
          maxExecutionTime: 300000,
          retryAttempts: 3,
          customRules: []
        }
      );

      const currentScan: SecurityTestBaseline = {
        testId: 'automated-scan',
        testName: 'Automated Security Scan',
        category: 'scanning',
        passed: scanResult.status === 'completed',
        score: this.calculateScoreFromScan(scanResult),
        issues: scanResult.issues,
        executionTime: scanResult.executionTime
      };

      currentResults.push(currentScan);

      // Compare results with baseline
      for (const currentTest of currentResults) {
        const baselineTest = baseline.testResults.find(bt => bt.testId === currentTest.testId);
        
        if (baselineTest) {
          const regression = this.analyzeTestRegression(baselineTest, currentTest, testConfig);
          if (regression) {
            regressions.push(regression);
          }
        }
      }

      // Calculate overall regression metrics
      const totalTests = currentResults.length;
      const regressedTests = regressions.length;
      const newVulnerabilities = this.countNewVulnerabilities(baseline, currentResults);
      const scoreDecrease = baseline.securityScore - (currentResults.reduce((sum, r) => sum + r.score, 0) / currentResults.length);
      const criticalRegressions = regressions.filter(r => r.regressionSeverity === 'critical').length;

      const overallRegression = regressions.length > 0;
      const actionRequired = criticalRegressions > 0 || scoreDecrease > testConfig.scoreThreshold;

      const recommendations = this.generateRegressionRecommendations(regressions, testConfig);

      const report: SecurityRegressionReport = {
        reportId,
        timestamp: new Date(),
        feature,
        baseline,
        currentResults,
        regressions,
        overallRegression,
        regressionSummary: {
          totalTests,
          regressedTests,
          newVulnerabilities,
          scoreDecrease,
          criticalRegressions
        },
        recommendations,
        actionRequired
      };

      this.regressionHistory.push(report);

      // Handle alerts and auto-rollback if configured
      if (testConfig.alertOnRegression && overallRegression) {
        await this.sendRegressionAlert(report);
      }

      if (testConfig.autoRollbackOnCritical && criticalRegressions > 0) {
        await this.triggerAutoRollback(report);
      }

      return report;
    } catch (error) {
      throw new Error(`Security regression test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Compares security metrics between two states
   */
  compareSecurityMetrics(
    baseline: SecurityBaseline,
    current: SecurityTestBaseline[]
  ): SecurityMetricsComparison[] {
    const comparisons: SecurityMetricsComparison[] = [];

    // Compare overall security score
    const currentScore = current.reduce((sum, r) => sum + r.score, 0) / current.length;
    comparisons.push(this.createMetricComparison(
      'Security Score',
      baseline.securityScore,
      currentScore,
      5 // 5% threshold
    ));

    // Compare vulnerability counts
    const currentVulnCount = current.reduce((sum, r) => sum + r.issues.length, 0);
    comparisons.push(this.createMetricComparison(
      'Vulnerability Count',
      baseline.vulnerabilityCount,
      currentVulnCount,
      0 // No increase allowed
    ));

    // Compare critical issues
    const currentCritical = current.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'critical').length, 0);
    comparisons.push(this.createMetricComparison(
      'Critical Issues',
      baseline.criticalIssues,
      currentCritical,
      0 // No increase allowed
    ));

    // Compare high issues
    const currentHigh = current.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'high').length, 0);
    comparisons.push(this.createMetricComparison(
      'High Severity Issues',
      baseline.highIssues,
      currentHigh,
      1 // Allow 1 new high issue
    ));

    return comparisons;
  }

  /**
   * Gets regression test history
   */
  getRegressionHistory(limit?: number): SecurityRegressionReport[] {
    const sortedHistory = this.regressionHistory.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? sortedHistory.slice(0, limit) : sortedHistory;
  }

  /**
   * Gets available security baselines
   */
  getAvailableBaselines(): SecurityBaseline[] {
    return Array.from(this.baselines.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Updates an existing baseline
   */
  async updateBaseline(
    baselineId: string,
    features: Feature[]
  ): Promise<SecurityBaseline> {
    const existingBaseline = this.baselines.get(baselineId);
    if (!existingBaseline) {
      throw new Error(`Baseline ${baselineId} not found`);
    }

    // Create new baseline with same ID but updated results
    return await this.createSecurityBaseline(
      baselineId,
      existingBaseline.name,
      existingBaseline.description,
      features
    );
  }

  /**
   * Deletes a security baseline
   */
  deleteBaseline(baselineId: string): boolean {
    return this.baselines.delete(baselineId);
  }

  // Private helper methods
  private calculateScoreFromValidation(validationResult: any): number {
    if (validationResult.passed) {
      // Base score of 100, reduced by vulnerability severity
      let score = 100;
      validationResult.vulnerabilities.forEach((vuln: SecurityVulnerability) => {
        switch (vuln.severity) {
          case 'critical': score -= 25; break;
          case 'high': score -= 15; break;
          case 'medium': score -= 8; break;
          case 'low': score -= 3; break;
        }
      });
      return Math.max(0, score);
    }
    return 0;
  }

  private calculateScoreFromScan(scanResult: any): number {
    if (scanResult.status === 'completed') {
      let score = 100;
      score -= scanResult.summary.criticalCount * 20;
      score -= scanResult.summary.highCount * 12;
      score -= scanResult.summary.mediumCount * 6;
      score -= scanResult.summary.lowCount * 2;
      return Math.max(0, score);
    }
    return 0;
  }

  private convertVulnerabilitiesToIssues(vulnerabilities: SecurityVulnerability[]): SecurityIssue[] {
    return vulnerabilities.map(vuln => ({
      type: 'vulnerability',
      severity: vuln.severity === 'medium' ? 'medium' : vuln.severity as 'low' | 'medium' | 'high' | 'critical',
      file: vuln.location || 'unknown',
      line: 0,
      description: vuln.description,
      recommendation: vuln.recommendation
    }));
  }

  private analyzeTestRegression(
    baseline: SecurityTestBaseline,
    current: SecurityTestBaseline,
    config: RegressionTestConfig
  ): SecurityRegressionResult | null {
    const regressions: string[] = [];
    let regressionType: SecurityRegressionResult['regressionType'] = 'score-decrease';
    let severity: SecurityRegressionResult['regressionSeverity'] = 'low';

    // Check score regression
    const scoreDecrease = baseline.score - current.score;
    const scoreDecreasePercentage = (scoreDecrease / baseline.score) * 100;
    
    if (scoreDecreasePercentage > config.scoreThreshold) {
      regressions.push(`Security score decreased by ${scoreDecreasePercentage.toFixed(1)}%`);
      regressionType = 'score-decrease';
      severity = scoreDecreasePercentage > 20 ? 'critical' : 
                scoreDecreasePercentage > 10 ? 'high' : 'medium';
    }

    // Check for new vulnerabilities
    const newVulnerabilities = current.issues.length - baseline.issues.length;
    if (newVulnerabilities > config.vulnerabilityThreshold) {
      regressions.push(`${newVulnerabilities} new security issues found`);
      regressionType = 'new-vulnerabilities';
      
      const criticalNew = current.issues.filter(i => i.severity === 'critical').length -
                         baseline.issues.filter(i => i.severity === 'critical').length;
      if (criticalNew > 0) {
        severity = 'critical';
      }
    }

    // Check test failure
    if (baseline.passed && !current.passed) {
      regressions.push('Security test that previously passed is now failing');
      regressionType = 'test-failure';
      severity = 'high';
    }

    // Check performance regression
    const performanceIncrease = ((current.executionTime - baseline.executionTime) / baseline.executionTime) * 100;
    if (performanceIncrease > config.performanceThreshold) {
      regressions.push(`Test execution time increased by ${performanceIncrease.toFixed(1)}%`);
      regressionType = 'performance-degradation';
      severity = severity === 'critical' ? 'critical' : 'medium';
    }

    if (regressions.length === 0) {
      return null;
    }

    return {
      testId: current.testId,
      testName: current.testName,
      category: current.category,
      baseline,
      current,
      regressed: true,
      regressionType,
      regressionSeverity: severity,
      details: regressions.join('; '),
      recommendations: this.generateTestRecommendations(regressionType, severity)
    };
  }

  private countNewVulnerabilities(baseline: SecurityBaseline, current: SecurityTestBaseline[]): number {
    const currentVulnCount = current.reduce((sum, r) => sum + r.issues.length, 0);
    return Math.max(0, currentVulnCount - baseline.vulnerabilityCount);
  }

  private createMetricComparison(
    metric: string,
    baseline: number,
    current: number,
    threshold: number
  ): SecurityMetricsComparison {
    const change = current - baseline;
    const changePercentage = baseline > 0 ? (change / baseline) * 100 : 0;
    const regressed = change > threshold;
    
    let severity: SecurityMetricsComparison['severity'] = 'low';
    if (regressed) {
      if (changePercentage > 50) severity = 'critical';
      else if (changePercentage > 25) severity = 'high';
      else if (changePercentage > 10) severity = 'medium';
    }

    return {
      metric,
      baseline,
      current,
      change,
      changePercentage,
      regressed,
      severity
    };
  }

  private generateRegressionRecommendations(
    regressions: SecurityRegressionResult[],
    config: RegressionTestConfig
  ): string[] {
    const recommendations: string[] = [];

    const criticalRegressions = regressions.filter(r => r.regressionSeverity === 'critical');
    const highRegressions = regressions.filter(r => r.regressionSeverity === 'high');

    if (criticalRegressions.length > 0) {
      recommendations.push('CRITICAL: Immediately address critical security regressions before deployment');
      recommendations.push('Consider rolling back changes until security issues are resolved');
    }

    if (highRegressions.length > 0) {
      recommendations.push('Address high-severity security regressions within 24 hours');
    }

    const scoreRegressions = regressions.filter(r => r.regressionType === 'score-decrease');
    if (scoreRegressions.length > 0) {
      recommendations.push('Review code changes that may have introduced security vulnerabilities');
    }

    const newVulnRegressions = regressions.filter(r => r.regressionType === 'new-vulnerabilities');
    if (newVulnRegressions.length > 0) {
      recommendations.push('Investigate and fix newly introduced security vulnerabilities');
    }

    const testFailures = regressions.filter(r => r.regressionType === 'test-failure');
    if (testFailures.length > 0) {
      recommendations.push('Fix failing security tests before proceeding with deployment');
    }

    return recommendations;
  }

  private generateTestRecommendations(
    regressionType: SecurityRegressionResult['regressionType'],
    severity: SecurityRegressionResult['regressionSeverity']
  ): string[] {
    const recommendations: string[] = [];

    switch (regressionType) {
      case 'score-decrease':
        recommendations.push('Review recent code changes for security implications');
        recommendations.push('Run additional security analysis on modified components');
        break;
      case 'new-vulnerabilities':
        recommendations.push('Investigate root cause of new vulnerabilities');
        recommendations.push('Apply security patches or fixes immediately');
        break;
      case 'test-failure':
        recommendations.push('Debug failing security test');
        recommendations.push('Ensure test environment is properly configured');
        break;
      case 'performance-degradation':
        recommendations.push('Optimize security test performance');
        recommendations.push('Review test implementation for efficiency');
        break;
    }

    if (severity === 'critical') {
      recommendations.unshift('URGENT: This is a critical security regression requiring immediate attention');
    }

    return recommendations;
  }

  private async sendRegressionAlert(report: SecurityRegressionReport): Promise<void> {
    // Implementation would send alerts via email, Slack, etc.
    console.log(`Security regression alert sent for report: ${report.reportId}`);
    console.log(`Critical regressions: ${report.regressionSummary.criticalRegressions}`);
    console.log(`Action required: ${report.actionRequired}`);
  }

  private async triggerAutoRollback(report: SecurityRegressionReport): Promise<void> {
    // Implementation would trigger automatic rollback
    console.log(`Auto-rollback triggered for critical security regression: ${report.reportId}`);
    console.log(`Feature: ${report.feature.name}`);
  }
}

export const securityRegressionTestService = new SecurityRegressionTestService();