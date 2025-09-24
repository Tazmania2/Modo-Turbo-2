import { VercelDeploymentService, DeploymentTriggerOptions } from './vercel-deployment.service';
import { WhiteLabelConfigService } from './white-label-config.service';
import { ErrorLoggerService } from './error-logger.service';
import { DeploymentConfig, DeploymentResult, RollbackOptions } from '@/types/vercel';
import { encrypt, decrypt } from '@/utils/encryption';

export interface AutomationConfig {
  vercelToken: string;
  vercelProjectId: string;
  vercelTeamId?: string;
  githubRepo?: string;
  defaultBranch: string;
  autoDeployOnConfigChange: boolean;
  healthCheckTimeout: number;
  rollbackOnFailure: boolean;
}

export interface DeploymentPipeline {
  id: string;
  name: string;
  trigger: 'manual' | 'config_change' | 'scheduled' | 'webhook';
  config: DeploymentConfig;
  createdAt: Date;
  lastRun?: Date;
  status: 'active' | 'paused' | 'failed';
}

export class DeploymentAutomationService {
  private vercelService: VercelDeploymentService;
  private configService: WhiteLabelConfigService;
  private errorLogger: ErrorLoggerService;
  private config: AutomationConfig;

  constructor(
    config: AutomationConfig,
    configService: WhiteLabelConfigService,
    errorLogger: ErrorLoggerService
  ) {
    this.config = config;
    this.configService = configService;
    this.errorLogger = errorLogger;
    
    this.vercelService = new VercelDeploymentService({
      token: config.vercelToken,
      projectId: config.vercelProjectId,
      teamId: config.vercelTeamId
    });
  }

