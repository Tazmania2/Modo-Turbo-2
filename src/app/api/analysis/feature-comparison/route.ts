/**
 * API endpoint for feature comparison and gap analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { FeatureComparisonService } from '@/services/analysis/feature-comparison.service';
import { ASTParserService } from '@/services/analysis/ast-parser.service';
import { RepositoryAnalyzerService } from '@/services/analysis/repository-analyzer.service';

interface FeatureComparisonRequest {
  essenciaPath: string;
  fnpRankingPath: string;
  currentPlatformPath: string;
  includeCategories?: string[];
  excludeCategories?: string[];
  minPriority?: number;
  generateReport?: boolean;
  reportFormat?: 'json' | 'html' | 'pdf';
}

export async function POST(request: NextRequest) {
  try {
    const body: FeatureComparisonRequest = await request.json();

    // Validate required fields
    if (!body.essenciaPath || !body.fnpRankingPath || !body.currentPlatformPath) {
      return NextResponse.json(
        { error: 'Missing required paths: essenciaPath, fnpRankingPath, currentPlatformPath' },
        { status: 400 }
      );
    }

    // Initialize services
    const astParserService = new ASTParserService();
    const repositoryAnalyzerService = new RepositoryAnalyzerService();
    const featureComparisonService = new FeatureComparisonService(
      astParserService,
      repositoryAnalyzerService
    );

    // Perform feature comparison
    const result = await featureComparisonService.performFeatureComparison({
      essenciaPath: body.essenciaPath,
      fnpRankingPath: body.fnpRankingPath,
      currentPlatformPath: body.currentPlatformPath,
      includeCategories: body.includeCategories,
      excludeCategories: body.excludeCategories,
      minPriority: body.minPriority,
      generateReport: body.generateReport,
      reportFormat: body.reportFormat
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: result.summary,
        analysisResult: {
          totalGaps: result.analysisResult.prioritizedGaps.length,
          highPriorityGaps: result.analysisResult.prioritizedGaps.filter(gap => gap.priority >= 7).length,
          phases: result.analysisResult.implementationRoadmap.length,
          overallRisk: result.analysisResult.riskAssessment.overallRisk
        },
        report: result.report ? {
          id: result.report.id,
          generatedAt: result.report.generatedAt,
          summary: result.report.summary
        } : undefined,
        exportedReportPath: result.exportedReportPath
      }
    });

  } catch (error) {
    console.error('Feature comparison API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Feature comparison failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Initialize services
    const astParserService = new ASTParserService();
    const repositoryAnalyzerService = new RepositoryAnalyzerService();
    const featureComparisonService = new FeatureComparisonService(
      astParserService,
      repositoryAnalyzerService
    );

    switch (action) {
      case 'status':
        const status = await featureComparisonService.getComparisonStatus();
        return NextResponse.json({ success: true, data: status });

      case 'quick-summary':
        const essenciaPath = searchParams.get('essenciaPath');
        const fnpRankingPath = searchParams.get('fnpRankingPath');
        const currentPlatformPath = searchParams.get('currentPlatformPath');

        if (!essenciaPath || !fnpRankingPath || !currentPlatformPath) {
          return NextResponse.json(
            { error: 'Missing required paths for quick summary' },
            { status: 400 }
          );
        }

        const quickSummary = await featureComparisonService.getQuickAnalysisSummary({
          essenciaPath,
          fnpRankingPath,
          currentPlatformPath
        });

        return NextResponse.json({ success: true, data: quickSummary });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: status, quick-summary' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Feature comparison GET API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}