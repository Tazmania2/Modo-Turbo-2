import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { themeService, ThemeService } from '../theme.service';
import { brandingService } from '../branding.service';
import { WhiteLabelBranding } from '@/types/funifier';

// Mock dependencies
vi.mock('../branding.service');

const mockBrandingService = brandingService as {
  getBranding: Mock;
  generateCSSProperties: Mock;
  generateTailwindConfig: Mock;
};

// Mock DOM APIs
const mockDocument = {
  documentElement: {
    style: {
      setProperty: vi.fn()
    }
  },
  body: {
    classList: {
      add: vi.fn()
    }
  },
  head: {
    appendChild: vi.fn()
  },
  createElement: vi.fn(),
  getElementById: vi.fn(),
  querySelector: vi.fn(),
  title: 'Test Page'
};

const mockStyleElement = {
  id: 'white-label-theme',
  type: 'text/css',
  textContent: ''
};

vi.stubGlobal('document', mockDocument);

describe('ThemeService', () => {
  const mockInstanceId = 'test-instance';
  
  const mockBranding: WhiteLabelBranding = {
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    accentColor: '#10B981',
    logo: 'https://example.com/logo.png',
    favicon: 'https://example.com/favicon.ico',
    companyName: 'Test Company',
    tagline: 'Test Tagline'
  };

  const mockCSSProperties = {
    '--color-primary-500': '#3B82F6',
    '--color-secondary-500': '#1F2937',
    '--color-accent-500': '#10B981',
    '--company-name': '"Test Company"',
    '--company-tagline': '"Test Tagline"'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset theme service state
    const service = ThemeService.getInstance();
    (service as any).currentTheme = { isLoaded: false };
    
    // Setup DOM mocks
    mockDocument.getElementById.mockReturnValue(null);
    mockDocument.createElement.mockReturnValue(mockStyleElement);
    mockDocument.querySelector.mockReturnValue(null);
  });

  describe('loadTheme', () => {
    it('should load and apply theme successfully', async () => {
      mockBrandingService.getBranding.mockResolvedValue(mockBranding);
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);

      await themeService.loadTheme(mockInstanceId);

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.isLoaded).toBe(true);
      expect(currentTheme.instanceId).toBe(mockInstanceId);
      expect(currentTheme.branding).toEqual(mockBranding);
    });

    it('should apply default theme when branding not found', async () => {
      mockBrandingService.getBranding.mockResolvedValue(null);
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);

      await themeService.loadTheme(mockInstanceId);

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.isLoaded).toBe(true);
      expect(currentTheme.instanceId).toBe(mockInstanceId);
      expect(currentTheme.branding?.companyName).toBe('Gamification Platform');
    });

    it('should handle errors gracefully', async () => {
      mockBrandingService.getBranding.mockRejectedValue(new Error('API Error'));
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);

      await themeService.loadTheme(mockInstanceId);

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.isLoaded).toBe(true);
      expect(currentTheme.branding?.companyName).toBe('Gamification Platform');
    });
  });

  describe('applyTheme', () => {
    it('should apply theme with DOM updates', async () => {
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);

      await themeService.applyTheme(mockInstanceId, mockBranding, { updateDOM: true });

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.isLoaded).toBe(true);
      expect(currentTheme.branding).toEqual(mockBranding);
      expect(currentTheme.cssProperties).toEqual(mockCSSProperties);
    });

    it('should apply theme without DOM updates', async () => {
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);

      await themeService.applyTheme(mockInstanceId, mockBranding, { updateDOM: false });

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.isLoaded).toBe(true);
      expect(currentTheme.branding).toEqual(mockBranding);
      
      // DOM methods should not be called
      expect(mockDocument.documentElement.style.setProperty).not.toHaveBeenCalled();
    });
  });

  describe('updateColors', () => {
    beforeEach(async () => {
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);
      await themeService.applyTheme(mockInstanceId, mockBranding);
    });

    it('should update colors in real-time', async () => {
      const newColors = {
        primary: '#FF0000',
        secondary: '#00FF00'
      };

      const updatedCSSProperties = {
        ...mockCSSProperties,
        '--color-primary-500': '#FF0000',
        '--color-secondary-500': '#00FF00'
      };

      mockBrandingService.generateCSSProperties.mockReturnValue(updatedCSSProperties);

      await themeService.updateColors(newColors);

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.branding?.primaryColor).toBe('#FF0000');
      expect(currentTheme.branding?.secondaryColor).toBe('#00FF00');
    });

    it('should handle missing branding gracefully', async () => {
      // Reset theme to unloaded state
      (themeService as any).currentTheme = { isLoaded: false };

      await themeService.updateColors({ primary: '#FF0000' });

      // Should not throw error and theme should remain unloaded
      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.isLoaded).toBe(false);
    });
  });

  describe('updateCompanyInfo', () => {
    beforeEach(async () => {
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);
      await themeService.applyTheme(mockInstanceId, mockBranding);
    });

    it('should update company information', async () => {
      const newInfo = {
        companyName: 'New Company',
        tagline: 'New Tagline'
      };

      const updatedCSSProperties = {
        ...mockCSSProperties,
        '--company-name': '"New Company"',
        '--company-tagline': '"New Tagline"'
      };

      mockBrandingService.generateCSSProperties.mockReturnValue(updatedCSSProperties);

      await themeService.updateCompanyInfo(newInfo);

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.branding?.companyName).toBe('New Company');
      expect(currentTheme.branding?.tagline).toBe('New Tagline');
    });
  });

  describe('updateLogo', () => {
    beforeEach(async () => {
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);
      await themeService.applyTheme(mockInstanceId, mockBranding);
    });

    it('should update logo', async () => {
      const newLogoUrl = 'https://example.com/new-logo.png';

      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);

      await themeService.updateLogo(newLogoUrl);

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.branding?.logo).toBe(newLogoUrl);
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of theme changes', async () => {
      const callback = vi.fn();
      const unsubscribe = themeService.subscribe(callback);

      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);
      await themeService.applyTheme(mockInstanceId, mockBranding);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        isLoaded: true,
        instanceId: mockInstanceId,
        branding: mockBranding
      }));

      unsubscribe();
    });

    it('should allow unsubscribing', async () => {
      const callback = vi.fn();
      const unsubscribe = themeService.subscribe(callback);

      unsubscribe();

      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);
      await themeService.applyTheme(mockInstanceId, mockBranding);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('generateThemeCSS', () => {
    it('should generate CSS string from current theme', async () => {
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);
      await themeService.applyTheme(mockInstanceId, mockBranding);

      const css = themeService.generateThemeCSS();

      expect(css).toContain(':root {');
      expect(css).toContain('--color-primary-500: #3B82F6;');
      expect(css).toContain('--company-name: "Test Company";');
    });

    it('should return empty string when no theme loaded', () => {
      const css = themeService.generateThemeCSS();
      expect(css).toBe('');
    });
  });

  describe('exportThemeConfig', () => {
    it('should export complete theme configuration', async () => {
      const mockTailwindConfig = { colors: { primary: { 500: 'var(--color-primary-500)' } } };
      
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);
      mockBrandingService.generateTailwindConfig.mockReturnValue(mockTailwindConfig);
      
      await themeService.applyTheme(mockInstanceId, mockBranding);

      const config = themeService.exportThemeConfig();

      expect(config).toHaveProperty('branding', mockBranding);
      expect(config).toHaveProperty('cssProperties', mockCSSProperties);
      expect(config).toHaveProperty('tailwindConfig', mockTailwindConfig);
    });

    it('should return empty object when no theme loaded', () => {
      const config = themeService.exportThemeConfig();
      expect(config).toEqual({});
    });
  });

  describe('resetTheme', () => {
    it('should reset to default theme', async () => {
      mockBrandingService.generateCSSProperties.mockReturnValue(mockCSSProperties);
      
      // First apply a custom theme
      await themeService.applyTheme(mockInstanceId, mockBranding);
      
      // Then reset
      await themeService.resetTheme();

      const currentTheme = themeService.getCurrentTheme();
      expect(currentTheme.branding?.companyName).toBe('Gamification Platform');
    });
  });

  describe('preloadTheme', () => {
    it('should preload theme successfully', async () => {
      mockBrandingService.getBranding.mockResolvedValue(mockBranding);

      const result = await themeService.preloadTheme(mockInstanceId);

      expect(result).toEqual(mockBranding);
      expect(mockBrandingService.getBranding).toHaveBeenCalledWith(mockInstanceId);
    });

    it('should handle preload errors', async () => {
      mockBrandingService.getBranding.mockRejectedValue(new Error('Preload failed'));

      const result = await themeService.preloadTheme(mockInstanceId);

      expect(result).toBeNull();
    });
  });
});