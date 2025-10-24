/**
 * Demo Mode Service
 * Centralized service for managing demo mode detection and data source validation
 */

export interface DemoModeConfig {
  enabled: boolean;
  source: 'environment' | 'localStorage' | 'default';
  reason?: string;
}

export interface DataSourceInfo {
  source: 'funifier' | 'demo';
  isDemoMode: boolean;
  timestamp: number;
}

class DemoModeService {
  private static instance: DemoModeService;
  private demoModeCache: DemoModeConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): DemoModeService {
    if (!DemoModeService.instance) {
      DemoModeService.instance = new DemoModeService();
    }
    return DemoModeService.instance;
  }

  /**
   * Check if the system is running in demo mode
   * This is the single source of truth for demo mode detection
   */
  isDemoMode(): boolean {
    const config = this.getDemoModeConfig();
    return config.enabled;
  }

  /**
   * Get detailed demo mode configuration
   */
  getDemoModeConfig(): DemoModeConfig {
    // Use cache if valid
    if (this.demoModeCache && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.demoModeCache;
    }

    let enabled = false;
    let source: 'environment' | 'localStorage' | 'default' = 'default';
    let reason: string | undefined;

    // Priority 1: Check localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const localStorageFlag = localStorage.getItem('demo_mode');
      if (localStorageFlag === 'true') {
        enabled = true;
        source = 'localStorage';
        reason = 'Demo mode explicitly enabled via localStorage';
        this.cacheResult({ enabled, source, reason });
        return { enabled, source, reason };
      }
    }

    // Priority 2: Check environment variable
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      enabled = true;
      source = 'environment';
      reason = 'Demo mode enabled via NEXT_PUBLIC_DEMO_MODE environment variable';
      this.cacheResult({ enabled, source, reason });
      return { enabled, source, reason };
    }

    // Priority 3: Check if Funifier credentials are missing or set to 'demo'
    const hasValidFunifierKey = process.env.FUNIFIER_API_KEY && 
                                 process.env.FUNIFIER_API_KEY !== 'demo' &&
                                 process.env.FUNIFIER_API_KEY !== '';
    
    if (!hasValidFunifierKey) {
      enabled = true;
      source = 'default';
      reason = 'Demo mode enabled because Funifier API key is missing or set to "demo"';
      this.cacheResult({ enabled, source, reason });
      return { enabled, source, reason };
    }

    // Production mode - all checks passed
    enabled = false;
    source = 'default';
    reason = 'Production mode - valid Funifier credentials detected';
    this.cacheResult({ enabled, source, reason });
    return { enabled, source, reason };
  }

  /**
   * Enable demo mode (client-side only)
   */
  enableDemoMode(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_mode', 'true');
      this.clearCache();
      console.log('[Demo Mode] Demo mode enabled');
    }
  }

  /**
   * Disable demo mode (client-side only)
   */
  disableDemoMode(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo_mode');
      this.clearCache();
      console.log('[Demo Mode] Demo mode disabled');
    }
  }

  /**
   * Get data source information for tracking
   */
  getDataSourceInfo(): DataSourceInfo {
    const isDemoMode = this.isDemoMode();
    return {
      source: isDemoMode ? 'demo' : 'funifier',
      isDemoMode,
      timestamp: Date.now()
    };
  }

  /**
   * Validate that data is coming from the correct source
   */
  validateDataSource(data: any, expectedSource: 'funifier' | 'demo'): boolean {
    const currentSource = this.isDemoMode() ? 'demo' : 'funifier';
    
    if (currentSource !== expectedSource) {
      console.warn(
        `[Demo Mode] Data source mismatch: expected ${expectedSource}, but system is in ${currentSource} mode`
      );
      return false;
    }

    // Additional validation: check if data has demo markers
    if (data && typeof data === 'object') {
      const hasIdPrefix = data._id?.startsWith('demo_');
      const hasSourceField = data.source === 'demo';
      
      if (expectedSource === 'demo' && !hasIdPrefix && !hasSourceField) {
        console.warn('[Demo Mode] Data appears to be from production in demo mode');
        return false;
      }
      
      if (expectedSource === 'funifier' && (hasIdPrefix || hasSourceField)) {
        console.warn('[Demo Mode] Data appears to be demo data in production mode');
        return false;
      }
    }

    return true;
  }

  /**
   * Get visual indicator configuration for UI
   */
  getVisualIndicator(): {
    show: boolean;
    message: string;
    color: string;
    icon: string;
  } | null {
    if (!this.isDemoMode()) {
      return null;
    }

    const config = this.getDemoModeConfig();
    return {
      show: true,
      message: `Demo Mode Active (${config.source})`,
      color: '#FFA500',
      icon: '🎮'
    };
  }

  /**
   * Clear the demo mode cache
   */
  clearCache(): void {
    this.demoModeCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Cache the demo mode result
   */
  private cacheResult(config: DemoModeConfig): void {
    this.demoModeCache = config;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Log demo mode status (for debugging)
   */
  logStatus(): void {
    const config = this.getDemoModeConfig();
    console.log('[Demo Mode] Status:', {
      enabled: config.enabled,
      source: config.source,
      reason: config.reason,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const demoModeService = DemoModeService.getInstance();
