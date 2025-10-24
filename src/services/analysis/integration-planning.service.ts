import { 
  ImprovementOpportunity, 
  RiskLevel,
  ImplementationStep,
  TestingPlan
} from '@/types/analysis.types';
import { PrioritizedFeature, IntegrationPhase } from './integration-priority-matrix.service';

export interface IntegrationPlan {
  id: string;
  name: string;
  description: string;
  phases: IntegrationPhase[];
  totalEstimatedHours: number;
  totalFeatures: number;
  overallRiskLevel: RiskLevel;
  startDate?: Date;
  estimatedEndDate?: Date;
  prerequisites: string[];
  deliverables: string[];
  successCriteria: string[];
  rollbackStrategy: RollbackStrategy;
  testingStrategy: IntegrationTestingStrategy;
  riskMitigation: RiskMitigationPlan;
}

export interface MigrationStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: MigrationStepType;
  estimatedHours: number;
  prerequisites: string[];
  deliverables: string[];
  rollbackInstructions: string;
  validationCriteria: string[];
  automatable: boolean;
  riskLevel: RiskLevel;
  affectedSystems: string[];
  backupRequired: boolean;
  testingRequired: boolean;
}

export type MigrationStepType = 
  | 'code-integration'
  | 'database-migration'
  | 'configuration-update'
  | 'dependency-update'
  | 'api-integration'
  | 'ui-integration'
  | 'testing'
  | 'deployment'
  | 'validation'
  | 'rollback-preparation';

export interface RollbackStrategy {
  id: string;
  description: string;
  steps: RollbackStep[];
  triggers: RollbackTrigger[];
  estimatedTime: number;
  dataBackupRequired: boolean;
  automatable: boolean;
  testingRequired: boolean;
}

export interface RollbackStep {
  order: number;
  title: string;
  description: string;
  commands: string[];
  validationChecks: string[];
  estimatedMinutes: number;
  critical: boolean;
}

export interface RollbackTrigger {
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  automatic: boolean;
  description: string;
}

export interface IntegrationTestingStrategy {
  phases: TestingPhase[];
  automationLevel: number;
  coverageTargets: CoverageTargets;
  performanceThresholds: PerformanceThresholds;
  securityValidation: SecurityValidation;
}

export interface TestingPhase {
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'compatibility';
  estimatedHours: number;
  automatable: boolean;
  prerequisites: string[];
  deliverables: string[];
  successCriteria: string[];
}

export interface CoverageTargets {
  unit: number;
  integration: number;
  e2e: number;
  overall: number;
}

export interface PerformanceThresholds {
  maxLoadTime: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  minThroughput: number;
}

export interface SecurityValidation {
  vulnerabilityScanning: boolean;
  penetrationTesting: boolean;
  complianceChecks: string[];
  securityReview: boolean;
}

export interface RiskMitigationPlan {
  risks: IdentifiedRisk[];
  mitigationStrategies: MitigationStrategy[];
  contingencyPlans: ContingencyPlan[];
  monitoringPlan: MonitoringPlan;
}

export interface IdentifiedRisk {
  id: string;
  description: string;
  category: RiskCategory;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: RiskLevel;
  affectedComponents: string[];
  triggers: string[];
}

export type RiskCategory = 
  | 'technical'
  | 'integration'
  | 'performance'
  | 'security'
  | 'compatibility'
  | 'timeline'
  | 'resource'
  | 'business';

export interface MitigationStrategy {
  riskId: string;
  strategy: string;
  actions: string[];
  responsible: string;
  timeline: string;
  cost: 'low' | 'medium' | 'high';
  effectiveness: 'low' | 'medium' | 'high';
}

export interface ContingencyPlan {
  riskId: string;
  plan: string;
  triggers: string[];
  actions: string[];
  resources: string[];
  timeline: string;
}

export interface MonitoringPlan {
  metrics: MonitoringMetric[];
  alerts: AlertConfiguration[];
  dashboards: string[];
  reportingSchedule: string;
}

export interface MonitoringMetric {
  name: string;
  description: string;
  type: 'performance' | 'error' | 'usage' | 'security';
  threshold: number;
  unit: string;
  frequency: string;
}

