import { NextRequest, NextResponse } from 'next/server';
import { funifierAuthService } from '@/services/funifier-auth.service';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Attempt to refresh the access token
    const authResponse = await funifierAuthService.refreshAccessToken();

    // Create response with new tokens
    const response = NextResponse.json({
      success: true,
      expires_in: authResponse.expires_in,
    });

    // Update access token cookie
    response.cookies.set('auth_token', authResponse.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: authResponse.expires_in,
      path: '/',
    });

    // Update refresh token if provided
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
    console.error('Token refresh error:', error);
    
    // Clear invalid tokens
    const response = NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 401 }
    );

    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');

    return response;
  }
}