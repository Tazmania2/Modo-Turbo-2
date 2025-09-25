import { NextRequest, NextResponse } from 'next/server';
import { funifierAuthService } from '@/services/funifier-auth.service';
import { FunifierCredentials } from '@/types/funifier';
import { whiteLabelConfigService } from '@/services/white-label-config.service';
import { withValidation, commonSchemas } from '@/middleware/validation';
import { withPublicSecurity } from '@/middleware/security';
import { handleApiError } from '@/middleware/error-handler';

export interface LoginRequest {
  username: string;
  password: string;
}

async function loginHandler(
  request: NextRequest,
  context: any,
  validatedData?: { body?: LoginRequest; query?: any; params?: any }
) {
  try {
    if (!validatedData?.body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { username, password } = validatedData.body;

    // Get instance ID from query params or use default
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    // Get Funifier credentials from white-label config
    console.log(`Login attempt for instance: ${instanceId}`);
    const config = await whiteLabelConfigService.getConfiguration(instanceId);
    console.log('Retrieved configuration:', config ? 'Found' : 'Not found');
    
    if (!config) {
      console.error(`No configuration found for instance: ${instanceId}`);
      return NextResponse.json(
        { error: 'System configuration error. Please contact your administrator.' },
        { status: 500 }
      );
    }
    
    if (!config.funifierIntegration) {
      console.error(`No Funifier integration found for instance: ${instanceId}`);
      return NextResponse.json(
        { error: 'System configuration error. Please contact your administrator.' },
        { status: 500 }
      );
    }
    
    if (!config.funifierIntegration.apiKey || !config.funifierIntegration.serverUrl || !config.funifierIntegration.authToken) {
      console.error(`Incomplete Funifier credentials for instance: ${instanceId}`, {
        hasApiKey: !!config.funifierIntegration.apiKey,
        hasServerUrl: !!config.funifierIntegration.serverUrl,
        hasAuthToken: !!config.funifierIntegration.authToken
      });
      return NextResponse.json(
        { error: 'System configuration error. Please contact your administrator.' },
        { status: 500 }
      );
    }

    // Initialize auth service with credentials
    const credentials: FunifierCredentials = {
      apiKey: config.funifierIntegration.apiKey,
      serverUrl: config.funifierIntegration.serverUrl,
      authToken: config.funifierIntegration.authToken,
    };

    console.log('Initializing Funifier auth service with credentials...');
    try {
      funifierAuthService.initialize(credentials);
    } catch (initError) {
      console.error('Failed to initialize Funifier auth service:', initError);
      return NextResponse.json(
        { error: 'System configuration error. Please contact your administrator.' },
        { status: 500 }
      );
    }

    // Attempt login with context
    console.log(`Attempting Funifier login for user: ${username}`);
    try {
      const authResponse = await funifierAuthService.login(
        {
          username,
          password,
        },
        {
          userAgent: request.headers.get('user-agent') || 'unknown',
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        }
      );
      
      console.log('Funifier login successful');
      
      // Create session cookie
      const response = NextResponse.json({
        success: true,
        user: authResponse.user,
        expires_in: authResponse.expires_in,
      });

      // Set HTTP-only cookie with access token
      response.cookies.set('auth_token', authResponse.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: authResponse.expires_in,
        path: '/',
      });

      // Set refresh token if available
      if (authResponse.refresh_token) {
        response.cookies.set('refresh_token', authResponse.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/',
        });
      }

      return response;
    } catch (loginError) {
      console.error('Funifier login failed:', loginError);
      return NextResponse.json(
        { error: loginError instanceof Error ? loginError.message : 'Login failed' },
        { status: 401 }
      );
    }
  } catch (error) {
    return handleApiError(error, 'Login failed');
  }
}

export async function POST(request: NextRequest, context: any) {
  const validatedHandler = withValidation(commonSchemas.loginBody)(loginHandler);
  return withPublicSecurity(validatedHandler)(request, context);
}