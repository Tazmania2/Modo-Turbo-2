import { NextRequest, NextResponse } from 'next/server';
import { funifierEnvService } from '@/services/funifier-env.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get instance ID from query params if provided
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || undefined;

    console.log('Setup API called with:', { mode: body.mode, instanceId });

    // Handle demo mode
    if (body.mode === 'demo') {
      const demoInstanceId = instanceId || `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      console.log('Demo mode detected, returning success immediately');
      return NextResponse.json({
        success: true,
        instanceId: demoInstanceId,
        redirectUrl: `/dashboard?instance=${demoInstanceId}&mode=demo`
      }, { status: 200 });
    }

    // For Funifier mode, check environment configuration
    const credentialsInfo = funifierEnvService.getCredentialsInfo();
    
    if (!credentialsInfo.isConfigured) {
      return NextResponse.json({
        success: false,
        errors: ['Funifier credentials not configured in environment variables. Please set FUNIFIER_API_KEY, FUNIFIER_APP_SECRET, and FUNIFIER_BASIC_TOKEN in your Vercel deployment.']
      }, { status: 400 });
    }

    // Test connection
    const connectionTest = await funifierEnvService.testConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        errors: [connectionTest.message]
      }, { status: 400 });
    }

    // Generate instance ID for Funifier mode
    const funifierInstanceId = instanceId || `funifier_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return NextResponse.json({
      success: true,
      instanceId: funifierInstanceId,
      redirectUrl: `/admin/login?instance=${funifierInstanceId}`
    }, { status: 200 });

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

    // With environment-based config, setup is always "complete"
    // The system will work with either demo mode or environment credentials
    const credentialsInfo = funifierEnvService.getCredentialsInfo();

    return NextResponse.json({
      needsSetup: false, // No complex setup needed anymore
      instanceId,
      isConfigured: credentialsInfo.isConfigured,
      isDemoMode: funifierEnvService.isDemoMode()
    });
  } catch (error) {
    console.error('Setup status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}