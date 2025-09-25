import { SetupRequest } from '@/types/funifier';
import { demoDataService } from './demo-data.service';

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

  private constructor() {}

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
      if (!instanceId) {
        return true; // No instance ID means fresh setup
      }

      // For now, always return true since we're not persisting configurations
      // In a full implementation, this would check the database
      return true;
    } catch (error) {
      console.error('Error checking setup status:', error);
      return true; // Assume setup needed on error
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
  async resetToSetup(instanceId: string, _userId: string): Promise<SetupResult> {
    try {
      // For now, always return success since we're not persisting configurations
      // In a full implementation, this would delete the configuration from database
      return {
        success: true,
        redirectUrl: '/setup'
      };
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

      // For demo mode, we don't need to save to database or encrypt anything
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

      // For now, just return success - actual Funifier integration would save credentials
      // This would normally save the encrypted credentials to the database
      return {
        success: true,
        instanceId: actualInstanceId,
        redirectUrl: `/admin/login?instance=${actualInstanceId}`
      };
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
      // Test the connection (would normally use funifierAuthService)
      
      // This would normally test the actual connection
      // For now, we'll do basic validation and assume success if credentials are provided
      if (credentials.apiKey && credentials.serverUrl && credentials.authToken) {
        return { success: true };
      }

      return {
        success: false,
        errors: ['Invalid credentials provided']
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