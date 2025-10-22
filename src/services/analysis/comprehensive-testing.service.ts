import { 
  PrioritizedFeature 
} from './integration-priority-matrix.service';
import { 
  IntegrationResult,
  TestResult,
  TestFailure
} from './feature-integration.service';
import { 
  ValidationExecution,
  ValidationResult
} from './integration-validation.service';

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  type: TestSuiteType;
  tests: TestCase[];
  configuration: TestConfiguration;
  dependencies: string[];
  tags: string[];
  enabled: boolean;
  parallel: boolean;
  timeout: number;
  retries: number;
}

export type TestSuiteType = 
  | 'unit'
  | 'integration' 
  | 'e2e'
  | 'performance'
  | 'security'
  | 'regression'
  | 'compatibility'
  | 'accessibility'
  | 'load'
  | 'stress';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  setup?: TestStep[];
  steps: TestStep[];
  teardown?: TestStep[];
  expectedResults: ExpectedResult[];
  timeout: number;
  retries: number;
  flaky: boolean;
  skip: boolean;
  skipReason?: string;
}

export interface TestStep {
  id: string;
  description: string;
  action: string;
  parameters: Record<string, any>;
  expectedOutcome: string;
  timeout: number;
}

export interface ExpectedResult {
  type: 'assertion' | 'performance' | 'security' | 'accessibility';
  condition: string;
  value: any;
  tolerance?: number;
  critical: boolean;
}

export interface TestConfiguration {
  environment: string;
  baseUrl?: string;
  database?: DatabaseConfig;
  browser?: BrowserConfig;
  performance?: PerformanceConfig;
  security?: SecurityConfig;
  variables: Record<string, any>;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface BrowserConfig {
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  headless: boolean;
  viewport: { width: number; height: number };
  deviceEmulation?: string;
  slowMo?: number;
}

export interface PerformanceConfig {
  thresholds: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
  };
  networkConditions?: 'fast3g' | 'slow3g' | 'offline';
  cpuThrottling?: number;
}

