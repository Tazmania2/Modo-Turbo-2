import { NextRequest, NextResponse } from 'next/server';
import { DeploymentAutomationService, AutomationConfig } from '@/services/deployment-automation.service';
import { WhiteLabelConfigService } from '@/services/white-label-config.service';
import { errorLogger } from '@/services/error-logger.service';
import { validateRequestBody } from '@/middleware/validation';
import { withAuth } from '@/middleware/auth';
import { z } from 'zod';

const triggerDeploymentSchema = z.object({
  instanceId: z.string().min(1, 'Instance ID is required'),
  target: z.enum(['production', 'preview', 'development']).optional().default('production'),
  branch: z.string().optional(),
  environmentVariables: z.record(z.string(), z.string()).optional(),
  skipHealthCheck: z.boolean().optional().default(false)
});

async function postHandler(request: NextRequest) {
  try {
    // Validate request body
    const validationResult = await validateRequestBody(request, triggerDeploymentSchema);
    if (!validationResult.success) {
      return validationResult.response;
    }

    const { instanceId, target, branch, environmentVariables, skipHealthCheck } = validationResult.data;

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

    // Trigger deployment
    const result = await deploymentService.triggerAutomatedDeployment(instanceId, {
      target,
      branch,
      environmentVariables
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        deploymentId: result.deploymentId,
        url: result.url,
        message: 'Deployment triggered successfully'
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
    console.error('Deployment trigger error:', error);
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