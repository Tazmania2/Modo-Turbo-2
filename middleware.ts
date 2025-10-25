import { NextRequest, NextResponse } from 'next/server';

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/ranking',
  '/admin',
  '/profile',
];

/**
 * Routes that require admin role
 */
const ADMIN_ROUTES = [
  '/admin',
];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/admin/login',
  '/setup',
  '/api/demo-data',
  '/api/setup',
];

/**
 * Check if a path matches any of the route patterns
 * Note: This checks exact matches or sub-paths, but /admin/login won't match /admin
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1));
    }
    // Exact match
    if (pathname === route) {
      return true;
    }
    // Sub-path match (e.g., /admin/settings matches /admin)
    // But /admin/login should not match /admin if /admin/login is in PUBLIC_ROUTES
    if (pathname.startsWith(`${route}/`)) {
      return true;
    }
    return false;
  });
}

/**
 * Check if a path is explicitly public (takes precedence over protected routes)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname === route;
  });
}

/**
 * Get authentication token from request
 */
function getAuthToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const tokenCookie = request.cookies.get('funifier_token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

/**
 * Verify token validity (basic check - full verification happens in API routes)
 */
function isTokenValid(token: string | null): boolean {
  if (!token) {
    return false;
  }

  try {
    // Basic JWT structure check
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) {
      return true; // No expiration set
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    return exp > now + 300;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Next.js middleware for authentication and request handling
 * This runs before API routes and page requests
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Create response with security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Only add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    // Allow credentials for same-origin requests
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Set CORS headers for development
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
      );
    }
  }

  // Skip authentication check for public routes (check this first!)
  // Public routes take precedence over protected routes
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Check authentication for protected routes
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    const token = getAuthToken(request);
    const hasValidToken = isTokenValid(token);

    // If user is authenticated, allow access to all protected routes
    // This removes authentication barriers for authenticated users
    if (hasValidToken) {
      // For admin routes, add a header to indicate admin check is needed
      // The actual admin verification will happen in the page component
      if (matchesRoute(pathname, ADMIN_ROUTES)) {
        response.headers.set('X-Require-Admin', 'true');
      }
      
      // Add authentication status header
      response.headers.set('X-Authenticated', 'true');
      
      // Preserve the intended destination for deep linking
      return response;
    }

    // User is not authenticated
    // Check if demo mode is enabled
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE_ENABLED === 'true';
    
    if (!isDemoMode) {
      // Redirect to login for non-API routes with deep linking support
      if (!pathname.startsWith('/api/')) {
        const loginUrl = new URL('/admin/login', request.url);
        // Only add redirect parameter if not already on a login page
        if (pathname !== '/admin/login' && pathname !== '/login') {
          loginUrl.searchParams.set('redirect', pathname);
          // Preserve query parameters
          request.nextUrl.searchParams.forEach((value, key) => {
            loginUrl.searchParams.set(key, value);
          });
        }
        return NextResponse.redirect(loginUrl);
      }
      
      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Demo mode is enabled, allow access
    response.headers.set('X-Demo-Mode', 'true');
  }

  return response;
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};