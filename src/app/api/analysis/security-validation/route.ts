import { NextRequest, NextResponse } from 'next/server';
import { 
  securityValidationTestService,
  vulnerabilityScanningAutomationService,
  securityRegressionTestService
} from '@/services/analysis';
// Using generic object for feature data
interface Feature {
  id: string;
  name: string;
  type: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'validate-feature':
        return await handleFeatureValidation(params);
      
      case 'run-security-scan':
        return await handleSecurityScan(params);
      
      case 'run-regression-test':
        return await handleRegressionTest(params);
      
      case 'create-baseline':
        return await handleCreateBaseline(params);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security validation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'scan-history':
        return await handleGetScanHistory(searchParams);
      
      case 'baselines':
        return await handleGetBaselines();
      
      case 'regression-history':
        return await handleGetRegressionHistory(searchParams);
      
      case 'dashboard-metrics':
        return await handleGetDashboardMetrics();
      
      case 'vulnerability-trends':
        return await handleGetVulnerabilityTrends(searchParams);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security validation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleFeatureValidation(params: any) {
  const { feature } = params;
  
  if (!feature) {
    return NextResponse.json(
      { error: 'Feature is required' },
      { status: 400 }
    );
  }

  try {
    const validationResult = await securityValidationTestService.validateFeatureSecurity(feature);
    
    return NextResponse.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Feature validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleSecurityScan(params: any) {
  const { scanTypes, config } = params;
  
  if (!scanTypes || !Array.isArray(scanTypes)) {
    return NextResponse.json(
      { error: 'Scan types array is required' },
      { status: 400 }
    );
  }

  try {
    const scanResult = await vulnerabilityScanningAutomationService.runImmediateScan(
      scanTypes,
      config || {
        projectPath: process.cwd(),
        excludePatterns: ['node_modules/**', '**/*.test.ts'],
        includePatterns: ['**/*.ts', '**/*.js'],
        severityThreshold: 'medium',
        maxExecutionTime: 300000,
        retryAttempts: 3,
        customRules: []
      }
    );
    
    return NextResponse.json({
      success: true,
      data: scanResult
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleRegressionTest(params: any) {
  const { feature, baselineId, config } = params;
  
  if (!feature || !baselineId) {
    return NextResponse.json(
      { error: 'Feature and baseline ID are required' },
      { status: 400 }
    );
  }

  try {
    const regressionResult = await securityRegressionTestService.runSecurityRegressionTests(
      feature,
      baselineId,
      config
    );
    
    return NextResponse.json({
      success: true,
      data: regressionResult
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Regression test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleCreateBaseline(params: any) {
  const { id, name, description, features } = params;
  
  if (!id || !name || !features || !Array.isArray(features)) {
    return NextResponse.json(
      { error: 'ID, name, and features array are required' },
      { status: 400 }
    );
  }

  try {
    const baseline = await securityRegressionTestService.createSecurityBaseline(
      id,
      name,
      description || '',
      features
    );
    
    return NextResponse.json({
      success: true,
      data: baseline
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Baseline creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleGetScanHistory(searchParams: URLSearchParams) {
  const limit = searchParams.get('limit');
  const limitNumber = limit ? parseInt(limit, 10) : undefined;

  try {
    const history = vulnerabilityScanningAutomationService.getScanHistory(limitNumber);
    
    return NextResponse.json({
      success: true,
      data: history
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get scan history: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleGetBaselines() {
  try {
    const baselines = securityRegressionTestService.getAvailableBaselines();
    
    return NextResponse.json({
      success: true,
      data: baselines
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get baselines: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleGetRegressionHistory(searchParams: URLSearchParams) {
  const limit = searchParams.get('limit');
  const limitNumber = limit ? parseInt(limit, 10) : undefined;

  try {
    const history = securityRegressionTestService.getRegressionHistory(limitNumber);
    
    return NextResponse.json({
      success: true,
      data: history
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get regression history: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleGetDashboardMetrics() {
  try {
    const metrics = vulnerabilityScanningAutomationService.getSecurityDashboardMetrics();
    
    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get dashboard metrics: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleGetVulnerabilityTrends(searchParams: URLSearchParams) {
  const days = searchParams.get('days');
  const daysNumber = days ? parseInt(days, 10) : 30;

  try {
    const trends = vulnerabilityScanningAutomationService.getVulnerabilityTrends(daysNumber);
    
    return NextResponse.json({
      success: true,
      data: trends
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get vulnerability trends: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}