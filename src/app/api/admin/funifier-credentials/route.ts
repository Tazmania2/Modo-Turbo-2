import { NextRequest, NextResponse } from 'next/server';
import { whiteLabelConfigService } from '@/services/white-label-config.service';
import { funifierAuthService } from '@/services/funifier-auth.service';
import { encrypt, decrypt } from '@/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance');

    if (!instanceId) {
      return NextResponse.json(
        { message: 'Instance ID is required' },
        { status: 400 }
      );
    }

    // Get the white-label configuration
    const config = await whiteLabelConfigService.getConfiguration(instanceId);
    
    if (!config) {
      return NextResponse.json(
        { hasCredentials: false, serverUrl: 'https://service2.funifier.com' },
        { status: 200 }
      );
    }

    // Check if credentials exist (don't return actual credentials for security)
    const hasCredentials = !!(
      config.funifierIntegration?.apiKey && 
      config.funifierIntegration?.authToken
    );

    return NextResponse.json({
      hasCredentials,
      serverUrl: config.funifierIntegration?.serverUrl || 'https://service2.funifier.com'
    });

  } catch (error) {
    console.error('Error fetching Funifier credentials status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceId, userId, credentials } = body;

    if (!instanceId || !userId || !credentials) {
      return NextResponse.json(
        { message: 'Instance ID, user ID, and credentials are required' },
        { status: 400 }
      );
    }

    const { apiKey, serverUrl, authToken } = credentials;

    if (!apiKey || !serverUrl || !authToken) {
      return NextResponse.json(
        { message: 'API key, server URL, and auth token are required' },
        { status: 400 }
      );
    }

    // Validate credentials first
    const isValid = await funifierAuthService.validateCredentials({
      apiKey,
      serverUrl,
      authToken
    });

    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid Funifier credentials' },
        { status: 400 }
      );
    }

    // Get existing configuration or create new one
    let config = await whiteLabelConfigService.getConfiguration(instanceId);
    
    if (!config) {
      // Create new configuration with credentials
      const setupResult = await whiteLabelConfigService.handleSetup({
        mode: 'funifier',
        funifierCredentials: credentials
      }, instanceId);

      if (!setupResult.success) {
        return NextResponse.json(
          { message: setupResult.message || 'Failed to save credentials' },
          { status: 500 }
        );
      }

      config = setupResult.configuration;
    } else {
      // Update existing configuration with new credentials
      const encryptedApiKey = encrypt(apiKey);
      const encryptedAuthToken = encrypt(authToken);

      const updatedConfig = {
        ...config,
        funifierIntegration: {
          ...config.funifierIntegration,
          apiKey: encryptedApiKey,
          serverUrl,
          authToken: encryptedAuthToken
        },
        updatedAt: Date.now(),
        lastModifiedBy: userId
      };

      const saveResult = await whiteLabelConfigService.saveConfiguration(updatedConfig);
      
      if (!saveResult.success) {
        return NextResponse.json(
          { message: saveResult.message || 'Failed to save credentials' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: 'Funifier credentials saved successfully',
      success: true
    });

  } catch (error) {
    console.error('Error saving Funifier credentials:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}