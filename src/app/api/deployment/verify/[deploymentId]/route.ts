import { NextRequest, NextResponse } from 'next/server';
import { VercelDeploymentService, getVercelConfigFromEnv } from '@/services/vercel-deployment.service';
import { DeploymentVerificationService } from '@/services/deployment-verification.service';
import { errorLogger } from '@/services/error-logger.service';
import { withAuth } from '@/middleware/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  try {
    // Validate authentication
    const authResult = await requireAuth(request, ['admin']);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { deploymentId } = params;

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID is required' },
        { status: 400 }
      );
    }

    // Get Vercel configuration
    const vercelConfig = getVercelConfigFromEnv();
    if (!vercelConfig) {
      return NextResponse.json(
        { error: 'Vercel configuration not found' },
        { status: 503 }
      );
    }

    // Initialize services
    const vercelService = new VercelDeploymentService(vercelConfig);
    const errorLogger = new ErrorLoggerService();
    const verificationService = new DeploymentVerificationService(vercelService, errorLogger);

    // Run verification
    const report = await verificationService.verifyDeployment(deploymentId);

    return NextResponse.json({
      success: report.overallSuccess,
      report
    });
  } catch (error) {
    console.error('Deployment verification error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to verify deployment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}