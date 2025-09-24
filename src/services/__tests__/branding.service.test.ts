import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { brandingService, BrandingService } from '../branding.service';
import { whiteLabelConfigService } from '../white-label-config.service';
import { validateBrandingConfiguration } from '@/utils/validation';
import { WhiteLabelBranding, WhiteLabelConfiguration } from '@/types/funifier';

// Mock dependencies
vi.mock('../white-label-config.service');
vi.mock('@/utils/validation');

const mockWhiteLabelConfigService = whiteLabelConfigService as {
  getConfiguration: Mock;
  saveConfiguration: Mock;
};

const mockValidateBrandingConfiguration = validateBrandingConfiguration as Mock;

describe('BrandingService', () => {
  const mockInstanceId = 'test-instance';
  const mockUserId = 'test-user';
  
  const mockBranding: WhiteLabelBranding = {
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    accentColor: '#10B981',
    logo: 'https://example.com/logo.png',
    favicon: 'https://example.com/favicon.ico',
    companyName: 'Test Company',
    tagline: 'Test Tagline'
  };

  const mockConfiguration: WhiteLabelConfiguration = {
    instanceId: mockInstanceId,
    branding: mockBranding,
    features: {
      ranking: true,
      dashboards: { carteira_i: true, carteira_ii: false },
      history: true,
      personalizedRanking: true
    },
    funifierIntegration: {
      apiKey: 'test-key',
      serverUrl: 'https://test.funifier.com',
      authToken: 'test-token',
      customCollections: []
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBranding', () => {
    it('should return branding configuration for valid instance', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfiguration);

      const result = await brandingService.getBranding(mockInstanceId);

      expect(result).toEqual(mockBranding);
      expect(mockWhiteLabelConfigService.getConfiguration).toHaveBeenCalledWith(mockInstanceId);
    });

    it('should return null when configuration not found', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(null);

      const result = await brandingService.getBranding(mockInstanceId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockRejectedValue(new Error('Database error'));

      const result = await brandingService.getBranding(mockInstanceId);

      expect(result).toBeNull();
    });
  });

  describe('updateBranding', () => {
    const updatedBranding = {
      primaryColor: '#FF0000',
      companyName: 'Updated Company'
    };

    beforeEach(() => {
      mockValidateBrandingConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
    });

    it('should update branding configuration successfully', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfiguration);
      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: { ...mockConfiguration, branding: { ...mockBranding, ...updatedBranding } }
      });

      const result = await brandingService.updateBranding(mockInstanceId, updatedBranding, mockUserId);

      expect(result.success).toBe(true);
      expect(result.branding).toEqual({ ...mockBranding, ...updatedBranding });
    });

    it('should return error when configuration not found', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(null);

      const result = await brandingService.updateBranding(mockInstanceId, updatedBranding, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Configuration not found for instance');
    });

    it('should return validation errors', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfiguration);
      mockValidateBrandingConfiguration.mockReturnValue({
        isValid: false,
        errors: ['Invalid color format'],
        warnings: []
      });

      const result = await brandingService.updateBranding(mockInstanceId, updatedBranding, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid color format');
    });

    it('should handle save configuration errors', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfiguration);
      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: false,
        errors: ['Save failed']
      });

      const result = await brandingService.updateBranding(mockInstanceId, updatedBranding, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Save failed');
    });
  });

  describe('updateThemeColors', () => {
    const colors = {
      primary: '#FF0000',
      secondary: '#00FF00',
      accent: '#0000FF'
    };

    it('should update theme colors', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfiguration);
      mockValidateBrandingConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: mockConfiguration
      });

      const result = await brandingService.updateThemeColors(mockInstanceId, colors, mockUserId);

      expect(result.success).toBe(true);
    });
  });

  describe('updateCompanyInfo', () => {
    const companyInfo = {
      companyName: 'New Company',
      tagline: 'New Tagline'
    };

    it('should update company information', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfiguration);
      mockValidateBrandingConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: mockConfiguration
      });

      const result = await brandingService.updateCompanyInfo(mockInstanceId, companyInfo, mockUserId);

      expect(result.success).toBe(true);
    });
  });

  describe('uploadLogo', () => {
    const mockFile = new File(['logo content'], 'logo.png', { type: 'image/png' });

    it('should upload logo successfully', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfiguration);
      mockValidateBrandingConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: mockConfiguration
      });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn((file) => {
          // Immediately trigger onload
          setTimeout(() => {
            mockFileReader.result = 'data:image/png;base64,mockbase64';
            if (mockFileReader.onload) {
              mockFileReader.onload({} as any);
            }
          }, 0);
        }),
        result: null as any,
        onload: null as any,
        onerror: null as any
      };
      
      vi.stubGlobal('FileReader', vi.fn(() => mockFileReader));

      const result = await brandingService.uploadLogo(mockInstanceId, mockFile, mockUserId);

      expect(result.success).toBe(true);
    });

    it('should reject invalid file types', async () => {
      const invalidFile = new File(['content'], 'file.txt', { type: 'text/plain' });

      const result = await brandingService.uploadLogo(mockInstanceId, invalidFile, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image file');
    });

    it('should reject oversized files', async () => {
      const oversizedFile = new File(['x'.repeat(6 * 1024 * 1024)], 'logo.png', { type: 'image/png' });

      const result = await brandingService.uploadLogo(mockInstanceId, oversizedFile, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image file');
    });
  });

  describe('resetToDefaults', () => {
    it('should reset branding to defaults', async () => {
      mockValidateBrandingConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: mockConfiguration
      });

      const result = await brandingService.resetToDefaults(mockInstanceId, mockUserId);

      expect(result.success).toBe(true);
      expect(mockWhiteLabelConfigService.saveConfiguration).toHaveBeenCalled();
    });
  });

  describe('generateCSSProperties', () => {
    it('should generate CSS properties from branding', () => {
      const properties = brandingService.generateCSSProperties(mockBranding);

      expect(properties).toHaveProperty('--color-primary-500', mockBranding.primaryColor);
      expect(properties).toHaveProperty('--company-name', `"${mockBranding.companyName}"`);
      expect(properties).toHaveProperty('--company-tagline', `"${mockBranding.tagline}"`);
    });

    it('should handle missing optional fields', () => {
      const minimalBranding: WhiteLabelBranding = {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        accentColor: '#0000FF',
        logo: '',
        favicon: '',
        companyName: '',
        tagline: ''
      };

      const properties = brandingService.generateCSSProperties(minimalBranding);

      expect(properties).toHaveProperty('--color-primary-500', '#FF0000');
      expect(properties).not.toHaveProperty('--company-name');
      expect(properties).not.toHaveProperty('--company-tagline');
    });
  });

  describe('generateTailwindConfig', () => {
    it('should generate Tailwind configuration', () => {
      const config = brandingService.generateTailwindConfig(mockBranding);

      expect(config).toHaveProperty('colors');
      expect(config.colors).toHaveProperty('primary');
      expect(config.colors).toHaveProperty('secondary');
      expect(config.colors).toHaveProperty('accent');
    });
  });
});