  /**
   * Trigger automated deployment with white-label configuration
   */
  async triggerAutomatedDeployment(
    instanceId: string,
    options: Partial<DeploymentTriggerOptions> = {}
  ): Promise<DeploymentResult> {
    try {
      // Get white-label configuration
      const whiteLabelConfig = await this.configService.getConfiguration(instanceId);
      
      if (!whiteLabelConfig) {
        throw new Error(`White-label configuration not found for instance: ${instanceId}`);
      }

      // Prepare environment variables
      const environmentVariables = await this.prepareEnvironmentVariables(whiteLabelConfig);

      // Trigger deployment
      const deployment = await this.vercelService.triggerDeployment({
        target: 'production',
        environmentVariables,
        gitSource: this.config.githubRepo ? {
          type: 'github',
          repo: this.config.githubRepo,
          ref: this.config.defaultBranch
        } : undefined,
        ...options
      });

      // Verify deployment
      const verificationResult = await this.vercelService.verifyDeployment(
        deployment.id,
        this.config.healthCheckTimeout
      );

      if (!verificationResult.success && this.config.rollbackOnFailure) {
        await this.handleDeploymentFailure(deployment.id, verificationResult.error);
      }

      const result: DeploymentResult = {
        success: verificationResult.success,
        deploymentId: deployment.id,
        url: deployment.url,
        error: verificationResult.error,
        logs: await this.vercelService.getDeploymentLogs(deployment.id)
      };

      // Log deployment result
      await this.logDeploymentResult(instanceId, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown deployment error';
      
      await this.errorLogger.logError({
        type: 'DEPLOYMENT_ERROR',
        message: errorMessage,
        details: { instanceId, options },
        timestamp: new Date(),
        retryable: true,
        userMessage: 'Deployment failed. Please try again or contact support.'
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Setup automated deployment pipeline
   */
  async setupDeploymentPipeline(pipeline: Omit<DeploymentPipeline, 'id' | 'createdAt'>): Promise<string> {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullPipeline: DeploymentPipeline = {
      ...pipeline,
      id: pipelineId,
      createdAt: new Date()
    };

    // Store pipeline configuration (in a real implementation, this would be in a database)
    await this.storePipelineConfig(fullPipeline);

    // Setup triggers based on pipeline type
    if (pipeline.trigger === 'config_change') {
      await this.setupConfigChangeListener(pipelineId);
    } else if (pipeline.trigger === 'scheduled') {
      await this.setupScheduledDeployment(pipelineId);
    }

    return pipelineId;
  }

  /**
   * Execute deployment pipeline
   */
  async executePipeline(pipelineId: string): Promise<DeploymentResult> {
    const pipeline = await this.getPipelineConfig(pipelineId);
    
    if (!pipeline || pipeline.status !== 'active') {
      throw new Error(`Pipeline ${pipelineId} not found or not active`);
    }

    // Update last run timestamp
    pipeline.lastRun = new Date();
    await this.storePipelineConfig(pipeline);

    // Execute deployment
    return this.triggerAutomatedDeployment(
      pipeline.config.projectId,
      {
        target: pipeline.config.target,
        environmentVariables: pipeline.config.environmentVariables,
        gitSource: pipeline.config.gitSource
      }
    );
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(options: RollbackOptions): Promise<DeploymentResult> {
    try {
      const deployment = await this.vercelService.rollbackDeployment(options.deploymentId);
      
      let verificationResult = { success: true, error: undefined };
      
      if (!options.skipHealthCheck) {
        verificationResult = await this.vercelService.verifyDeployment(deployment.id);
      }

      const result: DeploymentResult = {
        success: verificationResult.success,
        deploymentId: deployment.id,
        url: deployment.url,
        error: verificationResult.error,
        logs: await this.vercelService.getDeploymentLogs(deployment.id)
      };

      // Log rollback
      await this.errorLogger.logError({
        type: 'DEPLOYMENT_ROLLBACK',
        message: `Deployment rolled back: ${options.reason || 'Manual rollback'}`,
        details: options,
        timestamp: new Date(),
        retryable: false,
        userMessage: 'Deployment has been rolled back to previous version.'
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get deployment history
   */
  async getDeploymentHistory(limit: number = 20): Promise<any[]> {
    const deployments = await this.vercelService.getDeployments(limit);
    
    return deployments.map(deployment => ({
      id: deployment.id,
      url: deployment.url,
      status: deployment.readyState,
      createdAt: new Date(deployment.createdAt),
      readyAt: deployment.readyAt ? new Date(deployment.readyAt) : null,
      creator: deployment.creator,
      source: deployment.source,
      gitSource: deployment.gitSource
    }));
  }

  /**
   * Prepare environment variables for deployment
   */
  private async prepareEnvironmentVariables(whiteLabelConfig: any): Promise<Record<string, string>> {
    const envVars: Record<string, string> = {
      // White-label configuration
      NEXT_PUBLIC_INSTANCE_ID: whiteLabelConfig.instanceId,
      NEXT_PUBLIC_PRIMARY_COLOR: whiteLabelConfig.branding?.primaryColor || '#3B82F6',
      NEXT_PUBLIC_SECONDARY_COLOR: whiteLabelConfig.branding?.secondaryColor || '#1F2937',
      NEXT_PUBLIC_COMPANY_NAME: whiteLabelConfig.branding?.companyName || 'Gamification Platform',
      
      // Feature toggles
      NEXT_PUBLIC_FEATURE_RANKING: whiteLabelConfig.features?.ranking?.toString() || 'true',
      NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_I: whiteLabelConfig.features?.dashboards?.carteira_i?.toString() || 'true',
      NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_II: whiteLabelConfig.features?.dashboards?.carteira_ii?.toString() || 'true',
      NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_III: whiteLabelConfig.features?.dashboards?.carteira_iii?.toString() || 'true',
      NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_IV: whiteLabelConfig.features?.dashboards?.carteira_iv?.toString() || 'true',
      
      // Funifier configuration (encrypted)
      FUNIFIER_API_KEY: whiteLabelConfig.funifierIntegration?.apiKey || '',
      FUNIFIER_SERVER_URL: whiteLabelConfig.funifierIntegration?.serverUrl || '',
      FUNIFIER_AUTH_TOKEN: whiteLabelConfig.funifierIntegration?.authToken || '',
      
      // System configuration
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: `https://${whiteLabelConfig.instanceId}.vercel.app`
    };

    return envVars;
  }

  /**
   * Handle deployment failure
   */
  private async handleDeploymentFailure(deploymentId: string, error?: string): Promise<void> {
    // Get previous successful deployment
    const deployments = await this.vercelService.getDeployments(10);
    const lastSuccessful = deployments.find(d => d.readyState === 'READY' && d.id !== deploymentId);

    if (lastSuccessful) {
      await this.rollbackDeployment({
        deploymentId: lastSuccessful.id,
        reason: `Automatic rollback due to deployment failure: ${error}`
      });
    }
  }

  /**
   * Setup configuration change listener
   */
  private async setupConfigChangeListener(pipelineId: string): Promise<void> {
    // In a real implementation, this would setup a webhook or polling mechanism
    // to detect configuration changes and trigger deployments
    console.log(`Setting up config change listener for pipeline: ${pipelineId}`);
  }

  /**
   * Setup scheduled deployment
   */
  private async setupScheduledDeployment(pipelineId: string): Promise<void> {
    // In a real implementation, this would setup a cron job or scheduled task
    console.log(`Setting up scheduled deployment for pipeline: ${pipelineId}`);
  }

  /**
   * Store pipeline configuration
   */
  private async storePipelineConfig(pipeline: DeploymentPipeline): Promise<void> {
    // In a real implementation, this would store in a database
    // For now, we'll use a simple in-memory storage or file system
    const key = `deployment_pipeline_${pipeline.id}`;
    const encryptedConfig = encrypt(JSON.stringify(pipeline));
    
    // Store in environment or cache
    process.env[key] = encryptedConfig;
  }

  /**
   * Get pipeline configuration
   */
  private async getPipelineConfig(pipelineId: string): Promise<DeploymentPipeline | null> {
    const key = `deployment_pipeline_${pipelineId}`;
    const encryptedConfig = process.env[key];
    
    if (!encryptedConfig) {
      return null;
    }

    try {
      const decryptedConfig = decrypt(encryptedConfig);
      return JSON.parse(decryptedConfig);
    } catch (error) {
      console.error('Failed to decrypt pipeline config:', error);
      return null;
    }
  }

  /**
   * Log deployment result
   */
  private async logDeploymentResult(instanceId: string, result: DeploymentResult): Promise<void> {
    const logLevel = result.success ? 'info' : 'error';
    
    await this.errorLogger.logError({
      type: result.success ? 'DEPLOYMENT_SUCCESS' : 'DEPLOYMENT_FAILURE',
      message: result.success 
        ? `Deployment successful for instance: ${instanceId}`
        : `Deployment failed for instance: ${instanceId} - ${result.error}`,
      details: { instanceId, result },
      timestamp: new Date(),
      retryable: !result.success,
      userMessage: result.success 
        ? 'Deployment completed successfully'
        : 'Deployment failed. Please check the logs and try again.'
    });
  }
}

/**
 * Factory function to create deployment automation service
 */
export function createDeploymentAutomationService(
  config: AutomationConfig,
  configService: WhiteLabelConfigService,
  errorLogger: ErrorLoggerService
): DeploymentAutomationService {
  return new DeploymentAutomationService(config, configService, errorLogger);
}