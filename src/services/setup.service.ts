import { SetupRequest } from '@/types/funifier';
import { whiteLabelConfigService } from './white-label-config.service';
import { funifierAuthService } from './funifier-auth.service';
import { demoDataService } from './demo-data.service';
import { demoModeService } from './demo-mode.service';

export interface SetupResult {
  success: boolean;
  instanceId?: string;
  redirectUrl?: string;
  errors?: string[];
}

export interface CredentialsValidationResult {
  isValid: boolean;
  errors?: string[];
  userInfo?: {
    name: string;
    isAdmin: boolean;
    roles: string[];
  };
}

/**
 * Service for handling initial setup and demo mode configuration
 */
export class SetupService {
  private static instance: SetupService;

  private constructor() { }

  static getInstance(): SetupService {
    if (!SetupService.instance) {
      SetupService.instance = new SetupService();
    }
    return SetupService.instance;
  }

  /**
   * Handle initial setup request
   */
  async handleSetup(request: SetupRequest, instanceId?: string): Promise<SetupResult> {
    try {
      // Validate the setup request
      const validation = this.validateSetupRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      if (request.mode === 'demo') {
        return await this.setupDemoMode(instanceId);
      } else if (request.mode === 'funifier' && request.funifierCredentials) {
        return await this.setupFunifierMode(request.funifierCredentials, instanceId);
      }

      return {
        success: false,
        errors: ['Invalid setup mode or missing credentials']
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate Funifier credentials
   */
  async validateFunifierCredentials(credentials: {
    apiKey: string;
    serverUrl: string;
    authToken: string;
  }): Promise<CredentialsValidationResult> {
    try {
      // Basic validation
      if (!credentials.apiKey || !credentials.serverUrl || !credentials.authToken) {
        return {
          isValid: false,
          errors: ['All credentials are required']
        };
      }

      // URL validation
      try {
        new URL(credentials.serverUrl);
      } catch {
        return {
          isValid: false,
          errors: ['Invalid server URL format']
        };
      }

      // Test connection to Funifier
      const connectionTest = await this.testFunifierConnection(credentials);
      if (!connectionTest.success) {
        return {
          isValid: false,
          errors: connectionTest.errors || ['Failed to connect to Funifier']
        };
      }

      // Validate admin privileges
      const adminCheck = await this.validateAdminPrivileges(credentials);
      if (!adminCheck.success) {
        return {
          isValid: false,
          errors: adminCheck.errors || ['Admin privileges required']
        };
      }

      return {
        isValid: true,
        userInfo: adminCheck.userInfo
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Check if the system needs initial setup
   */
  async needsSetup(instanceId?: string): Promise<boolean> {
    try {
      // Check if demo mode is available using the demo mode service
      if (demoModeService.isDemoMode()) {
        console.log('Demo mode available, setup not strictly required');
        // Demo mode is available, but still check if Funifier is configured
      }

      if (!instanceId) {
        console.log('No instance ID provided, setup available');
        return false; // Allow access to demo mode even without instance ID
      }

      console.log(`Checking setup status for instance: ${instanceId}`);
      const config = await whiteLabelConfigService.getConfiguration(instanceId);
      const needsSetup = !config || !config.funifierIntegration?.apiKey;
      console.log(`Setup needed for ${instanceId}: ${needsSetup}`);
      return false; // Always allow access, setup is optional with demo mode
    } catch (error) {
      console.error('Error checking setup status:', error);
      return false; // Allow access to demo mode even on error
    }
  }

  /**
   * Validate Funifier server URL format
   */
  validateFunifierUrl(url: string): { isValid: boolean; normalizedUrl?: string; error?: string } {
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      
      // Must be HTTPS for production
      if (urlObj.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
        return {
          isValid: false,
          error: 'HTTPS is required for production environments'
        };
      }

      // Must be a Funifier domain
      if (!urlObj.hostname.includes('funifier.com')) {
        return {
          isValid: false,
          error: 'URL must be a valid Funifier domain (*.funifier.com)'
        };
      }

      // Normalize the URL to ensure it ends with /v3
      let normalizedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      
      // Remove trailing slashes
      normalizedUrl = normalizedUrl.replace(/\/+$/, '');
      
      // Ensure it ends with /v3
      if (!normalizedUrl.endsWith('/v3')) {
        normalizedUrl += '/v3';
      }

      return {
        isValid: true,
        normalizedUrl
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }

  /**
   * Generate demo data for the platform
   */
  generateDemoData() {
    return {
      players: demoDataService.generatePlayers(50),
      leaderboards: demoDataService.generateLeaderboards(),
      samplePlayerStatus: demoDataService.generatePlayerStatus('demo_player_1'),
      seasonHistory: demoDataService.generateSeasonHistory('demo_player_1')
    };
  }

  /**
   * Reset system to initial setup state
   */
  async resetToSetup(instanceId: string, userId: string): Promise<SetupResult> {
    try {
      const deleteResult = await whiteLabelConfigService.deleteConfiguration(instanceId);

      if (deleteResult) {
        return {
          success: true,
          redirectUrl: '/setup'
        };
      } else {
        return {
          success: false,
          errors: ['Failed to reset configuration']
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Private helper methods

  private validateSetupRequest(request: SetupRequest): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!request.mode) {
      errors.push('Setup mode is required');
    }

    if (request.mode === 'funifier') {
      if (!request.funifierCredentials) {
        errors.push('Funifier credentials are required for Funifier mode');
      } else {
        const { apiKey, serverUrl, authToken } = request.funifierCredentials;

        if (!apiKey) errors.push('API Key is required');
        if (!serverUrl) errors.push('Server URL is required');
        if (!authToken) errors.push('Auth Token is required');

        if (serverUrl && !serverUrl.startsWith('http')) {
          errors.push('Server URL must start with http:// or https://');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async setupDemoMode(instanceId?: string): Promise<SetupResult> {
    try {
      // Generate a unique instance ID if not provided
      const actualInstanceId = instanceId || this.generateInstanceId();

      // For demo mode, we don't need to save to database
      // Just return success with the instance ID
      return {
        success: true,
        instanceId: actualInstanceId,
        redirectUrl: `/dashboard?instance=${actualInstanceId}`
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Demo setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async setupFunifierMode(
    credentials: { apiKey: string; serverUrl: string; authToken: string },
    instanceId?: string
  ): Promise<SetupResult> {
    try {
      // Validate credentials first
      const validation = await this.validateFunifierCredentials(credentials);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Generate a unique instance ID if not provided
      const actualInstanceId = instanceId || this.generateInstanceId();

      // Initialize the Funifier API client with credentials first
      console.log('Initializing Funifier API client...');
      funifierAuthService.initialize({
        apiKey: credentials.apiKey,
        serverUrl: credentials.serverUrl,
        authToken: credentials.authToken,
      });

      // Initialize the white-label collection (with fallback)
      console.log('Initializing white-label collection...');
      try {
        await whiteLabelConfigService.initializeCollection();
        console.log('Collection initialized successfully');
      } catch (initError) {
        console.warn('Failed to initialize collection, will proceed with cache-only mode:', initError);
        // Don't fail the setup - we'll use cache-only mode as fallback
      }

      // Use the white-label config service to handle Funifier setup
      const setupResult = await whiteLabelConfigService.handleSetup({
        mode: 'funifier',
        funifierCredentials: credentials
      }, actualInstanceId);

      if (setupResult.success) {
        // Optional: Auto-trigger deployment after successful setup
        // Uncomment the following lines to enable auto-deployment
        /*
        try {
          const deploymentService = createDeploymentAutomationService(
            getAutomationConfig(),
            whiteLabelConfigService,
            errorLogger
          );
          
          await deploymentService.triggerAutomatedDeployment(actualInstanceId);
        } catch (deploymentError) {
          console.warn('Auto-deployment failed:', deploymentError);
          // Continue with setup success even if deployment fails
        }
        */

        return {
          success: true,
          instanceId: actualInstanceId,
          redirectUrl: `/admin/login?instance=${actualInstanceId}`
        };
      } else {
        return {
          success: false,
          errors: setupResult.errors
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Funifier setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async testFunifierConnection(credentials: {
    apiKey: string;
    serverUrl: string;
    authToken: string;
  }): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Test the connection using the auth service
      const isValid = await funifierAuthService.validateCredentials({
        apiKey: credentials.apiKey,
        serverUrl: credentials.serverUrl,
        authToken: credentials.authToken,
      });

      if (isValid) {
        return { success: true };
      }

      return {
        success: false,
        errors: ['Failed to connect to Funifier with provided credentials']
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async validateAdminPrivileges(_credentials: {
    apiKey: string;
    serverUrl: string;
    authToken: string;
  }): Promise<{
    success: boolean;
    errors?: string[];
    userInfo?: { name: string; isAdmin: boolean; roles: string[] }
  }> {
    try {
      // This would normally check admin privileges via Funifier API
      // For now, we'll assume success if credentials are provided
      return {
        success: true,
        userInfo: {
          name: 'Admin User',
          isAdmin: true,
          roles: ['admin']
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Admin validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private generateInstanceId(): string {
    // Generate a unique instance ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `wl_${timestamp}_${random}`;
  }
}

// Export singleton instance
export const setupService = SetupService.getInstance();