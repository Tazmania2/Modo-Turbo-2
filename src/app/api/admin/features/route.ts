import { NextRequest, NextResponse } from 'next/server';
import { simpleFeatureStorageService } from '@/services/simple-feature-storage.service';
import { featureToggleService } from '@/services/feature-toggle.service';

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

    // Get auth token from cookies
    const authToken = request.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const features = await simpleFeatureStorageService.getFeatures(instanceId);
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

    // Get auth token from cookies
    const authToken = request.cookies.get('auth_token')?.value;
    if (!authToken) {
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

    // Get current features
    const currentFeatures = await simpleFeatureStorageService.getFeatures(instanceId);
    if (!currentFeatures) {
      return NextResponse.json(
        { error: 'Failed to get current features' },
        { status: 500 }
      );
    }

    // Apply updates
    let updatedFeatures = { ...currentFeatures };
    for (const update of updates) {
      if (update.featureName.startsWith('dashboards.')) {
        const dashboardType = update.featureName.replace('dashboards.', '');
        updatedFeatures.dashboards = {
          ...updatedFeatures.dashboards,
          [dashboardType]: update.enabled
        };
      } else {
        (updatedFeatures as any)[update.featureName] = update.enabled;
      }
    }

    // Save updated features
    const saveResult = await simpleFeatureStorageService.saveFeatures(
      instanceId,
      updatedFeatures,
      'admin'
    );

    if (saveResult.success) {
      return NextResponse.json({
        success: true,
        features: updatedFeatures
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to save features',
          details: saveResult.error 
        },
        { status: 500 }
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