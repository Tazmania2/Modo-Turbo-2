import { WhiteLabelFeatures } from '@/types/funifier';
import { funifierEnvService } from './funifier-env.service';

/**
 * Simple feature storage service using Funifier database with environment credentials
 */
export class SimpleFeatureStorageService {
  private static instance: SimpleFeatureStorageService;
  private static readonly COLLECTION_NAME = 'whitelabel__c';

  private constructor() {}

  static getInstance(): SimpleFeatureStorageService {
    if (!SimpleFeatureStorageService.instance) {
      SimpleFeatureStorageService.instance = new SimpleFeatureStorageService();
    }
    return SimpleFeatureStorageService.instance;
  }

  /**
   * Get feature configuration for an instance
   */
  async getFeatures(instanceId: string): Promise<WhiteLabelFeatures | null> {
    try {
      // Get API client with basic auth for database operations
      const apiClient = funifierEnvService.getApiClient();
      
      // Use aggregate to find the configuration
      const aggregateQuery = [
        {
          "$match": { 
            "instanceId": instanceId 
          }
        },
        {
          "$limit": 1
        }
      ];
      
      const response = await apiClient.post<any[]>(`/database/${SimpleFeatureStorageService.COLLECTION_NAME}/aggregate?strict=true`, aggregateQuery);
      
      if (response && response.length > 0) {
        const config = response[0];
        return config.features || this.getDefaultFeatures();
      }
      
      // Return default features if no configuration found
      return this.getDefaultFeatures();
    } catch (error) {
      console.error('Failed to get features from database:', error);
      // Return default features on error
      return this.getDefaultFeatures();
    }
  }

  /**
   * Save feature configuration for an instance
   */
  async saveFeatures(instanceId: string, features: WhiteLabelFeatures, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get API client with basic auth for database operations
      const apiClient = funifierEnvService.getApiClient();
      
      // First, check if configuration exists
      const existingQuery = [
        {
          "$match": { 
            "instanceId": instanceId 
          }
        },
        {
          "$limit": 1
        }
      ];
      
      const existingResponse = await apiClient.post<any[]>(`/database/${SimpleFeatureStorageService.COLLECTION_NAME}/aggregate?strict=true`, existingQuery);
      
      const configData = {
        instanceId,
        features,
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1F2937',
          accentColor: '#10B981',
          logo: '',
          favicon: '',
          companyName: 'Your Company',
          tagline: 'Powered by Funifier'
        },
        funifierIntegration: {
          apiKey: '',
          serverUrl: '',
          authToken: '',
          customCollections: []
        },
        updatedAt: Date.now(),
        updatedBy: userId,
        createdAt: Date.now(),
        createdBy: userId
      };

      if (existingResponse && existingResponse.length > 0) {
        // Update existing configuration
        const existingConfig = existingResponse[0];
        const updateData = {
          ...existingConfig,
          features,
          updatedAt: Date.now(),
          updatedBy: userId
        };
        
        // Use POST to update (Funifier database doesn't have PUT)
        await apiClient.post(`/database/${SimpleFeatureStorageService.COLLECTION_NAME}`, updateData);
      } else {
        // Create new configuration
        configData.createdAt = Date.now();
        configData.createdBy = userId;
        
        await apiClient.post(`/database/${SimpleFeatureStorageService.COLLECTION_NAME}`, configData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save features to database:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get default feature configuration
   */
  private getDefaultFeatures(): WhiteLabelFeatures {
    return {
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
  }
}

// Export singleton instance
export const simpleFeatureStorageService = SimpleFeatureStorageService.getInstance();