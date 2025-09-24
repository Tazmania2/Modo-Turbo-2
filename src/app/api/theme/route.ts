import { NextRequest, NextResponse } from 'next/server';
import { brandingService } from '@/services/branding.service';
import { themeService } from '@/services/theme.service';

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
      // Return default theme
      return NextResponse.json({
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1F2937',
          accentColor: '#10B981',
          logo: '',
          favicon: '',
          companyName: 'Gamification Platform',
          tagline: 'Powered by Funifier'
        },
        cssProperties: {},
        isDefault: true
      });
    }

    // Generate CSS properties for the branding
    const cssProperties = brandingService.generateCSSProperties(branding);
    const tailwindConfig = brandingService.generateTailwindConfig(branding);

    return NextResponse.json({
      branding,
      cssProperties,
      tailwindConfig,
      isDefault: false
    });
  } catch (error) {
    console.error('Failed to get theme configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { action } = body;

    if (action === 'preload') {
      // Preload theme for faster application
      const branding = await themeService.preloadTheme(instanceId);
      
      if (branding) {
        const cssProperties = brandingService.generateCSSProperties(branding);
        return NextResponse.json({
          success: true,
          branding,
          cssProperties
        });
      } else {
        return NextResponse.json({
          success: true,
          branding: null,
          message: 'No custom theme found, will use defaults'
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process theme request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}