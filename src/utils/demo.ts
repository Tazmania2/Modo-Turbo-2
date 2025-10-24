/**
 * Demo mode utilities
 * @deprecated Use demoModeService from @/services/demo-mode.service instead
 */

import { demoModeService } from '@/services/demo-mode.service';

/**
 * Check if we're currently in demo mode
 * @deprecated Use demoModeService.isDemoMode() instead
 */
export function isDemoMode(): boolean {
  return demoModeService.isDemoMode();
}

/**
 * Get the appropriate API endpoint based on demo mode
 */
export function getApiEndpoint(endpoint: string): string {
  if (demoModeService.isDemoMode()) {
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
 * @deprecated Use demoModeService.enableDemoMode() instead
 */
export function setDemoMode(enabled: boolean): void {
  if (enabled) {
    demoModeService.enableDemoMode();
  } else {
    demoModeService.disableDemoMode();
  }
}

/**
 * Clear demo mode and redirect to setup
 */
export function exitDemoMode(): void {
  demoModeService.disableDemoMode();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_user');
    window.location.href = '/setup';
  }
}