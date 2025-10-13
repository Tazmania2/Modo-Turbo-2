// Analysis Infrastructure Exports

export { RepositoryAnalyzerService } from './repository-analyzer.service';
export { GitDiffAnalyzerService } from './git-diff-analyzer.service';
export { AnalysisConfigService } from './analysis-config.service';
export { AnalysisService } from './analysis.service';

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

// Analysis types
export * from '../../types/analysis.types';