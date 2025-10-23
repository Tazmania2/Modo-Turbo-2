import { 
  ImprovementOpportunity, 
  RiskLevel,
  AnalysisIssue 
} from '@/types/analysis.types';
import { PrioritizedFeature } from './integration-priority-matrix.service';

export interface IntegrationStrategy {
  approach: 'direct' | 'gradual' | 'parallel';
  featureFlags: FeatureFlagConfig[];
  testingApproach: 'unit' | 'integration' | 'e2e' | 'all';
  rolloutStrategy: 'immediate' | 'gradual' | 'canary';
  backupRequired: boolean;
  validationRequired: boolean;
  rollbackPlan: string;
}

export interface FeatureFlagConfig {
  name: string;
  description: string;
  defaultValue: boolean;
  environments: Record<string, boolean>;
  conditions: FeatureFlagCondition[];
  rolloutPercentage: number;
}

export interface FeatureFlagCondition {
  type: 'user' | 'environment' | 'time' | 'custom';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface IntegrationResult {
  success: boolean;
  feature: PrioritizedFeature;
  changes: CodeChange[];
  tests: TestResult[];
  performance: PerformanceImpact;
  issues: IntegrationIssue[];
  rollbackInfo: RollbackInfo;
  validationResults: ValidationResult[];
}

export interface CodeChange {
  id: string;
  type: 'file_added' | 'file_modified' | 'file_deleted' | 'dependency_added' | 'config_updated';
  path: string;
  description: string;
  linesAdded: number;
  linesRemoved: number;
  complexity: 'low' | 'medium' | 'high';
  riskLevel: RiskLevel;
  rollbackCommand: string;
  validationChecks: string[];
}

export interface TestResult {
  suite: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  duration: number;
  failures: TestFailure[];
}

export interface TestFailure {
  test: string;
  error: string;
  stack: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceImpact {
  bundleSize: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
  };
  loadTime: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
  };
  memoryUsage: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
  };
  renderTime: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
  };
}

export interface IntegrationIssue {
  id: string;
  type: 'conflict' | 'dependency' | 'compatibility' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
  suggestion: string;
  autoFixable: boolean;
  rollbackRequired: boolean;
}

export interface RollbackInfo {
  available: boolean;
  commands: string[];
  estimatedTime: number;
  dataBackupRequired: boolean;
  validationSteps: string[];
}

export interface ValidationResult {
  validator: string;
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface IntegrationJob {
  id: string;
  featureId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  strategy: IntegrationStrategy;
  startTime: Date;
  endTime?: Date;
  progress: number;
  currentStep: string;
  logs: IntegrationLog[];
  result?: IntegrationResult;
  error?: string;
}

export interface IntegrationLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  step: string;
  data?: any;
}

export interface ConfigurationMerger {
  mergeConfigurations(
    baseConfig: Record<string, any>,
    newConfig: Record<string, any>,
    strategy: 'override' | 'merge' | 'append'
  ): Record<string, any>;
  validateConfiguration(config: Record<string, any>): ValidationResult;
  backupConfiguration(configPath: string): Promise<string>;
  restoreConfiguration(backupPath: string, configPath: string): Promise<void>;
}

export class FeatureIntegrationService {
  private jobs = new Map<string, IntegrationJob>();
  private configMerger: ConfigurationMerger;

  constructor() {
    this.configMerger = new DefaultConfigurationMerger();
  }

