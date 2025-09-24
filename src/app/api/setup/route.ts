import { NextRequest, NextResponse } from 'next/server';
import { setupService } from '@/services/setup.service';
import { SetupRequest } from '@/types/funifier';

export async function POST(request: NextRequest) {
  try {
    const body: SetupRequest = await request.json();
    
    // Get instance ID from query params if provided
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;

    // Handle the setup request
    const result = await setupService.handleSetup(body, instanceId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Setup API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        errors: ['Internal server error during setup'] 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    // Check if setup is needed
    const needsSetup = await setupService.needsSetup(instanceId || undefined);

    return NextResponse.json({
      needsSetup,
      instanceId
    });
  } catch (error) {
    console.error('Setup status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}