import { NextRequest, NextResponse } from 'next/server';

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
    
    // Get the API key from configuration (we need this for Funifier auth)
    // For now, we'll try to get it from cache or use a default approach
    let apiKey = '';
    let serverUrl = 'https://service2.funifier.com';
    
    try {
      // Try to get from cache first (no database calls to avoid auth issues)
      const { whiteLabelConfigCache } = await import('@/utils/cache');
      const cachedConfig = whiteLabelConfigCache.getConfiguration(instanceId);
      
      if (cachedConfig?.funifierIntegration?.apiKey) {
        apiKey = cachedConfig.funifierIntegration.apiKey;
        serverUrl = cachedConfig.funifierIntegration.serverUrl || serverUrl;
      }
    } catch (cacheError) {
      console.warn('Could not get API key from cache:', cacheError);
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Funifier API key not configured. Please complete setup first.' },
        { status: 400 }
      );
    }
    
    // Use the correct Funifier authentication endpoint
    const funifierUrl = `${serverUrl}/v3/auth/token`;
    
    console.log(`Authenticating user ${username} with Funifier at ${funifierUrl}...`);
    
    const authResponse = await fetch(funifierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: apiKey,
        grant_type: 'password',
        username: username,
        password: password,
      }),
    });
    
    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      console.error('Funifier authentication failed:', errorData);
      
      return NextResponse.json(
        { error: errorData.message || 'Authentication failed' },
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