  /**
   * Integrate a feature using the specified strategy
   */
  async integrateFeature(
    feature: PrioritizedFeature,
    strategy: IntegrationStrategy
  ): Promise<IntegrationResult> {
    const jobId = `integration-${feature.id}-${Date.now()}`;
    
    // Create integration job
    const job: IntegrationJob = {
      id: jobId,
      featureId: feature.id,
      status: 'running',
      strategy,
      startTime: new Date(),
      progress: 0,
      currentStep: 'Initializing',
      logs: []
    };

    this.jobs.set(jobId, job);
    this.log(job, 'info', 'Starting feature integration', 'initialization');

    try {
      // Step 1: Pre-integration validation
      job.currentStep = 'Pre-integration validation';
      job.progress = 10;
      await this.preIntegrationValidation(feature, job);

      // Step 2: Create backup if required
      if (strategy.backupRequired) {
        job.currentStep = 'Creating backup';
        job.progress = 20;
        await this.createBackup(feature, job);
      }

      // Step 3: Apply code changes
      job.currentStep = 'Applying code changes';
      job.progress = 40;
      const codeChanges = await this.applyCodeChanges(feature, strategy, job);

      // Step 4: Update configurations
      job.currentStep = 'Updating configurations';
      job.progress = 60;
      await this.updateConfigurations(feature, strategy, job);

      // Step 5: Run tests
      job.currentStep = 'Running tests';
      job.progress = 80;
      const testResults = await this.runTests(feature, strategy, job);

      // Step 6: Performance validation
      job.currentStep = 'Performance validation';
      job.progress = 90;
      const performanceImpact = await this.validatePerformance(feature, job);

      // Step 7: Final validation
      job.currentStep = 'Final validation';
      job.progress = 95;
      const validationResults = await this.finalValidation(feature, job);

      // Complete integration
      job.status = 'completed';
      job.progress = 100;
      job.currentStep = 'Completed';
      job.endTime = new Date();

      const result: IntegrationResult = {
        success: true,
        feature,
        changes: codeChanges,
        tests: testResults,
        performance: performanceImpact,
        issues: [],
        rollbackInfo: this.generateRollbackInfo(codeChanges),
        validationResults
      };

      job.result = result;
      this.log(job, 'info', 'Feature integration completed successfully', 'completion');

      return result;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
      
      this.log(job, 'error', `Integration failed: ${job.error}`, 'error');

      // Attempt rollback if configured
      if (strategy.rolloutStrategy !== 'immediate') {
        await this.rollbackFeature(feature, job);
      }

      throw error;
    }
  }

  /**
   * Rollback a feature integration
   */
  async rollbackFeature(
    feature: PrioritizedFeature,
    job?: IntegrationJob
  ): Promise<void> {
    const rollbackJobId = `rollback-${feature.id}-${Date.now()}`;
    
    if (!job) {
      job = {
        id: rollbackJobId,
        featureId: feature.id,
        status: 'running',
        strategy: { approach: 'direct' } as IntegrationStrategy,
        startTime: new Date(),
        progress: 0,
        currentStep: 'Rolling back',
        logs: []
      };
      this.jobs.set(rollbackJobId, job);
    }

    this.log(job, 'info', 'Starting feature rollback', 'rollback');

    try {
      // Get rollback information
      const rollbackInfo = await this.getRollbackInfo(feature.id);
      
      if (!rollbackInfo.available) {
        throw new Error('Rollback information not available');
      }

      // Execute rollback commands
      for (const command of rollbackInfo.commands) {
        this.log(job, 'info', `Executing rollback command: ${command}`, 'rollback');
        await this.executeCommand(command);
      }

      // Validate rollback
      for (const step of rollbackInfo.validationSteps) {
        this.log(job, 'info', `Validating rollback step: ${step}`, 'validation');
        await this.validateRollbackStep(step);
      }

      job.status = 'completed';
      job.currentStep = 'Rollback completed';
      job.endTime = new Date();

      this.log(job, 'info', 'Feature rollback completed successfully', 'completion');

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Rollback failed';
      job.endTime = new Date();
      
      this.log(job, 'error', `Rollback failed: ${job.error}`, 'error');
      throw error;
    }
  }

  /**
   * Monitor feature performance after integration
   */
  async monitorFeaturePerformance(
    feature: PrioritizedFeature,
    duration: number = 3600000 // 1 hour default
  ): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const metrics: PerformanceMetrics = {
      feature: feature.id,
      startTime: new Date(startTime),
      endTime: new Date(startTime + duration),
      samples: [],
      averages: {
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      alerts: []
    };

    // Start monitoring
    const monitoringInterval = setInterval(async () => {
      try {
        const sample = await this.collectPerformanceSample(feature);
        metrics.samples.push(sample);

        // Check for performance alerts
        const alerts = this.checkPerformanceAlerts(sample, feature);
        metrics.alerts.push(...alerts);

        // Update averages
        this.updatePerformanceAverages(metrics);

      } catch (error) {
        console.error('Error collecting performance sample:', error);
      }
    }, 60000); // Collect sample every minute

    // Stop monitoring after duration
    setTimeout(() => {
      clearInterval(monitoringInterval);
      metrics.endTime = new Date();
    }, duration);

    return metrics;
  }

