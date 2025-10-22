import { 
  ImprovementOpportunity, 
  RiskLevel, 
  ComplexityLevel,
  AnalysisConfiguration 
} from '@/types/analysis.types';

export interface PriorityScore {
  total: number;
  businessValue: number;
  technicalValue: number;
  complexity: number;
  risk: number;
  dependencies: number;
  effort: number;
}

export interface PrioritizedFeature extends ImprovementOpportunity {
  priorityScore: PriorityScore;
  rank: number;
  integrationSequence: number;
  prerequisites: string[];
  blockedBy: string[];
  blocks: string[];
}

export interface PriorityMatrix {
  features: PrioritizedFeature[];
  totalFeatures: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  criticalPath: string[];
  integrationPhases: IntegrationPhase[];
}

export interface IntegrationPhase {
  id: string;
  name: string;
  features: string[];
  estimatedDuration: number;
  dependencies: string[];
  riskLevel: RiskLevel;
  prerequisites: string[];
}

export interface PrioritizationCriteria {
  businessValueWeight: number;
  technicalValueWeight: number;
  complexityWeight: number;
  riskWeight: number;
  dependencyWeight: number;
  effortWeight: number;
  thresholds: {
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

export class IntegrationPriorityMatrixService {
  private defaultCriteria: PrioritizationCriteria = {
    businessValueWeight: 0.3,
    technicalValueWeight: 0.25,
    complexityWeight: -0.2,
    riskWeight: -0.15,
    dependencyWeight: -0.05,
    effortWeight: -0.05,
    thresholds: {
      highPriority: 80,
      mediumPriority: 60,
      lowPriority: 40
    }
  };

  /**
   * Create priority matrix for integration planning
   */
  async createPriorityMatrix(
    improvements: ImprovementOpportunity[],
    criteria?: Partial<PrioritizationCriteria>
  ): Promise<PriorityMatrix> {
    const config = { ...this.defaultCriteria, ...criteria };
    
    // Calculate priority scores for each feature
    const prioritizedFeatures = improvements.map((improvement, index) => {
      const priorityScore = this.calculatePriorityScore(improvement, config);
      return {
        ...improvement,
        priorityScore,
        rank: 0, // Will be set after sorting
        integrationSequence: 0, // Will be set after dependency analysis
        prerequisites: this.extractPrerequisites(improvement),
        blockedBy: [],
        blocks: []
      } as PrioritizedFeature;
    });

    // Sort by priority score
    prioritizedFeatures.sort((a, b) => b.priorityScore.total - a.priorityScore.total);
    
    // Assign ranks
    prioritizedFeatures.forEach((feature, index) => {
      feature.rank = index + 1;
    });

    // Analyze dependencies and create integration sequence
    this.analyzeDependencies(prioritizedFeatures);
    
    // Create integration phases
    const integrationPhases = this.createIntegrationPhases(prioritizedFeatures);

    // Calculate statistics
    const stats = this.calculateStatistics(prioritizedFeatures, config);

    return {
      features: prioritizedFeatures,
      totalFeatures: prioritizedFeatures.length,
      highPriority: stats.highPriority,
      mediumPriority: stats.mediumPriority,
      lowPriority: stats.lowPriority,
      criticalPath: this.identifyCriticalPath(prioritizedFeatures),
      integrationPhases
    };
  }

  /**
   * Calculate priority score for a feature
   */
  private calculatePriorityScore(
    improvement: ImprovementOpportunity,
    criteria: PrioritizationCriteria
  ): PriorityScore {
    const businessValue = this.normalizeBusinessValue(improvement.businessValue);
    const technicalValue = this.normalizeTechnicalValue(improvement.technicalValue);
    const complexity = this.normalizeComplexity(improvement.effort);
    const risk = this.normalizeRisk(improvement.riskLevel);
    const dependencies = this.normalizeDependencies(improvement.dependencies.length);
    const effort = this.normalizeEffort(improvement.estimatedHours);

    const total = Math.max(0, Math.min(100,
      (businessValue * criteria.businessValueWeight) +
      (technicalValue * criteria.technicalValueWeight) +
      (complexity * criteria.complexityWeight) +
      (risk * criteria.riskWeight) +
      (dependencies * criteria.dependencyWeight) +
      (effort * criteria.effortWeight)
    ));

    return {
      total,
      businessValue,
      technicalValue,
      complexity,
      risk,
      dependencies,
      effort
    };
  }

  /**
   * Normalize business value to 0-100 scale
   */
  private normalizeBusinessValue(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  /**
   * Normalize technical value to 0-100 scale
   */
  private normalizeTechnicalValue(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  /**
   * Normalize complexity (effort) to 0-100 scale (inverted - lower complexity = higher score)
   */
  private normalizeComplexity(effort: string): number {
    const complexityMap = {
      'small': 90,
      'medium': 70,
      'large': 40,
      'epic': 20
    };
    return complexityMap[effort as keyof typeof complexityMap] || 50;
  }

  /**
   * Normalize risk level to 0-100 scale (inverted - lower risk = higher score)
   */
  private normalizeRisk(riskLevel: RiskLevel): number {
    const riskMap = {
      'low': 90,
      'medium': 70,
      'high': 40,
      'critical': 20
    };
    return riskMap[riskLevel] || 50;
  }

  /**
   * Normalize dependency count to 0-100 scale (inverted - fewer dependencies = higher score)
   */
  private normalizeDependencies(count: number): number {
    if (count === 0) return 100;
    if (count <= 2) return 80;
    if (count <= 5) return 60;
    if (count <= 10) return 40;
    return 20;
  }

  /**
   * Normalize effort (hours) to 0-100 scale (inverted - less effort = higher score)
   */
  private normalizeEffort(hours: number): number {
    if (hours <= 8) return 90;
    if (hours <= 24) return 80;
    if (hours <= 40) return 70;
    if (hours <= 80) return 50;
    if (hours <= 160) return 30;
    return 10;
  }

  /**
   * Extract prerequisites from improvement dependencies
   */
  private extractPrerequisites(improvement: ImprovementOpportunity): string[] {
    return improvement.dependencies || [];
  }

  /**
   * Analyze dependencies between features
   */
  private analyzeDependencies(features: PrioritizedFeature[]): void {
    const featureMap = new Map(features.map(f => [f.id, f]));

    features.forEach(feature => {
      feature.prerequisites.forEach(prereqId => {
        const prereq = featureMap.get(prereqId);
        if (prereq) {
          feature.blockedBy.push(prereqId);
          prereq.blocks.push(feature.id);
        }
      });
    });

    // Calculate integration sequence based on dependencies
    this.calculateIntegrationSequence(features);
  }

  /**
   * Calculate integration sequence using topological sort
   */
  private calculateIntegrationSequence(features: PrioritizedFeature[]): void {
    const visited = new Set<string>();
    const sequence: string[] = [];
    
    const visit = (featureId: string) => {
      if (visited.has(featureId)) return;
      
      const feature = features.find(f => f.id === featureId);
      if (!feature) return;
      
      // Visit all prerequisites first
      feature.blockedBy.forEach(prereqId => {
        if (!visited.has(prereqId)) {
          visit(prereqId);
        }
      });
      
      visited.add(featureId);
      sequence.push(featureId);
    };

    // Start with features that have no dependencies, ordered by priority
    const noDependencies = features
      .filter(f => f.blockedBy.length === 0)
      .sort((a, b) => b.priorityScore.total - a.priorityScore.total);

    noDependencies.forEach(feature => visit(feature.id));

    // Visit remaining features
    features.forEach(feature => {
      if (!visited.has(feature.id)) {
        visit(feature.id);
      }
    });

    // Assign sequence numbers
    sequence.forEach((featureId, index) => {
      const feature = features.find(f => f.id === featureId);
      if (feature) {
        feature.integrationSequence = index + 1;
      }
    });
  }

  /**
   * Create integration phases based on dependencies and complexity
   */
  private createIntegrationPhases(features: PrioritizedFeature[]): IntegrationPhase[] {
    const phases: IntegrationPhase[] = [];
    const processed = new Set<string>();
    let phaseNumber = 1;

    while (processed.size < features.length) {
      const phaseFeatures = features.filter(feature => 
        !processed.has(feature.id) && 
        feature.blockedBy.every(prereq => processed.has(prereq))
      );

      if (phaseFeatures.length === 0) {
        // Handle circular dependencies by taking the highest priority remaining feature
        const remaining = features.filter(f => !processed.has(f.id));
        if (remaining.length > 0) {
          phaseFeatures.push(remaining[0]);
        }
      }

      if (phaseFeatures.length > 0) {
        const phase: IntegrationPhase = {
          id: `phase-${phaseNumber}`,
          name: `Integration Phase ${phaseNumber}`,
          features: phaseFeatures.map(f => f.id),
          estimatedDuration: Math.max(...phaseFeatures.map(f => f.estimatedHours)),
          dependencies: this.getPhasePrerequisites(phaseFeatures, processed),
          riskLevel: this.calculatePhaseRisk(phaseFeatures),
          prerequisites: []
        };

        phases.push(phase);
        phaseFeatures.forEach(f => processed.add(f.id));
        phaseNumber++;
      }
    }

    return phases;
  }

  /**
   * Get prerequisites for a phase
   */
  private getPhasePrerequisites(phaseFeatures: PrioritizedFeature[], processed: Set<string>): string[] {
    const prerequisites = new Set<string>();
    
    phaseFeatures.forEach(feature => {
      feature.blockedBy.forEach(prereq => {
        if (processed.has(prereq)) {
          prerequisites.add(prereq);
        }
      });
    });

    return Array.from(prerequisites);
  }

  /**
   * Calculate risk level for a phase
   */
  private calculatePhaseRisk(features: PrioritizedFeature[]): RiskLevel {
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

  /**
   * Calculate statistics for the priority matrix
   */
  private calculateStatistics(
    features: PrioritizedFeature[], 
    criteria: PrioritizationCriteria
  ): { highPriority: number; mediumPriority: number; lowPriority: number } {
    let highPriority = 0;
    let mediumPriority = 0;
    let lowPriority = 0;

    features.forEach(feature => {
      if (feature.priorityScore.total >= criteria.thresholds.highPriority) {
        highPriority++;
      } else if (feature.priorityScore.total >= criteria.thresholds.mediumPriority) {
        mediumPriority++;
      } else {
        lowPriority++;
      }
    });

    return { highPriority, mediumPriority, lowPriority };
  }

  /**
   * Identify critical path through the integration
   */
  private identifyCriticalPath(features: PrioritizedFeature[]): string[] {
    // Find the longest path through dependencies
    const paths: string[][] = [];
    
    const findPaths = (featureId: string, currentPath: string[]): void => {
      const feature = features.find(f => f.id === featureId);
      if (!feature) return;

      const newPath = [...currentPath, featureId];
      
      if (feature.blocks.length === 0) {
        paths.push(newPath);
      } else {
        feature.blocks.forEach(blockedId => {
          findPaths(blockedId, newPath);
        });
      }
    };

    // Start from features with no prerequisites
    features
      .filter(f => f.blockedBy.length === 0)
      .forEach(f => findPaths(f.id, []));

    // Return the longest path (critical path)
    return paths.reduce((longest, current) => 
      current.length > longest.length ? current : longest, 
      []
    );
  }

  /**
   * Update priority scores based on new criteria
   */
  async updatePriorityScores(
    matrix: PriorityMatrix,
    newCriteria: Partial<PrioritizationCriteria>
  ): Promise<PriorityMatrix> {
    const criteria = { ...this.defaultCriteria, ...newCriteria };
    
    // Recalculate scores
    matrix.features.forEach(feature => {
      feature.priorityScore = this.calculatePriorityScore(feature, criteria);
    });

    // Re-sort and update ranks
    matrix.features.sort((a, b) => b.priorityScore.total - a.priorityScore.total);
    matrix.features.forEach((feature, index) => {
      feature.rank = index + 1;
    });

    // Recalculate statistics
    const stats = this.calculateStatistics(matrix.features, criteria);
    matrix.highPriority = stats.highPriority;
    matrix.mediumPriority = stats.mediumPriority;
    matrix.lowPriority = stats.lowPriority;

    return matrix;
  }

  /**
   * Export priority matrix to different formats
   */
  async exportMatrix(matrix: PriorityMatrix, format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(matrix, null, 2);
    }

    if (format === 'csv') {
      const headers = [
        'Rank', 'Feature ID', 'Title', 'Category', 'Priority Score', 
        'Business Value', 'Technical Value', 'Complexity', 'Risk Level',
        'Estimated Hours', 'Dependencies', 'Integration Sequence'
      ];

      const rows = matrix.features.map(feature => [
        feature.rank,
        feature.id,
        feature.title,
        feature.category,
        feature.priorityScore.total.toFixed(2),
        feature.priorityScore.businessValue.toFixed(2),
        feature.priorityScore.technicalValue.toFixed(2),
        feature.priorityScore.complexity.toFixed(2),
        feature.riskLevel,
        feature.estimatedHours,
        feature.dependencies.join(';'),
        feature.integrationSequence
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }
}