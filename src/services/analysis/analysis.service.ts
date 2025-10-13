import { RepositoryAnalyzerService, ChangeAnalysis, ProjectStructure } from './repository-analyzer.service';
import { GitDiffAnalyzerService, GitDiffResult } from './git-diff-analyzer.service';
import { AnalysisConfigService, AnalysisConfiguration } from './analysis-config.service';

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
  analysisDate: Date;
  isAccessible: boolean;
  error?: string;
}

export interface ComparisonResult {
  changes: ChangeAnalysis;
  gitDiff: GitDiffResult[];
  newFeatures: string[];
  improvements: string[];
  potentialIssues: string[];
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

  constructor() {
    this.repositoryAnalyzer = new RepositoryAnalyzerService();
    this.gitDiffAnalyzer = new GitDiffAnalyzerService();
    this.configService = new AnalysisConfigService();
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

      return {
        repository: repoConfig.url,
        branch,
        commitHash,
        structure,
        analysisDate: new Date(),
        isAccessible: true
      };
    } catch (error) {
      return {
        repository: config.repositories[repositoryName].url,
        branch: config.repositories[repositoryName].branch,
        commitHash: '',
        structure: { directories: [], files: [], components: [], services: [], utilities: [], tests: [] },
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
          gitDiff: [],
          newFeatures: [],
          improvements: [],
          potentialIssues: ['Repository not accessible for comparison'],
          compatibilityScore: 0
        };
      }

      // Get repository configurations
      const baseRepoConfig = config.repositories.essencia; // This should be dynamic based on baseResult
      const currentRepoConfig = config.repositories.current;

      // Perform change analysis
      const changes = await this.repositoryAnalyzer.analyzeChanges(baseRepoConfig, currentRepoConfig);

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

      const improvements = this.identifyImprovements(changes);
      const potentialIssues = this.identifyPotentialIssues(changes, config);
      const compatibilityScore = this.calculateCompatibilityScore(changes, config);

      return {
        changes,
        gitDiff,
        newFeatures,
        improvements,
        potentialIssues,
        compatibilityScore
      };
    } catch (error) {
      throw new Error(`Repository comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Identify improvements from changes
   */
  private identifyImprovements(changes: ChangeAnalysis): string[] {
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
  private identifyPotentialIssues(changes: ChangeAnalysis, config: AnalysisConfiguration): string[] {
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

    return issues;
  }

  /**
   * Calculate compatibility score based on changes and rules
   */
  private calculateCompatibilityScore(changes: ChangeAnalysis, config: AnalysisConfiguration): number {
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