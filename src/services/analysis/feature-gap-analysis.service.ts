/**
 * Feature Gap Analysis Service
 * Compares features across projects and identifies gaps and opportunities
 */

import { Feature, FeatureIdentificationService } from './feature-identification.service';

export interface FeatureGap {
  feature: Feature;
  sourceProject: 'essencia' | 'fnp-ranking';
  integrationComplexity: 'low' | 'medium' | 'high';
  businessValue: 'low' | 'medium' | 'high';
  technicalRisk: 'low' | 'medium' | 'high';
  conflictsWith: string[];
  prerequisites: string[];
  estimatedEffort: number; // hours
  priority: number; // 1-10 scale
}

export interface FeatureComparison {
  essenciaFeatures: Feature[];
  fnpFeatures: Feature[];
  currentFeatures: Feature[];
  commonFeatures: FeatureMatch[];
  uniqueToEssencia: Feature[];
  uniqueToFnp: Feature[];
  uniqueToCurrent: Feature[];
  gaps: FeatureGap[];
}

export interface FeatureMatch {
  essenciaFeature?: Feature;
  fnpFeature?: Feature;
  currentFeature?: Feature;
  similarity: number; // 0-1 scale
  differences: string[];
}

export interface PrioritizedFeature extends FeatureGap {
  implementationOrder: number;
  dependencies: string[];
  blockers: string[];
}

export interface GapAnalysisResult {
  comparison: FeatureComparison;
  prioritizedGaps: PrioritizedFeature[];
  recommendations: AnalysisRecommendation[];
  riskAssessment: RiskAssessment;
  implementationRoadmap: ImplementationPhase[];
}

export interface AnalysisRecommendation {
  type: 'integrate' | 'skip' | 'modify' | 'research';
  feature: Feature;
  reason: string;
  alternatives?: string[];
  conditions?: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
}

export interface RiskFactor {
  type: 'technical' | 'business' | 'security' | 'performance';
  description: string;
  impact: 'low' | 'medium' | 'high';
  probability: 'low' | 'medium' | 'high';
  affectedFeatures: string[];
}

export interface MitigationStrategy {
  riskType: string;
  strategy: string;
  effort: 'low' | 'medium' | 'high';
  effectiveness: 'low' | 'medium' | 'high';
}

