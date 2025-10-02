import { NextRequest, NextResponse } from 'next/server';
import { demoDataService } from '@/services/demo-data.service';
import { funifierEnvService } from '@/services/funifier-env.service';

/**
 * Headless authentication - redirect to Funifier
 * This app should not handle authentication directly
 */
export async function GET(request: NextRequest) {
  // GET requests should redirect to login page, not handle authentication
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get('instance');
  
  const loginPageUrl = instanceId 
    ? `/admin/login?instance=${instanceId}`
    : '/admin/login';
    
  return NextResponse.redirect(`${request.nextUrl.origin}${loginPageUrl}`);
}

/**
 * Handle POST requests - this should not be used in headless mode
 * Return error with guidance to use Funifier directly
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if we're in demo mode
    if (demoDataService.isDemoMode()) {
      console.log('🎭 Demo mode - authenticating user:', username);
      
      try {
        const demoAuth = await demoDataService.authenticateDemo(username, password);
        console.log('🎭 Demo authentication successful');
        
        // Create session cookie with the demo token
        const response = NextResponse.json({
          success: true,
          message: 'Demo authentication successful',
          token_type: demoAuth.token_type,
          expires_in: demoAuth.expires_in,
          user_type: demoAuth.user_type,
          isDemoMode: true
        });
        
        // Set HTTP-only cookie with access token
        response.cookies.set('auth_token', demoAuth.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: demoAuth.expires_in,
          path: '/',
        });
        
        return response;
      } catch (demoError) {
        console.log('🎭 Demo authentication failed:', demoError);
        return NextResponse.json(
          { 
            error: demoError instanceof Error ? demoError.message : 'Invalid demo credentials',
            isDemoMode: true,
            availableCredentials: ['demo/demo', 'admin/admin', 'player1/demo']
          },
          { status: 401 }
        );
      }
    }
    
    // Get credentials from environment variables
    const credentialsInfo = funifierEnvService.getCredentialsInfo();
    
    if (!credentialsInfo.isConfigured) {
      console.error('Funifier credentials not configured in environment variables');
      return NextResponse.json(
        { 
          error: 'Funifier credentials not configured. Please set environment variables in your Vercel deployment.',
          instanceId: instanceId,
          needsSetup: true
        },
        { status: 400 }
      );
    }

    // Get API client from environment service
    const apiClient = funifierEnvService.getApiClient();
    const serverUrl = funifierEnvService.getApiUrl();
    
    // Use the correct Funifier authentication endpoint
    const funifierUrl = `${serverUrl}/auth/token`;
    
    // Validate the endpoint URL format
    if (!funifierUrl.includes('/v3/auth/token')) {
      console.error('Invalid auth endpoint URL:', funifierUrl);
      return NextResponse.json(
        { error: 'Invalid Funifier server configuration. URL must include /v3/auth/token' },
        { status: 500 }
      );
    }
    
    console.log(`Authenticating user ${username} with Funifier at ${funifierUrl}...`);
    console.log('API Key available:', process.env.FUNIFIER_API_KEY ? 'YES' : 'NO');
    console.log('Server URL:', serverUrl);
    
    // Create URL-encoded body as per Funifier documentation
    // CRITICAL: Do not send any Authorization headers to /v3/auth/token
    const urlEncodedBody = new URLSearchParams({
      apiKey: process.env.FUNIFIER_API_KEY || '',
      grant_type: 'password',
      username: username,
      password: password,
    }).toString();
    
    console.log('Request body (credentials masked):', {
      apiKey: process.env.FUNIFIER_API_KEY ? `${process.env.FUNIFIER_API_KEY.substring(0, 8)}...` : 'NOT_FOUND',
      grant_type: 'password',
      username: username,
      password: '***HIDDEN***'
    });
    
    // Headers for initial auth request - CRITICAL: NO Authorization header
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };
    
    // Double-check we're not accidentally including auth headers
    if ('authorization' in headers || 'Authorization' in headers) {
      console.error('CRITICAL ERROR: Authorization header found in auth request!');
      return NextResponse.json(
        { error: 'Internal error: Invalid request headers' },
        { status: 500 }
      );
    }
    
    console.log('Making auth request to:', funifierUrl);
    console.log('Headers (verified no auth):', headers);
    console.log('Body length:', urlEncodedBody.length);
    
    const authResponse = await fetch(funifierUrl, {
      method: 'POST',
      headers: headers,
      body: urlEncodedBody,
    });
    
    if (!authResponse.ok) {
      const responseText = await authResponse.text();
      console.error('=== FUNIFIER AUTH FAILED ===');
      console.error('Request URL:', funifierUrl);
      console.error('Request Method:', 'POST');
      console.error('Request Headers:', headers);
      console.error('Request Body:', urlEncodedBody);
      console.error('Response Status:', authResponse.status, authResponse.statusText);
      console.error('Response Headers:', Object.fromEntries(authResponse.headers.entries()));
      console.error('Response Body:', responseText);
      console.error('=== END DEBUG INFO ===');
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Could not parse error response as JSON:', parseError);
      }
      
      // Check for the specific auth error message
      const isAuthTypeError = responseText.includes('Need to inform a type of authentication');
      
      return NextResponse.json(
        { 
          error: errorData.message || errorData.errorMessage || 'Authentication failed',
          details: responseText,
          status: authResponse.status,
          isAuthTypeError,
          debugInfo: {
            url: funifierUrl,
            hasApiKey: !!process.env.FUNIFIER_API_KEY,
            bodyLength: urlEncodedBody.length
          }
        },
        { status: 401 }
      );
    }
    
    const authData = await authResponse.json();
    console.log('Funifier authentication successful');
    
    // Create session cookie with the bearer token
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token_type: authData.token_type,
      expires_in: authData.expires_in
    });
    
    // Set HTTP-only cookie with access token
    if (authData.access_token) {
      response.cookies.set('auth_token', authData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: Math.floor(authData.expires_in / 1000) || 3600, // Convert to seconds
        path: '/',
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}