export interface SecurityConfig {
  scanTypes: ('xss' | 'sql-injection' | 'csrf' | 'authentication' | 'authorization')[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  excludeUrls: string[];
  customHeaders: Record<string, string>;
}

export interface TestExecution {
  id: string;
  suiteId: string;
  featureId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration: number;
  progress: number;
  currentTest: string;
  results: TestCaseResult[];
  summary: TestSummary;
  logs: TestLog[];
  artifacts: TestArtifact[];
  environment: string;
  triggeredBy: string;
}

export interface TestCaseResult {
  testId: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  startTime: Date;
  endTime: Date;
  duration: number;
  steps: TestStepResult[];
  assertions: AssertionResult[];
  performance?: PerformanceMetrics;
  security?: SecurityResult;
  screenshots?: string[];
  error?: TestError;
  retries: number;
}

export interface TestStepResult {
  stepId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  output: any;
  error?: string;
  screenshot?: string;
}

export interface AssertionResult {
  assertion: string;
  expected: any;
  actual: any;
  passed: boolean;
  message: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
  speedIndex: number;
  networkRequests: number;
  transferSize: number;
  resourceSize: number;
}

export interface SecurityResult {
  vulnerabilities: SecurityVulnerability[];
  score: number;
  passed: boolean;
  recommendations: string[];
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  evidence: string;
  recommendation: string;
}

export interface TestError {
  type: string;
  message: string;
  stack: string;
  screenshot?: string;
  context: Record<string, any>;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  passRate: number;
  duration: number;
  coverage?: CoverageReport;
  performance?: PerformanceSummary;
  security?: SecuritySummary;
}

export interface CoverageReport {
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
  overall: number;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

export interface PerformanceSummary {
  averageLoadTime: number;
  slowestTest: string;
  fastestTest: string;
  performanceScore: number;
  regressions: PerformanceRegression[];
}

export interface PerformanceRegression {
  test: string;
  metric: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
}

export interface SecuritySummary {
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  securityScore: number;
  passed: boolean;
}

export interface TestLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  test: string;
  message: string;
  data?: any;
}

export interface TestArtifact {
  type: 'screenshot' | 'video' | 'log' | 'report' | 'coverage';
  name: string;
  path: string;
  size: number;
  createdAt: Date;
}

export interface RegressionTestSuite {
  id: string;
  name: string;
  baselineVersion: string;
  currentVersion: string;
  tests: RegressionTest[];
  configuration: RegressionConfig;
}

export interface RegressionTest {
  id: string;
  name: string;
  category: 'functional' | 'performance' | 'visual' | 'api';
  baseline: TestBaseline;
  tolerance: number;
  critical: boolean;
}

export interface TestBaseline {
  results: any;
  performance?: PerformanceMetrics;
  screenshots?: string[];
  apiResponses?: any[];
  createdAt: Date;
  version: string;
}

export interface RegressionConfig {
  performanceThreshold: number;
  visualThreshold: number;
  functionalTolerance: number;
  apiTolerance: number;
  excludeFlaky: boolean;
}

export interface AutomatedTestRunner {
  executeTestSuite(suiteId: string, options?: TestExecutionOptions): Promise<TestExecution>;
  executeRegressionTests(feature: PrioritizedFeature): Promise<RegressionTestResult>;
  generateTestReport(execution: TestExecution, format: ReportFormat): Promise<string>;
  createBaseline(suiteId: string, version: string): Promise<TestBaseline>;
  compareWithBaseline(execution: TestExecution, baseline: TestBaseline): Promise<RegressionAnalysis>;
}

export interface TestExecutionOptions {
  environment?: string;
  parallel?: boolean;
  tags?: string[];
  excludeTags?: string[];
  retries?: number;
  timeout?: number;
  headless?: boolean;
  recordVideo?: boolean;
  takeScreenshots?: boolean;
}

export interface RegressionTestResult {
  feature: string;
  passed: boolean;
  regressions: TestRegression[];
  improvements: TestImprovement[];
  summary: RegressionSummary;
}

export interface TestRegression {
  test: string;
  type: 'functional' | 'performance' | 'visual' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  baseline: any;
  current: any;
  difference: any;
}

export interface TestImprovement {
  test: string;
  type: 'performance' | 'quality' | 'coverage';
  description: string;
  improvement: number;
}

export interface RegressionSummary {
  totalTests: number;
  regressions: number;
  improvements: number;
  unchanged: number;
  regressionRate: number;
  improvementRate: number;
}

export interface RegressionAnalysis {
  regressions: TestRegression[];
  improvements: TestImprovement[];
  summary: RegressionSummary;
  recommendations: string[];
}

export type ReportFormat = 'html' | 'json' | 'junit' | 'allure' | 'cucumber';

export class ComprehensiveTestingService {
  private testSuites = new Map<string, TestSuite>();
  private executions = new Map<string, TestExecution>();
  private baselines = new Map<string, TestBaseline>();
  private testRunner: AutomatedTestRunner;

  constructor() {
    this.testRunner = new DefaultAutomatedTestRunner();
    this.initializeDefaultTestSuites();
  }

