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
    const { companyInfo, userId } = body;

    if (!companyInfo || !userId) {
      return NextResponse.json(
        { error: 'Company information and user ID are required' },
        { status: 400 }
      );
    }

    // Validate company information
    if (companyInfo.companyName && companyInfo.companyName.length > 100) {
      return NextResponse.json(
        { error: 'Company name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (companyInfo.tagline && companyInfo.tagline.length > 200) {
      return NextResponse.json(
        { error: 'Tagline must be 200 characters or less' },
        { status: 400 }
      );
    }

    const result = await brandingService.updateCompanyInfo(instanceId, companyInfo, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        branding: result.branding,
        warnings: result.warnings
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to update company information',
          details: result.errors 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to update company information:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}