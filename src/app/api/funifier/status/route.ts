import { NextRequest, NextResponse } from 'next/server';
import { funifierEnvService } from '@/services/funifier-env.service';

export async function GET(request: NextRequest) {
  try {
    // Get credentials info (without sensitive data)
    const credentialsInfo = funifierEnvService.getCredentialsInfo();
    
    // Test connection if credentials are configured
    let connectionTest = null;
    if (credentialsInfo.isConfigured) {
      connectionTest = await funifierEnvService.testConnection();
    }

    return NextResponse.json({
      ...credentialsInfo,
      connectionTest,
      isDemoMode: funifierEnvService.isDemoMode(),
      apiUrl: funifierEnvService.getApiUrl(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Funifier status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check Funifier status',
        isConfigured: false,
        isDemoMode: funifierEnvService.isDemoMode()
      },
      { status: 500 }
    );
  }
}