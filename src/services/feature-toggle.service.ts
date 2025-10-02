import { 
  WhiteLabelFeatures, 
  WhiteLabelConfiguration 
} from '@/types/funifier';
import { whiteLabelConfigService } from './white-label-config.service';
import { validateFeatureToggleConfiguration } from '@/utils/validation';

export interface FeatureToggleUpdate {
  featureName: string;
  enabled: boolean;
  category?: string;
}

export interface FeatureToggleResult {
  success: boolean;
  updatedFeatures?: WhiteLabelFeatures;
  errors?: string[];
  warnings?: string[];
}

export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  category: 'core' | 'dashboard' | 'ranking' | 'analytics';
  defaultEnabled: boolean;
  dependencies?: string[];
  requiresRestart?: boolean;
}

/**
 * Service for managing feature toggles in white-label configurations
 */
export class FeatureToggleService {
  private static instance: FeatureToggleService;

  private constructor() {}

  static getInstance(): FeatureToggleService {
    if (!FeatureToggleService.instance) {
      FeatureToggleService.instance = new FeatureToggleService();
    }
    return FeatureToggleService.instance;
  }

  /**
   * Get all available feature definitions
   */
  getAvailableFeatures(): FeatureDefinition[] {
    return [
      {
        key: 'ranking',
        name: 'Ranking System',
        description: 'Enable leaderboards and competitive rankings',
        category: 'ranking',
        defaultEnabled: true
      },
      {
        key: 'personalizedRanking',
        name: 'Personalized Rankings',
        description: 'Show personalized ranking views with user context',
        category: 'ranking',
        defaultEnabled: true,
        dependencies: ['ranking']
      },
      {
        key: 'history',
        name: 'User History',
        description: 'Enable historical data and performance tracking',
        category: 'analytics',
        defaultEnabled: true
      },
      {
        key: 'dashboards.carteira_i',
        name: 'Carteira I Dashboard',
        description: 'Basic dashboard with essential metrics',
        category: 'dashboard',
        defaultEnabled: true
      },
      {
        key: 'dashboards.carteira_ii',
        name: 'Carteira II Dashboard',
        description: 'Advanced dashboard with detailed analytics',
        category: 'dashboard',
        defaultEnabled: true
      },
      {
        key: 'dashboards.carteira_iii',
        name: 'Carteira III Dashboard',
        description: 'Professional dashboard with team features',
        category: 'dashboard',
        defaultEnabled: false
      },
      {
        key: 'dashboards.carteira_iv',
        name: 'Carteira IV Dashboard',
        description: 'Enterprise dashboard with full feature set',
        category: 'dashboard',
        defaultEnabled: false
      }
    ];
  }

