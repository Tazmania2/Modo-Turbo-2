import { NextRequest, NextResponse } from 'next/server';
import { funifierEnvService } from '@/services/funifier-env.service';
import { simpleFeatureStorageService } from '@/services/simple-feature-storage.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || 'test-instance';

    // Check Funifier credentials
    const credentialsInfo = funifierEnvService.getCredentialsInfo();
    
    // Try to get features
    let featuresResult = null;
    let featuresError = null;
    
    try {
      featuresResult = await simpleFeatureStorageService.getFeatures(instanceId);
    } catch (error) {
      featuresError = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      credentialsInfo,
      instanceId,
      featuresResult,
      featuresError,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}