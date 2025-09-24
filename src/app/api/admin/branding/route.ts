import { NextRequest, NextResponse } from 'next/server';
import { brandingService } from '@/services/branding.service';
import { validateBrandingConfiguration } from '@/utils/validation';
import { WhiteLabelBranding } from '@/types/funifier';

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

    const branding = await brandingService.getBranding(instanceId);

    if (!branding) {
      return NextResponse.json(
        { error: 'Branding configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ branding });
  } catch (error) {
    console.error('Failed to get branding configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { branding, userId } = body;

    if (!branding || !userId) {
      return NextResponse.json(
        { error: 'Branding configuration and user ID are required' },
        { status: 400 }
      );
    }

    // Validate branding configuration
    const validation = validateBrandingConfiguration(branding);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid branding configuration',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    const result = await brandingService.updateBranding(instanceId, branding, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        branding: result.branding,
        warnings: result.warnings
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to update branding configuration',
          details: result.errors 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to update branding configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');
    const userId = searchParams.get('userId');

    if (!instanceId || !userId) {
      return NextResponse.json(
        { error: 'Instance ID and user ID are required' },
        { status: 400 }
      );
    }

    const result = await brandingService.resetToDefaults(instanceId, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        branding: result.branding,
        message: 'Branding reset to defaults successfully'
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to reset branding configuration',
          details: result.errors 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to reset branding configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}