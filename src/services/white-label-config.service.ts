import {
  WhiteLabelConfiguration,
  FunifierWhiteLabelRecord,
  SetupRequest,
  WhiteLabelConfigResponse
} from '@/types/funifier';
import { funifierDatabaseService } from './funifier-database.service';
import { funifierAuthService } from './funifier-auth.service';
import { encrypt, decrypt, generateSecureToken } from '@/utils/encryption';
import {
  validateWhiteLabelConfiguration,
  validateSetupRequest,
  sanitizeConfiguration,
  ValidationResult
} from '@/utils/validation';
import { whiteLabelConfigCache } from '@/utils/cache';

export interface ConfigurationUpdateResult {
  success: boolean;
  configuration?: WhiteLabelConfiguration;
  errors?: string[];
  warnings?: string[];
}

export interface SetupResult {
  success: boolean;
  instanceId?: string;
  redirectUrl?: string;
  errors?: string[];
}

/**
 * Service for managing white-label configurations in Funifier
 */
export class WhiteLabelConfigService {
  private static instance: WhiteLabelConfigService;
  private static readonly COLLECTION_NAME = 'whitelabel__c';

  private constructor() { }

  static getInstance(): WhiteLabelConfigService {
    if (!WhiteLabelConfigService.instance) {
      WhiteLabelConfigService.instance = new WhiteLabelConfigService();
    }
    return WhiteLabelConfigService.instance;
  }

