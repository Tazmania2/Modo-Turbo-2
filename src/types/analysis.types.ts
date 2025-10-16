// Core analysis types and interfaces

export interface AnalysisMetadata {
  id: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
}

export interface RepositoryMetadata {
  name: string;
  url: string;
  branch: string;
  commitHash: string;
  lastAnalyzed: Date;
  size: number; // in bytes
  fileCount: number;
  language: string;
  framework: string[];
}

export interface FileAnalysis {
  path: string;
  type: FileType;
  size: number;
  lines: number;
  complexity: ComplexityLevel;
  dependencies: string[];
  exports: string[];
  imports: ImportInfo[];
  lastModified: Date;
  author: string;
  changeFrequency: number;
}

export interface ImportInfo {
  module: string;
  type: 'default' | 'named' | 'namespace' | 'dynamic';
  specifiers: string[];
  isExternal: boolean;
}

export type FileType = 
  | 'component' 
  | 'service' 
  | 'utility' 
  | 'config' 
  | 'test' 
  | 'type' 
  | 'hook' 
  | 'api' 
  | 'middleware'
  | 'style'
  | 'asset'
  | 'documentation';

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'critical';

export type ChangeImpact = 'breaking' | 'additive' | 'neutral' | 'improvement';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AnalysisRule {
  id: string;
  name: string;
  description: string;
  type: AnalysisRuleType;
  pattern: string | RegExp;
  weight: number;
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  category: string;
  tags: string[];
}

export type AnalysisRuleType = 
  | 'file-pattern'
  | 'dependency'
  | 'structure'
  | 'performance'
  | 'security'
  | 'compatibility'
  | 'quality'
  | 'maintainability';

export interface AnalysisIssue {
  id: string;
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  column?: number;
  suggestion?: string;
  autoFixable: boolean;
}

export interface QualityMetrics {
  maintainabilityIndex: number;
  cyclomaticComplexity: number;
  codeChurn: number;
  testCoverage: number;
  duplicateCodePercentage: number;
  technicalDebt: TechnicalDebt;
}

export interface TechnicalDebt {
  totalMinutes: number;
  categories: {
    [category: string]: {
      minutes: number;
      issues: number;
      severity: 'low' | 'medium' | 'high';
    };
  };
}

export interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  dependencyAudit: DependencyAuditResult[];
  codeSecurityIssues: SecurityIssue[];
  complianceScore: number;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  package: string;
  version: string;
  patchedVersions: string;
  recommendation: string;
}

export interface DependencyAuditResult {
  package: string;
  version: string;
  vulnerabilities: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  recommendation: 'update' | 'replace' | 'remove' | 'monitor';
}

export interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line: number;
  description: string;
  recommendation: string;
}

export interface CompatibilityAnalysis {
  whiteLabel: WhiteLabelCompatibility;
  api: ApiCompatibility;
  database: DatabaseCompatibility;
  browser: BrowserCompatibility;
  mobile: MobileCompatibility;
}

export interface WhiteLabelCompatibility {
  score: number;
  issues: CompatibilityIssue[];
  recommendations: string[];
  themeSupport: boolean;
  brandingFlexibility: number;
}

export interface ApiCompatibility {
  backwardCompatible: boolean;
  breakingChanges: ApiBreakingChange[];
  deprecations: ApiDeprecation[];
  versionCompatibility: string[];
}

export interface ApiBreakingChange {
  endpoint: string;
  method: string;
  changeType: 'removed' | 'modified' | 'parameter-changed';
  description: string;
  impact: 'high' | 'medium' | 'low';
  migration: string;
}

export interface ApiDeprecation {
  endpoint: string;
  method: string;
  deprecatedIn: string;
  removedIn: string;
  replacement: string;
  reason: string;
}

export interface DatabaseCompatibility {
  migrationRequired: boolean;
  migrations: DatabaseMigration[];
  dataIntegrity: boolean;
  performanceImpact: 'none' | 'low' | 'medium' | 'high';
}

