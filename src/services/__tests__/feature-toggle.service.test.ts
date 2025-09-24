import { describe, it, expect, beforeEach, vi } from 'vitest';
import { featureToggleService } from '../feature-toggle.service';
import { whiteLabelConfigService } from '../white-label-config.service';
import { WhiteLabelFeatures, WhiteLabelConfiguration } from '@/types/funifier';

// Mock the white-label config service
vi.mock('../white-label-config.service');

const mockWhiteLabelConfigService = whiteLabelConfigService as any;

describe('FeatureToggleService', () => {
  const mockInstanceId = 'test-instance-123';
  const mockUserId = 'test-user-456';

  const mockFeatures: WhiteLabelFeatures = {
    ranking: true,
    dashboards: {
      carteira_i: true,
      carteira_ii: false,
      carteira_iii: false,
      carteira_iv: false
    },
    history: true,
    personalizedRanking: false
  };

  const mockConfig: WhiteLabelConfiguration = {
    instanceId: mockInstanceId,
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      accentColor: '#10B981',
      logo: '',
      favicon: '',
      companyName: 'Test Company',
      tagline: 'Test Tagline'
    },
    features: mockFeatures,
    funifierIntegration: {
      apiKey: 'test-key',
      serverUrl: 'https://test.funifier.com',
      authToken: 'test-token',
      customCollections: []
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailableFeatures', () => {
    it('should return all available feature definitions', () => {
      const features = featureToggleService.getAvailableFeatures();
      
      expect(features).toHaveLength(7);
      expect(features.map(f => f.key)).toContain('ranking');
      expect(features.map(f => f.key)).toContain('personalizedRanking');
      expect(features.map(f => f.key)).toContain('history');
      expect(features.map(f => f.key)).toContain('dashboards.carteira_i');
    });

    it('should include feature dependencies', () => {
      const features = featureToggleService.getAvailableFeatures();
      const personalizedRanking = features.find(f => f.key === 'personalizedRanking');
      
      expect(personalizedRanking?.dependencies).toContain('ranking');
    });
  });

  describe('getFeatureConfiguration', () => {
    it('should return feature configuration for valid instance', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);

      const result = await featureToggleService.getFeatureConfiguration(mockInstanceId);

      expect(result).toEqual(mockFeatures);
      expect(mockWhiteLabelConfigService.getConfiguration).toHaveBeenCalledWith(mockInstanceId);
    });

    it('should return null when configuration not found', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(null);

      const result = await featureToggleService.getFeatureConfiguration(mockInstanceId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockRejectedValue(new Error('Database error'));

      const result = await featureToggleService.getFeatureConfiguration(mockInstanceId);

      expect(result).toBeNull();
    });
  });

  describe('updateFeatureToggle', () => {
    it('should update a single feature successfully', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);
      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: {
          ...mockConfig,
          features: { ...mockFeatures, ranking: false }
        }
      });

      const result = await featureToggleService.updateFeatureToggle(
        mockInstanceId,
        'ranking',
        false,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.updatedFeatures?.ranking).toBe(false);
    });

    it('should update dashboard feature successfully', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);
      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: {
          ...mockConfig,
          features: {
            ...mockFeatures,
            dashboards: { ...mockFeatures.dashboards, carteira_ii: true }
          }
        }
      });

      const result = await featureToggleService.updateFeatureToggle(
        mockInstanceId,
        'dashboards.carteira_ii',
        true,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.updatedFeatures?.dashboards.carteira_ii).toBe(true);
    });

    it('should return error when configuration not found', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(null);

      const result = await featureToggleService.updateFeatureToggle(
        mockInstanceId,
        'ranking',
        false,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Configuration not found');
    });

    it('should validate feature dependencies', async () => {
      // Create a config where ranking is disabled but we try to enable personalizedRanking
      const configWithDisabledRanking = {
        ...mockConfig,
        features: { ...mockFeatures, ranking: false }
      };
      
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(configWithDisabledRanking);

      const result = await featureToggleService.updateFeatureToggle(
        mockInstanceId,
        'personalizedRanking',
        true,
        mockUserId
      );

      // This should fail validation due to missing dependency
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateMultipleFeatures', () => {
    it('should update multiple features successfully', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);
      
      const updatedFeatures = {
        ...mockFeatures,
        ranking: false,
        history: false
      };

      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: { ...mockConfig, features: updatedFeatures }
      });

      const updates = [
        { featureName: 'ranking', enabled: false },
        { featureName: 'history', enabled: false }
      ];

      const result = await featureToggleService.updateMultipleFeatures(
        mockInstanceId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.updatedFeatures?.ranking).toBe(false);
      expect(result.updatedFeatures?.history).toBe(false);
    });

    it('should handle validation errors for multiple features', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);

      const updates = [
        { featureName: 'ranking', enabled: false },
        { featureName: 'personalizedRanking', enabled: true }
      ];

      const result = await featureToggleService.updateMultipleFeatures(
        mockInstanceId,
        updates,
        mockUserId
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('resetFeaturesToDefaults', () => {
    it('should reset features to default configuration', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);
      
      const defaultFeatures = {
        ranking: true,
        dashboards: {
          carteira_i: true,
          carteira_ii: true,
          carteira_iii: false,
          carteira_iv: false
        },
        history: true,
        personalizedRanking: true
      };

      mockWhiteLabelConfigService.saveConfiguration.mockResolvedValue({
        success: true,
        configuration: { ...mockConfig, features: defaultFeatures }
      });

      const result = await featureToggleService.resetFeaturesToDefaults(
        mockInstanceId,
        mockUserId
      );

      expect(result.success).toBe(true);
      expect(result.updatedFeatures).toEqual(defaultFeatures);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled features', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);

      const result = await featureToggleService.isFeatureEnabled(mockInstanceId, 'ranking');

      expect(result).toBe(true);
    });

    it('should return false for disabled features', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);

      const result = await featureToggleService.isFeatureEnabled(mockInstanceId, 'personalizedRanking');

      expect(result).toBe(false);
    });

    it('should handle dashboard features correctly', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(mockConfig);

      const result1 = await featureToggleService.isFeatureEnabled(mockInstanceId, 'dashboards.carteira_i');
      const result2 = await featureToggleService.isFeatureEnabled(mockInstanceId, 'dashboards.carteira_ii');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should return false when configuration not found', async () => {
      mockWhiteLabelConfigService.getConfiguration.mockResolvedValue(null);

      const result = await featureToggleService.isFeatureEnabled(mockInstanceId, 'ranking');

      expect(result).toBe(false);
    });
  });

  describe('getDependentFeatures', () => {
    it('should return features that depend on a given feature', () => {
      const dependents = featureToggleService.getDependentFeatures('ranking');

      expect(dependents).toContain('personalizedRanking');
    });

    it('should return empty array for features with no dependents', () => {
      const dependents = featureToggleService.getDependentFeatures('history');

      expect(dependents).toHaveLength(0);
    });
  });

  describe('validateFeatureDependencies', () => {
    it('should validate dependencies correctly', () => {
      const validFeatures: WhiteLabelFeatures = {
        ranking: true,
        personalizedRanking: true,
        history: true,
        dashboards: { carteira_i: true }
      };

      const result = featureToggleService.validateFeatureDependencies(validFeatures);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect dependency violations', () => {
      const invalidFeatures: WhiteLabelFeatures = {
        ranking: false,
        personalizedRanking: true,
        history: true,
        dashboards: { carteira_i: true }
      };

      const result = featureToggleService.validateFeatureDependencies(invalidFeatures);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('requires');
    });
  });
});