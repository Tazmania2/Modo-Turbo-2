import { WhiteLabelConfiguration, FunifierWhiteLabelRecord } from '@/types/funifier';
import { funifierDatabaseService } from './funifier-database.service';
import { encrypt, decrypt } from '@/utils/encryption';

export interface BrandingDatabaseResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Service for managing branding data in Funifier database using aggregate queries
 */
export class BrandingDatabaseService {
  private static instance: BrandingDatabaseService;
  private static readonly COLLECTION_NAME = 'whitelabel__c';

  private constructor() {}

  static getInstance(): BrandingDatabaseService {
    if (!BrandingDatabaseService.instance) {
      BrandingDatabaseService.instance = new BrandingDatabaseService();
    }
    return BrandingDatabaseService.instance;
  }

  /**
   * Get branding configuration using aggregate query
   */
  async getBrandingConfiguration(instanceId: string): Promise<BrandingDatabaseResult> {
    try {
      console.log(`Getting branding configuration for instance: ${instanceId}`);
      
      // Use aggregate query to find the configuration
      const aggregateQuery = [
        {
          $match: { 
            instanceId: instanceId,
            isActive: true
          }
        },
        {
          $limit: 1
        }
      ];
      
      const response = await funifierDatabaseService.aggregate<FunifierWhiteLabelRecord>(
        BrandingDatabaseService.COLLECTION_NAME, 
        aggregateQuery
      );
      
      if (response && response.length > 0) {
        const record = response[0];
        
        // Decrypt sensitive data
        const decryptedConfig = await this.decryptSensitiveData(record.config);
        
        return {
          success: true,
          data: decryptedConfig.branding
        };
      }
      
      return {
        success: false,
        error: 'Configuration not found'
      };
    } catch (error) {
      console.error('Failed to get branding configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Save branding configuration using proper POST operations
   */
  async saveBrandingConfiguration(
    instanceId: string, 
    branding: Partial<WhiteLabelConfiguration['branding']>,
    userId: string
  ): Promise<BrandingDatabaseResult> {
    try {
      console.log(`Saving branding configuration for instance: ${instanceId}`);
      
      // First, get the existing configuration using aggregate
      const existingQuery = [
        {
          $match: { 
            instanceId: instanceId,
            isActive: true
          }
        },
        {
          $limit: 1
        }
      ];
      
      const existingResponse = await funifierDatabaseService.aggregate<FunifierWhiteLabelRecord>(
        BrandingDatabaseService.COLLECTION_NAME, 
        existingQuery
      );
      
      let result;
      
      if (existingResponse && existingResponse.length > 0) {
        // Update existing configuration
        const existingRecord = existingResponse[0];
        const decryptedConfig = await this.decryptSensitiveData(existingRecord.config);
        
        // Merge branding data
        const updatedConfig: WhiteLabelConfiguration = {
          ...decryptedConfig,
          branding: {
            ...decryptedConfig.branding,
            ...branding
          },
          updatedAt: Date.now()
        };
        
        // Encrypt sensitive data
        const encryptedConfig = await this.encryptSensitiveData(updatedConfig);
        
        // Update the record
        const updateData = {
          config: encryptedConfig,
          lastModifiedBy: userId,
          time: Date.now()
        };
        
        result = await funifierDatabaseService.updateById(
          BrandingDatabaseService.COLLECTION_NAME,
          existingRecord._id,
          updateData
        );
        
        if (result.acknowledged) {
          return {
            success: true,
            data: updatedConfig.branding
          };
        } else {
          throw new Error('Update operation not acknowledged');
        }
      } else {
        // Create new configuration
        const newConfig: WhiteLabelConfiguration = {
          instanceId,
          branding: {
            primaryColor: '#3B82F6',
            secondaryColor: '#1F2937',
            accentColor: '#10B981',
            logo: '',
            favicon: '',
            companyName: 'Your Company',
            tagline: 'Gamification Made Simple',
            ...branding
          },
          features: {
            ranking: true,
            dashboards: {
              carteira_i: true,
              carteira_ii: true,
              carteira_iii: true,
              carteira_iv: true
            },
            history: true,
            personalizedRanking: true
          },
          funifierIntegration: {
            apiKey: '',
            serverUrl: '',
            authToken: '',
            customCollections: []
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        // Encrypt sensitive data
        const encryptedConfig = await this.encryptSensitiveData(newConfig);
        
        // Create new record
        const newRecord: Partial<FunifierWhiteLabelRecord> = {
          instanceId,
          config: encryptedConfig,
          isActive: true,
          createdBy: userId,
          lastModifiedBy: userId,
          time: Date.now()
        };
        
        result = await funifierDatabaseService.insertOne(
          BrandingDatabaseService.COLLECTION_NAME,
          newRecord
        );
        
        if (result.acknowledged) {
          return {
            success: true,
            data: newConfig.branding
          };
        } else {
          throw new Error('Insert operation not acknowledged');
        }
      }
    } catch (error) {
      console.error('Failed to save branding configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all branding configurations using aggregate query
   */
  async getAllBrandingConfigurations(): Promise<BrandingDatabaseResult> {
    try {
      const aggregateQuery = [
        {
          $match: { 
            isActive: true
          }
        },
        {
          $sort: { 
            time: -1 
          }
        }
      ];
      
      const response = await funifierDatabaseService.aggregate<FunifierWhiteLabelRecord>(
        BrandingDatabaseService.COLLECTION_NAME, 
        aggregateQuery
      );
      
      const configurations = [];
      
      for (const record of response) {
        try {
          const decryptedConfig = await this.decryptSensitiveData(record.config);
          configurations.push({
            instanceId: record.instanceId,
            branding: decryptedConfig.branding,
            updatedAt: decryptedConfig.updatedAt
          });
        } catch (error) {
          console.error(`Failed to decrypt configuration for instance ${record.instanceId}:`, error);
        }
      }
      
      return {
        success: true,
        data: configurations
      };
    } catch (error) {
      console.error('Failed to get all branding configurations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete branding configuration
   */
  async deleteBrandingConfiguration(instanceId: string): Promise<BrandingDatabaseResult> {
    try {
      // Find the record using aggregate
      const findQuery = [
        {
          $match: { 
            instanceId: instanceId,
            isActive: true
          }
        },
        {
          $limit: 1
        }
      ];
      
      const response = await funifierDatabaseService.aggregate<FunifierWhiteLabelRecord>(
        BrandingDatabaseService.COLLECTION_NAME, 
        findQuery
      );
      
      if (response && response.length > 0) {
        const record = response[0];
        
        // Soft delete by setting isActive to false
        const result = await funifierDatabaseService.updateById(
          BrandingDatabaseService.COLLECTION_NAME,
          record._id,
          { isActive: false, time: Date.now() }
        );
        
        if (result.acknowledged) {
          return {
            success: true,
            data: { deleted: true }
          };
        } else {
          throw new Error('Delete operation not acknowledged');
        }
      }
      
      return {
        success: false,
        error: 'Configuration not found'
      };
    } catch (error) {
      console.error('Failed to delete branding configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Private helper methods

  private async encryptSensitiveData(config: WhiteLabelConfiguration): Promise<WhiteLabelConfiguration> {
    const encryptedConfig = { ...config };

    // Encrypt Funifier credentials if they exist
    if (config.funifierIntegration.apiKey) {
      encryptedConfig.funifierIntegration.apiKey = encrypt(config.funifierIntegration.apiKey);
    }
    if (config.funifierIntegration.authToken) {
      encryptedConfig.funifierIntegration.authToken = encrypt(config.funifierIntegration.authToken);
    }

    return encryptedConfig;
  }

  private async decryptSensitiveData(config: WhiteLabelConfiguration): Promise<WhiteLabelConfiguration> {
    const decryptedConfig = { ...config };

    // Decrypt Funifier credentials if they exist
    if (config.funifierIntegration.apiKey) {
      try {
        decryptedConfig.funifierIntegration.apiKey = decrypt(config.funifierIntegration.apiKey);
      } catch (error) {
        console.error('Failed to decrypt API key:', error);
        decryptedConfig.funifierIntegration.apiKey = '';
      }
    }
    if (config.funifierIntegration.authToken) {
      try {
        decryptedConfig.funifierIntegration.authToken = decrypt(config.funifierIntegration.authToken);
      } catch (error) {
        console.error('Failed to decrypt auth token:', error);
        decryptedConfig.funifierIntegration.authToken = '';
      }
    }

    return decryptedConfig;
  }
}

// Export singleton instance
export const brandingDatabaseService = BrandingDatabaseService.getInstance();