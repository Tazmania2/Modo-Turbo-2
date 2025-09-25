import { NextRequest, NextResponse } from 'next/server';
import { setupService } from '@/services/setup.service';
import { SetupRequest } from '@/types/funifier';

export async function POST(request: NextRequest) {
  try {
    const body: SetupRequest = await request.json();
    
    // Get instance ID from query params if provided
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;

    console.log('Setup API called with:', { mode: body.mode, instanceId });

    // Quick fix for demo mode - always return success
    if (body.mode === 'demo') {
      const demoInstanceId = instanceId || `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      console.log('Demo mode detected, returning success immediately');
      return NextResponse.json({
        success: true,
        instanceId: demoInstanceId,
        redirectUrl: `/dashboard?instance=${demoInstanceId}`
      }, { status: 200 });
    }

    // Handle the setup request for non-demo modes
    const result = await setupService.handleSetup(body, instanceId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      console.error('Setup failed:', result.errors);
      
      // Provide more helpful error messages
      const enhancedErrors = result.errors?.map(error => {
        if (error.includes('Failed to save configuration to database')) {
          return 'Unable to connect to Funifier database. Please check your credentials and network connection. The configuration has been saved locally and you can try again later.';
        }
        if (error.includes('Failed to initialize Funifier database')) {
          return 'Could not initialize Funifier database. Please verify your API credentials and that your Funifier instance is accessible.';
        }
        if (error.includes('Failed to connect to Funifier')) {
          return 'Cannot reach Funifier server. Please check the server URL and your network connection.';
        }
        return error;
      });
      
      return NextResponse.json({
        ...result,
        errors: enhancedErrors
      }, { status: 400 });
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