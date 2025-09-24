import { NextRequest, NextResponse } from 'next/server';
import { whiteLabelConfigService } from '@/services/white-label-config.service';
import { funifierAuthService } from '@/services/funifier-auth.service';
import { decrypt } from '@/utils/encryption';

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
    
    if (!config || !config.funifierIntegration) {
      return NextResponse.json(
        { 
          isValid: false, 
          message: 'No Funifier credentials configured' 
        },
        { status: 400 }
      );
    }

    const { apiKey, serverUrl, authToken } = config.funifierIntegration;

    if (!apiKey || !authToken) {
      return NextResponse.json(
        { 
          isValid: false, 
          message: 'Incomplete Funifier credentials' 
        },
        { status: 400 }
      );
    }

    try {
      // Decrypt credentials
      const decryptedApiKey = decrypt(apiKey);
      const decryptedAuthToken = decrypt(authToken);

      // Test the connection
      const isValid = await funifierAuthService.validateCredentials({
        apiKey: decryptedApiKey,
        serverUrl: serverUrl || 'https://service2.funifier.com',
        authToken: decryptedAuthToken
      });

      if (isValid) {
        return NextResponse.json({
          isValid: true,
          message: 'Connection test successful - credentials are working correctly'
        });
      } else {
        return NextResponse.json({
          isValid: false,
          message: 'Connection test failed - credentials may be invalid or expired'
        });
      }

    } catch (decryptError) {
      console.error('Error decrypting credentials:', decryptError);
      return NextResponse.json(
        { 
          isValid: false, 
          message: 'Failed to decrypt stored credentials' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error testing Funifier connection:', error);
    return NextResponse.json(
      { 
        isValid: false, 
        message: 'Internal server error during connection test' 
      },
      { status: 500 }
    );
  }
}