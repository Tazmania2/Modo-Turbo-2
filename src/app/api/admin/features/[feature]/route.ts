import { NextRequest, NextResponse } from 'next/server';
import { featureToggleService } from '@/services/feature-toggle.service';
import { verifyAuthToken } from '@/utils/auth';

/**
 * PUT /api/admin/features/[feature] - Update a single feature toggle
 */
export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ feature: string }> }
) {
  const { feature } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
        { status: 400 }
      );
    }

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature name is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Enabled must be a boolean value' },
        { status: 400 }
      );
    }

    const result = await featureToggleService.updateFeatureToggle(
      instanceId,
      feature,
      enabled,
      authResult.user?._id || 'unknown'
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        features: result.updatedFeatures,
        warnings: result.warnings
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to update feature',
          details: result.errors 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to update feature toggle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/features/[feature] - Check if a specific feature is enabled
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ 2222 }> }) {
  const { feature } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
        { status: 400 }
      );
    }

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature name is required' },
        { status: 400 }
      );
    }

    const isEnabled = await featureToggleService.isFeatureEnabled(instanceId, feature);

    return NextResponse.json({
      feature,
      enabled: isEnabled
    });
  } catch (error) {
    console.error('Failed to check feature status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}