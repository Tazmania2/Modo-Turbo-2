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

    // Get Funifier credentials from white-label config
    // For now, we'll use a default instance ID. In production, this should come from the request
    const config = await whiteLabelConfigService.getConfiguration('default');
    if (!config?.funifierIntegration) {
      return NextResponse.json(
        { error: 'Funifier integration not configured' },
        { status: 500 }
      );
    }

    // Initialize auth service with credentials
    const credentials: FunifierCredentials = {
      apiKey: config.funifierIntegration.apiKey,
      serverUrl: config.funifierIntegration.serverUrl,
      authToken: config.funifierIntegration.authToken,
    };

    funifierAuthService.initialize(credentials);

    // Attempt login with context
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
  } catch (error) {
    return handleApiError(error, 'Login failed');
  }
}

export async function POST(request: NextRequest, context: any) {
  const validatedHandler = withValidation(commonSchemas.loginBody)(loginHandler);
  return withPublicSecurity(validatedHandler)(request, context);
}