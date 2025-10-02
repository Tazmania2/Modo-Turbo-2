import { FunifierApiClient } from './funifier-api-client';
import { FunifierCredentials } from '@/types/funifier';

/**
 * Environment-based Funifier service that uses credentials from Vercel environment variables
 * This eliminates the need for complex setup flows
 */
export class FunifierEnvService {
  private static instance: FunifierEnvService;
  private apiClient: FunifierApiClient;
  private credentials: FunifierCredentials;

  private constructor() {
    // Get credentials from environment variables
    this.credentials = {
      apiKey: process.env.FUNIFIER_API_KEY || '',
      authToken: process.env.FUNIFIER_BASIC_TOKEN || '',
      serverUrl: process.env.DEFAULT_FUNIFIER_URL || 'https://service2.funifier.com'
    };

    // Initialize API client with environment credentials
    this.apiClient = new FunifierApiClient(this.credentials.serverUrl);
    this.apiClient.setCredentials(this.credentials);
  }

  public static getInstance(): FunifierEnvService {
    if (!FunifierEnvService.instance) {
      FunifierEnvService.instance = new FunifierEnvService();
    }
    return FunifierEnvService.instance;
  }

  /**
   * Get the configured API client
   */
  public getApiClient(): FunifierApiClient {
    return this.apiClient;
  }

  /**
   * Get current credentials (without sensitive data)
   */
  public getCredentialsInfo() {
    return {
      hasApiKey: !!this.credentials.apiKey,
      hasAuthToken: !!this.credentials.authToken,
      serverUrl: this.credentials.serverUrl,
      isConfigured: !!(this.credentials.apiKey && this.credentials.authToken)
    };
  }

  /**
   * Test connectivity with current environment credentials
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.credentials.apiKey || !this.credentials.authToken) {
        return {
          success: false,
          message: 'Missing Funifier credentials in environment variables'
        };
      }

      await this.apiClient.healthCheck();
      return {
        success: true,
        message: 'Successfully connected to Funifier API'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.userMessage || 'Failed to connect to Funifier API'
      };
    }
  }

  /**
   * Check if demo mode is enabled
   */
  public isDemoMode(): boolean {
    return process.env.DEMO_MODE_ENABLED === 'true';
  }

  /**
   * Get the correct API URL for requests
   */
  public getApiUrl(): string {
    return this.credentials.serverUrl.endsWith('/v3') 
      ? this.credentials.serverUrl 
      : `${this.credentials.serverUrl.replace(/\/$/, '')}/v3`;
  }
}

// Export singleton instance
export const funifierEnvService = FunifierEnvService.getInstance();