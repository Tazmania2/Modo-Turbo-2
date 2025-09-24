import { NextRequest, NextResponse } from 'next/server';
import { featureToggleService } from '@/services/feature-toggle.service';
import { verifyAuthToken } from '@/utils/auth';

/**
 * GET /api/admin/features - Get feature configuration for an instance
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
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

    const features = await featureToggleService.getFeatureConfiguration(instanceId);
    const availableFeatures = featureToggleService.getAvailableFeatures();

    return NextResponse.json({
      features,
      availableFeatures
    });
  } catch (error) {
    console.error('Failed to get feature configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/features - Update feature configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
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
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    const result = await featureToggleService.updateMultipleFeatures(
      instanceId,
      updates,
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
          error: 'Failed to update features',
          details: result.errors 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to update feature configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}