/**
 * Feature Comparison Service
 * Main orchestrator for feature comparison and gap analysis system
 */

import { FeatureIdentificationService, FeatureIdentificationResult } from './feature-identification.service';
import { FeatureGapAnalysisService, GapAnalysisResult } from './feature-gap-analysis.service';
import { FeatureComparisonReportingService, ComparisonReport } from './feature-comparison-reporting.service';
import { ASTParserService } from './ast-parser.service';
import { RepositoryAnalyzerService } from './repository-analyzer.service';

export interface FeatureComparisonConfig {
  essenciaPath: string;
  fnpRankingPath: string;
  currentPlatformPath: string;
  outputPath?: string;
  includeCategories?: string[];
  excludeCategories?: string[];
  minPriority?: number;
  generateReport?: boolean;
  reportFormat?: 'json' | 'html' | 'pdf';
}

export interface FeatureComparisonResult {
  analysisResult: GapAnalysisResult;
  report?: ComparisonReport;
  exportedReportPath?: string;
  summary: ComparisonSummary;
}

export interface ComparisonSummary {
  totalFeaturesAnalyzed: number;
  gapsIdentified: number;
  highPriorityGaps: number;
  quickWins: number;
  estimatedEffort: number;
  recommendedPhases: number;
  overallRisk: 'low' | 'medium' | 'high';
  nextSteps: string[];
}

export class FeatureComparisonService {
  private featureIdentificationService: FeatureIdentificationService;
  private featureGapAnalysisService: FeatureGapAnalysisService;
  private featureComparisonReportingService: FeatureComparisonReportingService;

  constructor(
    astParserService: ASTParserService,
    repositoryAnalyzerService: RepositoryAnalyzerService
  ) {
    this.featureIdentificationService = new FeatureIdentificationService(
      astParserService,
      repositoryAnalyzerService
    );
    
    this.featureGapAnalysisService = new FeatureGapAnalysisService(
      this.featureIdentificationService
    );
    
    this.featureComparisonReportingService = new FeatureComparisonReportingService();
  }

  /**
   * Perform comprehensive feature comparison and gap analysis
   */
  async performFeatureComparison(config: FeatureComparisonConfig): Promise<FeatureComparisonResult> {
    try {
      console.log('Starting feature comparison analysis...');
      
      // Validate configuration
      this.validateConfig(config);

      // Perform gap analysis
      console.log('Performing gap analysis...');
      const analysisResult = await this.featureGapAnalysisService.performGapAnalysis(
        config.essenciaPath,
        config.fnpRankingPath,
        config.currentPlatformPath
      );

      // Filter results based on configuration
      const filteredResult = this.filterAnalysisResult(analysisResult, config);

      // Generate report if requested
      let report: ComparisonReport | undefined;
      let exportedReportPath: string | undefined;

      if (config.generateReport !== false) {
        console.log('Generating comparison report...');
        report = await this.featureComparisonReportingService.generateComparisonReport(filteredResult);

        if (config.outputPath && config.reportFormat) {
          console.log(`Exporting report to ${config.reportFormat} format...`);
          const reportContent = await this.featureComparisonReportingService.exportReport(
            report,
            config.reportFormat
          );
          
          exportedReportPath = await this.saveReportToFile(
            reportContent,
            config.outputPath,
            config.reportFormat
          );
        }
      }

      // Generate summary
      const summary = this.generateComparisonSummary(filteredResult, report);

      console.log('Feature comparison analysis completed successfully');

      return {
        analysisResult: filteredResult,
        report,
        exportedReportPath,
        summary
      };

    } catch (error) {
      console.error('Error performing feature comparison:', error);
      throw new Error(`Feature comparison failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: FeatureComparisonConfig): void {
    if (!config.essenciaPath) {
      throw new Error('Essencia project path is required');
    }

    if (!config.fnpRankingPath) {
      throw new Error('FNP-Ranking project path is required');
    }

    if (!config.currentPlatformPath) {
      throw new Error('Current platform path is required');
    }
  }

  /**
   * Filter analysis result based on configuration
   */
  private filterAnalysisResult(
    analysisResult: GapAnalysisResult,
    config: FeatureComparisonConfig
  ): GapAnalysisResult {
    let filteredGaps = analysisResult.prioritizedGaps;

    // Filter by categories
    if (config.includeCategories && config.includeCategories.length > 0) {
      filteredGaps = filteredGaps.filter(gap =>
        config.includeCategories!.includes(gap.feature.category)
      );
    }

    return {
      ...analysisResult,
      prioritizedGaps: filteredGaps
    };
  }

  /**
   * Generate comparison summary
   */
  private generateComparisonSummary(
    analysisResult: GapAnalysisResult,
    report?: ComparisonReport
  ): ComparisonSummary {
    const { comparison, prioritizedGaps, implementationRoadmap, riskAssessment } = analysisResult;

    const totalFeaturesAnalyzed = 
      comparison.essenciaFeatures.length + 
      comparison.fnpFeatures.length + 
      comparison.currentFeatures.length;

    const gapsIdentified = prioritizedGaps.length;
    const highPriorityGaps = prioritizedGaps.filter(gap => gap.priority >= 7).length;
    const quickWins = prioritizedGaps.filter(
      gap => gap.estimatedEffort <= 16 && gap.businessValue !== 'low'
    ).length;

    const estimatedEffort = prioritizedGaps.reduce((sum, gap) => sum + gap.estimatedEffort, 0);
    const recommendedPhases = implementationRoadmap.length;
    const overallRisk = riskAssessment.overallRisk;

    const nextSteps = this.generateNextSteps(prioritizedGaps, quickWins, overallRisk);

    return {
      totalFeaturesAnalyzed,
      gapsIdentified,
      highPriorityGaps,
      quickWins,
      estimatedEffort,
      recommendedPhases,
      overallRisk,
      nextSteps
    };
  }

  /**
   * Generate next steps recommendations
   */
  private generateNextSteps(
    prioritizedGaps: any[],
    quickWins: number,
    overallRisk: 'low' | 'medium' | 'high'
  ): string[] {
    const nextSteps: string[] = [];

    if (quickWins > 0) {
      nextSteps.push(`Start with ${quickWins} quick win features to build momentum`);
    }

    if (overallRisk === 'high') {
      nextSteps.push('Conduct detailed risk assessment before proceeding with high-risk features');
    }

    nextSteps.push('Set up feature flags for gradual rollout');

    return nextSteps;
  }

  /**
   * Get quick analysis summary without full report generation
   */
  async getQuickAnalysisSummary(config: FeatureComparisonConfig): Promise<ComparisonSummary> {
    try {
      const analysisResult = await this.featureGapAnalysisService.performGapAnalysis(
        config.essenciaPath,
        config.fnpRankingPath,
        config.currentPlatformPath
      );

      const filteredResult = this.filterAnalysisResult(analysisResult, config);
      return this.generateComparisonSummary(filteredResult);

    } catch (error) {
      console.error('Error getting quick analysis summary:', error);
      throw new Error(`Quick analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get feature comparison status
   */
  async getComparisonStatus(): Promise<{
    isRunning: boolean;
    lastRun?: Date;
    lastResult?: ComparisonSummary;
  }> {
    // This would integrate with a status tracking system
    return {
      isRunning: false,
      lastRun: undefined,
      lastResult: undefined
    };
  }

  /**
   * Save report to file
   */
  private async saveReportToFile(
    content: string,
    outputPath: string,
    format: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `feature-comparison-report-${timestamp}.${format}`;
    return `${outputPath}/${filename}`;
  }
}