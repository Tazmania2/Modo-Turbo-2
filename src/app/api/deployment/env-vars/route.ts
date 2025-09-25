import { NextRequest, NextResponse } from 'next/server';
import { VercelDeploymentService, getVercelConfigFromEnv } from '@/services/vercel-deployment.service';
import { validateRequestBody } from '@/middleware/validation';
import { withAuth } from '@/middleware/auth';
import { z } from 'zod';

const updateEnvVarsSchema = z.object({
  variables: z.record(z.string(), z.string()),
  target: z.array(z.enum(['production', 'preview', 'development'])).optional().default(['production', 'preview', 'development'])
});

const deleteEnvVarSchema = z.object({
  key: z.string().min(1, 'Environment variable key is required')
});

async function getHandler(request: NextRequest) {
  try {

    // Get Vercel configuration
    const vercelConfig = getVercelConfigFromEnv();
    if (!vercelConfig) {
      return NextResponse.json(
        { error: 'Vercel configuration not found' },
        { status: 503 }
      );
    }

    const vercelService = new VercelDeploymentService(vercelConfig);

    // Get environment variables
    const envVars = await vercelService.getEnvironmentVariables();

    // Filter out sensitive values for security
    const sanitizedVars = envVars.map(envVar => ({
      id: envVar.id,
      key: envVar.key,
      target: envVar.target,
      type: envVar.type,
      createdAt: new Date(envVar.createdAt).toISOString(),
      updatedAt: new Date(envVar.updatedAt).toISOString(),
      // Don't expose actual values for security
      hasValue: Boolean(envVar.value)
    }));

    return NextResponse.json({
      environmentVariables: sanitizedVars
    });
  } catch (error) {
    console.error('Get environment variables error:', error);
    return NextResponse.json(
      { error: 'Failed to get environment variables' },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest) {
  try {

    // Validate request body
    const validationResult = await validateRequestBody(request, updateEnvVarsSchema);
    if (!validationResult.success) {
      return validationResult.response;
    }

    const { variables, target } = validationResult.data;

    // Get Vercel configuration
    const vercelConfig = getVercelConfigFromEnv();
    if (!vercelConfig) {
      return NextResponse.json(
        { error: 'Vercel configuration not found' },
        { status: 503 }
      );
    }

    const vercelService = new VercelDeploymentService(vercelConfig);

    // Update environment variables
    await vercelService.updateEnvironmentVariables(variables, target);

    return NextResponse.json({
      success: true,
      message: 'Environment variables updated successfully',
      updatedCount: Object.keys(variables).length
    });
  } catch (error) {
    console.error('Update environment variables error:', error);
    return NextResponse.json(
      { error: 'Failed to update environment variables' },
      { status: 500 }
    );
  }
}

async function deleteHandler(request: NextRequest) {
  try {

    // Validate request body
    const validationResult = await validateRequestBody(request, deleteEnvVarSchema);
    if (!validationResult.success) {
      return validationResult.response;
    }

    const { key } = validationResult.data;

    // Get Vercel configuration
    const vercelConfig = getVercelConfigFromEnv();
    if (!vercelConfig) {
      return NextResponse.json(
        { error: 'Vercel configuration not found' },
        { status: 503 }
      );
    }

    const vercelService = new VercelDeploymentService(vercelConfig);

    // Delete environment variable
    await vercelService.deleteEnvironmentVariable(key);

    return NextResponse.json({
      success: true,
      message: `Environment variable '${key}' deleted successfully`
    });
  } catch (error) {
    console.error('Delete environment variable error:', error);
    return NextResponse.json(
      { error: 'Failed to delete environment variable' },
      { status: 500 }
    );
  }
}
// Export handlers with authentication middleware
export async function GET(request: NextRequest) {
  return withAuth(request, getHandler, { requireAdmin: true });
}

export async function POST(request: NextRequest) {
  return withAuth(request, postHandler, { requireAdmin: true });
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, deleteHandler, { requireAdmin: true });
}