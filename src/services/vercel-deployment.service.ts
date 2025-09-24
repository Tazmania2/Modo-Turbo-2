import { VercelDeployment, VercelProject, VercelEnvironmentVariable, DeploymentStatus } from '@/types/vercel';
import { encrypt, decrypt } from '@/utils/encryption';

export interface VercelConfig {
  token: string;
  teamId?: string;
  projectId: string;
}

export interface DeploymentTriggerOptions {
  branch?: string;
  environmentVariables?: Record<string, string>;
  target?: 'production' | 'preview' | 'development';
  gitSource?: {
    type: 'github' | 'gitlab' | 'bitbucket';
    repo: string;
    ref: string;
  };
}

export interface DeploymentVerificationResult {
  success: boolean;
  deploymentId: string;
  url?: string;
  status: DeploymentStatus;
  error?: string;
  logs?: string[];
}

export class VercelDeploymentService {
  private readonly baseUrl = 'https://api.vercel.com';
  private config: VercelConfig;

  constructor(config: VercelConfig) {
    this.config = config;
  }

  /**
   * Get project information from Vercel
   */
  async getProject(): Promise<VercelProject> {
    const response = await this.makeRequest(`/v9/projects/${this.config.projectId}`);
    return response;
  }

  /**
   * List all environment variables for the project
   */
  async getEnvironmentVariables(): Promise<VercelEnvironmentVariable[]> {
    const response = await this.makeRequest(
      `/v9/projects/${this.config.projectId}/env`
    );
    return response.envs || [];
  }

  /**
   * Create or update environment variables
   */
  async updateEnvironmentVariables(
    variables: Record<string, string>,
    target: ('production' | 'preview' | 'development')[] = ['production', 'preview', 'development']
  ): Promise<void> {
    const existingVars = await this.getEnvironmentVariables();
    
    for (const [key, value] of Object.entries(variables)) {
      const existingVar = existingVars.find(v => v.key === key);
      
      if (existingVar) {
        // Update existing variable
        await this.makeRequest(
          `/v9/projects/${this.config.projectId}/env/${existingVar.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              value: this.shouldEncrypt(key) ? encrypt(value) : value,
              target
            })
          }
        );
      } else {
        // Create new variable
        await this.makeRequest(
          `/v9/projects/${this.config.projectId}/env`,
          {
            method: 'POST',
            body: JSON.stringify({
              key,
              value: this.shouldEncrypt(key) ? encrypt(value) : value,
              target,
              type: 'encrypted'
            })
          }
        );
      }
    }
  }

  /**
   * Delete environment variable
   */
  async deleteEnvironmentVariable(key: string): Promise<void> {
    const existingVars = await this.getEnvironmentVariables();
    const variable = existingVars.find(v => v.key === key);
    
    if (variable) {
      await this.makeRequest(
        `/v9/projects/${this.config.projectId}/env/${variable.id}`,
        { method: 'DELETE' }
      );
    }
  }

  /**
   * Trigger a new deployment
   */
  async triggerDeployment(options: DeploymentTriggerOptions = {}): Promise<VercelDeployment> {
    const deploymentData: any = {
      name: `white-label-gamification-${Date.now()}`,
      target: options.target || 'production',
      projectSettings: {
        framework: 'nextjs'
      }
    };

    // Add git source if provided
    if (options.gitSource) {
      deploymentData.gitSource = options.gitSource;
    }

    // Add environment variables if provided
    if (options.environmentVariables) {
      await this.updateEnvironmentVariables(options.environmentVariables);
    }

    const response = await this.makeRequest('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify(deploymentData)
    });

    return response;
  }

  /**
   * Get deployment status and details
   */
  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    const response = await this.makeRequest(`/v13/deployments/${deploymentId}`);
    return response;
  }

  /**
   * List recent deployments
   */
  async getDeployments(limit: number = 10): Promise<VercelDeployment[]> {
    const response = await this.makeRequest(
      `/v6/deployments?projectId=${this.config.projectId}&limit=${limit}`
    );
    return response.deployments || [];
  }

  /**
   * Verify deployment is successful and accessible
   */
  async verifyDeployment(deploymentId: string, timeout: number = 300000): Promise<DeploymentVerificationResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const deployment = await this.getDeployment(deploymentId);
        
        if (deployment.readyState === 'READY') {
          // Test if the deployment is accessible
          const healthCheck = await this.testDeploymentHealth(deployment.url);
          
          return {
            success: healthCheck.success,
            deploymentId,
            url: deployment.url,
            status: deployment.readyState,
            error: healthCheck.error
          };
        } else if (deployment.readyState === 'ERROR') {
          return {
            success: false,
            deploymentId,
            status: deployment.readyState,
            error: 'Deployment failed'
          };
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        return {
          success: false,
          deploymentId,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return {
      success: false,
      deploymentId,
      status: 'TIMEOUT',
      error: 'Deployment verification timed out'
    };
  }

  /**
   * Rollback to a previous deployment
   */
  async rollbackDeployment(deploymentId: string): Promise<VercelDeployment> {
    // Get the deployment to rollback to
    const targetDeployment = await this.getDeployment(deploymentId);
    
    if (!targetDeployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    // Promote the deployment to production
    const response = await this.makeRequest(
      `/v13/deployments/${deploymentId}/promote`,
      { method: 'POST' }
    );

    return response;
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const response = await this.makeRequest(
        `/v2/deployments/${deploymentId}/events`
      );
      
      return response.map((event: any) => event.text || event.payload?.text || '').filter(Boolean);
    } catch (error) {
      console.error('Failed to fetch deployment logs:', error);
      return [];
    }
  }

  /**
   * Test deployment health
   */
  private async testDeploymentHealth(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: `Health check failed with status ${response.status}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Health check failed' 
      };
    }
  }

  /**
   * Make authenticated request to Vercel API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.config.teamId) {
      headers['X-Vercel-Team-Id'] = this.config.teamId;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vercel API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Determine if a variable should be encrypted
   */
  private shouldEncrypt(key: string): boolean {
    const sensitiveKeys = [
      'FUNIFIER_API_KEY',
      'FUNIFIER_AUTH_TOKEN',
      'ENCRYPTION_KEY',
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_URL'
    ];
    
    return sensitiveKeys.some(sensitiveKey => 
      key.toUpperCase().includes(sensitiveKey.toUpperCase())
    );
  }
}

/**
 * Factory function to create Vercel deployment service
 */
export function createVercelDeploymentService(config: VercelConfig): VercelDeploymentService {
  return new VercelDeploymentService(config);
}

/**
 * Get Vercel configuration from environment
 */
export function getVercelConfigFromEnv(): VercelConfig | null {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return null;
  }

  return {
    token,
    projectId,
    teamId
  };
}