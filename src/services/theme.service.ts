import { WhiteLabelBranding } from '@/types/funifier';
import { brandingService } from './branding.service';

export interface ThemeState {
  isLoaded: boolean;
  instanceId?: string;
  branding?: WhiteLabelBranding;
  cssProperties?: Record<string, string>;
}

export interface ThemeUpdateOptions {
  updateDOM?: boolean;
  updateTailwind?: boolean;
}

/**
 * Service for managing dynamic theme application and real-time updates
 */
export class ThemeService {
  private static instance: ThemeService;
  private currentTheme: ThemeState = { isLoaded: false };
  private styleElement: HTMLStyleElement | null = null;
  private observers: Set<(theme: ThemeState) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeStyleElement();
    }
  }

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Load and apply theme for an instance
   */
  async loadTheme(instanceId: string, options: ThemeUpdateOptions = {}): Promise<void> {
    try {
      const branding = await brandingService.getBranding(instanceId);
      
      if (branding) {
        await this.applyTheme(instanceId, branding, options);
      } else {
        // Apply default theme
        await this.applyDefaultTheme(instanceId, options);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      // Fallback to default theme
      await this.applyDefaultTheme(instanceId, options);
    }
  }

  /**
   * Apply theme configuration
   */
  async applyTheme(
    instanceId: string, 
    branding: WhiteLabelBranding, 
    options: ThemeUpdateOptions = {}
  ): Promise<void> {
    const { updateDOM = true, updateTailwind = true } = options;

    // Generate CSS properties
    const cssProperties = brandingService.generateCSSProperties(branding);

    // Update current theme state
    this.currentTheme = {
      isLoaded: true,
      instanceId,
      branding,
      cssProperties
    };

    // Apply to DOM if requested
    if (updateDOM && typeof window !== 'undefined') {
      this.updateDOMStyles(cssProperties);
      this.updateFavicon(branding.favicon);
      this.updatePageTitle(branding.companyName);
    }

    // Notify observers
    this.notifyObservers();
  }

  /**
   * Apply default neutral theme
   */
  async applyDefaultTheme(instanceId: string, options: ThemeUpdateOptions = {}): Promise<void> {
    const defaultBranding: WhiteLabelBranding = {
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      accentColor: '#10B981',
      logo: '',
      favicon: '',
      companyName: 'Gamification Platform',
      tagline: 'Powered by Funifier'
    };

    await this.applyTheme(instanceId, defaultBranding, options);
  }

  /**
   * Update theme colors in real-time
   */
  async updateColors(colors: { primary?: string; secondary?: string; accent?: string }): Promise<void> {
    if (!this.currentTheme.branding) return;

    const updatedBranding: WhiteLabelBranding = {
      ...this.currentTheme.branding,
      ...(colors.primary && { primaryColor: colors.primary }),
      ...(colors.secondary && { secondaryColor: colors.secondary }),
      ...(colors.accent && { accentColor: colors.accent })
    };

    await this.applyTheme(this.currentTheme.instanceId!, updatedBranding);
  }

  /**
   * Update company information in real-time
   */
  async updateCompanyInfo(info: { companyName?: string; tagline?: string }): Promise<void> {
    if (!this.currentTheme.branding) return;

    const updatedBranding: WhiteLabelBranding = {
      ...this.currentTheme.branding,
      ...info
    };

    await this.applyTheme(this.currentTheme.instanceId!, updatedBranding);
  }

  /**
   * Update logo in real-time
   */
  async updateLogo(logoUrl: string): Promise<void> {
    if (!this.currentTheme.branding) return;

    const updatedBranding: WhiteLabelBranding = {
      ...this.currentTheme.branding,
      logo: logoUrl
    };

    await this.applyTheme(this.currentTheme.instanceId!, updatedBranding);
  }

  /**
   * Get current theme state
   */
  getCurrentTheme(): ThemeState {
    return { ...this.currentTheme };
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: (theme: ThemeState) => void): () => void {
    this.observers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.observers.delete(callback);
    };
  }

  /**
   * Generate CSS string for current theme
   */
  generateThemeCSS(): string {
    if (!this.currentTheme.cssProperties) return '';

    const cssRules = Object.entries(this.currentTheme.cssProperties)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join('\n');

    return `:root {\n${cssRules}\n}`;
  }

  /**
   * Export theme configuration for external use
   */
  exportThemeConfig(): Record<string, any> {
    if (!this.currentTheme.branding) return {};

    return {
      branding: this.currentTheme.branding,
      cssProperties: this.currentTheme.cssProperties,
      tailwindConfig: brandingService.generateTailwindConfig(this.currentTheme.branding)
    };
  }

  /**
   * Reset to default theme
   */
  async resetTheme(): Promise<void> {
    if (this.currentTheme.instanceId) {
      await this.applyDefaultTheme(this.currentTheme.instanceId);
    }
  }

  /**
   * Preload theme for faster application
   */
  async preloadTheme(instanceId: string): Promise<WhiteLabelBranding | null> {
    try {
      return await brandingService.getBranding(instanceId);
    } catch (error) {
      console.error('Failed to preload theme:', error);
      return null;
    }
  }

  // Private methods

  private initializeStyleElement(): void {
    // Create or find the theme style element
    this.styleElement = document.getElementById('white-label-theme') as HTMLStyleElement;
    
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'white-label-theme';
      this.styleElement.type = 'text/css';
      document.head.appendChild(this.styleElement);
    }
  }

  private updateDOMStyles(cssProperties: Record<string, string>): void {
    if (!this.styleElement) return;

    // Generate CSS content
    const cssContent = this.generateThemeCSS();
    
    // Update style element
    this.styleElement.textContent = cssContent;

    // Also update CSS custom properties on document root
    const root = document.documentElement;
    Object.entries(cssProperties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Add theme class to body
    document.body.classList.add('white-label-theme');
  }

  private updateFavicon(faviconUrl: string): void {
    if (!faviconUrl) return;

    // Find existing favicon link
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }

    faviconLink.href = faviconUrl;
  }

  private updatePageTitle(companyName: string): void {
    if (!companyName) return;

    // Update page title to include company name
    const currentTitle = document.title;
    const baseTitles = ['Dashboard', 'Ranking', 'History', 'Admin'];
    
    let newTitle = currentTitle;
    const foundBaseTitle = baseTitles.find(title => currentTitle.includes(title));
    
    if (foundBaseTitle) {
      newTitle = `${foundBaseTitle} - ${companyName}`;
    } else if (!currentTitle.includes(companyName)) {
      newTitle = `${currentTitle} - ${companyName}`;
    }

    document.title = newTitle;
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.currentTheme);
      } catch (error) {
        console.error('Error in theme observer:', error);
      }
    });
  }
}

// Export singleton instance
export const themeService = ThemeService.getInstance();