export interface AlertConfiguration {
  metric: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recipients: string[];
  escalation: boolean;
}

export interface EffortEstimate {
  totalHours: number;
  breakdown: EffortBreakdown;
  confidence: 'low' | 'medium' | 'high';
  assumptions: string[];
  risks: string[];
  bufferPercentage: number;
}

export interface EffortBreakdown {
  analysis: number;
  development: number;
  testing: number;
  integration: number;
  documentation: number;
  deployment: number;
  validation: number;
}

export class IntegrationPlanningService {
  /**
   * Create comprehensive integration plan
   */
  async createIntegrationPlan(
    features: PrioritizedFeature[],
    phases: IntegrationPhase[],
    options?: IntegrationPlanOptions
  ): Promise<IntegrationPlan> {
    const planId = `integration-plan-${Date.now()}`;
    
    // Calculate total estimates
    const totalEstimatedHours = features.reduce((sum, f) => sum + f.estimatedHours, 0);
    const overallRiskLevel = this.calculateOverallRisk(features);
    
    // Generate migration steps
    const migrationSteps = await this.generateMigrationSteps(features, phases);
    
    // Create rollback strategy
    const rollbackStrategy = this.createRollbackStrategy(features, migrationSteps);
    
    // Create testing strategy
    const testingStrategy = this.createTestingStrategy(features, phases);
    
    // Create risk mitigation plan
    const riskMitigation = this.createRiskMitigationPlan(features, phases);
    
    // Calculate timeline
    const { startDate, estimatedEndDate } = this.calculateTimeline(
      totalEstimatedHours, 
      options?.startDate
    );

    return {
      id: planId,
      name: options?.name || `Integration Plan ${new Date().toISOString().split('T')[0]}`,
      description: options?.description || 'Automated integration plan for base project improvements',
      phases,
      totalEstimatedHours,
      totalFeatures: features.length,
      overallRiskLevel,
      startDate,
      estimatedEndDate,
      prerequisites: this.extractGlobalPrerequisites(features),
      deliverables: this.generateDeliverables(features, phases),
      successCriteria: this.generateSuccessCriteria(features),
      rollbackStrategy,
      testingStrategy,
      riskMitigation
    };
  }

  /**
   * Generate detailed migration steps
   */
  async generateMigrationSteps(
    features: PrioritizedFeature[],
    phases: IntegrationPhase[]
  ): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = [];
    let stepOrder = 1;

    for (const phase of phases) {
      const phaseFeatures = features.filter(f => phase.features.includes(f.id));
      
      // Add preparation steps
      steps.push({
        id: `prep-${phase.id}`,
        order: stepOrder++,
        title: `Prepare ${phase.name}`,
        description: `Prepare environment and dependencies for ${phase.name}`,
        type: 'rollback-preparation',
        estimatedHours: 2,
        prerequisites: phase.dependencies,
        deliverables: ['Environment backup', 'Dependency verification'],
        rollbackInstructions: 'Restore from backup if preparation fails',
        validationCriteria: ['All dependencies available', 'Backup completed'],
        automatable: true,
        riskLevel: 'low',
        affectedSystems: ['Development environment'],
        backupRequired: true,
        testingRequired: false
      });

      // Add feature-specific steps
      for (const feature of phaseFeatures) {
        steps.push(...this.generateFeatureMigrationSteps(feature, stepOrder));
        stepOrder += this.getFeatureStepCount(feature);
      }

      // Add validation step
      steps.push({
        id: `validate-${phase.id}`,
        order: stepOrder++,
        title: `Validate ${phase.name}`,
        description: `Validate successful integration of ${phase.name}`,
        type: 'validation',
        estimatedHours: Math.ceil(phase.estimatedDuration * 0.2),
        prerequisites: phase.features,
        deliverables: ['Validation report', 'Test results'],
        rollbackInstructions: 'Execute phase rollback if validation fails',
        validationCriteria: this.generatePhaseValidationCriteria(phaseFeatures),
        automatable: true,
        riskLevel: phase.riskLevel,
        affectedSystems: this.getAffectedSystems(phaseFeatures),
        backupRequired: false,
        testingRequired: true
      });
    }

