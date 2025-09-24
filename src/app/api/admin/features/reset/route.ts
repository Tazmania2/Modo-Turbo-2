import { NextRequest, NextResponse } from 'next/server';
import { featureToggleService } from '@/services/feature-toggle.service';
import { verifyAuthToken } from '@/utils/auth';

/**
 * POST /api/admin/features/reset - Reset features to default configuration
 */
export async function POST(request: NextRequest) {
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

    const result = await featureToggleService.resetFeaturesToDefaults(
      instanceId,
      authResult.user?._id || 'unknown'
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        features: result.updatedFeatures,
        message: 'Features reset to default configuration'
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to reset features',
          details: result.errors 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to reset features:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}