  /**
   * Get integration job status
   */
  getJobStatus(jobId: string): IntegrationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * List all integration jobs
   */
  listJobs(filter?: { status?: string; featureId?: string }): IntegrationJob[] {
    const jobs = Array.from(this.jobs.values());
    
    if (!filter) return jobs;

    return jobs.filter(job => {
      if (filter.status && job.status !== filter.status) return false;
      if (filter.featureId && job.featureId !== filter.featureId) return false;
      return true;
    });
  }

  // Private helper methods

  private async preIntegrationValidation(
    feature: PrioritizedFeature,
    job: IntegrationJob
  ): Promise<void> {
    this.log(job, 'info', 'Running pre-integration validation', 'validation');

    // Check prerequisites
    for (const prereq of feature.prerequisites) {
      const prereqMet = await this.checkPrerequisite(prereq);
      if (!prereqMet) {
        throw new Error(`Prerequisite not met: ${prereq}`);
      }
    }

    // Check for conflicts
    const conflicts = await this.checkForConflicts(feature);
    if (conflicts.length > 0) {
      throw new Error(`Integration conflicts detected: ${conflicts.join(', ')}`);
    }

    // Validate dependencies
    const dependencyIssues = await this.validateDependencies(feature);
    if (dependencyIssues.length > 0) {
      throw new Error(`Dependency issues: ${dependencyIssues.join(', ')}`);
    }
  }

  private async createBackup(
    feature: PrioritizedFeature,
    job: IntegrationJob
  ): Promise<void> {
    this.log(job, 'info', 'Creating backup before integration', 'backup');

    // Backup affected files
    for (const file of feature.files) {
      await this.backupFile(file);
    }

    // Backup configurations
    await this.configMerger.backupConfiguration('config/app.json');
    await this.configMerger.backupConfiguration('package.json');
  }

  private async applyCodeChanges(
    feature: PrioritizedFeature,
    strategy: IntegrationStrategy,
    job: IntegrationJob
  ): Promise<CodeChange[]> {
    this.log(job, 'info', 'Applying code changes', 'integration');

    const changes: CodeChange[] = [];

    // Apply changes based on strategy
    switch (strategy.approach) {
      case 'direct':
        return await this.applyDirectChanges(feature, job);
      case 'gradual':
        return await this.applyGradualChanges(feature, strategy, job);
      case 'parallel':
        return await this.applyParallelChanges(feature, strategy, job);
      default:
        throw new Error(`Unknown integration approach: ${strategy.approach}`);
    }
  }

  private async applyDirectChanges(
    feature: PrioritizedFeature,
    job: IntegrationJob
  ): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    // Simulate code integration
    for (const file of feature.files) {
      const change: CodeChange = {
        id: `change-${Date.now()}-${Math.random()}`,
        type: 'file_modified',
        path: file,
        description: `Integrated ${feature.title} changes`,
        linesAdded: Math.floor(Math.random() * 100) + 10,
        linesRemoved: Math.floor(Math.random() * 50),
        complexity: feature.effort === 'large' ? 'high' : 'medium',
        riskLevel: feature.riskLevel,
        rollbackCommand: `git checkout HEAD -- ${file}`,
        validationChecks: [`Validate ${file} syntax`, `Test ${file} functionality`]
      };

      changes.push(change);
      this.log(job, 'info', `Applied changes to ${file}`, 'integration');
    }

