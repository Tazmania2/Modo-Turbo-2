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
    
    // Use the correct Funifier authentication endpoint
    const funifierUrl = 'https://service2.funifier.com/v3/auth/basic';
    
    console.log(`Authenticating user ${username} with Funifier...`);
    
    const authResponse = await fetch(funifierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
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
      message: 'Authentication successful'
    });
    
    // Set HTTP-only cookie with access token
    if (authData.access_token) {
      response.cookies.set('auth_token', authData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: authData.expires_in || 3600, // Default 1 hour
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