export interface ImplementationPhase {
  phase: number;
  name: string;
  features: PrioritizedFeature[];
  estimatedDuration: number; // days
  prerequisites: string[];
  deliverables: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class FeatureGapAnalysisService {
  constructor(
    private featureIdentificationService: FeatureIdentificationService
  ) {}

  /**
   * Perform comprehensive gap analysis between projects
   */
  async performGapAnalysis(
    essenciaPath: string,
    fnpPath: string,
    currentPath: string
  ): Promise<GapAnalysisResult> {
    try {
      // Identify features from all projects
      const essenciaResult = await this.featureIdentificationService.identifyFeatures(essenciaPath, 'essencia');
      const fnpResult = await this.featureIdentificationService.identifyFeatures(fnpPath, 'fnp-ranking');
      const currentResult = await this.featureIdentificationService.identifyFeatures(currentPath, 'current');

      // Compare features across projects
      const comparison = await this.compareFeatures(
        essenciaResult.features,
        fnpResult.features,
        currentResult.features
      );

      // Identify and analyze gaps
      const gaps = await this.identifyFeatureGaps(comparison);

      // Prioritize features for integration
      const prioritizedGaps = await this.prioritizeFeatures(gaps);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(prioritizedGaps);

      // Assess risks
      const riskAssessment = await this.assessRisks(prioritizedGaps);

      // Create implementation roadmap
      const implementationRoadmap = await this.createImplementationRoadmap(prioritizedGaps);

      return {
        comparison,
        prioritizedGaps,
        recommendations,
        riskAssessment,
        implementationRoadmap
      };
    } catch (error) {
      console.error('Error performing gap analysis:', error);
      throw new Error(`Failed to perform gap analysis: ${error.message}`);
    }
  }

  /**
   * Compare features across all three projects
   */
  private async compareFeatures(
    essenciaFeatures: Feature[],
    fnpFeatures: Feature[],
    currentFeatures: Feature[]
  ): Promise<FeatureComparison> {
    const commonFeatures: FeatureMatch[] = [];
    const uniqueToEssencia: Feature[] = [];
    const uniqueToFnp: Feature[] = [];
    const uniqueToCurrent: Feature[] = [];

    // Find matches and unique features
    for (const essenciaFeature of essenciaFeatures) {
      const fnpMatch = this.findSimilarFeature(essenciaFeature, fnpFeatures);
      const currentMatch = this.findSimilarFeature(essenciaFeature, currentFeatures);

      if (fnpMatch || currentMatch) {
        commonFeatures.push({
          essenciaFeature,
          fnpFeature: fnpMatch?.feature,
          currentFeature: currentMatch?.feature,
          similarity: Math.max(fnpMatch?.similarity || 0, currentMatch?.similarity || 0),
          differences: this.identifyDifferences(essenciaFeature, fnpMatch?.feature, currentMatch?.feature)
        });
      } else {
        uniqueToEssencia.push(essenciaFeature);
      }
    }

    // Find FNP-unique features
    for (const fnpFeature of fnpFeatures) {
      const essenciaMatch = this.findSimilarFeature(fnpFeature, essenciaFeatures);
      const currentMatch = this.findSimilarFeature(fnpFeature, currentFeatures);

      if (!essenciaMatch && !currentMatch) {
        uniqueToFnp.push(fnpFeature);
      }
    }

    // Find current-unique features
    for (const currentFeature of currentFeatures) {
      const essenciaMatch = this.findSimilarFeature(currentFeature, essenciaFeatures);
      const fnpMatch = this.findSimilarFeature(currentFeature, fnpFeatures);

      if (!essenciaMatch && !fnpMatch) {
        uniqueToCurrent.push(currentFeature);
      }
    }

    const gaps = await this.identifyGapsFromComparison({
      essenciaFeatures,
      fnpFeatures,
      currentFeatures,
      commonFeatures,
      uniqueToEssencia,
      uniqueToFnp,
      uniqueToCurrent,
      gaps: []
    });

    return {
      essenciaFeatures,
      fnpFeatures,
      currentFeatures,
      commonFeatures,
      uniqueToEssencia,
      uniqueToFnp,
      uniqueToCurrent,
      gaps
    };
  }

  /**
   * Find similar feature in a list
   */
  private findSimilarFeature(
    targetFeature: Feature,
    featureList: Feature[]
  ): { feature: Feature; similarity: number } | null {
    let bestMatch: { feature: Feature; similarity: number } | null = null;

    for (const feature of featureList) {
      const similarity = this.calculateFeatureSimilarity(targetFeature, feature);
      
      if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { feature, similarity };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two features
   */
  private calculateFeatureSimilarity(feature1: Feature, feature2: Feature): number {
    let similarity = 0;
    let factors = 0;

    // Name similarity
    const nameSimilarity = this.calculateStringSimilarity(feature1.name, feature2.name);
    similarity += nameSimilarity * 0.3;
    factors += 0.3;

    // Category match
    if (feature1.category === feature2.category) {
      similarity += 0.4;
    }
    factors += 0.4;

    // Description similarity
    const descSimilarity = this.calculateStringSimilarity(feature1.description, feature2.description);
    similarity += descSimilarity * 0.2;
    factors += 0.2;

    // Component similarity
    const componentSimilarity = this.calculateComponentSimilarity(feature1.components, feature2.components);
    similarity += componentSimilarity * 0.1;
    factors += 0.1;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate component similarity
   */
  private calculateComponentSimilarity(components1: any[], components2: any[]): number {
    if (components1.length === 0 && components2.length === 0) return 1;
    if (components1.length === 0 || components2.length === 0) return 0;

    const matches = components1.filter(c1 => 
      components2.some(c2 => c1.name === c2.name || c1.type === c2.type)
    );

    return matches.length / Math.max(components1.length, components2.length);
  }

  /**
   * Identify differences between features
   */
  private identifyDifferences(
    essenciaFeature?: Feature,
    fnpFeature?: Feature,
    currentFeature?: Feature
  ): string[] {
    const differences: string[] = [];

    if (essenciaFeature && currentFeature) {
      if (essenciaFeature.complexity !== currentFeature.complexity) {
        differences.push(`Complexity differs: ${essenciaFeature.complexity} vs ${currentFeature.complexity}`);
      }
      
      if (essenciaFeature.whiteLabelCompatible !== currentFeature.whiteLabelCompatible) {
        differences.push(`White-label compatibility differs`);
      }
    }

    return differences;
  }

  /**
   * Identify feature gaps from comparison
   */
  private async identifyGapsFromComparison(comparison: FeatureComparison): Promise<FeatureGap[]> {
    const gaps: FeatureGap[] = [];

    // Gaps from Essencia features not in current
    for (const feature of comparison.uniqueToEssencia) {
      const gap = await this.createFeatureGap(feature, 'essencia');
      gaps.push(gap);
    }

    // Gaps from FNP features not in current
    for (const feature of comparison.uniqueToFnp) {
      const gap = await this.createFeatureGap(feature, 'fnp-ranking');
      gaps.push(gap);
    }

    return gaps;
  }

  /**
   * Identify feature gaps
   */
  private async identifyFeatureGaps(comparison: FeatureComparison): Promise<FeatureGap[]> {
    return comparison.gaps;
  }

  /**
   * Create a feature gap from a feature
   */
  private async createFeatureGap(feature: Feature, sourceProject: 'essencia' | 'fnp-ranking'): Promise<FeatureGap> {
    const integrationComplexity = this.assessIntegrationComplexity(feature);
    const businessValue = this.assessBusinessValue(feature);
    const technicalRisk = this.assessTechnicalRisk(feature);
    const conflictsWith = await this.identifyConflicts(feature);
    const prerequisites = await this.identifyPrerequisites(feature);
    const estimatedEffort = this.estimateEffort(feature, integrationComplexity);
    const priority = this.calculatePriority(businessValue, integrationComplexity, technicalRisk);

    return {
      feature,
      sourceProject,
      integrationComplexity,
      businessValue,
      technicalRisk,
      conflictsWith,
      prerequisites,
      estimatedEffort,
      priority
    };
  }

  /**
   * Assess integration complexity
   */
  private assessIntegrationComplexity(feature: Feature): 'low' | 'medium' | 'high' {
    let complexity = 0;

    // Base complexity from feature
    switch (feature.complexity) {
      case 'high': complexity += 3; break;
      case 'medium': complexity += 2; break;
      case 'low': complexity += 1; break;
    }

    // Dependencies add complexity
    complexity += Math.min(feature.dependencies.length * 0.5, 2);

    // White-label compatibility reduces complexity
    if (feature.whiteLabelCompatible) complexity -= 1;

    if (complexity >= 4) return 'high';
    if (complexity >= 2.5) return 'medium';
    return 'low';
  }

  /**
   * Assess business value
   */
  private assessBusinessValue(feature: Feature): 'low' | 'medium' | 'high' {
    // High value categories
    if (['dashboard', 'ranking', 'auth'].includes(feature.category)) {
      return 'high';
    }

    // Medium value categories
    if (['admin', 'api'].includes(feature.category)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Assess technical risk
   */
  private assessTechnicalRisk(feature: Feature): 'low' | 'medium' | 'high' {
    let risk = 0;

    // High complexity increases risk
    if (feature.complexity === 'high') risk += 2;
    if (feature.complexity === 'medium') risk += 1;

    // Many dependencies increase risk
    if (feature.dependencies.length > 5) risk += 2;
    else if (feature.dependencies.length > 2) risk += 1;

    // Performance impact affects risk
    if (feature.performanceImpact === 'negative') risk += 2;

    // White-label incompatibility increases risk
    if (!feature.whiteLabelCompatible) risk += 1;

    if (risk >= 4) return 'high';
    if (risk >= 2) return 'medium';
    return 'low';
  }

  /**
   * Identify potential conflicts
   */
  private async identifyConflicts(feature: Feature): Promise<string[]> {
    // This would analyze existing codebase for conflicts
    // For now, return empty array
    return [];
  }

  /**
   * Identify prerequisites
   */
  private async identifyPrerequisites(feature: Feature): Promise<string[]> {
    return feature.dependencies;
  }

  /**
   * Estimate implementation effort in hours
   */
  private estimateEffort(feature: Feature, complexity: 'low' | 'medium' | 'high'): number {
    const baseEffort = {
      'low': 8,
      'medium': 24,
      'high': 80
    };

    let effort = baseEffort[complexity];

    // Adjust based on feature category
    const categoryMultipliers = {
      'dashboard': 1.2,
      'ranking': 1.3,
      'auth': 1.5,
      'admin': 1.1,
      'api': 1.0,
      'ui': 0.8,
      'integration': 1.4
    };

    effort *= categoryMultipliers[feature.category] || 1.0;

    // Adjust for white-label compatibility
    if (!feature.whiteLabelCompatible) {
      effort *= 1.5;
    }

    return Math.round(effort);
  }

  /**
   * Calculate priority score (1-10)
   */
  private calculatePriority(
    businessValue: 'low' | 'medium' | 'high',
    complexity: 'low' | 'medium' | 'high',
    risk: 'low' | 'medium' | 'high'
  ): number {
    const valueScores = { 'low': 2, 'medium': 5, 'high': 8 };
    const complexityScores = { 'low': 8, 'medium': 5, 'high': 2 };
    const riskScores = { 'low': 8, 'medium': 5, 'high': 2 };

    const score = (
      valueScores[businessValue] * 0.5 +
      complexityScores[complexity] * 0.3 +
      riskScores[risk] * 0.2
    );

    return Math.round(Math.max(1, Math.min(10, score)));
  }

  /**
   * Prioritize features for integration
   */
  private async prioritizeFeatures(gaps: FeatureGap[]): Promise<PrioritizedFeature[]> {
    const prioritized = gaps
      .sort((a, b) => b.priority - a.priority)
      .map((gap, index) => ({
        ...gap,
        implementationOrder: index + 1,
        dependencies: gap.prerequisites,
        blockers: gap.conflictsWith
      }));

    return prioritized;
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(features: PrioritizedFeature[]): Promise<AnalysisRecommendation[]> {
    const recommendations: AnalysisRecommendation[] = [];

    for (const feature of features) {
      let type: AnalysisRecommendation['type'] = 'integrate';
      let reason = '';
      const alternatives: string[] = [];
      const conditions: string[] = [];

      // Determine recommendation type
      if (feature.technicalRisk === 'high' && feature.businessValue === 'low') {
        type = 'skip';
        reason = 'High risk with low business value makes integration inadvisable';
      } else if (feature.integrationComplexity === 'high') {
        type = 'modify';
        reason = 'High complexity suggests modification or phased approach';
        conditions.push('Break into smaller phases');
        conditions.push('Ensure thorough testing');
      } else if (feature.businessValue === 'high' && feature.technicalRisk === 'low') {
        type = 'integrate';
        reason = 'High value with low risk makes this a priority integration';
      } else {
        type = 'research';
        reason = 'Requires further analysis to determine best approach';
      }

      recommendations.push({
        type,
        feature: feature.feature,
        reason,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        conditions: conditions.length > 0 ? conditions : undefined
      });
    }

    return recommendations;
  }

  /**
   * Assess overall risks
   */
  private async assessRisks(features: PrioritizedFeature[]): Promise<RiskAssessment> {
    const riskFactors: RiskFactor[] = [];
    const mitigationStrategies: MitigationStrategy[] = [];

    // Analyze risk patterns
    const highRiskFeatures = features.filter(f => f.technicalRisk === 'high');
    const complexFeatures = features.filter(f => f.integrationComplexity === 'high');

    if (highRiskFeatures.length > 0) {
      riskFactors.push({
        type: 'technical',
        description: `${highRiskFeatures.length} features have high technical risk`,
        impact: 'high',
        probability: 'medium',
        affectedFeatures: highRiskFeatures.map(f => f.feature.id)
      });

      mitigationStrategies.push({
        riskType: 'technical',
        strategy: 'Implement comprehensive testing and gradual rollout',
        effort: 'high',
        effectiveness: 'high'
      });
    }

    if (complexFeatures.length > 0) {
      riskFactors.push({
        type: 'business',
        description: `${complexFeatures.length} features have high integration complexity`,
        impact: 'medium',
        probability: 'high',
        affectedFeatures: complexFeatures.map(f => f.feature.id)
      });

      mitigationStrategies.push({
        riskType: 'business',
        strategy: 'Break complex features into smaller phases',
        effort: 'medium',
        effectiveness: 'high'
      });
    }

    const overallRisk = this.calculateOverallRisk(riskFactors);

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies
    };
  }

  /**
   * Calculate overall risk level
   */
  private calculateOverallRisk(riskFactors: RiskFactor[]): 'low' | 'medium' | 'high' {
    if (riskFactors.some(rf => rf.impact === 'high' && rf.probability === 'high')) {
      return 'high';
    }
    
    if (riskFactors.some(rf => rf.impact === 'high' || rf.probability === 'high')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Create implementation roadmap
   */
  private async createImplementationRoadmap(features: PrioritizedFeature[]): Promise<ImplementationPhase[]> {
    const phases: ImplementationPhase[] = [];
    const featuresPerPhase = 5;
    
    for (let i = 0; i < features.length; i += featuresPerPhase) {
      const phaseFeatures = features.slice(i, i + featuresPerPhase);
      const phaseNumber = Math.floor(i / featuresPerPhase) + 1;
      
      const estimatedDuration = Math.ceil(
        phaseFeatures.reduce((sum, f) => sum + f.estimatedEffort, 0) / 40 // 40 hours per week
      );

      const riskLevel = this.calculatePhaseRisk(phaseFeatures);

      phases.push({
        phase: phaseNumber,
        name: `Integration Phase ${phaseNumber}`,
        features: phaseFeatures,
        estimatedDuration,
        prerequisites: this.getPhasePrerequisites(phaseFeatures),
        deliverables: this.getPhaseDeliverables(phaseFeatures),
        riskLevel
      });
    }

    return phases;
  }

  /**
   * Calculate phase risk level
   */
  private calculatePhaseRisk(features: PrioritizedFeature[]): 'low' | 'medium' | 'high' {
    const highRiskCount = features.filter(f => f.technicalRisk === 'high').length;
    const totalFeatures = features.length;

    if (highRiskCount / totalFeatures > 0.5) return 'high';
    if (highRiskCount / totalFeatures > 0.2) return 'medium';
    return 'low';
  }

  /**
   * Get phase prerequisites
   */
  private getPhasePrerequisites(features: PrioritizedFeature[]): string[] {
    const prerequisites = new Set<string>();
    
    features.forEach(feature => {
      feature.dependencies.forEach(dep => prerequisites.add(dep));
    });

    return Array.from(prerequisites);
  }

  /**
   * Get phase deliverables
   */
  private getPhaseDeliverables(features: PrioritizedFeature[]): string[] {
    return features.map(f => `Integrated ${f.feature.name}`);
  }
}