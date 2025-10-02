import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VercelDeploymentService } from '../vercel-deployment.service';
import { VercelConfig } from '../vercel-deployment.service';

// Mock fetch globally
global.fetch = vi.fn();

describe('VercelDeploymentService', () => {
  let service: VercelDeploymentService;
  let mockConfig: VercelConfig;

  beforeEach(() => {
    mockConfig = {
      token: 'test-token',
      projectId: 'test-project-id',
      teamId: 'test-team-id'
    };
    
    service = new VercelDeploymentService(mockConfig);
    
    // Reset fetch mock
    vi.mocked(fetch).mockReset();
  });

  describe('getProject', () => {
    it('should fetch project information successfully', async () => {
      const mockProject = {
        id: 'test-project-id',
        name: 'test-project',
        framework: 'nextjs'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProject)
      });

      const result = await service.getProject();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v9/projects/test-project-id',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'X-Vercel-Team-Id': 'test-team-id'
          })
        })
      );

      expect(result).toEqual(mockProject);
    });

    it('should handle API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Project not found')
      });

      await expect(service.getProject()).rejects.toThrow('Vercel API error: 404 Not Found - Project not found');
    });
  });

  describe('getEnvironmentVariables', () => {
    it('should fetch environment variables successfully', async () => {
      const mockEnvVars = {
        envs: [
          {
            id: 'env-1',
            key: 'NODE_ENV',
            value: 'production',
            target: ['production'],
            type: 'plain',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEnvVars)
      });

      const result = await service.getEnvironmentVariables();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v9/projects/test-project-id/env',
        expect.any(Object)
      );

      expect(result).toEqual(mockEnvVars.envs);
    });

    it('should return empty array if no envs property', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await service.getEnvironmentVariables();
      expect(result).toEqual([]);
    });
  });

  describe('updateEnvironmentVariables', () => {
    it('should create new environment variables', async () => {
      // Mock getting existing variables (empty)
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ envs: [] })
        })
        // Mock creating new variable
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'new-env-id' })
        });

      await service.updateEnvironmentVariables({
        'NEW_VAR': 'new-value'
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Check the create call
      expect(fetch).toHaveBeenNthCalledWith(2,
        'https://api.vercel.com/v9/projects/test-project-id/env',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            key: 'NEW_VAR',
            value: 'new-value',
            target: ['production', 'preview', 'development'],
            type: 'encrypted'
          })
        })
      );
    });

    it('should update existing environment variables', async () => {
      const existingVar = {
        id: 'existing-env-id',
        key: 'EXISTING_VAR',
        value: 'old-value',
        target: ['production'],
        type: 'plain',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Mock getting existing variables
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ envs: [existingVar] })
        })
        // Mock updating variable
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'existing-env-id' })
        });

      await service.updateEnvironmentVariables({
        'EXISTING_VAR': 'new-value'
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Check the update call
      expect(fetch).toHaveBeenNthCalledWith(2,
        'https://api.vercel.com/v9/projects/test-project-id/env/existing-env-id',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            value: 'new-value',
            target: ['production', 'preview', 'development']
          })
        })
      );
    });
  });

  describe('triggerDeployment', () => {
    it('should trigger deployment successfully', async () => {
      const mockDeployment = {
        id: 'deployment-id',
        url: 'https://test-deployment.vercel.app',
        readyState: 'BUILDING'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeployment)
      });

      const result = await service.triggerDeployment({
        target: 'production'
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v13/deployments',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"target":"production"')
        })
      );

      expect(result).toEqual(mockDeployment);
    });

    it('should include git source when provided', async () => {
      const mockDeployment = {
        id: 'deployment-id',
        url: 'https://test-deployment.vercel.app',
        readyState: 'BUILDING'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeployment)
      });

      await service.triggerDeployment({
        gitSource: {
          type: 'github',
          repo: 'user/repo',
          ref: 'main'
        }
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v13/deployments',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"gitSource"')
        })
      );
    });
  });

  describe('verifyDeployment', () => {
    it('should verify successful deployment', async () => {
      const mockDeployment = {
        id: 'deployment-id',
        url: 'https://test-deployment.vercel.app',
        readyState: 'READY'
      };

      // Mock deployment status check
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeployment)
        })
        // Mock health check
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        });

      const result = await service.verifyDeployment('deployment-id', 5000);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('deployment-id');
      expect(result.url).toBe('https://test-deployment.vercel.app');
    });

    it('should handle deployment errors', async () => {
      const mockDeployment = {
        id: 'deployment-id',
        url: 'https://test-deployment.vercel.app',
        readyState: 'ERROR'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeployment)
      });

      const result = await service.verifyDeployment('deployment-id', 5000);

      expect(result.success).toBe(false);
      expect(result.status).toBe('ERROR');
      expect(result.error).toBe('Deployment failed');
    });

    it('should timeout if deployment takes too long', async () => {
      const mockDeployment = {
        id: 'deployment-id',
        url: 'https://test-deployment.vercel.app',
        readyState: 'BUILDING'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockDeployment)
      });

      const result = await service.verifyDeployment('deployment-id', 100); // Very short timeout

      expect(result.success).toBe(false);
      expect(result.status).toBe('TIMEOUT');
    });
  });

  describe('rollbackDeployment', () => {
    it('should rollback to previous deployment', async () => {
      const mockDeployment = {
        id: 'rollback-deployment-id',
        url: 'https://rollback-deployment.vercel.app',
        readyState: 'READY'
      };

      // Mock get deployment
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeployment)
        })
        // Mock promote deployment
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeployment)
        });

      const result = await service.rollbackDeployment('rollback-deployment-id');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v13/deployments/rollback-deployment-id/promote',
        expect.objectContaining({
          method: 'POST'
        })
      );

      expect(result).toEqual(mockDeployment);
    });

    it('should throw error if deployment not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Deployment not found')
      });

      await expect(service.rollbackDeployment('nonexistent-id'))
        .rejects.toThrow('Vercel API error: 404 Not Found - Deployment not found');
    });
  });

  describe('getDeploymentLogs', () => {
    it('should fetch deployment logs successfully', async () => {
      const mockLogs = [
        { text: 'Building application...' },
        { payload: { text: 'Build completed' } },
        { text: 'Deployment ready' }
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLogs)
      });

      const result = await service.getDeploymentLogs('deployment-id');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.vercel.com/v2/deployments/deployment-id/events',
        expect.any(Object)
      );

      expect(result).toEqual([
        'Building application...',
        'Build completed',
        'Deployment ready'
      ]);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getDeploymentLogs('deployment-id');

      expect(result).toEqual([]);
    });
  });
});