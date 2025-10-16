import { RepositoryAnalyzerService, ChangeAnalysis, ProjectStructure } from './repository-analyzer.service';
import { GitDiffAnalyzerService, GitDiffResult } from './git-diff-analyzer.service';
import { AnalysisConfigService, AnalysisConfiguration } from './analysis-config.service';
import { DependencyAnalyzerService, DependencyComparison, VulnerabilityReport } from './dependency-analyzer.service';
import { DependencyAuditResult, AnalysisIssue } from '../../types/analysis.types';

export interface AnalysisResult {
  id: string;
  timestamp: Date;
  repositories: {
    essencia: RepositoryAnalysisResult;
    fnpRanking: RepositoryAnalysisResult;
    current: RepositoryAnalysisResult;
  };
  comparisons: {
    essenciaVsCurrent: ComparisonResult;
    fnpRankingVsCurrent: ComparisonResult;
  };
  summary: AnalysisSummary;
}

export interface RepositoryAnalysisResult {
  repository: string;
  branch: string;
  commitHash: string;
  structure: ProjectStructure;
  dependencies: DependencyAnalysisInfo;
  analysisDate: Date;
  isAccessible: boolean;
  error?: string;
}

export interface DependencyAnalysisInfo {
  packageInfo: any;
  vulnerabilities: VulnerabilityReport[];
  auditResults: DependencyAuditResult[];
  dependencyTree: any[];
}

export interface ComparisonResult {
  changes: ChangeAnalysis;
  dependencyComparison: DependencyComparison;
  gitDiff: GitDiffResult[];
  newFeatures: string[];
  improvements: string[];
  potentialIssues: string[];
  securityIssues: AnalysisIssue[];
  compatibilityScore: number;
}

export interface AnalysisSummary {
  totalChanges: number;
  newComponents: number;
  newServices: number;
  newUtilities: number;
  dependencyChanges: number;
  configurationChanges: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedActions: string[];
}

export class AnalysisService {
  private repositoryAnalyzer: RepositoryAnalyzerService;
  private gitDiffAnalyzer: GitDiffAnalyzerService;
  private configService: AnalysisConfigService;
  private dependencyAnalyzer: DependencyAnalyzerService;

  constructor() {
    this.repositoryAnalyzer = new RepositoryAnalyzerService();
    this.gitDiffAnalyzer = new GitDiffAnalyzerService();
    this.configService = new AnalysisConfigService();
    this.dependencyAnalyzer = new DependencyAnalyzerService();
  }

