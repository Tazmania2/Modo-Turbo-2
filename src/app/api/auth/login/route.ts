import { NextRequest, NextResponse } from 'next/server';
import { whiteLabelConfigService } from '@/services/white-label-config.service';

/**
 * Headless authentication - redirect to Funifier
 * This app should not handle authentication directly
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    // Get Funifier configuration
    const config = await whiteLabelConfigService.getConfiguration(instanceId);
    
    if (!config?.funifierIntegration?.serverUrl) {
      return NextResponse.json(
        { error: 'Funifier configuration not found. Please complete setup first.' },
        { status: 400 }
      );
    }
    
    // Redirect to Funifier login page
    const returnUrl = `${request.nextUrl.origin}/dashboard?instance=${instanceId}`;
    const funifierLoginUrl = `${config.funifierIntegration.serverUrl}/login?redirect_uri=${encodeURIComponent(returnUrl)}`;
    
    return NextResponse.redirect(funifierLoginUrl);
  } catch (error) {
    console.error('Failed to redirect to Funifier login:', error);
    return NextResponse.json(
      { error: 'Failed to redirect to Funifier login' },
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