  /**
   * Get current feature configuration for an instance
   */
  async getFeatureConfiguration(instanceId: string): Promise<WhiteLabelFeatures | null> {
    try {
      // Make HTTP request to the API route
      const response = await fetch(`/api/admin/features?instanceId=${instanceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to get feature configuration:', response.statusText);
        return null;
      }

      const result = await response.json();
      return result.features || null;
    } catch (error) {
      console.error('Failed to get feature configuration:', error);
      return null;
    }
  }

  /**
   * Update a single feature toggle
   */
  async updateFeatureToggle(
    instanceId: string,
    featureName: string,
    enabled: boolean,
    userId: string
  ): Promise<FeatureToggleResult> {
    try {
      const config = await whiteLabelConfigService.getConfiguration(instanceId);
      if (!config) {
        return {
          success: false,
          errors: ['Configuration not found']
        };
      }

      // Update the specific feature
      const updatedFeatures = this.updateFeatureInConfig(config.features, featureName, enabled);
      
      // Validate the updated configuration
      const validation = validateFeatureToggleConfiguration(updatedFeatures);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Update the full configuration
      const updatedConfig: WhiteLabelConfiguration = {
        ...config,
        features: updatedFeatures,
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
          updatedFeatures,
          warnings: validation.warnings
        };
      } else {
        return {
          success: false,
          errors: saveResult.errors
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to update feature toggle: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Update multiple feature toggles at once
   */
  async updateMultipleFeatures(
    instanceId: string,
    updates: FeatureToggleUpdate[],
    userId: string
  ): Promise<FeatureToggleResult> {
    try {
      // Make HTTP request to the API route
      const response = await fetch(`/api/admin/features?instanceId=${instanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          errors: [errorData.error || 'Failed to update features']
        };
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          updatedFeatures: result.features
        };
      } else {
        return {
          success: false,
          errors: [result.error || 'Failed to update features']
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to update feature toggles: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Reset features to default configuration
   */
  async resetFeaturesToDefaults(instanceId: string, userId: string): Promise<FeatureToggleResult> {
    try {
      const defaultFeatures = this.getDefaultFeatures();
      
      // Convert default features to updates format
      const updates: FeatureToggleUpdate[] = [];
      const availableFeatures = this.getAvailableFeatures();
      
      for (const feature of availableFeatures) {
        updates.push({
          featureName: feature.key,
          enabled: feature.defaultEnabled
        });
      }

      // Use the updateMultipleFeatures method which calls the API
      return await this.updateMultipleFeatures(instanceId, updates, userId);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to reset features: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Check if a specific feature is enabled
   */
  async isFeatureEnabled(instanceId: string, featureName: string): Promise<boolean> {
    try {
      const features = await this.getFeatureConfiguration(instanceId);
      if (!features) {
        return false;
      }

      return this.getFeatureValue(features, featureName);
    } catch (error) {
      console.error('Failed to check feature status:', error);
      return false;
    }
  }

  /**
   * Get features that depend on a specific feature
   */
  getDependentFeatures(featureName: string): string[] {
    const allFeatures = this.getAvailableFeatures();
    return allFeatures
      .filter(feature => feature.dependencies?.includes(featureName))
      .map(feature => feature.key);
  }

  /**
   * Validate feature dependencies
   */
  validateFeatureDependencies(features: WhiteLabelFeatures): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const availableFeatures = this.getAvailableFeatures();

    for (const feature of availableFeatures) {
      if (feature.dependencies) {
        const isFeatureEnabled = this.getFeatureValue(features, feature.key);
        
        if (isFeatureEnabled) {
          for (const dependency of feature.dependencies) {
            const isDependencyEnabled = this.getFeatureValue(features, dependency);
            if (!isDependencyEnabled) {
              errors.push(`Feature "${feature.name}" requires "${dependency}" to be enabled`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Private helper methods

  private updateFeatureInConfig(
    features: WhiteLabelFeatures,
    featureName: string,
    enabled: boolean
  ): WhiteLabelFeatures {
    const updatedFeatures = { ...features };

    if (featureName.startsWith('dashboards.')) {
      const dashboardType = featureName.replace('dashboards.', '');
      updatedFeatures.dashboards = {
        ...updatedFeatures.dashboards,
        [dashboardType]: enabled
      };
    } else {
      (updatedFeatures as any)[featureName] = enabled;
    }

    return updatedFeatures;
  }

  private getFeatureValue(features: WhiteLabelFeatures, featureName: string): boolean {
    if (featureName.startsWith('dashboards.')) {
      const dashboardType = featureName.replace('dashboards.', '');
      return features.dashboards[dashboardType] || false;
    } else {
      return (features as any)[featureName] || false;
    }
  }

  private getDefaultFeatures(): WhiteLabelFeatures {
    const availableFeatures = this.getAvailableFeatures();
    const defaultFeatures: WhiteLabelFeatures = {
      ranking: false,
      dashboards: {},
      history: false,
      personalizedRanking: false
    };

    for (const feature of availableFeatures) {
      if (feature.key.startsWith('dashboards.')) {
        const dashboardType = feature.key.replace('dashboards.', '');
        defaultFeatures.dashboards[dashboardType] = feature.defaultEnabled;
      } else {
        (defaultFeatures as any)[feature.key] = feature.defaultEnabled;
      }
    }

    return defaultFeatures;
  }
}

// Export singleton instance
export const featureToggleService = FeatureToggleService.getInstance();