import { NextRequest, NextResponse } from 'next/server';
import { brandingService } from '@/services/branding.service';

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
    const { colors, userId } = body;

    if (!colors || !userId) {
      return NextResponse.json(
        { error: 'Colors and user ID are required' },
        { status: 400 }
      );
    }

    // Validate color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (colors.primary && !hexColorRegex.test(colors.primary)) {
      return NextResponse.json(
        { error: 'Primary color must be a valid hex color' },
        { status: 400 }
      );
    }
    
    if (colors.secondary && !hexColorRegex.test(colors.secondary)) {
      return NextResponse.json(
        { error: 'Secondary color must be a valid hex color' },
        { status: 400 }
      );
    }
    
    if (colors.accent && !hexColorRegex.test(colors.accent)) {
      return NextResponse.json(
        { error: 'Accent color must be a valid hex color' },
        { status: 400 }
      );
    }

    const result = await brandingService.updateThemeColors(instanceId, colors, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        branding: result.branding,
        warnings: result.warnings
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to update theme colors',
          details: result.errors 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to update theme colors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}