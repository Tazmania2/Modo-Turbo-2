import { NextRequest, NextResponse } from 'next/server';
import { brandingService } from '@/services/branding.service';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');
    const assetType = searchParams.get('type'); // 'logo' or 'favicon'
    const userId = searchParams.get('userId');

    if (!instanceId || !assetType || !userId) {
      return NextResponse.json(
        { error: 'Instance ID, asset type, and user ID are required' },
        { status: 400 }
      );
    }

    if (!['logo', 'favicon'].includes(assetType)) {
      return NextResponse.json(
        { error: 'Asset type must be either "logo" or "favicon"' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    let result;
    if (assetType === 'logo') {
      result = await brandingService.uploadLogo(instanceId, file, userId);
    } else {
      result = await brandingService.uploadFavicon(instanceId, file, userId);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        message: `${assetType} uploaded successfully`
      });
    } else {
      return NextResponse.json(
        { 
          error: result.error || `Failed to upload ${assetType}`
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to upload asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}