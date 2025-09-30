/**
 * Demo mode utilities
 */

/**
 * Check if we're currently in demo mode
 */
export function isDemoMode(): boolean {
  if (typeof window !== 'undefined') {
    // Check localStorage for demo mode flag
    const demoFlag = localStorage.getItem('demo_mode');
    if (demoFlag === 'true') return true;
  }
  
  // Check environment variables (server-side compatible)
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    !process.env.FUNIFIER_API_KEY ||
    process.env.FUNIFIER_API_KEY === "demo"
  );
}

/**
 * Get the appropriate API endpoint based on demo mode
 */
export function getApiEndpoint(endpoint: string): string {
  if (isDemoMode()) {
    // Convert regular endpoints to demo endpoints
    if (endpoint.startsWith('/api/ranking/')) {
      return '/api/demo/ranking';
    }
    if (endpoint.startsWith('/api/dashboard/history/')) {
      return '/api/demo/history';
    }
    if (endpoint.startsWith('/api/dashboard/')) {
      return '/api/demo/dashboard';
    }
  }
  
  return endpoint;
}

/**
 * Set demo mode flag
 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    if (enabled) {
      localStorage.setItem('demo_mode', 'true');
    } else {
      localStorage.removeItem('demo_mode');
    }
  }
}

/**
 * Clear demo mode and redirect to setup
 */
export function exitDemoMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('auth_user');
    window.location.href = '/setup';
  }
}