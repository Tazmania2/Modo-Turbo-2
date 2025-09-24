/**
 * Example usage of the White-Label Configuration Service
 * 
 * This example demonstrates how to use the white-label configuration management
 * system to set up, manage, and retrieve configurations for different instances.
 */

import { whiteLabelConfigService } from '../white-label-config.service';
import { WhiteLabelConfiguration, SetupRequest } from '@/types/funifier';

/**
 * Example 1: Initialize the service and create collection
 */
export async function initializeWhiteLabelSystem(): Promise<void> {
  try {
    console.log('Initializing white-label configuration system...');
    
    // Initialize the collection in Funifier
    await whiteLabelConfigService.initializeCollection();
    
    console.log('White-label system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize white-label system:', error);
    throw error;
  }
}

/**
 * Example 2: Set up a new demo instance
 */
export async function setupDemoInstance(): Promise<string> {
  try {
    console.log('Setting up demo instance...');
    
    const setupRequest: SetupRequest = {
      mode: 'demo'
    };
    
    const result = await whiteLabelConfigService.handleSetup(setupRequest);
    
    if (result.success) {
      console.log(`Demo instance created with ID: ${result.instanceId}`);
      console.log(`Redirect URL: ${result.redirectUrl}`);
      return result.instanceId!;
    } else {
      throw new Error(`Setup failed: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    console.error('Failed to setup demo instance:', error);
    throw error;
  }
}

/**
 * Example 3: Set up a Funifier-integrated instance
 */
export async function setupFunifierInstance(): Promise<string> {
  try {
    console.log('Setting up Funifier instance...');
    
    const setupRequest: SetupRequest = {
      mode: 'funifier',
      funifierCredentials: {
        apiKey: 'your-funifier-api-key',
        serverUrl: 'https://your-funifier-server.com',
        authToken: 'your-auth-token'
      }
    };
    
    const result = await whiteLabelConfigService.handleSetup(setupRequest);
    
    if (result.success) {
      console.log(`Funifier instance created with ID: ${result.instanceId}`);
      console.log(`Redirect URL: ${result.redirectUrl}`);
      return result.instanceId!;
    } else {
      throw new Error(`Setup failed: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    console.error('Failed to setup Funifier instance:', error);
    throw error;
  }
}

/**
 * Example 4: Update an existing configuration
 */
export async function updateInstanceConfiguration(instanceId: string): Promise<void> {
  try {
    console.log(`Updating configuration for instance: ${instanceId}`);
    
    // Get current configuration
    const currentConfig = await whiteLabelConfigService.getConfiguration(instanceId);
    
    if (!currentConfig) {
      throw new Error('Configuration not found');
    }
    
    // Update branding
    const updatedConfig: WhiteLabelConfiguration = {
      ...currentConfig,
      branding: {
        ...currentConfig.branding,
        primaryColor: '#FF6B35',
        secondaryColor: '#2E3440',
        companyName: 'Updated Company Name',
        tagline: 'New and Improved Tagline'
      },
      features: {
        ...currentConfig.features,
        ranking: true,
        personalizedRanking: true,
        dashboards: {
          ...currentConfig.features.dashboards,
          carteira_iii: true,
          carteira_iv: true
        }
      },
      updatedAt: Date.now()
    };
    
    const result = await whiteLabelConfigService.saveConfiguration(
      instanceId,
      updatedConfig,
      'admin-user-123'
    );
    
    if (result.success) {
      console.log('Configuration updated successfully');
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Warnings:', result.warnings);
      }
    } else {
      throw new Error(`Update failed: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    console.error('Failed to update configuration:', error);
    throw error;
  }
}

/**
 * Example 5: Retrieve configuration for API response
 */
export async function getInstanceConfigForAPI(instanceId: string): Promise<void> {
  try {
    console.log(`Retrieving configuration for instance: ${instanceId}`);
    
    const config = await whiteLabelConfigService.getConfigurationResponse(instanceId);
    
    if (config) {
      console.log('Configuration retrieved:', {
        instanceId: config.instanceId,
        companyName: config.branding.companyName,
        primaryColor: config.branding.primaryColor,
        featuresEnabled: Object.keys(config.features).filter(
          key => config.features[key as keyof typeof config.features]
        ),
        funifierConfigured: config.funifierConfig.isConfigured
      });
    } else {
      console.log('Configuration not found');
    }
  } catch (error) {
    console.error('Failed to retrieve configuration:', error);
    throw error;
  }
}

/**
 * Example 6: Validate configuration before saving
 */
export async function validateConfigurationExample(): Promise<void> {
  try {
    console.log('Validating configuration...');
    
    const testConfig: WhiteLabelConfiguration = {
      instanceId: 'test-instance',
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1F2937',
        accentColor: '#10B981',
        logo: 'https://example.com/logo.png',
        favicon: 'https://example.com/favicon.ico',
        companyName: 'Test Company',
        tagline: 'Test Tagline'
      },
      features: {
        ranking: true,
        dashboards: {
          carteira_i: true,
          carteira_ii: false
        },
        history: true,
        personalizedRanking: true
      },
      funifierIntegration: {
        apiKey: '',
        serverUrl: '',
        authToken: '',
        customCollections: []
      }
    };
    
    const validation = whiteLabelConfigService.validateConfiguration(testConfig);
    
    if (validation.isValid) {
      console.log('Configuration is valid');
    } else {
      console.log('Configuration validation failed:');
      validation.errors.forEach(error => console.log(`- ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log('Warnings:');
      validation.warnings.forEach(warning => console.log(`- ${warning}`));
    }
  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
}

/**
 * Example 7: Reset configuration to defaults
 */
export async function resetInstanceToDefaults(instanceId: string): Promise<void> {
  try {
    console.log(`Resetting instance ${instanceId} to defaults...`);
    
    const result = await whiteLabelConfigService.resetConfiguration(
      instanceId,
      'admin-user-123'
    );
    
    if (result.success) {
      console.log('Configuration reset to defaults successfully');
    } else {
      throw new Error(`Reset failed: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    console.error('Failed to reset configuration:', error);
    throw error;
  }
}

/**
 * Example 8: List all configurations (admin function)
 */
export async function listAllConfigurations(): Promise<void> {
  try {
    console.log('Listing all configurations...');
    
    const configurations = await whiteLabelConfigService.listConfigurations();
    
    console.log(`Found ${configurations.length} configurations:`);
    configurations.forEach(config => {
      console.log(`- Instance: ${config.instanceId}`);
      console.log(`  Company: ${config.branding.companyName}`);
      console.log(`  Funifier: ${config.funifierConfig.isConfigured ? 'Yes' : 'No'}`);
      console.log(`  Features: ${Object.keys(config.features).length} configured`);
    });
  } catch (error) {
    console.error('Failed to list configurations:', error);
    throw error;
  }
}

/**
 * Example 9: Delete a configuration
 */
export async function deleteInstanceConfiguration(instanceId: string): Promise<void> {
  try {
    console.log(`Deleting configuration for instance: ${instanceId}`);
    
    const success = await whiteLabelConfigService.deleteConfiguration(instanceId);
    
    if (success) {
      console.log('Configuration deleted successfully');
    } else {
      console.log('Configuration not found or could not be deleted');
    }
  } catch (error) {
    console.error('Failed to delete configuration:', error);
    throw error;
  }
}

/**
 * Complete workflow example
 */
export async function completeWorkflowExample(): Promise<void> {
  try {
    console.log('=== White-Label Configuration Complete Workflow ===');
    
    // 1. Initialize system
    await initializeWhiteLabelSystem();
    
    // 2. Create demo instance
    const demoInstanceId = await setupDemoInstance();
    
    // 3. Retrieve and display configuration
    await getInstanceConfigForAPI(demoInstanceId);
    
    // 4. Update configuration
    await updateInstanceConfiguration(demoInstanceId);
    
    // 5. Validate configuration
    await validateConfigurationExample();
    
    // 6. List all configurations
    await listAllConfigurations();
    
    // 7. Reset to defaults
    await resetInstanceToDefaults(demoInstanceId);
    
    // 8. Clean up - delete configuration
    await deleteInstanceConfiguration(demoInstanceId);
    
    console.log('=== Workflow completed successfully ===');
  } catch (error) {
    console.error('Workflow failed:', error);
    throw error;
  }
}

// Export all examples for easy usage
export const whiteLabelConfigExamples = {
  initializeWhiteLabelSystem,
  setupDemoInstance,
  setupFunifierInstance,
  updateInstanceConfiguration,
  getInstanceConfigForAPI,
  validateConfigurationExample,
  resetInstanceToDefaults,
  listAllConfigurations,
  deleteInstanceConfiguration,
  completeWorkflowExample
};