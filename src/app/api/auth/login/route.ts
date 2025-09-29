import { NextRequest, NextResponse } from 'next/server';
import { whiteLabelConfigService } from '@/services/white-label-config.service';
import { whiteLabelConfigCache } from '@/utils/cache';

/**
 * Headless authentication - redirect to Funifier
 * This app should not handle authentication directly
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    // For headless authentication, we need to get the Funifier URL from cache only
    // We can't make database calls without authentication (chicken-and-egg problem)
    console.log(`Attempting login redirect for instance: ${instanceId}`);
    
    // Try cache-only first (no database calls)
    const cachedConfig = whiteLabelConfigCache.getConfiguration(instanceId);
    
    if (cachedConfig?.funifierIntegration?.serverUrl) {
      // Found in cache - use it
      const returnUrl = `${request.nextUrl.origin}/dashboard?instance=${instanceId}`;
      const funifierLoginUrl = `${cachedConfig.funifierIntegration.serverUrl}/login?redirect_uri=${encodeURIComponent(returnUrl)}`;
      
      console.log(`Redirecting to Funifier login: ${funifierLoginUrl}`);
      return NextResponse.redirect(funifierLoginUrl);
    }
    
    // If not in cache, we have a problem - setup might not be complete
    // or the cache was cleared. For now, redirect to a default Funifier URL
    // or back to setup
    console.warn(`No cached configuration found for instance: ${instanceId}`);
    
    // Try to use default Funifier URL from environment
    const defaultFunifierUrl = process.env.DEFAULT_FUNIFIER_URL || 'https://service2.funifier.com';
    const returnUrl = `${request.nextUrl.origin}/dashboard?instance=${instanceId}`;
    const funifierLoginUrl = `${defaultFunifierUrl}/login?redirect_uri=${encodeURIComponent(returnUrl)}`;
    
    console.log(`Using default Funifier URL for login: ${funifierLoginUrl}`);
    return NextResponse.redirect(funifierLoginUrl);
    
  } catch (error) {
    console.error('Failed to redirect to Funifier login:', error);
    
    // Last resort - redirect back to setup
    return NextResponse.redirect(`${request.nextUrl.origin}/setup?error=login_failed`);
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