    return changes;
  }

  private async applyGradualChanges(
    feature: PrioritizedFeature,
    strategy: IntegrationStrategy,
    job: IntegrationJob
  ): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    // Apply changes gradually with feature flags
    for (const flagConfig of strategy.featureFlags) {
      await this.createFeatureFlag(flagConfig);
      this.log(job, 'info', `Created feature flag: ${flagConfig.name}`, 'feature-flags');
    }

    // Apply code changes with feature flag protection
    const directChanges = await this.applyDirectChanges(feature, job);
    changes.push(...directChanges);

    return changes;
  }

  private async applyParallelChanges(
    feature: PrioritizedFeature,
    strategy: IntegrationStrategy,
    job: IntegrationJob
  ): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    // Apply changes in parallel branches
    const fileGroups = this.groupFilesByDependency(feature.files);
    
    for (const group of fileGroups) {
      const groupChanges = await Promise.all(
        group.map(file => this.applyFileChange(file, feature, job))
      );
      changes.push(...groupChanges);
    }

    return changes;
  }

  private async updateConfigurations(
    feature: PrioritizedFeature,
    strategy: IntegrationStrategy,
    job: IntegrationJob
  ): Promise<void> {
    this.log(job, 'info', 'Updating configurations', 'configuration');

    // Update package.json if needed
    if (this.requiresPackageUpdate(feature)) {
      await this.updatePackageJson(feature);
    }

    // Update app configuration
    if (this.requiresConfigUpdate(feature)) {
      await this.updateAppConfig(feature);
    }

    // Update environment variables
    if (this.requiresEnvUpdate(feature)) {
      await this.updateEnvironmentConfig(feature);
    }
  }

  private async runTests(
    feature: PrioritizedFeature,
    strategy: IntegrationStrategy,
    job: IntegrationJob
  ): Promise<TestResult[]> {
    this.log(job, 'info', 'Running tests', 'testing');

    const results: TestResult[] = [];

    switch (strategy.testingApproach) {
      case 'unit':
        results.push(await this.runUnitTests(feature));
        break;
      case 'integration':
        results.push(await this.runIntegrationTests(feature));
        break;
      case 'e2e':
        results.push(await this.runE2ETests(feature));
        break;
      case 'all':
        results.push(await this.runUnitTests(feature));
        results.push(await this.runIntegrationTests(feature));
        results.push(await this.runE2ETests(feature));
        break;
    }

    // Check for test failures
    const hasFailures = results.some(result => result.failed > 0);
    if (hasFailures) {
      throw new Error('Tests failed during integration');
    }

    return results;
  }

  private async validatePerformance(
    feature: PrioritizedFeature,
    job: IntegrationJob
  ): Promise<PerformanceImpact> {
    this.log(job, 'info', 'Validating performance impact', 'performance');

    // Simulate performance measurement
    const impact: PerformanceImpact = {
      bundleSize: {
        before: 1000000,
        after: 1050000,
        change: 50000,
        changePercent: 5
      },
      loadTime: {
        before: 2000,
        after: 2100,
        change: 100,
        changePercent: 5
      },
      memoryUsage: {
        before: 50000000,
        after: 52000000,
        change: 2000000,
        changePercent: 4
      },
      renderTime: {
        before: 16,
        after: 17,
        change: 1,
        changePercent: 6.25
      }
    };

    // Check performance thresholds
    if (impact.loadTime.changePercent > 10) {
      throw new Error('Performance regression exceeds threshold');
    }

    return impact;
  }

  private async finalValidation(
    feature: PrioritizedFeature,
    job: IntegrationJob
  ): Promise<ValidationResult[]> {
    this.log(job, 'info', 'Running final validation', 'validation');

    const results: ValidationResult[] = [];

    // Compatibility validation
    results.push(await this.validateCompatibility(feature));

    // Security validation
    results.push(await this.validateSecurity(feature));

    // White-label validation
    results.push(await this.validateWhiteLabel(feature));

    return results;
  }

  private generateRollbackInfo(changes: CodeChange[]): RollbackInfo {
    return {
      available: true,
      commands: changes.map(change => change.rollbackCommand),
      estimatedTime: changes.length * 2, // 2 minutes per change
      dataBackupRequired: changes.some(change => change.type === 'config_updated'),
      validationSteps: changes.flatMap(change => change.validationChecks)
    };
  }

  private log(
    job: IntegrationJob,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    step: string,
    data?: any
  ): void {
    const logEntry: IntegrationLog = {
      timestamp: new Date(),
      level,
      message,
      step,
      data
    };

    job.logs.push(logEntry);
    console.log(`[${job.id}] ${level.toUpperCase()}: ${message}`);
  }

  // Additional helper methods would be implemented here...
  private async checkPrerequisite(prereq: string): Promise<boolean> {
    // Implementation would check if prerequisite is met
    return true;
  }

  private async checkForConflicts(feature: PrioritizedFeature): Promise<string[]> {
    // Implementation would check for integration conflicts
    return [];
  }

  private async validateDependencies(feature: PrioritizedFeature): Promise<string[]> {
    // Implementation would validate dependencies
    return [];
  }

  private async backupFile(file: string): Promise<void> {
    // Implementation would backup the file
  }

  private async createFeatureFlag(config: FeatureFlagConfig): Promise<void> {
    // Implementation would create feature flag
  }

  private groupFilesByDependency(files: string[]): string[][] {
    // Implementation would group files by their dependencies
    return [files];
  }

  private async applyFileChange(
    file: string,
    feature: PrioritizedFeature,
    job: IntegrationJob
  ): Promise<CodeChange> {
    // Implementation would apply changes to a specific file
    return {
      id: `change-${Date.now()}`,
      type: 'file_modified',
      path: file,
      description: `Applied changes to ${file}`,
      linesAdded: 10,
      linesRemoved: 5,
      complexity: 'medium',
      riskLevel: 'low',
      rollbackCommand: `git checkout HEAD -- ${file}`,
      validationChecks: [`Validate ${file}`]
    };
  }

  private requiresPackageUpdate(feature: PrioritizedFeature): boolean {
    return feature.dependencies.length > 0;
  }

  private requiresConfigUpdate(feature: PrioritizedFeature): boolean {
    return feature.category === 'security' || feature.category === 'monitoring';
  }

  private requiresEnvUpdate(feature: PrioritizedFeature): boolean {
    return feature.files.some(file => file.includes('env'));
  }

  private async updatePackageJson(feature: PrioritizedFeature): Promise<void> {
    // Implementation would update package.json
  }

  private async updateAppConfig(feature: PrioritizedFeature): Promise<void> {
    // Implementation would update app configuration
  }

  private async updateEnvironmentConfig(feature: PrioritizedFeature): Promise<void> {
    // Implementation would update environment configuration
  }

  private async runUnitTests(feature: PrioritizedFeature): Promise<TestResult> {
    // Implementation would run unit tests
    return {
      suite: 'Unit Tests',
      type: 'unit',
      passed: 45,
      failed: 0,
      skipped: 2,
      coverage: 92,
      duration: 15000,
      failures: []
    };
  }

  private async runIntegrationTests(feature: PrioritizedFeature): Promise<TestResult> {
    // Implementation would run integration tests
    return {
      suite: 'Integration Tests',
      type: 'integration',
      passed: 23,
      failed: 0,
      skipped: 1,
      coverage: 85,
      duration: 45000,
      failures: []
    };
  }

  private async runE2ETests(feature: PrioritizedFeature): Promise<TestResult> {
    // Implementation would run e2e tests
    return {
      suite: 'E2E Tests',
      type: 'e2e',
      passed: 12,
      failed: 0,
      skipped: 0,
      coverage: 78,
      duration: 120000,
      failures: []
    };
  }

  private async validateCompatibility(feature: PrioritizedFeature): Promise<ValidationResult> {
    return {
      validator: 'Compatibility Validator',
      passed: true,
      score: 95,
      issues: [],
      recommendations: []
    };
  }

  private async validateSecurity(feature: PrioritizedFeature): Promise<ValidationResult> {
    return {
      validator: 'Security Validator',
      passed: true,
      score: 98,
      issues: [],
      recommendations: []
    };
  }

  private async validateWhiteLabel(feature: PrioritizedFeature): Promise<ValidationResult> {
    return {
      validator: 'White-label Validator',
      passed: true,
      score: 90,
      issues: [],
      recommendations: []
    };
  }

  private async getRollbackInfo(featureId: string): Promise<RollbackInfo> {
    // Implementation would get rollback information
    return {
      available: true,
      commands: ['git revert HEAD'],
      estimatedTime: 5,
      dataBackupRequired: false,
      validationSteps: ['Verify rollback']
    };
  }

  private async executeCommand(command: string): Promise<void> {
    // Implementation would execute rollback command
  }

  private async validateRollbackStep(step: string): Promise<void> {
    // Implementation would validate rollback step
  }

  private async collectPerformanceSample(feature: PrioritizedFeature): Promise<PerformanceSample> {
    // Implementation would collect performance sample
    return {
      timestamp: new Date(),
      responseTime: Math.random() * 100 + 50,
      errorRate: Math.random() * 0.01,
      throughput: Math.random() * 100 + 200,
      memoryUsage: Math.random() * 10 + 40,
      cpuUsage: Math.random() * 20 + 10
    };
  }

  private checkPerformanceAlerts(
    sample: PerformanceSample,
    feature: PrioritizedFeature
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    if (sample.responseTime > 200) {
      alerts.push({
        type: 'response_time',
        severity: 'warning',
        message: 'Response time exceeds threshold',
        value: sample.responseTime,
        threshold: 200
      });
    }

    return alerts;
  }

  private updatePerformanceAverages(metrics: PerformanceMetrics): void {
    const samples = metrics.samples;
    if (samples.length === 0) return;

    metrics.averages.responseTime = samples.reduce((sum, s) => sum + s.responseTime, 0) / samples.length;
    metrics.averages.errorRate = samples.reduce((sum, s) => sum + s.errorRate, 0) / samples.length;
    metrics.averages.throughput = samples.reduce((sum, s) => sum + s.throughput, 0) / samples.length;
    metrics.averages.memoryUsage = samples.reduce((sum, s) => sum + s.memoryUsage, 0) / samples.length;
    metrics.averages.cpuUsage = samples.reduce((sum, s) => sum + s.cpuUsage, 0) / samples.length;
  }
}