export interface DatabaseMigration {
  type: 'schema' | 'data' | 'index' | 'constraint';
  description: string;
  sql: string;
  rollback: string;
  risk: 'low' | 'medium' | 'high';
}

export interface BrowserCompatibility {
  supported: string[];
  unsupported: string[];
  polyfillsRequired: string[];
  features: FeatureCompatibility[];
}

export interface FeatureCompatibility {
  feature: string;
  support: { [browser: string]: boolean };
  polyfill?: string;
  fallback?: string;
}

export interface MobileCompatibility {
  responsive: boolean;
  touchOptimized: boolean;
  performanceScore: number;
  issues: MobileIssue[];
}

export interface MobileIssue {
  type: 'layout' | 'performance' | 'touch' | 'accessibility';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface CompatibilityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  file: string;
  description: string;
  recommendation: string;
  autoFixable: boolean;
}

export interface ImprovementOpportunity {
  id: string;
  title: string;
  description: string;
  category: ImprovementCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'small' | 'medium' | 'large' | 'epic';
  impact: 'low' | 'medium' | 'high';
  businessValue: number;
  technicalValue: number;
  riskLevel: RiskLevel;
  estimatedHours: number;
  dependencies: string[];
  files: string[];
  implementation: ImplementationPlan;
}

export type ImprovementCategory = 
  | 'performance'
  | 'security'
  | 'maintainability'
  | 'scalability'
  | 'user-experience'
  | 'developer-experience'
  | 'compatibility'
  | 'accessibility'
  | 'seo'
  | 'monitoring'
  | 'testing'
  | 'documentation';

export interface ImplementationPlan {
  steps: ImplementationStep[];
  prerequisites: string[];
  risks: string[];
  testing: TestingPlan;
  rollback: string;
}

export interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  estimatedHours: number;
  files: string[];
  dependencies: string[];
}

export interface TestingPlan {
  unit: string[];
  integration: string[];
  e2e: string[];
  manual: string[];
  performance: string[];
}

export interface RepositoryAnalysisResult {
  repository: RepositoryMetadata;
  files: FileAnalysis[];
  dependencies: DependencyAnalysisResult;
  metrics: QualityMetrics;
  issues: AnalysisIssue[];
  improvements: ImprovementOpportunity[];
}

export interface DependencyAnalysisResult {
  total: number;
  direct: number;
  indirect: number;
  outdated: number;
  vulnerable: number;
  tree: DependencyTreeInfo[];
  vulnerabilities: SecurityVulnerability[];
  audit: DependencyAuditResult[];
}

export interface DependencyTreeInfo {
  name: string;
  version: string;
  depth: number;
  isDirect: boolean;
  children: DependencyTreeInfo[];
}

export interface ComparisonResult {
  baseRepository: string;
  targetRepository: string;
  summary: ComparisonSummary;
  fileChanges: FileChangeAnalysis[];
  dependencyChanges: DependencyChangeAnalysis;
  structuralChanges: StructuralChangeAnalysis[];
  qualityDelta: QualityMetricsDelta;
}

export interface ComparisonSummary {
  filesAdded: number;
  filesModified: number;
  filesRemoved: number;
  linesAdded: number;
  linesRemoved: number;
  dependenciesAdded: number;
  dependenciesRemoved: number;
  dependenciesUpdated: number;
  overallRiskLevel: RiskLevel;
}

export interface FileChangeAnalysis {
  path: string;
  changeType: 'added' | 'modified' | 'removed';
  linesAdded: number;
  linesRemoved: number;
  complexityChange: number;
  riskLevel: RiskLevel;
  impact: ChangeImpact;
}

export interface DependencyChangeAnalysis {
  added: DependencyChange[];
  removed: DependencyChange[];
  updated: DependencyChange[];
  securityImpact: SecurityImpactAnalysis;
}

