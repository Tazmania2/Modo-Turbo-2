import { NextRequest, NextResponse } from 'next/server';

/**
 * Headless authentication - redirect to Funifier
 * This app should not handle authentication directly
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    console.log(`Login redirect requested for instance: ${instanceId}`);
    
    // Completely headless approach - use default Funifier URL
    // Don't try to get any stored configuration to avoid authentication issues
    const defaultFunifierUrl = process.env.DEFAULT_FUNIFIER_URL || 'https://service2.funifier.com';
    const returnUrl = `${request.nextUrl.origin}/dashboard?instance=${instanceId}`;
    const funifierLoginUrl = `${defaultFunifierUrl}/login?redirect_uri=${encodeURIComponent(returnUrl)}`;
    
    console.log(`Redirecting to Funifier login: ${funifierLoginUrl}`);
    return NextResponse.redirect(funifierLoginUrl);
    
  } catch (error) {
    console.error('Failed to redirect to Funifier login:', error);
    
    // Return JSON error instead of redirect to see what's happening
    return NextResponse.json(
      { 
        error: 'Failed to redirect to Funifier login',
        details: error instanceof Error ? error.message : 'Unknown error',
        instanceId: request.nextUrl.searchParams.get('instance')
      },
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests - this should not be used in headless mode
 * Return error with guidance to use Funifier directly
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get('instance');
  
  // Log POST attempt for debugging
  console.warn('POST login attempt detected - this should use GET redirect instead');
  
  return NextResponse.json(
    { 
      error: 'This app uses Funifier authentication. Please login through Funifier directly.',
      message: 'Redirecting to Funifier login...',
      redirectTo: instanceId ? `/api/auth/login?instance=${instanceId}` : '/api/auth/login'
    },
    { status: 302 }
  );
}