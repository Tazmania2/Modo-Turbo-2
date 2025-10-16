// Analysis Infrastructure Exports

export { RepositoryAnalyzerService } from './repository-analyzer.service';
export { GitDiffAnalyzerService } from './git-diff-analyzer.service';
export { AnalysisConfigService } from './analysis-config.service';
export { AnalysisService } from './analysis.service';

// Security Validation and Testing Exports
export { SecurityValidationTestService, securityValidationTestService } from './security-validation-test.service';
export { VulnerabilityScanningAutomationService, vulnerabilityScanningAutomationService } from './vulnerability-scanning-automation.service';
export { SecurityRegressionTestService, securityRegressionTestService } from './security-regression-test.service';

// Re-export types
export type {
  RepositoryConfig,
  FileChange,
  DependencyChange,
  ConfigChange,
  ChangeAnalysis,
  ProjectStructure
} from './repository-analyzer.service';

export type {
  GitDiffResult,
  GitDiffChange,
  GitCommitInfo,
  GitBranchComparison
} from './git-diff-analyzer.service';

export type {
  AnalysisConfiguration,
  AnalysisRule,
  PrioritizationCriteria,
  CompatibilityRule,
  SecurityConfig,
  RepositoryCredentials
} from './analysis-config.service';

export type {
  AnalysisResult,
  RepositoryAnalysisResult,
  ComparisonResult,
  AnalysisSummary
} from './analysis.service';

// Security Testing Types
export type {
  SecurityTestCase,
  SecurityTestResult,
  SecurityTestSuite,
  SecurityValidationReport,
  VulnerabilityScanConfig,
  SecurityRegressionTest
} from './security-validation-test.service';

export type {
  VulnerabilityScanSchedule,
  VulnerabilityScanType,
  AutomatedScanResult,
  ScanConfiguration,
  ContinuousMonitoringConfig
} from './vulnerability-scanning-automation.service';

export type {
  SecurityBaseline,
  SecurityRegressionResult,
  SecurityRegressionReport,
  RegressionTestConfig,
  SecurityMetricsComparison
} from './security-regression-test.service';

// Analysis types
export * from '../../types/analysis.types';