  /**
   * Perform comprehensive analysis of base projects vs current platform
   */
  async performAnalysis(): Promise<AnalysisResult> {
    try {
      const config = await this.configService.loadConfiguration();
      const analysisId = this.generateAnalysisId();

      console.log('Starting comprehensive analysis...');

      // Analyze individual repositories
      const [essenciaResult, fnpRankingResult, currentResult] = await Promise.allSettled([
        this.analyzeRepository('essencia', config),
        this.analyzeRepository('fnpRanking', config),
        this.analyzeRepository('current', config)
      ]);

      // Perform comparisons
      const comparisons = await this.performComparisons(
        this.getResultValue(essenciaResult),
        this.getResultValue(fnpRankingResult),
        this.getResultValue(currentResult),
        config
      );

      // Generate summary
      const summary = this.generateSummary(comparisons);

      const result: AnalysisResult = {
        id: analysisId,
        timestamp: new Date(),
        repositories: {
          essencia: this.getResultValue(essenciaResult),
          fnpRanking: this.getResultValue(fnpRankingResult),
          current: this.getResultValue(currentResult)
        },
        comparisons,
        summary
      };

      console.log('Analysis completed successfully');
      return result;
    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze a specific repository
   */
  async analyzeRepository(
    repositoryName: 'essencia' | 'fnpRanking' | 'current',
    config: AnalysisConfiguration
  ): Promise<RepositoryAnalysisResult> {
    try {
      console.log(`Analyzing ${repositoryName} repository...`);

      const repoConfig = await this.configService.getRepositoryConfigWithCredentials(repositoryName);
      
      // Validate repository access
      const isAccessible = await this.configService.validateRepositoryAccess(repoConfig.url);
      if (!isAccessible && repositoryName !== 'current') {
        return {
          repository: repoConfig.url,
          branch: repoConfig.branch,
          commitHash: '',
          structure: { directories: [], files: [], components: [], services: [], utilities: [], tests: [] },
          dependencies: {
            packageInfo: null,
            vulnerabilities: [],
            auditResults: [],
            dependencyTree: []
          },
          analysisDate: new Date(),
          isAccessible: false,
          error: 'Repository not accessible or credentials invalid'
        };
      }

      // For current repository, use local path
      const repoPath = repositoryName === 'current' ? process.cwd() : repoConfig.localPath || '';

      // Get repository info
      let commitHash = '';
      let branch = repoConfig.branch;
      
      if (repositoryName !== 'current') {
        // Clone/update repository if needed
        await this.repositoryAnalyzer.analyzeChanges(repoConfig, repoConfig);
        
        // Get git info
        const isValidRepo = await this.gitDiffAnalyzer.validateRepository(repoPath);
        if (isValidRepo) {
          commitHash = await this.gitDiffAnalyzer.getLatestCommitHash(repoPath);
          branch = await this.gitDiffAnalyzer.getCurrentBranch(repoPath);
        }
      } else {
        // For current repository, get git info if it's a git repo
        try {
          const isValidRepo = await this.gitDiffAnalyzer.validateRepository(repoPath);
          if (isValidRepo) {
            commitHash = await this.gitDiffAnalyzer.getLatestCommitHash(repoPath);
            branch = await this.gitDiffAnalyzer.getCurrentBranch(repoPath);
          }
        } catch {
          // Not a git repository or no git access
        }
      }

      // Get project structure
      const structure = await this.repositoryAnalyzer.getProjectStructure(repoPath);

      // Perform dependency analysis
      const dependencies = await this.analyzeDependencies(repoPath);

      return {
        repository: repoConfig.url,
        branch,
        commitHash,
        structure,
        dependencies,
        analysisDate: new Date(),
        isAccessible: true
      };
    } catch (error) {
      return {
        repository: config.repositories[repositoryName].url,
        branch: config.repositories[repositoryName].branch,
        commitHash: '',
        structure: { directories: [], files: [], components: [], services: [], utilities: [], tests: [] },
        dependencies: {
          packageInfo: null,
          vulnerabilities: [],
          auditResults: [],
          dependencyTree: []
        },
        analysisDate: new Date(),
        isAccessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform comparisons between repositories
   */
  private async performComparisons(
    essenciaResult: RepositoryAnalysisResult,
    fnpRankingResult: RepositoryAnalysisResult,
    currentResult: RepositoryAnalysisResult,
    config: AnalysisConfiguration
  ): Promise<{
    essenciaVsCurrent: ComparisonResult;
    fnpRankingVsCurrent: ComparisonResult;
  }> {
    const comparisons = {
      essenciaVsCurrent: await this.compareRepositories(essenciaResult, currentResult, config),
      fnpRankingVsCurrent: await this.compareRepositories(fnpRankingResult, currentResult, config)
    };

    return comparisons;
  }

  /**
   * Compare two repositories
   */
  private async compareRepositories(
    baseResult: RepositoryAnalysisResult,
    currentResult: RepositoryAnalysisResult,
    config: AnalysisConfiguration
  ): Promise<ComparisonResult> {
    try {
      if (!baseResult.isAccessible || !currentResult.isAccessible) {
        return {
          changes: {
            addedFiles: [],
            modifiedFiles: [],
            deletedFiles: [],
            dependencyChanges: [],
            configurationChanges: []
          },
          dependencyComparison: {
            added: [],
            removed: [],
            updated: [],
            unchanged: []
          },
          gitDiff: [],
          newFeatures: [],
          improvements: [],
          potentialIssues: ['Repository not accessible for comparison'],
          securityIssues: [],
          compatibilityScore: 0
        };
      }

      // Get repository configurations
      const baseRepoConfig = config.repositories.essencia; // This should be dynamic based on baseResult
      const currentRepoConfig = config.repositories.current;

      // Perform change analysis
      const changes = await this.repositoryAnalyzer.analyzeChanges(baseRepoConfig, currentRepoConfig);

      // Perform dependency comparison
      const dependencyComparison = await this.compareDependencies(baseResult, currentResult);

      // Perform git diff analysis (if both are git repositories)
      let gitDiff: GitDiffResult[] = [];
      try {
        if (baseResult.commitHash && currentResult.commitHash) {
          // This would require more complex git diff between different repositories
          // For now, we'll use the change analysis results
          gitDiff = [];
        }
      } catch (error) {
        console.warn('Git diff analysis failed:', error);
      }

      // Identify new features and improvements
      const structureComparison = await this.repositoryAnalyzer.compareProjectStructures(
        baseResult.structure,
        currentResult.structure
      );

      const newFeatures = [
        ...structureComparison.newComponents.map(c => `New component: ${c}`),
        ...structureComparison.newServices.map(s => `New service: ${s}`),
        ...structureComparison.newUtilities.map(u => `New utility: ${u}`)
      ];

      const improvements = this.identifyImprovements(changes, dependencyComparison);
      const potentialIssues = this.identifyPotentialIssues(changes, dependencyComparison, config);
      const securityIssues = await this.identifySecurityIssues(currentResult);
      const compatibilityScore = this.calculateCompatibilityScore(changes, dependencyComparison, config);

      return {
        changes,
        dependencyComparison,
        gitDiff,
        newFeatures,
        improvements,
        potentialIssues,
        securityIssues,
        compatibilityScore
      };
    } catch (error) {
      throw new Error(`Repository comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze dependencies for a repository
   */
  private async analyzeDependencies(repoPath: string): Promise<DependencyAnalysisInfo> {
    try {
      const packageJsonPath = `${repoPath}/package.json`;
      
      // Check if package.json exists
      const fs = await import('fs/promises');
      try {
        await fs.access(packageJsonPath);
      } catch {
        return {
          packageInfo: null,
          vulnerabilities: [],
          auditResults: [],
          dependencyTree: []
        };
      }

      const packageInfo = await this.dependencyAnalyzer.parsePackageJson(packageJsonPath);
      const vulnerabilities = await this.dependencyAnalyzer.scanVulnerabilities(repoPath);
      const securityIssues = await this.dependencyAnalyzer.generateDependencyIssues(repoPath);
      const auditResults = await this.dependencyAnalyzer.analyzeDependencyImpact('', repoPath);
      const dependencyTree = await this.dependencyAnalyzer.buildDependencyTree(repoPath);

      return {
        packageInfo,
        vulnerabilities,
        auditResults,
        dependencyTree
      };
    } catch (error) {
      console.warn(`Failed to analyze dependencies for ${repoPath}:`, error);
      return {
        packageInfo: null,
        vulnerabilities: [],
        auditResults: [],
        dependencyTree: []
      };
    }
  }

  /**
   * Compare dependencies between two repositories
   */
  private async compareDependencies(
    baseResult: RepositoryAnalysisResult,
    currentResult: RepositoryAnalysisResult
  ): Promise<DependencyComparison> {
    try {
      if (!baseResult.dependencies.packageInfo || !currentResult.dependencies.packageInfo) {
        return {
          added: [],
          removed: [],
          updated: [],
          unchanged: []
        };
      }

      const baseDeps = {
        ...baseResult.dependencies.packageInfo.dependencies,
        ...baseResult.dependencies.packageInfo.devDependencies
      };
      
      const currentDeps = {
        ...currentResult.dependencies.packageInfo.dependencies,
        ...currentResult.dependencies.packageInfo.devDependencies
      };

      const baseKeys = new Set(Object.keys(baseDeps));
      const currentKeys = new Set(Object.keys(currentDeps));

      const added = Array.from(currentKeys).filter(key => !baseKeys.has(key));
      const removed = Array.from(baseKeys).filter(key => !currentKeys.has(key));
      const unchanged: string[] = [];
      const updated: Array<{
        name: string;
        oldVersion: string;
        newVersion: string;
        isBreaking: boolean;
      }> = [];

      for (const key of baseKeys) {
        if (currentKeys.has(key)) {
          const oldVersion = baseDeps[key];
          const newVersion = currentDeps[key];
          
          if (oldVersion === newVersion) {
            unchanged.push(key);
          } else {
            updated.push({
              name: key,
              oldVersion,
              newVersion,
              isBreaking: this.isBreakingVersionChange(oldVersion, newVersion)
            });
          }
        }
      }

      return { added, removed, updated, unchanged };
    } catch (error) {
      console.warn('Failed to compare dependencies:', error);
      return {
        added: [],
        removed: [],
        updated: [],
        unchanged: []
      };
    }
  }

  /**
   * Identify security issues from repository analysis
   */
  private async identifySecurityIssues(result: RepositoryAnalysisResult): Promise<AnalysisIssue[]> {
    const issues: AnalysisIssue[] = [];

    // Convert vulnerability reports to analysis issues
    result.dependencies.vulnerabilities.forEach(vuln => {
      issues.push({
        id: `vuln-${vuln.package}-${Date.now()}`,
        ruleId: 'dependency-vulnerability',
        severity: vuln.severity === 'critical' || vuln.severity === 'high' ? 'error' : 'warning',
        message: `Security vulnerability in ${vuln.package}@${vuln.version}: ${vuln.title}`,
        file: 'package.json',
        suggestion: vuln.recommendation,
        autoFixable: false
      });
    });

    return issues;
  }

  /**
   * Check if version change is breaking
   */
  private isBreakingVersionChange(oldVersion: string, newVersion: string): boolean {
    const oldMajor = this.extractMajorVersion(oldVersion);
    const newMajor = this.extractMajorVersion(newVersion);
    return oldMajor !== newMajor && newMajor > oldMajor;
  }

  /**
   * Extract major version number
   */
  private extractMajorVersion(version: string): number {
    const cleaned = version.replace(/[\^~>=<]/, '');
    const parts = cleaned.split('.');
    return parseInt(parts[0]) || 0;
  }

  /**
   * Identify improvements from changes
   */
  private identifyImprovements(changes: ChangeAnalysis, dependencyComparison: DependencyComparison): string[] {
    const improvements: string[] = [];

    // Analyze added files for improvements
    changes.addedFiles.forEach(file => {
      if (file.type === 'component' && file.complexity === 'high') {
        improvements.push(`New complex component: ${file.path}`);
      } else if (file.type === 'service') {
        improvements.push(`New service functionality: ${file.path}`);
      } else if (file.type === 'utility') {
        improvements.push(`New utility function: ${file.path}`);
      }
    });

    // Analyze dependency changes for improvements
    changes.dependencyChanges.forEach(dep => {
      if (dep.changeType === 'added') {
        improvements.push(`New dependency: ${dep.name}@${dep.newVersion}`);
      } else if (dep.changeType === 'updated') {
        improvements.push(`Updated dependency: ${dep.name} (${dep.oldVersion} → ${dep.newVersion})`);
      }
    });

    // Analyze new dependencies
    dependencyComparison.added.forEach(dep => {
      improvements.push(`New dependency added: ${dep}`);
    });

    // Analyze updated dependencies (non-breaking)
    dependencyComparison.updated.forEach(dep => {
      if (!dep.isBreaking) {
        improvements.push(`Dependency updated: ${dep.name} (${dep.oldVersion} → ${dep.newVersion})`);
      }
    });

    // Analyze configuration changes
    changes.configurationChanges.forEach(config => {
      if (config.impact === 'additive') {
        improvements.push(`Configuration improvement: ${config.file}`);
      }
    });

    return improvements;
  }

  /**
   * Identify potential issues from changes
   */
  private identifyPotentialIssues(changes: ChangeAnalysis, dependencyComparison: DependencyComparison, config: AnalysisConfiguration): string[] {
    const issues: string[] = [];

    // Check for breaking changes
    changes.modifiedFiles.forEach(file => {
      if (file.impact === 'breaking') {
        issues.push(`Potential breaking change: ${file.path}`);
      }
    });

    changes.deletedFiles.forEach(file => {
      issues.push(`Deleted file may cause issues: ${file.path}`);
    });

    // Check dependency changes for potential issues
    changes.dependencyChanges.forEach(dep => {
      if (dep.changeType === 'removed') {
        issues.push(`Removed dependency may cause issues: ${dep.name}`);
      } else if (dep.changeType === 'updated' && dep.oldVersion && dep.newVersion) {
        // Check for major version changes
        const oldMajor = dep.oldVersion.split('.')[0];
        const newMajor = dep.newVersion.split('.')[0];
        if (oldMajor !== newMajor) {
          issues.push(`Major version change in dependency: ${dep.name} (${dep.oldVersion} → ${dep.newVersion})`);
        }
      }
    });

    // Check configuration changes for breaking changes
    changes.configurationChanges.forEach(configChange => {
      if (configChange.impact === 'breaking') {
        issues.push(`Breaking configuration change: ${configChange.file}`);
      }
    });

    // Check dependency comparison for issues
    dependencyComparison.removed.forEach(dep => {
      issues.push(`Removed dependency may cause issues: ${dep}`);
    });

    dependencyComparison.updated.forEach(dep => {
      if (dep.isBreaking) {
        issues.push(`Breaking dependency change: ${dep.name} (${dep.oldVersion} → ${dep.newVersion})`);
      }
    });

    return issues;
  }

  /**
   * Calculate compatibility score based on changes and rules
   */
  private calculateCompatibilityScore(changes: ChangeAnalysis, dependencyComparison: DependencyComparison, config: AnalysisConfiguration): number {
    let score = 100;
    const compatibilityRules = config.compatibilityRules.filter(rule => rule.enabled);

    // Deduct points for breaking changes
    changes.modifiedFiles.forEach(file => {
      if (file.impact === 'breaking') {
        score -= 10;
      }
    });

    changes.deletedFiles.forEach(() => {
      score -= 15;
    });

    // Deduct points for major dependency changes
    changes.dependencyChanges.forEach(dep => {
      if (dep.changeType === 'removed') {
        score -= 20;
      } else if (dep.changeType === 'updated' && dep.oldVersion && dep.newVersion) {
        const oldMajor = dep.oldVersion.split('.')[0];
        const newMajor = dep.newVersion.split('.')[0];
        if (oldMajor !== newMajor) {
          score -= 10;
        }
      }
    });

    // Deduct points for breaking configuration changes
    changes.configurationChanges.forEach(configChange => {
      if (configChange.impact === 'breaking') {
        score -= 15;
      }
    });

    // Deduct points for dependency issues
    dependencyComparison.removed.forEach(() => {
      score -= 20;
    });

    dependencyComparison.updated.forEach(dep => {
      if (dep.isBreaking) {
        score -= 15;
      }
    });

    // Apply compatibility rules
    compatibilityRules.forEach(rule => {
      if (rule.severity === 'error') {
        // Check if rule applies to any changes
        const hasMatchingChanges = this.checkRuleAgainstChanges(rule, changes);
        if (hasMatchingChanges) {
          score -= 25;
        }
      } else if (rule.severity === 'warning') {
        const hasMatchingChanges = this.checkRuleAgainstChanges(rule, changes);
        if (hasMatchingChanges) {
          score -= 10;
        }
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if a compatibility rule applies to the changes
   */
  private checkRuleAgainstChanges(rule: any, changes: ChangeAnalysis): boolean {
    // Simple pattern matching - can be enhanced with proper glob matching
    const allFiles = [
      ...changes.addedFiles.map(f => f.path),
      ...changes.modifiedFiles.map(f => f.path),
      ...changes.deletedFiles.map(f => f.path)
    ];

    return allFiles.some(file => {
      // Simple pattern matching
      if (rule.pattern.includes('**')) {
        const pattern = rule.pattern.replace('**/', '').replace('**', '');
        return file.includes(pattern.replace('*', ''));
      }
      return file.includes(rule.pattern);
    });
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(comparisons: {
    essenciaVsCurrent: ComparisonResult;
    fnpRankingVsCurrent: ComparisonResult;
  }): AnalysisSummary {
    const essenciaChanges = comparisons.essenciaVsCurrent.changes;
    const fnpRankingChanges = comparisons.fnpRankingVsCurrent.changes;

    const totalChanges = 
      essenciaChanges.addedFiles.length + essenciaChanges.modifiedFiles.length + essenciaChanges.deletedFiles.length +
      fnpRankingChanges.addedFiles.length + fnpRankingChanges.modifiedFiles.length + fnpRankingChanges.deletedFiles.length;

    const newComponents = 
      essenciaChanges.addedFiles.filter(f => f.type === 'component').length +
      fnpRankingChanges.addedFiles.filter(f => f.type === 'component').length;

    const newServices = 
      essenciaChanges.addedFiles.filter(f => f.type === 'service').length +
      fnpRankingChanges.addedFiles.filter(f => f.type === 'service').length;

    const newUtilities = 
      essenciaChanges.addedFiles.filter(f => f.type === 'utility').length +
      fnpRankingChanges.addedFiles.filter(f => f.type === 'utility').length;

    const dependencyChanges = 
      essenciaChanges.dependencyChanges.length + fnpRankingChanges.dependencyChanges.length;

    const configurationChanges = 
      essenciaChanges.configurationChanges.length + fnpRankingChanges.configurationChanges.length;

    // Calculate risk level based on compatibility scores and potential issues
    const avgCompatibilityScore = (comparisons.essenciaVsCurrent.compatibilityScore + comparisons.fnpRankingVsCurrent.compatibilityScore) / 2;
    const totalIssues = comparisons.essenciaVsCurrent.potentialIssues.length + comparisons.fnpRankingVsCurrent.potentialIssues.length;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (avgCompatibilityScore < 50 || totalIssues > 10) {
      riskLevel = 'high';
    } else if (avgCompatibilityScore < 75 || totalIssues > 5) {
      riskLevel = 'medium';
    }

    // Generate recommended actions
    const recommendedActions: string[] = [];
    
    if (newComponents > 0) {
      recommendedActions.push(`Review ${newComponents} new components for integration opportunities`);
    }
    
    if (newServices > 0) {
      recommendedActions.push(`Evaluate ${newServices} new services for platform enhancement`);
    }
    
    if (dependencyChanges > 0) {
      recommendedActions.push(`Review ${dependencyChanges} dependency changes for security and compatibility`);
    }
    
    if (riskLevel === 'high') {
      recommendedActions.push('Conduct thorough testing before integration due to high risk level');
    }
    
    if (totalIssues > 0) {
      recommendedActions.push(`Address ${totalIssues} potential issues before proceeding with integration`);
    }

    return {
      totalChanges,
      newComponents,
      newServices,
      newUtilities,
      dependencyChanges,
      configurationChanges,
      riskLevel,
      recommendedActions
    };
  }

  /**
   * Generate unique analysis ID
   */
  private generateAnalysisId(): string {
    return `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get result value from PromiseSettledResult
   */
  private getResultValue<T>(result: PromiseSettledResult<T>): T {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      throw new Error(`Promise rejected: ${result.reason}`);
    }
  }

  /**
   * Save analysis result
   */
  async saveAnalysisResult(result: AnalysisResult): Promise<void> {
    try {
      const resultsDir = '.kiro/analysis/results';
      const fs = await import('fs/promises');
      const path = await import('path');
      
      await fs.mkdir(resultsDir, { recursive: true });
      
      const resultPath = path.join(resultsDir, `${result.id}.json`);
      await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    } catch (error) {
      throw new Error(`Failed to save analysis result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load analysis result
   */
  async loadAnalysisResult(analysisId: string): Promise<AnalysisResult> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const resultPath = path.join('.kiro/analysis/results', `${analysisId}.json`);
      const content = await fs.readFile(resultPath, 'utf-8');
      return JSON.parse(content) as AnalysisResult;
    } catch (error) {
      throw new Error(`Failed to load analysis result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all analysis results
   */
  async listAnalysisResults(): Promise<{ id: string; timestamp: Date; summary: string }[]> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const resultsDir = '.kiro/analysis/results';
      
      try {
        const files = await fs.readdir(resultsDir);
        const results = [];
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const content = await fs.readFile(path.join(resultsDir, file), 'utf-8');
              const result = JSON.parse(content) as AnalysisResult;
              results.push({
                id: result.id,
                timestamp: new Date(result.timestamp),
                summary: `${result.summary.totalChanges} changes, ${result.summary.riskLevel} risk`
              });
            } catch (error) {
              console.warn(`Failed to parse analysis result ${file}:`, error);
            }
          }
        }
        
        return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      } catch (error) {
        return [];
      }
    } catch (error) {
      throw new Error(`Failed to list analysis results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up temporary files and resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.repositoryAnalyzer.cleanup();
    } catch (error) {
      console.warn('Failed to cleanup analysis service:', error);
    }
  }
}