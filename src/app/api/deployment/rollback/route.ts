import { NextRequest, NextResponse } from 'next/server';
import { DeploymentAutomationService, AutomationConfig } from '@/services/deployment-automation.service';
import { WhiteLabelConfigService } from '@/services/white-label-config.service';
import { errorLogger } from '@/services/error-logger.service';
import { validateRequestBody } from '@/middleware/validation';
import { withAuth } from '@/middleware/auth';
import { z } from 'zod';

const rollbackSchema = z.object({
  deploymentId: z.string().min(1, 'Deployment ID is required'),
  reason: z.string().optional(),
  skipHealthCheck: z.boolean().optional().default(false)
});

async function postHandler(request: NextRequest) {
  try {
    // Validate request body
    const validationResult = await validateRequestBody(request, rollbackSchema);
    if (!validationResult.success) {
      return validationResult.response;
    }

    const { deploymentId, reason, skipHealthCheck } = validationResult.data;

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

    // Perform rollback
    const result = await deploymentService.rollbackDeployment({
      deploymentId,
      reason,
      skipHealthCheck
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        deploymentId: result.deploymentId,
        url: result.url,
        message: 'Rollback completed successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          logs: result.logs
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Deployment rollback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export handler with authentication middleware
export async function POST(request: NextRequest) {
  return withAuth(request, postHandler, { requireAdmin: true });
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