    return steps;
  }

  /**
   * Generate migration steps for a specific feature
   */
  private generateFeatureMigrationSteps(
    feature: PrioritizedFeature, 
    startOrder: number
  ): MigrationStep[] {
    const steps: MigrationStep[] = [];
    let order = startOrder;

    // Code integration step
    steps.push({
      id: `code-${feature.id}`,
      order: order++,
      title: `Integrate ${feature.title} Code`,
      description: `Integrate code changes for ${feature.title}`,
      type: 'code-integration',
      estimatedHours: Math.ceil(feature.estimatedHours * 0.6),
      prerequisites: feature.prerequisites,
      deliverables: ['Integrated code', 'Updated documentation'],
      rollbackInstructions: `Revert code changes for ${feature.title}`,
      validationCriteria: ['Code compiles successfully', 'No breaking changes'],
      automatable: false,
      riskLevel: feature.riskLevel,
      affectedSystems: feature.files,
      backupRequired: true,
      testingRequired: true
    });

    // Configuration update step (if needed)
    if (this.requiresConfiguration(feature)) {
      steps.push({
        id: `config-${feature.id}`,
        order: order++,
        title: `Update Configuration for ${feature.title}`,
        description: `Update configuration settings for ${feature.title}`,
        type: 'configuration-update',
        estimatedHours: Math.ceil(feature.estimatedHours * 0.2),
        prerequisites: [`code-${feature.id}`],
        deliverables: ['Updated configuration', 'Configuration backup'],
        rollbackInstructions: `Restore configuration backup for ${feature.title}`,
        validationCriteria: ['Configuration valid', 'No conflicts'],
        automatable: true,
        riskLevel: 'medium',
        affectedSystems: ['Configuration files'],
        backupRequired: true,
        testingRequired: true
      });
    }

    // Testing step
    steps.push({
      id: `test-${feature.id}`,
      order: order++,
      title: `Test ${feature.title}`,
      description: `Execute tests for ${feature.title}`,
      type: 'testing',
      estimatedHours: Math.ceil(feature.estimatedHours * 0.2),
      prerequisites: [`code-${feature.id}`],
      deliverables: ['Test results', 'Coverage report'],
      rollbackInstructions: `Rollback ${feature.title} if tests fail`,
      validationCriteria: ['All tests pass', 'Coverage meets threshold'],
      automatable: true,
      riskLevel: 'low',
      affectedSystems: ['Test environment'],
      backupRequired: false,
      testingRequired: false
    });

    return steps;
  }

  /**
   * Create rollback strategy
   */
  private createRollbackStrategy(
    features: PrioritizedFeature[],
    migrationSteps: MigrationStep[]
  ): RollbackStrategy {
    const rollbackSteps: RollbackStep[] = [];
    let order = 1;

    // Create rollback steps in reverse order
    const reversedSteps = [...migrationSteps].reverse();
    
    for (const step of reversedSteps) {
      if (step.type !== 'validation' && step.type !== 'testing') {
        rollbackSteps.push({
          order: order++,
          title: `Rollback ${step.title}`,
          description: step.rollbackInstructions,
          commands: this.generateRollbackCommands(step),
          validationChecks: [`Verify ${step.title} rollback`],
          estimatedMinutes: Math.ceil(step.estimatedHours * 30),
          critical: step.riskLevel === 'high' || step.riskLevel === 'critical'
        });
      }
    }

    return {
      id: `rollback-${Date.now()}`,
      description: 'Comprehensive rollback strategy for integration plan',
      steps: rollbackSteps,
      triggers: this.generateRollbackTriggers(),
      estimatedTime: rollbackSteps.reduce((sum, step) => sum + step.estimatedMinutes, 0),
      dataBackupRequired: true,
      automatable: true,
      testingRequired: true
    };
  }

  /**
   * Create testing strategy
   */
  private createTestingStrategy(
    features: PrioritizedFeature[],
    phases: IntegrationPhase[]
  ): IntegrationTestingStrategy {
    const testingPhases: TestingPhase[] = [
      {
        name: 'Unit Testing',
        type: 'unit',
        estimatedHours: Math.ceil(features.length * 2),
        automatable: true,
        prerequisites: ['Code integration complete'],
        deliverables: ['Unit test results', 'Coverage report'],
        successCriteria: ['90% test coverage', 'All tests pass']
      },
      {
        name: 'Integration Testing',
        type: 'integration',
        estimatedHours: Math.ceil(phases.length * 4),
        automatable: true,
        prerequisites: ['Unit testing complete'],
        deliverables: ['Integration test results', 'API validation'],
        successCriteria: ['All integrations work', 'No breaking changes']
      },
      {
        name: 'End-to-End Testing',
        type: 'e2e',
        estimatedHours: Math.ceil(features.length * 1.5),
        automatable: true,
        prerequisites: ['Integration testing complete'],
        deliverables: ['E2E test results', 'User flow validation'],
        successCriteria: ['All user flows work', 'Performance acceptable']
      },
      {
        name: 'Performance Testing',
        type: 'performance',
        estimatedHours: 8,
        automatable: true,
        prerequisites: ['E2E testing complete'],
        deliverables: ['Performance report', 'Benchmark results'],
        successCriteria: ['No performance regression', 'Meets thresholds']
      },
      {
        name: 'Security Testing',
        type: 'security',
        estimatedHours: 6,
        automatable: false,
        prerequisites: ['Performance testing complete'],
        deliverables: ['Security audit report', 'Vulnerability scan'],
        successCriteria: ['No critical vulnerabilities', 'Security review passed']
      }
    ];

    return {
      phases: testingPhases,
      automationLevel: 85,
      coverageTargets: {
        unit: 90,
        integration: 80,
        e2e: 70,
        overall: 85
      },
      performanceThresholds: {
        maxLoadTime: 3000,
        maxMemoryUsage: 512,
        maxCpuUsage: 80,
        minThroughput: 100
      },
      securityValidation: {
        vulnerabilityScanning: true,
        penetrationTesting: false,
        complianceChecks: ['OWASP Top 10', 'Security headers'],
        securityReview: true
      }
    };
  }

  /**
   * Create risk mitigation plan
   */
  private createRiskMitigationPlan(
    features: PrioritizedFeature[],
    phases: IntegrationPhase[]
  ): RiskMitigationPlan {
    const risks = this.identifyRisks(features, phases);
    const mitigationStrategies = this.createMitigationStrategies(risks);
    const contingencyPlans = this.createContingencyPlans(risks);
    const monitoringPlan = this.createMonitoringPlan(features);

    return {
      risks,
      mitigationStrategies,
      contingencyPlans,
      monitoringPlan
    };
  }

  /**
   * Calculate effort estimate
   */
  async estimateImplementationEffort(
    features: PrioritizedFeature[],
    plan: IntegrationPlan
  ): Promise<EffortEstimate> {
    const baseHours = features.reduce((sum, f) => sum + f.estimatedHours, 0);
    
    const breakdown: EffortBreakdown = {
      analysis: Math.ceil(baseHours * 0.1),
      development: Math.ceil(baseHours * 0.6),
      testing: Math.ceil(baseHours * 0.15),
      integration: Math.ceil(baseHours * 0.08),
      documentation: Math.ceil(baseHours * 0.04),
      deployment: Math.ceil(baseHours * 0.02),
      validation: Math.ceil(baseHours * 0.01)
    };

    const totalHours = Object.values(breakdown).reduce((sum, hours) => sum + hours, 0);
    const bufferPercentage = this.calculateBuffer(plan.overallRiskLevel);
    
    return {
      totalHours: Math.ceil(totalHours * (1 + bufferPercentage / 100)),
      breakdown,
      confidence: this.calculateConfidence(features, plan),
      assumptions: this.generateAssumptions(features),
      risks: this.generateRiskFactors(features),
      bufferPercentage
    };
  }

  // Helper methods
  private calculateOverallRisk(features: PrioritizedFeature[]): RiskLevel {
    const riskScores = features.map(f => {
      const riskMap = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
      return riskMap[f.riskLevel] || 2;
    });

    const avgRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    if (avgRisk >= 3.5) return 'critical';
    if (avgRisk >= 2.5) return 'high';
    if (avgRisk >= 1.5) return 'medium';
    return 'low';
  }

  private calculateTimeline(totalHours: number, startDate?: Date): { startDate: Date; estimatedEndDate: Date } {
    const start = startDate || new Date();
    const workingHoursPerDay = 6; // Assuming 6 productive hours per day
    const workingDays = Math.ceil(totalHours / workingHoursPerDay);
    
    const end = new Date(start);
    end.setDate(end.getDate() + workingDays);
    
    return { startDate: start, estimatedEndDate: end };
  }

  private extractGlobalPrerequisites(features: PrioritizedFeature[]): string[] {
    const prerequisites = new Set<string>();
    features.forEach(f => {
      f.prerequisites.forEach(prereq => prerequisites.add(prereq));
    });
    return Array.from(prerequisites);
  }

  private generateDeliverables(features: PrioritizedFeature[], phases: IntegrationPhase[]): string[] {
    return [
      'Integrated codebase with all improvements',
      'Updated documentation',
      'Test suite with comprehensive coverage',
      'Performance benchmarks',
      'Security audit report',
      'Deployment scripts',
      'Rollback procedures',
      'Integration monitoring dashboard'
    ];
  }

  private generateSuccessCriteria(features: PrioritizedFeature[]): string[] {
    return [
      'All features successfully integrated without breaking existing functionality',
      'Test coverage maintains or exceeds 85%',
      'No performance regression beyond 5%',
      'No critical security vulnerabilities introduced',
      'White-label compatibility maintained',
      'All rollback procedures tested and verified',
      'Documentation updated and reviewed'
    ];
  }

  private requiresConfiguration(feature: PrioritizedFeature): boolean {
    return feature.category === 'monitoring' || 
           feature.category === 'compatibility' ||
           feature.files.some(file => file.includes('config'));
  }

  private getFeatureStepCount(feature: PrioritizedFeature): number {
    let count = 2; // Code integration + testing
    if (this.requiresConfiguration(feature)) count++;
    return count;
  }

  private generatePhaseValidationCriteria(features: PrioritizedFeature[]): string[] {
    return [
      'All phase features integrated successfully',
      'No breaking changes introduced',
      'Performance within acceptable limits',
      'Security validation passed',
      'Compatibility tests passed'
    ];
  }

  private getAffectedSystems(features: PrioritizedFeature[]): string[] {
    const systems = new Set<string>();
    features.forEach(f => {
      f.files.forEach(file => {
        if (file.includes('api/')) systems.add('API');
        if (file.includes('components/')) systems.add('UI');
        if (file.includes('services/')) systems.add('Services');
        if (file.includes('database/')) systems.add('Database');
      });
    });
    return Array.from(systems);
  }

  private generateRollbackCommands(step: MigrationStep): string[] {
    const commands: string[] = [];
    
    switch (step.type) {
      case 'code-integration':
        commands.push('git revert <commit-hash>');
        commands.push('npm run build');
        break;
      case 'configuration-update':
        commands.push('cp backup/config.json config.json');
        commands.push('systemctl restart service');
        break;
      case 'database-migration':
        commands.push('npm run migrate:rollback');
        break;
      default:
        commands.push('# Manual rollback required');
    }
    
    return commands;
  }

  private generateRollbackTriggers(): RollbackTrigger[] {
    return [
      {
        condition: 'Critical test failures > 5%',
        severity: 'high',
        automatic: true,
        description: 'Automatic rollback when critical tests fail'
      },
      {
        condition: 'Performance degradation > 20%',
        severity: 'high',
        automatic: true,
        description: 'Automatic rollback on significant performance issues'
      },
      {
        condition: 'Security vulnerabilities detected',
        severity: 'critical',
        automatic: false,
        description: 'Manual review required for security issues'
      }
    ];
  }

  private identifyRisks(features: PrioritizedFeature[], phases: IntegrationPhase[]): IdentifiedRisk[] {
    const risks: IdentifiedRisk[] = [];
    
    // Technical risks
    const highComplexityFeatures = features.filter(f => f.effort === 'large' || f.effort === 'epic');
    if (highComplexityFeatures.length > 0) {
      risks.push({
        id: 'tech-complexity',
        description: 'High complexity features may cause integration issues',
        category: 'technical',
        probability: 'medium',
        impact: 'high',
        riskLevel: 'high',
        affectedComponents: highComplexityFeatures.map(f => f.id),
        triggers: ['Complex code changes', 'Multiple dependencies']
      });
    }

    // Integration risks
    const dependentFeatures = features.filter(f => f.dependencies.length > 3);
    if (dependentFeatures.length > 0) {
      risks.push({
        id: 'integration-dependencies',
        description: 'Features with many dependencies may cause cascade failures',
        category: 'integration',
        probability: 'medium',
        impact: 'medium',
        riskLevel: 'medium',
        affectedComponents: dependentFeatures.map(f => f.id),
        triggers: ['Dependency conflicts', 'Version mismatches']
      });
    }

    return risks;
  }

  private createMitigationStrategies(risks: IdentifiedRisk[]): MitigationStrategy[] {
    return risks.map(risk => ({
      riskId: risk.id,
      strategy: `Mitigate ${risk.category} risk`,
      actions: this.getMitigationActions(risk),
      responsible: 'Development Team',
      timeline: 'Before implementation',
      cost: 'medium',
      effectiveness: 'high'
    }));
  }

  private getMitigationActions(risk: IdentifiedRisk): string[] {
    switch (risk.category) {
      case 'technical':
        return ['Code review', 'Prototype testing', 'Incremental implementation'];
      case 'integration':
        return ['Dependency analysis', 'Staged rollout', 'Compatibility testing'];
      case 'performance':
        return ['Performance testing', 'Load testing', 'Monitoring setup'];
      default:
        return ['Risk assessment', 'Monitoring', 'Contingency planning'];
    }
  }

  private createContingencyPlans(risks: IdentifiedRisk[]): ContingencyPlan[] {
    return risks.map(risk => ({
      riskId: risk.id,
      plan: `Contingency for ${risk.description}`,
      triggers: risk.triggers,
      actions: ['Assess impact', 'Execute rollback if needed', 'Implement alternative'],
      resources: ['Development team', 'Testing environment'],
      timeline: 'Immediate'
    }));
  }

  private createMonitoringPlan(features: PrioritizedFeature[]): MonitoringPlan {
    return {
      metrics: [
        {
          name: 'Integration Success Rate',
          description: 'Percentage of successful feature integrations',
          type: 'usage',
          threshold: 95,
          unit: 'percentage',
          frequency: 'daily'
        },
        {
          name: 'Performance Impact',
          description: 'Performance change after integration',
          type: 'performance',
          threshold: 5,
          unit: 'percentage',
          frequency: 'continuous'
        }
      ],
      alerts: [
        {
          metric: 'Integration Success Rate',
          condition: 'below',
          threshold: 90,
          severity: 'warning',
          recipients: ['team@company.com'],
          escalation: true
        }
      ],
      dashboards: ['Integration Status', 'Performance Metrics'],
      reportingSchedule: 'Weekly'
    };
  }

  private calculateBuffer(riskLevel: RiskLevel): number {
    const bufferMap = { 'low': 10, 'medium': 20, 'high': 30, 'critical': 50 };
    return bufferMap[riskLevel] || 20;
  }

  private calculateConfidence(features: PrioritizedFeature[], plan: IntegrationPlan): 'low' | 'medium' | 'high' {
    const complexFeatures = features.filter(f => f.effort === 'large' || f.effort === 'epic').length;
    const totalFeatures = features.length;
    const complexityRatio = complexFeatures / totalFeatures;
    
    if (complexityRatio > 0.5 || plan.overallRiskLevel === 'critical') return 'low';
    if (complexityRatio > 0.3 || plan.overallRiskLevel === 'high') return 'medium';
    return 'high';
  }

  private generateAssumptions(features: PrioritizedFeature[]): string[] {
    return [
      'Development team has required expertise',
      'Testing environment is available',
      'No major external dependencies change',
      'Rollback procedures are tested',
      'Adequate time for testing and validation'
    ];
  }

  private generateRiskFactors(features: PrioritizedFeature[]): string[] {
    return [
      'Complexity of feature interactions',
      'External dependency changes',
      'Resource availability',
      'Timeline constraints',
      'Integration complexity'
    ];
  }
}

export interface IntegrationPlanOptions {
  name?: string;
  description?: string;
  startDate?: Date;
  teamSize?: number;
  workingHoursPerDay?: number;
}