  /**
   * Create a new test suite
   */
  createTestSuite(suite: Omit<TestSuite, 'id'>): TestSuite {
    const id = `suite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullSuite: TestSuite = { ...suite, id };
    
    this.testSuites.set(id, fullSuite);
    return fullSuite;
  }

  /**
   * Execute comprehensive testing for a feature
   */
  async executeComprehensiveTesting(
    feature: PrioritizedFeature,
    options?: TestExecutionOptions
  ): Promise<TestExecution[]> {
    const executions: TestExecution[] = [];

    // Execute different types of test suites
    const suiteTypes = ['unit', 'integration', 'e2e', 'performance', 'security'];
    
    for (const suiteType of suiteTypes) {
      const suite = this.findSuiteByType(suiteType as TestSuiteType);
      if (suite && suite.enabled) {
        try {
          const execution = await this.testRunner.executeTestSuite(suite.id, options);
          executions.push(execution);
        } catch (error) {
          console.error(`Failed to execute ${suiteType} tests:`, error);
        }
      }
    }

    return executions;
  }

  /**
   * Execute regression testing
   */
  async executeRegressionTesting(
    feature: PrioritizedFeature,
    baselineVersion?: string
  ): Promise<RegressionTestResult> {
    return await this.testRunner.executeRegressionTests(feature);
  }

  /**
   * Create performance test automation
   */
  async createPerformanceTestAutomation(
    feature: PrioritizedFeature,
    thresholds: PerformanceConfig['thresholds']
  ): Promise<TestSuite> {
    const performanceTests: TestCase[] = [
      {
        id: 'load-time-test',
        name: 'Page Load Time Test',
        description: 'Measure page load time and core web vitals',
        category: 'performance',
        priority: 'high',
        tags: ['performance', 'load-time'],
        steps: [
          {
            id: 'navigate',
            description: 'Navigate to feature page',
            action: 'navigate',
            parameters: { url: '/feature-page' },
            expectedOutcome: 'Page loads successfully',
            timeout: 30000
          },
          {
            id: 'measure-metrics',
            description: 'Measure performance metrics',
            action: 'measurePerformance',
            parameters: {},
            expectedOutcome: 'Metrics collected',
            timeout: 5000
          }
        ],
        expectedResults: [
          {
            type: 'performance',
            condition: 'loadTime <= threshold',
            value: thresholds.loadTime,
            critical: true
          },
          {
            type: 'performance',
            condition: 'firstContentfulPaint <= threshold',
            value: thresholds.firstContentfulPaint,
            critical: true
          }
        ],
        timeout: 60000,
        retries: 2,
        flaky: false,
        skip: false
      },
      {
        id: 'memory-usage-test',
        name: 'Memory Usage Test',
        description: 'Monitor memory usage during feature interaction',
        category: 'performance',
        priority: 'medium',
        tags: ['performance', 'memory'],
        steps: [
          {
            id: 'baseline-memory',
            description: 'Measure baseline memory usage',
            action: 'measureMemory',
            parameters: {},
            expectedOutcome: 'Baseline established',
            timeout: 5000
          },
          {
            id: 'interact-feature',
            description: 'Interact with feature',
            action: 'interactWithFeature',
            parameters: { feature: feature.id },
            expectedOutcome: 'Feature interaction completed',
            timeout: 30000
          },
          {
            id: 'measure-memory-after',
            description: 'Measure memory usage after interaction',
            action: 'measureMemory',
            parameters: {},
            expectedOutcome: 'Memory usage measured',
            timeout: 5000
          }
        ],
        expectedResults: [
          {
            type: 'performance',
            condition: 'memoryIncrease <= 50MB',
            value: 50 * 1024 * 1024,
            critical: false
          }
        ],
        timeout: 60000,
        retries: 1,
        flaky: true,
        skip: false
      }
    ];

    return this.createTestSuite({
      name: `Performance Tests - ${feature.title}`,
      description: `Automated performance tests for ${feature.title}`,
      type: 'performance',
      tests: performanceTests,
      configuration: {
        environment: 'test',
        performance: { thresholds },
        variables: { featureId: feature.id }
      },
      dependencies: [],
      tags: ['performance', feature.category],
      enabled: true,
      parallel: false,
      timeout: 300000,
      retries: 2
    });
  }

  /**
   * Build end-to-end test suite
   */
  async buildE2ETestSuite(
    feature: PrioritizedFeature,
    userFlows: UserFlow[]
  ): Promise<TestSuite> {
    const e2eTests: TestCase[] = userFlows.map(flow => ({
      id: `e2e-${flow.id}`,
      name: `E2E Test - ${flow.name}`,
      description: `End-to-end test for ${flow.description}`,
      category: 'e2e',
      priority: flow.critical ? 'critical' : 'high',
      tags: ['e2e', feature.category, ...flow.tags],
      steps: flow.steps.map((step, index) => ({
        id: `step-${index}`,
        description: step.description,
        action: step.action,
        parameters: step.parameters,
        expectedOutcome: step.expectedOutcome,
        timeout: step.timeout || 30000
      })),
      expectedResults: flow.expectedResults.map(result => ({
        type: 'assertion',
        condition: result.condition,
        value: result.value,
        critical: result.critical
      })),
      timeout: flow.timeout || 300000,
      retries: 2,
      flaky: false,
      skip: false
    }));

    return this.createTestSuite({
      name: `E2E Tests - ${feature.title}`,
      description: `End-to-end tests for ${feature.title}`,
      type: 'e2e',
      tests: e2eTests,
      configuration: {
        environment: 'test',
        baseUrl: 'http://localhost:3000',
        browser: {
          browser: 'chrome',
          headless: true,
          viewport: { width: 1920, height: 1080 }
        },
        variables: { featureId: feature.id }
      },
      dependencies: [],
      tags: ['e2e', feature.category],
      enabled: true,
      parallel: true,
      timeout: 600000,
      retries: 2
    });
  }

  /**
   * Generate test report
   */
  async generateComprehensiveReport(
    executions: TestExecution[],
    format: ReportFormat = 'html'
  ): Promise<string> {
    const overallSummary = this.calculateOverallSummary(executions);
    const regressionAnalysis = await this.analyzeRegressions(executions);
    const performanceAnalysis = this.analyzePerformance(executions);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: overallSummary,
      executions: executions.map(e => ({
        id: e.id,
        suite: e.suiteId,
        status: e.status,
        duration: e.duration,
        summary: e.summary
      })),
      regressions: regressionAnalysis,
      performance: performanceAnalysis,
      recommendations: this.generateRecommendations(executions)
    };

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'html':
        return this.generateHTMLReport(report);
      case 'junit':
        return this.generateJUnitReport(executions);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  /**
   * Get test execution status
   */
  getExecutionStatus(executionId: string): TestExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List test executions
   */
  listExecutions(filter?: {
    suiteId?: string;
    status?: string;
    environment?: string;
  }): TestExecution[] {
    const executions = Array.from(this.executions.values());
    
    if (!filter) return executions;

    return executions.filter(execution => {
      if (filter.suiteId && execution.suiteId !== filter.suiteId) return false;
      if (filter.status && execution.status !== filter.status) return false;
      if (filter.environment && execution.environment !== filter.environment) return false;
      return true;
    });
  }

  /**
   * Create baseline for regression testing
   */
  async createTestBaseline(
    suiteId: string,
    version: string
  ): Promise<TestBaseline> {
    return await this.testRunner.createBaseline(suiteId, version);
  }

  // Private helper methods

  private initializeDefaultTestSuites(): void {
    // Unit test suite
    const unitTestSuite: TestSuite = {
      id: 'unit-tests',
      name: 'Unit Tests',
      description: 'Comprehensive unit test suite',
      type: 'unit',
      tests: [],
      configuration: {
        environment: 'test',
        variables: {}
      },
      dependencies: [],
      tags: ['unit'],
      enabled: true,
      parallel: true,
      timeout: 300000,
      retries: 2
    };

    // Integration test suite
    const integrationTestSuite: TestSuite = {
      id: 'integration-tests',
      name: 'Integration Tests',
      description: 'API and service integration tests',
      type: 'integration',
      tests: [],
      configuration: {
        environment: 'test',
        baseUrl: 'http://localhost:3000',
        variables: {}
      },
      dependencies: ['unit-tests'],
      tags: ['integration'],
      enabled: true,
      parallel: true,
      timeout: 600000,
      retries: 2
    };

    // E2E test suite
    const e2eTestSuite: TestSuite = {
      id: 'e2e-tests',
      name: 'End-to-End Tests',
      description: 'Complete user journey tests',
      type: 'e2e',
      tests: [],
      configuration: {
        environment: 'test',
        baseUrl: 'http://localhost:3000',
        browser: {
          browser: 'chrome',
          headless: true,
          viewport: { width: 1920, height: 1080 }
        },
        variables: {}
      },
      dependencies: ['integration-tests'],
      tags: ['e2e'],
      enabled: true,
      parallel: false,
      timeout: 1200000,
      retries: 2
    };

    this.testSuites.set('unit-tests', unitTestSuite);
    this.testSuites.set('integration-tests', integrationTestSuite);
    this.testSuites.set('e2e-tests', e2eTestSuite);
  }

  private findSuiteByType(type: TestSuiteType): TestSuite | undefined {
    return Array.from(this.testSuites.values()).find(suite => suite.type === type);
  }

  private calculateOverallSummary(executions: TestExecution[]): TestSummary {
    const totals = executions.reduce((acc, execution) => ({
      total: acc.total + execution.summary.total,
      passed: acc.passed + execution.summary.passed,
      failed: acc.failed + execution.summary.failed,
      skipped: acc.skipped + execution.summary.skipped,
      errors: acc.errors + execution.summary.errors,
      duration: acc.duration + execution.summary.duration
    }), { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, duration: 0 });

    return {
      ...totals,
      passRate: totals.total > 0 ? (totals.passed / totals.total) * 100 : 0
    };
  }

  private async analyzeRegressions(executions: TestExecution[]): Promise<RegressionAnalysis> {
    // Implementation would analyze regressions across executions
    return {
      regressions: [],
      improvements: [],
      summary: {
        totalTests: 0,
        regressions: 0,
        improvements: 0,
        unchanged: 0,
        regressionRate: 0,
        improvementRate: 0
      },
      recommendations: []
    };
  }

  private analyzePerformance(executions: TestExecution[]): PerformanceSummary {
    const performanceExecutions = executions.filter(e => 
      e.results.some(r => r.performance)
    );

    if (performanceExecutions.length === 0) {
      return {
        averageLoadTime: 0,
        slowestTest: '',
        fastestTest: '',
        performanceScore: 100,
        regressions: []
      };
    }

    const loadTimes = performanceExecutions.flatMap(e => 
      e.results.filter(r => r.performance).map(r => r.performance!.loadTime)
    );

    return {
      averageLoadTime: loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length,
      slowestTest: 'test-1', // Would be calculated from actual data
      fastestTest: 'test-2', // Would be calculated from actual data
      performanceScore: 85, // Would be calculated based on thresholds
      regressions: []
    };
  }

  private generateRecommendations(executions: TestExecution[]): string[] {
    const recommendations: string[] = [];
    
    const failedExecutions = executions.filter(e => e.status === 'failed');
    if (failedExecutions.length > 0) {
      recommendations.push('Review and fix failing tests before deployment');
    }

    const lowPassRate = executions.some(e => e.summary.passRate < 90);
    if (lowPassRate) {
      recommendations.push('Improve test coverage and stability');
    }

    const longDuration = executions.some(e => e.duration > 600000); // 10 minutes
    if (longDuration) {
      recommendations.push('Optimize test execution time');
    }

    return recommendations;
  }

  private generateHTMLReport(report: any): string {
    // Implementation would generate HTML report
    return `
      <html>
        <head><title>Test Report</title></head>
        <body>
          <h1>Comprehensive Test Report</h1>
          <pre>${JSON.stringify(report, null, 2)}</pre>
        </body>
      </html>
    `;
  }

  private generateJUnitReport(executions: TestExecution[]): string {
    // Implementation would generate JUnit XML report
    return `<?xml version="1.0" encoding="UTF-8"?>
      <testsuites>
        ${executions.map(e => `
          <testsuite name="${e.suiteId}" tests="${e.summary.total}" failures="${e.summary.failed}">
            ${e.results.map(r => `
              <testcase name="${r.testId}" time="${r.duration / 1000}">
                ${r.status === 'failed' ? `<failure>${r.error?.message}</failure>` : ''}
              </testcase>
            `).join('')}
          </testsuite>
        `).join('')}
      </testsuites>
    `;
  }
}

// Default test runner implementation
class DefaultAutomatedTestRunner implements AutomatedTestRunner {
  async executeTestSuite(
    suiteId: string,
    options?: TestExecutionOptions
  ): Promise<TestExecution> {
    const executionId = `execution-${suiteId}-${Date.now()}`;
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 2000));

    const execution: TestExecution = {
      id: executionId,
      suiteId,
      status: 'completed',
      startTime: new Date(Date.now() - 2000),
      endTime: new Date(),
      duration: 2000,
      progress: 100,
      currentTest: '',
      results: [
        {
          testId: 'test-1',
          status: 'passed',
          startTime: new Date(Date.now() - 1500),
          endTime: new Date(Date.now() - 1000),
          duration: 500,
          steps: [],
          assertions: [],
          retries: 0
        },
        {
          testId: 'test-2',
          status: 'passed',
          startTime: new Date(Date.now() - 1000),
          endTime: new Date(Date.now() - 500),
          duration: 500,
          steps: [],
          assertions: [],
          retries: 0
        }
      ],
      summary: {
        total: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
        errors: 0,
        passRate: 100,
        duration: 2000
      },
      logs: [],
      artifacts: [],
      environment: options?.environment || 'test',
      triggeredBy: 'automated'
    };

    return execution;
  }

  async executeRegressionTests(feature: PrioritizedFeature): Promise<RegressionTestResult> {
    // Simulate regression testing
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      feature: feature.id,
      passed: true,
      regressions: [],
      improvements: [
        {
          test: 'performance-test',
          type: 'performance',
          description: 'Load time improved by 15%',
          improvement: 15
        }
      ],
      summary: {
        totalTests: 10,
        regressions: 0,
        improvements: 1,
        unchanged: 9,
        regressionRate: 0,
        improvementRate: 10
      }
    };
  }

  async generateTestReport(
    execution: TestExecution,
    format: ReportFormat
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(execution, null, 2);
      case 'html':
        return `<html><body><h1>Test Report</h1><pre>${JSON.stringify(execution, null, 2)}</pre></body></html>`;
      default:
        return JSON.stringify(execution, null, 2);
    }
  }

  async createBaseline(suiteId: string, version: string): Promise<TestBaseline> {
    return {
      results: {},
      createdAt: new Date(),
      version
    };
  }

  async compareWithBaseline(
    execution: TestExecution,
    baseline: TestBaseline
  ): Promise<RegressionAnalysis> {
    return {
      regressions: [],
      improvements: [],
      summary: {
        totalTests: execution.summary.total,
        regressions: 0,
        improvements: 0,
        unchanged: execution.summary.total,
        regressionRate: 0,
        improvementRate: 0
      },
      recommendations: []
    };
  }
}

// Additional interfaces
export interface UserFlow {
  id: string;
  name: string;
  description: string;
  critical: boolean;
  tags: string[];
  steps: UserFlowStep[];
  expectedResults: UserFlowResult[];
  timeout: number;
}

export interface UserFlowStep {
  description: string;
  action: string;
  parameters: Record<string, any>;
  expectedOutcome: string;
  timeout?: number;
}

export interface UserFlowResult {
  condition: string;
  value: any;
  critical: boolean;
}