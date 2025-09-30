import { NextRequest, NextResponse } from 'next/server';
import { whiteLabelConfigService } from '@/services/white-label-config.service';
import { WhiteLabelConfiguration } from '@/types/funifier';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    const body = await request.json();
    const { apiKey, serverUrl, authToken } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      );
    }

    // Validate and normalize the server URL
    let normalizedServerUrl = serverUrl || 'https://service2.funifier.com/v3';
    
    // Ensure the URL ends with /v3
    if (!normalizedServerUrl.endsWith('/v3')) {
      normalizedServerUrl = normalizedServerUrl.replace(/\/+$/, '') + '/v3';
    }

    // Ensure it's using the correct Funifier domain
    if (!normalizedServerUrl.includes('funifier.com')) {
      return NextResponse.json(
        { error: 'Server URL must be a valid Funifier API endpoint (https://service2.funifier.com/v3)' },
        { status: 400 }
      );
    }

    // Test the credentials by making a basic API call
    try {
      const testUrl = `${normalizedServerUrl}/auth/token`;
      
      // Create a test request to validate the API key
      const testBody = new URLSearchParams({
        apiKey: apiKey,
        grant_type: 'client_credentials'
      }).toString();

      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: testBody,
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('Funifier API test failed:', testResponse.status, errorText);
        
        return NextResponse.json(
          { 
            error: 'Invalid Funifier credentials. Please check your API Key.',
            details: `API test failed with status ${testResponse.status}`
          },
          { status: 401 }
        );
      }

      // If test successful, save the configuration
      const config = await whiteLabelConfigService.getConfiguration(instanceId);
      
      const updatedConfig: WhiteLabelConfiguration = {
        instanceId,
        branding: config?.branding || {
          companyName: 'White Label Platform',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          accentColor: '#10B981',
          logo: '',
          favicon: '',
          tagline: 'Powered by Funifier'
        },
        features: config?.features || {
          ranking: true,
          dashboards: {
            main: true,
            analytics: true,
            achievements: true,
            teams: true
          },
          history: true,
          personalizedRanking: true
        },
        funifierIntegration: {
          apiKey,
          serverUrl: normalizedServerUrl,
          authToken: authToken || config?.funifierIntegration?.authToken || '',
          customCollections: config?.funifierIntegration?.customCollections || []
        },
        createdAt: config?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      await whiteLabelConfigService.saveConfiguration(instanceId, updatedConfig, 'setup-api');

      return NextResponse.json({
        success: true,
        message: 'Funifier credentials configured successfully',
        serverUrl: normalizedServerUrl
      });

    } catch (testError) {
      console.error('Funifier API test error:', testError);
      return NextResponse.json(
        { 
          error: 'Failed to validate Funifier credentials. Please check your API Key and server URL.',
          details: testError instanceof Error ? testError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    const config = await whiteLabelConfigService.getConfiguration(instanceId);
    
    return NextResponse.json({
      isConfigured: !!config?.funifierIntegration?.apiKey,
      serverUrl: config?.funifierIntegration?.serverUrl || 'https://service2.funifier.com/v3',
      hasApiKey: !!config?.funifierIntegration?.apiKey,
      lastUpdated: config?.updatedAt
    });

  } catch (error) {
    console.error('Setup status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}