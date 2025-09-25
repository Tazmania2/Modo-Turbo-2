import { NextRequest, NextResponse } from 'next/server';
import { DeploymentAutomationService, AutomationConfig } from '@/services/deployment-automation.service';
import { WhiteLabelConfigService } from '@/services/white-label-config.service';
import { errorLogger } from '@/services/error-logger.service';
import { withAuth } from '@/middleware/auth';

async function getHandler(request: NextRequest) {
  try {

    // Get query parameters
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get automation configuration
    const automationConfig = getAutomationConfig();
    if (!automationConfig) {
      return NextResponse.json(
        { error: 'Deployment automation not configured' },
        { status: 503 }
      );
    }

    // Initialize services
    const configService = WhiteLabelConfigService.getInstance();
    const deploymentService = new DeploymentAutomationService(
      automationConfig,
      configService,
      errorLogger
    );

    // Get deployment history
    const history = await deploymentService.getDeploymentHistory(limit);

    return NextResponse.json({
      deployments: history,
      total: history.length
    });
  } catch (error) {
    console.error('Get deployment history error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment history' },
      { status: 500 }
    );
  }
}

// Export handler with authentication middleware
export async function GET(request: NextRequest) {
  return withAuth(request, getHandler, { requireAdmin: true });
}

function getAutomationConfig(): AutomationConfig | null {
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;
  const githubRepo = process.env.GITHUB_REPO;
  const defaultBranch = process.env.DEFAULT_BRANCH || 'main';

  if (!vercelToken || !vercelProjectId) {
    return null;
  }

  return {
    vercelToken,
    vercelProjectId,
    vercelTeamId,
    githubRepo,
    defaultBranch,
    autoDeployOnConfigChange: process.env.AUTO_DEPLOY_ON_CONFIG_CHANGE === 'true',
    healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '300000'),
    rollbackOnFailure: process.env.ROLLBACK_ON_FAILURE !== 'false'
  };
}