  /**
   * Initialize the white-label collection if it doesn't exist
   */
  async initializeCollection(): Promise<void> {
    try {
      console.log('Checking if white-label collection exists...');
      const exists = await funifierDatabaseService.collectionExists(WhiteLabelConfigService.COLLECTION_NAME);
      console.log(`Collection exists: ${exists}`);

      if (!exists) {
        console.log('Creating white-label collection...');
        await funifierDatabaseService.createCollection(WhiteLabelConfigService.COLLECTION_NAME);

        // Create index on instanceId for faster lookups
        console.log('Creating index on instanceId...');
        await funifierDatabaseService.createIndex(
          WhiteLabelConfigService.COLLECTION_NAME,
          { instanceId: 1 },
          { unique: true }
        );
        console.log('White-label collection initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize white-label collection:', error);
      throw new Error(`Failed to initialize white-label collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create or update white-label configuration
   */
  async saveConfiguration(
    instanceId: string,
    config: WhiteLabelConfiguration,
    userId: string
  ): Promise<ConfigurationUpdateResult> {
    try {
      // Validate configuration (allow empty integration for demo mode)
      const isDemoMode = !config.funifierIntegration.apiKey && !config.funifierIntegration.serverUrl && !config.funifierIntegration.authToken;
      const validation = validateWhiteLabelConfiguration(config, isDemoMode);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Sanitize configuration
      const sanitizedConfig = sanitizeConfiguration(config);

      // For demo mode, just cache the configuration
      if (isDemoMode) {
        console.log('Demo mode detected, saving to cache only');
        whiteLabelConfigCache.setConfiguration(instanceId, sanitizedConfig);
        return {
          success: true,
          configuration: sanitizedConfig,
          warnings: validation.warnings
        };
      }

      // For Funifier mode, try to save to database with fallback
      console.log('Funifier mode detected, attempting to save to database');

      try {
        // Encrypt sensitive data
        const encryptedConfig = await this.encryptSensitiveData(sanitizedConfig);

        // Prepare record for Funifier
        const record: Partial<FunifierWhiteLabelRecord> = {
          instanceId,
          config: encryptedConfig,
          isActive: true,
          lastModifiedBy: userId,
          time: Date.now()
        };

        // Check if configuration already exists
        const existing = await this.findConfigurationRecord(instanceId);

        let result;
        if (existing) {
          // Update existing configuration
          console.log(`Updating existing configuration for instance: ${instanceId}`);
          result = await funifierDatabaseService.updateById(
            WhiteLabelConfigService.COLLECTION_NAME,
            existing._id,
            record
          );
          console.log('Update result:', result);
        } else {
          // Create new configuration
          console.log(`Creating new configuration for instance: ${instanceId}`);
          record.createdBy = userId;
          result = await funifierDatabaseService.insertOne(
            WhiteLabelConfigService.COLLECTION_NAME,
            record
          );
          console.log('Insert result:', result);
        }

        if (result.acknowledged) {
          // Update cache
          whiteLabelConfigCache.setConfiguration(instanceId, sanitizedConfig);

          return {
            success: true,
            configuration: sanitizedConfig,
            warnings: validation.warnings
          };
        } else {
          console.error('Database operation not acknowledged:', result);
          throw new Error('Database operation not acknowledged');
        }
      } catch (dbError) {
        console.error('Database save failed, falling back to cache-only mode:', dbError);

        // Fallback: Save to cache and warn user
        whiteLabelConfigCache.setConfiguration(instanceId, sanitizedConfig);

        return {
          success: true,
          configuration: sanitizedConfig,
          warnings: [
            ...(validation.warnings || []),
            'Configuration saved locally but could not be saved to Funifier database. You may need to check your Funifier connection and credentials.'
          ]
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Get white-label configuration by instance ID
   */
  async getConfiguration(instanceId: string): Promise<WhiteLabelConfiguration | null> {
    try {
      // Check cache first
      const cached = whiteLabelConfigCache.getConfiguration(instanceId);
      if (cached) {
        console.log(`Configuration found in cache for instance: ${instanceId}`);
        return cached;
      }

      // For demo instances, don't try to fetch from database
      if (instanceId.startsWith('demo_') || instanceId.includes('demo')) {
        console.log(`Demo instance detected: ${instanceId}, returning null to trigger demo setup`);
        return null;
      }

      // Fetch from database for Funifier instances
      try {
        const record = await this.findConfigurationRecord(instanceId);
        if (!record || !record.isActive) {
          console.log(`No active configuration found in database for instance: ${instanceId}`);
          return null;
        }

        // Decrypt sensitive data
        const decryptedConfig = await this.decryptSensitiveData(record.config);

        // Cache the result
        whiteLabelConfigCache.setConfiguration(instanceId, decryptedConfig);

        return decryptedConfig;
      } catch (dbError) {
        console.error('Database error, falling back to cache-only mode:', dbError);
        return null;
      }
    } catch (error) {
      console.error('Failed to get configuration:', error);
      return null;
    }
  }

  /**
   * Get configuration for API response (without sensitive data)
   */
  async getConfigurationResponse(instanceId: string): Promise<WhiteLabelConfigResponse | null> {
    try {
      const config = await this.getConfiguration(instanceId);
      if (!config) {
        return null;
      }

      return {
        _id: config._id || '',
        instanceId: config.instanceId,
        branding: config.branding,
        features: config.features,
        funifierConfig: {
          isConfigured: !!config.funifierIntegration.apiKey,
          serverUrl: config.funifierIntegration.serverUrl
        }
      };
    } catch (error) {
      console.error('Failed to get configuration response:', error);
      return null;
    }
  }

  /**
   * Handle initial setup request
   */
  async handleSetup(request: SetupRequest, instanceId?: string): Promise<SetupResult> {
    try {
      // Validate setup request
      const validation = validateSetupRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      const actualInstanceId = instanceId || generateSecureToken(16);

      if (request.mode === 'demo') {
        // For demo mode, we don't need to save to Funifier database
        // Just cache the configuration locally
        console.log('Setting up demo mode...');
        const demoConfig = this.createDemoConfiguration(actualInstanceId);

        // Cache the demo configuration without saving to database
        whiteLabelConfigCache.setConfiguration(actualInstanceId, demoConfig);

        return {
          success: true,
          instanceId: actualInstanceId,
          redirectUrl: `/dashboard?instance=${actualInstanceId}`
        };
      } else if (request.mode === 'funifier' && request.funifierCredentials) {
        // Create Funifier-based configuration
        const funifierConfig = this.createFunifierConfiguration(
          actualInstanceId,
          request.funifierCredentials
        );

        // Test Funifier connection before saving (non-blocking)
        console.log('Testing Funifier connection...');
        const connectionTest = await this.testFunifierConnection(request.funifierCredentials);
        if (!connectionTest.success) {
          console.warn('Funifier connection test failed, but proceeding with setup:', connectionTest.error);
          // Don't fail the setup - we'll save locally and warn the user
        } else {
          console.log('Funifier connection test successful');
        }

        const saveResult = await this.saveConfiguration(actualInstanceId, funifierConfig, 'system');

        if (saveResult.success) {
          return {
            success: true,
            instanceId: actualInstanceId,
            redirectUrl: `/api/auth/login?instance=${actualInstanceId}`
          };
        } else {
          return {
            success: false,
            errors: saveResult.errors
          };
        }
      }

      return {
        success: false,
        errors: ['Invalid setup mode']
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration(instanceId: string, userId: string): Promise<ConfigurationUpdateResult> {
    try {
      const defaultConfig = this.createDemoConfiguration(instanceId);
      const result = await this.saveConfiguration(instanceId, defaultConfig, userId);

      // Clear cache
      whiteLabelConfigCache.invalidateInstance(instanceId);

      return result;
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to reset configuration: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(instanceId: string): Promise<boolean> {
    try {
      const record = await this.findConfigurationRecord(instanceId);
      if (!record) {
        return false;
      }

      const result = await funifierDatabaseService.deleteById(
        WhiteLabelConfigService.COLLECTION_NAME,
        record._id
      );

      if (result.acknowledged && result.deletedCount > 0) {
        // Clear cache
        whiteLabelConfigCache.invalidateInstance(instanceId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      return false;
    }
  }

  /**
   * List all configurations (admin function)
   */
  async listConfigurations(): Promise<WhiteLabelConfigResponse[]> {
    try {
      const records = await funifierDatabaseService.find<FunifierWhiteLabelRecord>(
        WhiteLabelConfigService.COLLECTION_NAME,
        { filter: { isActive: true } }
      );

      const configurations: WhiteLabelConfigResponse[] = [];

      for (const record of records) {
        try {
          const decryptedConfig = await this.decryptSensitiveData(record.config);
          configurations.push({
            _id: record._id,
            instanceId: record.instanceId,
            branding: decryptedConfig.branding,
            features: decryptedConfig.features,
            funifierConfig: {
              isConfigured: !!decryptedConfig.funifierIntegration.apiKey,
              serverUrl: decryptedConfig.funifierIntegration.serverUrl
            }
          });
        } catch (error) {
          console.error(`Failed to decrypt configuration for instance ${record.instanceId}:`, error);
        }
      }

      return configurations;
    } catch (error) {
      console.error('Failed to list configurations:', error);
      return [];
    }
  }

  /**
   * Validate configuration without saving
   */
  validateConfiguration(config: WhiteLabelConfiguration): ValidationResult {
    return validateWhiteLabelConfiguration(config);
  }

  // Private helper methods

  private async findConfigurationRecord(instanceId: string): Promise<FunifierWhiteLabelRecord | null> {
    try {
      return await funifierDatabaseService.findOne<FunifierWhiteLabelRecord>(
        WhiteLabelConfigService.COLLECTION_NAME,
        { filter: { instanceId, isActive: true } }
      );
    } catch (error) {
      console.error('Failed to find configuration record:', error);
      return null;
    }
  }

  private async encryptSensitiveData(config: WhiteLabelConfiguration): Promise<WhiteLabelConfiguration> {
    const encryptedConfig = { ...config };

    // Encrypt Funifier credentials
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

    // Decrypt Funifier credentials
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

  private createDemoConfiguration(instanceId: string): WhiteLabelConfiguration {
    return {
      instanceId,
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1F2937',
        accentColor: '#10B981',
        logo: '',
        favicon: '',
        companyName: 'Demo Company',
        tagline: 'Gamification Made Simple'
      },
      features: {
        ranking: true,
        dashboards: {
          carteira_i: true,
          carteira_ii: true,
          carteira_iii: false,
          carteira_iv: false
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
  }

  private createFunifierConfiguration(
    instanceId: string,
    credentials: { apiKey: string; serverUrl: string; authToken: string }
  ): WhiteLabelConfiguration {
    return {
      instanceId,
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1F2937',
        accentColor: '#10B981',
        logo: '',
        favicon: '',
        companyName: 'Your Company',
        tagline: 'Powered by Funifier'
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
        apiKey: credentials.apiKey,
        serverUrl: credentials.serverUrl,
        authToken: credentials.authToken,
        customCollections: [WhiteLabelConfigService.COLLECTION_NAME]
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private async testFunifierConnection(credentials: { apiKey: string; serverUrl: string; authToken: string }): Promise<{ success: boolean; error?: string }> {
    try {
      // Basic validation first
      if (!credentials.apiKey || !credentials.serverUrl || !credentials.authToken) {
        return {
          success: false,
          error: 'Missing required credentials (API Key, Server URL, or Auth Token)'
        };
      }

      // Validate URL format
      try {
        new URL(credentials.serverUrl);
      } catch {
        return {
          success: false,
          error: 'Invalid server URL format'
        };
      }

      // Test the connection using the auth service (with timeout)
      console.log('Attempting to validate Funifier credentials...');
      const isValid = await Promise.race([
        funifierAuthService.validateCredentials({
          apiKey: credentials.apiKey,
          serverUrl: credentials.serverUrl,
          authToken: credentials.authToken,
        }),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);

      if (isValid) {
        console.log('Funifier credentials validated successfully');
        return { success: true };
      }

      return {
        success: false,
        error: 'Failed to connect to Funifier with provided credentials'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      console.warn('Funifier connection test failed:', errorMessage);

      // Don't treat connection failures as fatal - the setup can still proceed
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}. Setup will proceed with local storage.`
      };
    }
  }
}

// Export singleton instance
export const whiteLabelConfigService = WhiteLabelConfigService.getInstance();