export interface DependencyChange {
  name: string;
  oldVersion?: string;
  newVersion?: string;
  changeType: 'added' | 'removed' | 'updated';
  isBreaking: boolean;
  riskLevel: RiskLevel;
  vulnerabilities: SecurityVulnerability[];
}

export interface SecurityImpactAnalysis {
  newVulnerabilities: number;
  resolvedVulnerabilities: number;
  riskChange: 'increased' | 'decreased' | 'unchanged';
  criticalIssues: SecurityVulnerability[];
}

export interface StructuralChangeAnalysis {
  type: 'component' | 'service' | 'utility' | 'config' | 'api';
  name: string;
  changeType: 'added' | 'modified' | 'removed';
  impact: ChangeImpact;
  affectedFiles: string[];
  dependencies: string[];
}

export interface QualityMetricsDelta {
  maintainabilityChange: number;
  complexityChange: number;
  testCoverageChange: number;
  technicalDebtChange: number;
  overallQualityChange: number;
}

export interface AnalysisReport {
  metadata: AnalysisMetadata;
  summary: AnalysisSummary;
  repositories: RepositoryAnalysisResult[];
  comparisons: ComparisonResult[];
  improvements: ImprovementOpportunity[];
  issues: AnalysisIssue[];
  metrics: QualityMetrics;
  security: SecurityAnalysis;
  compatibility: CompatibilityAnalysis;
  recommendations: Recommendation[];
}

export interface AnalysisSummary {
  totalFiles: number;
  totalLines: number;
  totalChanges: number;
  newComponents: number;
  newServices: number;
  newUtilities: number;
  dependencyChanges: number;
  configurationChanges: number;
  riskLevel: RiskLevel;
  qualityScore: number;
  maintainabilityScore: number;
  securityScore: number;
  compatibilityScore: number;
  recommendedActions: string[];
  estimatedEffort: string;
  businessImpact: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: ImprovementCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'small' | 'medium' | 'large';
  impact: 'low' | 'medium' | 'high';
  reasoning: string;
  implementation: string;
  benefits: string[];
  risks: string[];
  alternatives: string[];
}

export interface AnalysisConfiguration {
  rules: AnalysisRule[];
  thresholds: AnalysisThresholds;
  exclusions: AnalysisExclusions;
  integrations: AnalysisIntegrations;
}

export interface AnalysisThresholds {
  complexity: {
    low: number;
    medium: number;
    high: number;
  };
  maintainability: {
    good: number;
    fair: number;
    poor: number;
  };
  security: {
    acceptable: number;
    warning: number;
    critical: number;
  };
  performance: {
    excellent: number;
    good: number;
    poor: number;
  };
}

export interface AnalysisExclusions {
  files: string[];
  directories: string[];
  patterns: string[];
  rules: string[];
}

export interface AnalysisIntegrations {
  github: GitHubIntegration;
  sonarqube?: SonarQubeIntegration;
  eslint?: ESLintIntegration;
  jest?: JestIntegration;
}

export interface GitHubIntegration {
  enabled: boolean;
  token: string;
  owner: string;
  repo: string;
  createIssues: boolean;
  createPullRequests: boolean;
}

export interface SonarQubeIntegration {
  enabled: boolean;
  url: string;
  token: string;
  projectKey: string;
}

export interface ESLintIntegration {
  enabled: boolean;
  configPath: string;
  includeWarnings: boolean;
}

export interface JestIntegration {
  enabled: boolean;
  configPath: string;
  coverageThreshold: number;
}

// Utility types for analysis results
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AnalysisJob {
  id: string;
  status: AnalysisStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  result?: AnalysisReport;
}

export interface AnalysisFilter {
  repositories?: string[];
  fileTypes?: FileType[];
  categories?: ImprovementCategory[];
  priorities?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export interface AnalysisExport {
  format: 'json' | 'csv' | 'pdf' | 'html';
  includeDetails: boolean;
  sections: string[];
  filter?: AnalysisFilter;
}