// Default configuration merger implementation
class DefaultConfigurationMerger implements ConfigurationMerger {
  mergeConfigurations(
    baseConfig: Record<string, any>,
    newConfig: Record<string, any>,
    strategy: 'override' | 'merge' | 'append'
  ): Record<string, any> {
    switch (strategy) {
      case 'override':
        return { ...baseConfig, ...newConfig };
      case 'merge':
        return this.deepMerge(baseConfig, newConfig);
      case 'append':
        return this.appendConfig(baseConfig, newConfig);
      default:
        return baseConfig;
    }
  }

  validateConfiguration(config: Record<string, any>): ValidationResult {
    return {
      validator: 'Configuration Validator',
      passed: true,
      score: 100,
      issues: [],
      recommendations: []
    };
  }

  async backupConfiguration(configPath: string): Promise<string> {
    const backupPath = `${configPath}.backup.${Date.now()}`;
    // Implementation would backup the configuration file
    return backupPath;
  }

  async restoreConfiguration(backupPath: string, configPath: string): Promise<void> {
    // Implementation would restore the configuration file
  }

  private deepMerge(obj1: any, obj2: any): any {
    const result = { ...obj1 };
    
    for (const key in obj2) {
      if (obj2[key] && typeof obj2[key] === 'object' && !Array.isArray(obj2[key])) {
        result[key] = this.deepMerge(result[key] || {}, obj2[key]);
      } else {
        result[key] = obj2[key];
      }
    }
    
    return result;
  }

  private appendConfig(baseConfig: any, newConfig: any): any {
    const result = { ...baseConfig };
    
    for (const key in newConfig) {
      if (Array.isArray(result[key]) && Array.isArray(newConfig[key])) {
        result[key] = [...result[key], ...newConfig[key]];
      } else {
        result[key] = newConfig[key];
      }
    }
    
    return result;
  }
}

// Additional interfaces
export interface PerformanceMetrics {
  feature: string;
  startTime: Date;
  endTime: Date;
  samples: PerformanceSample[];
  averages: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  alerts: PerformanceAlert[];
}

export interface PerformanceSample {
  timestamp: Date;
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface PerformanceAlert {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  value: number;
  threshold: number;
}