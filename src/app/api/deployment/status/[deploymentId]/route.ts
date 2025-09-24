import { NextRequest, NextResponse } from 'next/server';
import { VercelDeploymentService, getVercelConfigFromEnv } from '@/services/vercel-deployment.service';
import { withAuth } from '@/middleware/auth';

export async function GET(
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

    const vercelService = new VercelDeploymentService(vercelConfig);

    // Get deployment status
    const deployment = await vercelService.getDeployment(deploymentId);
    
    // Get deployment logs if requested
    const includeLogs = request.nextUrl.searchParams.get('includeLogs') === 'true';
    let logs: string[] = [];
    
    if (includeLogs) {
      logs = await vercelService.getDeploymentLogs(deploymentId);
    }

    return NextResponse.json({
      id: deployment.id,
      url: deployment.url,
      status: deployment.readyState,
      createdAt: new Date(deployment.createdAt).toISOString(),
      readyAt: deployment.readyAt ? new Date(deployment.readyAt).toISOString() : null,
      buildingAt: deployment.buildingAt ? new Date(deployment.buildingAt).toISOString() : null,
      creator: deployment.creator,
      source: deployment.source,
      gitSource: deployment.gitSource,
      logs: includeLogs ? logs : undefined
    });
  } catch (error) {
    console.error('Get deployment status error:', error);
    
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}