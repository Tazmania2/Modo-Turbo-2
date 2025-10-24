import { WhiteLabelBranding } from '@/types/funifier';
import { whiteLabelConfigService } from './white-label-config.service';
import { brandingDatabaseService } from './branding-database.service';
import { validateBrandingConfiguration } from '@/utils/validation';
import { getFunifierDirectService } from './funifier-direct.service';
import { WhiteLabelConfig } from '@/types/funifier-api-responses';
import { demoModeService } from './demo-mode.service';

export interface BrandingUpdateResult {
  success: boolean;
  branding?: WhiteLabelBranding;
  errors?: string[];
  warnings?: string[];
}

export interface AssetUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface BrandingAssets {
  logo?: string;
  favicon?: string;
}

/**
 * Service for managing white-label branding configuration
 */
export class BrandingService {
  private static instance: BrandingService;

  private constructor() {}

  static getInstance(): BrandingService {
    if (!BrandingService.instance) {
      BrandingService.instance = new BrandingService();
    }
    return BrandingService.instance;
  }

  /**
   * Get current branding configuration for an instance
   * Uses direct Funifier API integration or demo data based on mode
   */
  async getBranding(instanceId: string): Promise<WhiteLabelBranding | null> {
    try {
      // Check if we're in demo mode
      const isDemoMode = demoModeService.isDemoMode();
      
      if (isDemoMode) {
        // Return demo branding configuration
        console.log('[BrandingService] Using demo branding configuration');
        const demoBranding: WhiteLabelBranding = {
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          accentColor: '#F59E0B',
          logo: 'https://via.placeholder.com/200x80?text=Demo+Company',
          favicon: 'https://via.placeholder.com/32x32?text=D',
          companyName: 'Demo Company',
          tagline: 'Your Gamification Partner'
        };
        
        // Validate data source
        demoModeService.validateDataSource(demoBranding, 'demo');
        return demoBranding;
      }
      
      // Production mode - use direct Funifier API
      console.log('[BrandingService] Using Funifier API for branding');
      const funifierService = getFunifierDirectService();
      funifierService.setInstanceId(instanceId);
      
      const config = await funifierService.getWhiteLabelConfig();
      if (!config?.branding) return null;
      
      // Convert BrandingConfig to WhiteLabelBranding
      const branding = {
        primaryColor: config.branding.primaryColor,
        secondaryColor: config.branding.secondaryColor,
        accentColor: config.branding.accentColor,
        logo: config.branding.logo,
        favicon: config.branding.favicon || '',
        companyName: config.branding.companyName,
        tagline: config.branding.tagline || ''
      };
      
      // Validate data source
      demoModeService.validateDataSource(branding, 'funifier');
      return branding;
    } catch (error) {
      console.error('Failed to get branding configuration:', error);
      
      // In demo mode, return demo data on error
      if (demoModeService.isDemoMode()) {
        return {
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          accentColor: '#F59E0B',
          logo: 'https://via.placeholder.com/200x80?text=Demo+Company',
          favicon: 'https://via.placeholder.com/32x32?text=D',
          companyName: 'Demo Company',
          tagline: 'Your Gamification Partner'
        };
      }
      
      // Fallback to local service in production
      try {
        const config = await whiteLabelConfigService.getConfiguration(instanceId);
        return config?.branding || null;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Update branding configuration
   * Uses direct Funifier API integration to persist to white_label__c collection
   */
  async updateBranding(
    instanceId: string,
    branding: Partial<WhiteLabelBranding>,
    userId: string
  ): Promise<BrandingUpdateResult> {
    try {
      // Use direct Funifier API
      const funifierService = getFunifierDirectService();
      funifierService.setInstanceId(instanceId);
      
      // Get current configuration from Funifier
      const currentConfig = await funifierService.getWhiteLabelConfig();
      if (!currentConfig) {
        return {
          success: false,
          errors: ['Configuration not found for instance']
        };
      }

      // Merge with existing branding
      const updatedBranding: WhiteLabelBranding = {
        primaryColor: currentConfig.branding.primaryColor,
        secondaryColor: currentConfig.branding.secondaryColor,
        accentColor: currentConfig.branding.accentColor,
        logo: currentConfig.branding.logo,
        favicon: currentConfig.branding.favicon || '',
        companyName: currentConfig.branding.companyName,
        tagline: currentConfig.branding.tagline || '',
        ...branding
      };

      // Validate branding configuration
      const validation = validateBrandingConfiguration(updatedBranding);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Update configuration in Funifier
      const updatedConfig: WhiteLabelConfig = {
        ...currentConfig,
        branding: {
          logo: updatedBranding.logo,
          favicon: updatedBranding.favicon,
          primaryColor: updatedBranding.primaryColor,
          secondaryColor: updatedBranding.secondaryColor,
          accentColor: updatedBranding.accentColor,
          companyName: updatedBranding.companyName,
          tagline: updatedBranding.tagline
        },
        updatedAt: Date.now()
      };

      // Save directly to Funifier white_label__c collection
      await funifierService.saveWhiteLabelConfig(updatedConfig);

      return {
        success: true,
        branding: updatedBranding,
        warnings: validation.warnings
      };
    } catch (error) {
      console.error('Failed to update branding via Funifier:', error);
      
      // Fallback to local service
      try {
        const currentConfig = await whiteLabelConfigService.getConfiguration(instanceId);
        if (!currentConfig) {
          return {
            success: false,
            errors: ['Configuration not found for instance']
          };
        }

        const updatedBranding: WhiteLabelBranding = {
          ...currentConfig.branding,
          ...branding
        };

        const validation = validateBrandingConfiguration(updatedBranding);
        if (!validation.isValid) {
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings
          };
        }

        const updatedConfig = {
          ...currentConfig,
          branding: updatedBranding,
          updatedAt: Date.now()
        };

        const saveResult = await whiteLabelConfigService.saveConfiguration(
          instanceId,
          updatedConfig,
          userId
        );

        if (saveResult.success) {
          return {
            success: true,
            branding: updatedBranding,
            warnings: validation.warnings
          };
        } else {
          return {
            success: false,
            errors: saveResult.errors
          };
        }
      } catch (fallbackError) {
        return {
          success: false,
          errors: [`Failed to update branding: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
      }
    }
  }

  /**
   * Update theme colors
   */
  async updateThemeColors(
    instanceId: string,
    colors: ThemeColors,
    userId: string
  ): Promise<BrandingUpdateResult> {
    return this.updateBranding(instanceId, {
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent
    }, userId);
  }

  /**
   * Update company information
   */
  async updateCompanyInfo(
    instanceId: string,
    companyInfo: { companyName?: string; tagline?: string },
    userId: string
  ): Promise<BrandingUpdateResult> {
    return this.updateBranding(instanceId, companyInfo, userId);
  }

  /**
   * Update assets (logo, favicon)
   */
  async updateAssets(
    instanceId: string,
    assets: BrandingAssets,
    userId: string
  ): Promise<BrandingUpdateResult> {
    return this.updateBranding(instanceId, assets, userId);
  }

  /**
   * Upload and set logo
   */
  async uploadLogo(
    instanceId: string,
    logoFile: File,
    userId: string
  ): Promise<AssetUploadResult> {
    try {
      // Validate file
      if (!this.isValidImageFile(logoFile)) {
        return {
          success: false,
          error: 'Invalid image file. Please use PNG, JPG, or SVG format.'
        };
      }

      // Convert to base64 for storage (in a real app, you'd upload to a CDN)
      const logoUrl = await this.fileToBase64(logoFile);
      
      // Update branding with new logo
      const updateResult = await this.updateAssets(instanceId, { logo: logoUrl }, userId);
      
      if (updateResult.success) {
        return {
          success: true,
          url: logoUrl
        };
      } else {
        return {
          success: false,
          error: updateResult.errors?.[0] || 'Failed to update logo'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload logo'
      };
    }
  }

  /**
   * Upload and set favicon
   */
  async uploadFavicon(
    instanceId: string,
    faviconFile: File,
    userId: string
  ): Promise<AssetUploadResult> {
    try {
      // Validate file
      if (!this.isValidFaviconFile(faviconFile)) {
        return {
          success: false,
          error: 'Invalid favicon file. Please use ICO, PNG format (16x16 or 32x32).'
        };
      }

      // Convert to base64 for storage
      const faviconUrl = await this.fileToBase64(faviconFile);
      
      // Update branding with new favicon
      const updateResult = await this.updateAssets(instanceId, { favicon: faviconUrl }, userId);
      
      if (updateResult.success) {
        return {
          success: true,
          url: faviconUrl
        };
      } else {
        return {
          success: false,
          error: updateResult.errors?.[0] || 'Failed to update favicon'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload favicon'
      };
    }
  }

  /**
   * Reset branding to neutral defaults
   */
  async resetToDefaults(instanceId: string, userId: string): Promise<BrandingUpdateResult> {
    const defaultBranding: WhiteLabelBranding = {
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      accentColor: '#10B981',
      logo: '',
      favicon: '',
      companyName: 'Your Company',
      tagline: 'Gamification Made Simple'
    };

    return this.updateBranding(instanceId, defaultBranding, userId);
  }

  /**
   * Generate CSS custom properties from branding configuration
   */
  generateCSSProperties(branding: WhiteLabelBranding): Record<string, string> {
    const properties: Record<string, string> = {};

    // Generate color variations for primary color
    const primaryVariations = this.generateColorVariations(branding.primaryColor);
    Object.entries(primaryVariations).forEach(([key, value]) => {
      properties[`--color-primary-${key}`] = value;
    });

    // Generate color variations for secondary color
    const secondaryVariations = this.generateColorVariations(branding.secondaryColor);
    Object.entries(secondaryVariations).forEach(([key, value]) => {
      properties[`--color-secondary-${key}`] = value;
    });

    // Generate color variations for accent color
    const accentVariations = this.generateColorVariations(branding.accentColor);
    Object.entries(accentVariations).forEach(([key, value]) => {
      properties[`--color-accent-${key}`] = value;
    });

    // Add company branding
    if (branding.companyName) {
      properties['--company-name'] = `"${branding.companyName}"`;
    }
    if (branding.tagline) {
      properties['--company-tagline'] = `"${branding.tagline}"`;
    }

    return properties;
  }

  /**
   * Generate Tailwind CSS configuration for custom colors
   */
  generateTailwindConfig(branding: WhiteLabelBranding): Record<string, any> {
    return {
      colors: {
        primary: {
          50: `var(--color-primary-50)`,
          100: `var(--color-primary-100)`,
          200: `var(--color-primary-200)`,
          300: `var(--color-primary-300)`,
          400: `var(--color-primary-400)`,
          500: `var(--color-primary-500)`,
          600: `var(--color-primary-600)`,
          700: `var(--color-primary-700)`,
          800: `var(--color-primary-800)`,
          900: `var(--color-primary-900)`,
          950: `var(--color-primary-950)`,
        },
        secondary: {
          50: `var(--color-secondary-50)`,
          100: `var(--color-secondary-100)`,
          200: `var(--color-secondary-200)`,
          300: `var(--color-secondary-300)`,
          400: `var(--color-secondary-400)`,
          500: `var(--color-secondary-500)`,
          600: `var(--color-secondary-600)`,
          700: `var(--color-secondary-700)`,
          800: `var(--color-secondary-800)`,
          900: `var(--color-secondary-900)`,
          950: `var(--color-secondary-950)`,
        },
        accent: {
          50: `var(--color-accent-50)`,
          100: `var(--color-accent-100)`,
          200: `var(--color-accent-200)`,
          300: `var(--color-accent-300)`,
          400: `var(--color-accent-400)`,
          500: `var(--color-accent-500)`,
          600: `var(--color-accent-600)`,
          700: `var(--color-accent-700)`,
          800: `var(--color-accent-800)`,
          900: `var(--color-accent-900)`,
          950: `var(--color-accent-950)`,
        }
      }
    };
  }

  // Private helper methods

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  private isValidFaviconFile(file: File): boolean {
    const validTypes = ['image/x-icon', 'image/png'];
    const maxSize = 1 * 1024 * 1024; // 1MB

    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private generateColorVariations(baseColor: string): Record<string, string> {
    // This is a simplified color variation generator
    // In a real implementation, you'd use a proper color manipulation library
    const variations: Record<string, string> = {};
    
    // For now, we'll use the base color for all variations
    // In production, you'd generate proper color scales
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    
    shades.forEach(shade => {
      if (shade === 500) {
        variations[shade.toString()] = baseColor;
      } else if (shade < 500) {
        // Lighter variations (simplified)
        variations[shade.toString()] = this.lightenColor(baseColor, (500 - shade) / 500 * 0.8);
      } else {
        // Darker variations (simplified)
        variations[shade.toString()] = this.darkenColor(baseColor, (shade - 500) / 500 * 0.8);
      }
    });

    return variations;
  }

  private lightenColor(color: string, amount: number): string {
    // Simplified color lightening - in production use a proper color library
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * amount));
    const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private darkenColor(color: string, amount: number): string {
    // Simplified color darkening - in production use a proper color library
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
    const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}

// Export singleton instance
export const brandingService = BrandingService.getInstance();