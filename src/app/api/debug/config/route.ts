import { NextRequest, NextResponse } from 'next/server';
import { whiteLabelConfigService } from '@/services/white-label-config.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance');
    
    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
        { status: 400 }
      );
    }

    console.log(`Debug: Checking configuration for instance: ${instanceId}`);
    
    const config = await whiteLabelConfigService.getConfiguration(instanceId);
    
    const debugInfo = {
      instanceId,
      configExists: !!config,
      hasFunifierIntegration: !!config?.funifierIntegration,
      funifierCredentials: config?.funifierIntegration ? {
        hasApiKey: !!config.funifierIntegration.apiKey,
        hasServerUrl: !!config.funifierIntegration.serverUrl,
        hasAuthToken: !!config.funifierIntegration.authToken,
        serverUrl: config.funifierIntegration.serverUrl // Safe to show URL
      } : null,
      branding: config?.branding,
      features: config?.features
    };

    console.log('Debug info:', debugInfo);

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug config error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration debug info' },
      { status: 500 }
    );
  }
}