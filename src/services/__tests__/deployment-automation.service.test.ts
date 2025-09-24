import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeploymentAutomationService, AutomationConfig } from '../deployment-automation.service';
import { VercelDeploymentService } from '../vercel-deployment.service';
import { WhiteLabelConfigService } from '../white-label-config.service';
import { ErrorLoggerService } from '../error-logger.service';

// Mock dependencies
vi.mock('../vercel-deployment.service');
vi.mock('../white-label-config.service');
vi.mock('../error-logger.service');

describe('DeploymentAutomationService', () => {
  let service: DeploymentAutomationService;
  let mockConfig: AutomationConfig;
  let mockVercelService: any;
  let mockConfigService: any;
  let mockErrorLogger: any;

  beforeEach(() => {
    mockConfig = {
      vercelToken: 'test-token',
      vercelProjectId: 'test-project',
      vercelTeamId: 'test-team',
      githubRepo: 'user/repo',
      defaultBranch: 'main',
      autoDeployOnConfigChange: true,
      healthCheckTimeout: 300000,
      rollbackOnFailure: true
    };

    mockConfigService = {
      getConfiguration: jest.fn(),
      updateConfiguration: jest.fn(),
      createConfiguration: jest.fn(),
      deleteConfiguration: jest.fn()
    } as any;

    mockErrorLogger = {
      logError: jest.fn()
    } as any;

    // Create service with mocked dependencies
    service = new DeploymentAutomationService(
      mockConfig,
      mockConfigService,
      mockErrorLogger
    );

    // Get the mocked Vercel service instance
    mockVercelService = (service as any).vercelService;
  });

  describe('triggerAutomatedDeployment', () => {
    it('should trigger deployment successfully', async () => {
      const mockWhiteLabelConfig = {
        instanceId: 'test-instance',
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1F2937',
          companyName: 'Test Company'
        },
        features: {
          ranking: true,
          dashboards: {
            carteira_i: true,
            carteira_ii: false
          }
        },
        funifierIntegration: {
          apiKey: 'test-api-key',
          serverUrl: 'https://test.funifier.com',
          authToken: 'test-auth-token'
        }
      };

      const mockDeployment = {
        id: 'deployment-123',
        url: 'https://test-deployment.vercel.app',
        readyState: 'BUILDING'
      };

      const mockVerificationResult = {
        success: true,
        deploymentId: 'deployment-123',
        url: 'https://test-deployment.vercel.app',
        status: 'READY'
      };

      mockConfigService.getConfiguration.mockResolvedValue(mockWhiteLabelConfig);
      mockVercelService.triggerDeployment = jest.fn().mockResolvedValue(mockDeployment);
      mockVercelService.verifyDeployment = jest.fn().mockResolvedValue(mockVerificationResult);
      mockVercelService.getDeploymentLogs = jest.fn().mockResolvedValue(['Build completed']);

      const result = await service.triggerAutomatedDeployment('test-instance');

      expect(mockConfigService.getConfiguration).toHaveBeenCalledWith('test-instance');
      expect(mockVercelService.triggerDeployment).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'production',
          environmentVariables: expect.objectContaining({
            NEXT_PUBLIC_INSTANCE_ID: 'test-instance',
            NEXT_PUBLIC_PRIMARY_COLOR: '#3B82F6',
            FUNIFIER_API_KEY: 'test-api-key'
          }),
          gitSource: {
            type: 'github',
            repo: 'user/repo',
            ref: 'main'
          }
        })
      );

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('deployment-123');
      expect(result.url).toBe('https://test-deployment.vercel.app');
    });

    it('should handle missing configuration', async () => {
      mockConfigService.getConfiguration.mockResolvedValue(null);

      const result = await service.triggerAutomatedDeployment('nonexistent-instance');

      expect(result.success).toBe(false);
      expect(result.error).toContain('White-label configuration not found');
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DEPLOYMENT_ERROR'
        })
      );
    });

    it('should rollback on deployment failure when configured', async () => {
      const mockWhiteLabelConfig = {
        instanceId: 'test-instance',
        branding: {},
        features: {},
        funifierIntegration: {}
      };

      const mockDeployment = {
        id: 'deployment-123',
        url: 'https://test-deployment.vercel.app',
        readyState: 'BUILDING'
      };

      const mockVerificationResult = {
        success: false,
        deploymentId: 'deployment-123',
        status: 'ERROR',
        error: 'Health check failed'
      };

      const mockPreviousDeployment = {
        id: 'deployment-122',
        readyState: 'READY'
      };

      mockConfigService.getConfiguration.mockResolvedValue(mockWhiteLabelConfig);
      mockVercelService.triggerDeployment = jest.fn().mockResolvedValue(mockDeployment);
      mockVercelService.verifyDeployment = jest.fn().mockResolvedValue(mockVerificationResult);
      mockVercelService.getDeployments = jest.fn().mockResolvedValue([
        mockDeployment,
        mockPreviousDeployment
      ]);
      mockVercelService.rollbackDeployment = jest.fn().mockResolvedValue({
        success: true,
        deploymentId: 'deployment-122'
      });
      mockVercelService.getDeploymentLogs = jest.fn().mockResolvedValue(['Build failed']);

      const result = await service.triggerAutomatedDeployment('test-instance');

      expect(mockVercelService.rollbackDeployment).toHaveBeenCalledWith('deployment-122');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Health check failed');
    });
  });

  describe('setupDeploymentPipeline', () => {
    it('should create deployment pipeline successfully', async () => {
      const pipelineConfig = {
        name: 'Test Pipeline',
        trigger: 'config_change' as const,
        config: {
          projectId: 'test-project',
          environmentVariables: { NODE_ENV: 'production' },
          target: 'production' as const
        },
        status: 'active' as const
      };

      const pipelineId = await service.setupDeploymentPipeline(pipelineConfig);

      expect(pipelineId).toMatch(/^pipeline_\d+_[a-z0-9]+$/);
    });
  });

  describe('rollbackDeployment', () => {
    it('should rollback deployment successfully', async () => {
      const mockRollbackDeployment = {
        id: 'rollback-deployment-id',
        url: 'https://rollback-deployment.vercel.app'
      };

      const mockVerificationResult = {
        success: true,
        deploymentId: 'rollback-deployment-id',
        url: 'https://rollback-deployment.vercel.app',
        status: 'READY'
      };

      mockVercelService.rollbackDeployment = jest.fn().mockResolvedValue(mockRollbackDeployment);
      mockVercelService.verifyDeployment = jest.fn().mockResolvedValue(mockVerificationResult);
      mockVercelService.getDeploymentLogs = jest.fn().mockResolvedValue(['Rollback completed']);

      const result = await service.rollbackDeployment({
        deploymentId: 'target-deployment-id',
        reason: 'Test rollback'
      });

      expect(mockVercelService.rollbackDeployment).toHaveBeenCalledWith('target-deployment-id');
      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('rollback-deployment-id');
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DEPLOYMENT_ROLLBACK',
          message: expect.stringContaining('Test rollback')
        })
      );
    });

    it('should skip health check when requested', async () => {
      const mockRollbackDeployment = {
        id: 'rollback-deployment-id',
        url: 'https://rollback-deployment.vercel.app'
      };

      mockVercelService.rollbackDeployment = jest.fn().mockResolvedValue(mockRollbackDeployment);
      mockVercelService.getDeploymentLogs = jest.fn().mockResolvedValue([]);

      const result = await service.rollbackDeployment({
        deploymentId: 'target-deployment-id',
        skipHealthCheck: true
      });

      expect(mockVercelService.verifyDeployment).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle rollback errors', async () => {
      mockVercelService.rollbackDeployment = jest.fn().mockRejectedValue(
        new Error('Rollback failed')
      );

      const result = await service.rollbackDeployment({
        deploymentId: 'target-deployment-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rollback failed');
    });
  });

  describe('getDeploymentHistory', () => {
    it('should return formatted deployment history', async () => {
      const mockDeployments = [
        {
          id: 'deployment-1',
          url: 'https://deployment-1.vercel.app',
          readyState: 'READY',
          createdAt: 1640995200000,
          readyAt: 1640995800000,
          creator: { username: 'testuser' },
          source: 'git',
          gitSource: { type: 'github', repo: 'user/repo', ref: 'main' }
        },
        {
          id: 'deployment-2',
          url: 'https://deployment-2.vercel.app',
          readyState: 'ERROR',
          createdAt: 1640995100000,
          creator: { email: 'test@example.com' },
          source: 'cli'
        }
      ];

      mockVercelService.getDeployments = jest.fn().mockResolvedValue(mockDeployments);

      const result = await service.getDeploymentHistory(10);

      expect(mockVercelService.getDeployments).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'deployment-1',
        url: 'https://deployment-1.vercel.app',
        status: 'READY',
        createdAt: new Date(1640995200000),
        readyAt: new Date(1640995800000),
        creator: { username: 'testuser' },
        source: 'git',
        gitSource: { type: 'github', repo: 'user/repo', ref: 'main' }
      });
    });
  });

  describe('prepareEnvironmentVariables', () => {
    it('should prepare environment variables correctly', async () => {
      const mockWhiteLabelConfig = {
        instanceId: 'test-instance',
        branding: {
          primaryColor: '#FF0000',
          secondaryColor: '#00FF00',
          companyName: 'Test Corp'
        },
        features: {
          ranking: false,
          dashboards: {
            carteira_i: true,
            carteira_ii: false,
            carteira_iii: true,
            carteira_iv: false
          }
        },
        funifierIntegration: {
          apiKey: 'secret-api-key',
          serverUrl: 'https://api.funifier.com',
          authToken: 'secret-auth-token'
        }
      };

      // Use reflection to access private method for testing
      const envVars = await (service as any).prepareEnvironmentVariables(mockWhiteLabelConfig);

      expect(envVars).toEqual({
        NEXT_PUBLIC_INSTANCE_ID: 'test-instance',
        NEXT_PUBLIC_PRIMARY_COLOR: '#FF0000',
        NEXT_PUBLIC_SECONDARY_COLOR: '#00FF00',
        NEXT_PUBLIC_COMPANY_NAME: 'Test Corp',
        NEXT_PUBLIC_FEATURE_RANKING: 'false',
        NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_I: 'true',
        NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_II: 'false',
        NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_III: 'true',
        NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_IV: 'false',
        FUNIFIER_API_KEY: 'secret-api-key',
        FUNIFIER_SERVER_URL: 'https://api.funifier.com',
        FUNIFIER_AUTH_TOKEN: 'secret-auth-token',
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'https://test-instance.vercel.app'
      });
    });

    it('should use default values for missing configuration', async () => {
      const mockWhiteLabelConfig = {
        instanceId: 'minimal-instance'
      };

      const envVars = await (service as any).prepareEnvironmentVariables(mockWhiteLabelConfig);

      expect(envVars.NEXT_PUBLIC_PRIMARY_COLOR).toBe('#3B82F6');
      expect(envVars.NEXT_PUBLIC_COMPANY_NAME).toBe('Gamification Platform');
      expect(envVars.NEXT_PUBLIC_FEATURE_RANKING).toBe('true');
    });
  });
});