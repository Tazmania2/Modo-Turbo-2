import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeploymentVerificationService } from '../deployment-verification.service';
import { VercelDeploymentService } from '../vercel-deployment.service';
import { ErrorLoggerService } from '../error-logger.service';

// Mock dependencies
vi.mock('../vercel-deployment.service');
vi.mock('../error-logger.service');

// Mock fetch globally
global.fetch = jest.fn();

describe('DeploymentVerificationService', () => {
  let service: DeploymentVerificationService;
  let mockVercelService: jest.Mocked<VercelDeploymentService>;
  let mockErrorLogger: jest.Mocked<ErrorLoggerService>;

  beforeEach(() => {
    mockVercelService = {
      getDeployment: jest.fn(),
      getDeploymentLogs: jest.fn()
    } as any;

    mockErrorLogger = {
      logError: jest.fn()
    } as any;

    service = new DeploymentVerificationService(mockVercelService, mockErrorLogger);

    // Reset fetch mock
    (fetch as jest.Mock).mockReset();
  });

  describe('verifyDeployment', () => {
    it('should verify successful deployment', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        url: 'https://test-deployment.vercel.app',
        readyState: 'READY'
      };

      mockVercelService.getDeployment.mockResolvedValue(mockDeployment);

      // Mock successful API responses
      (fetch as jest.Mock)
        // Health check
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        })
        // Homepage load
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><head><title>Test App</title></head><body>Content here...</body></html>')
        })
        // API endpoints - health
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' })
        })
        // API endpoints - config
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ config: 'data' })
        })
        // Auth endpoint
        .mockResolvedValueOnce({
          ok: false,
          status: 401 // Expected for invalid credentials
        })
        // Performance test (homepage again)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html>...</html>')
        })
        // Security headers
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([
            ['x-frame-options', 'DENY'],
            ['x-content-type-options', 'nosniff']
          ])
        });

      const report = await service.verifyDeployment('deployment-123');

      expect(mockVercelService.getDeployment).toHaveBeenCalledWith('deployment-123');
      expect(report.deploymentId).toBe('deployment-123');
      expect(report.url).toBe('https://test-deployment.vercel.app');
      expect(report.overallSuccess).toBe(true);
      expect(report.totalTests).toBeGreaterThan(0);
      expect(report.passedTests).toBeGreaterThan(0);
      expect(report.criticalFailures).toBe(0);
    });

    it('should handle deployment not ready', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        url: 'https://test-deployment.vercel.app',
        readyState: 'BUILDING'
      };

      mockVercelService.getDeployment.mockResolvedValue(mockDeployment);

      const report = await service.verifyDeployment('deployment-123');

      expect(report.overallSuccess).toBe(false);
      expect(report.tests[0].name).toBe('Verification Setup');
      expect(report.tests[0].success).toBe(false);
      expect(report.tests[0].message).toContain('Deployment is not ready');
    });

    it('should handle verification errors', async () => {
      mockVercelService.getDeployment.mockRejectedValue(new Error('Network error'));

      const report = await service.verifyDeployment('deployment-123');

      expect(report.overallSuccess).toBe(false);
      expect(report.criticalFailures).toBe(1);
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DEPLOYMENT_VERIFICATION_ERROR'
        })
      );
    });

    it('should handle failed health check', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        url: 'https://test-deployment.vercel.app',
        readyState: 'READY'
      };

      mockVercelService.getDeployment.mockResolvedValue(mockDeployment);

      // Mock failed health check
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        // Mock other successful responses
        .mockResolvedValue({
          ok: true,
          text: () => Promise.resolve('<html><title>Test</title><body>Content</body></html>'),
          json: () => Promise.resolve({}),
          headers: new Map()
        });

      const report = await service.verifyDeployment('deployment-123');

      const healthTest = report.tests.find(t => t.name === 'Health Check');
      expect(healthTest?.success).toBe(false);
      expect(healthTest?.critical).toBe(true);
      expect(report.criticalFailures).toBeGreaterThan(0);
    });

    it('should handle slow performance', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        url: 'https://test-deployment.vercel.app',
        readyState: 'READY'
      };

      mockVercelService.getDeployment.mockResolvedValue(mockDeployment);

      // Mock slow response for performance test
      (fetch as jest.Mock)
        .mockImplementation((url) => {
          if (url.includes('/api/health')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ status: 'ok' })
            });
          }
          
          // Simulate slow homepage load for performance test
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                text: () => Promise.resolve('<html><title>Test</title><body>Content</body></html>'),
                json: () => Promise.resolve({}),
                headers: new Map()
              });
            }, 100); // Simulate delay
          });
        });

      const report = await service.verifyDeployment('deployment-123');

      const performanceTest = report.tests.find(t => t.name === 'Performance Check');
      expect(performanceTest).toBeDefined();
      expect(performanceTest?.duration).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        url: 'https://test-deployment.vercel.app',
        readyState: 'READY'
      };

      mockVercelService.getDeployment.mockResolvedValue(mockDeployment);

      // Mock mixed results - some failures
      (fetch as jest.Mock)
        // Health check - success
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' })
        })
        // Homepage - success
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><title>Test</title><body>Content</body></html>')
        })
        // API endpoints - partial failure
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({})
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        // Auth - expected failure
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        })
        // Performance - slow (will be marked as failure)
        .mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                text: () => Promise.resolve('<html>...</html>')
              });
            }, 6000); // Longer than 5 second threshold
          });
        });

      const report = await service.verifyDeployment('deployment-123');

      expect(report.recommendations).toContain('Consider addressing non-critical issues for better user experience');
      expect(report.recommendations.some(r => r.includes('performance'))).toBe(true);
    });
  });

  describe('individual test methods', () => {
    it('should test health endpoint correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      });

      const result = await (service as any).testHealthEndpoint('https://test.vercel.app');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Health endpoint responding correctly');
      expect(fetch).toHaveBeenCalledWith(
        'https://test.vercel.app/api/health',
        expect.objectContaining({
          method: 'GET',
          headers: { 'User-Agent': 'Deployment-Verification/1.0' }
        })
      );
    });

    it('should test homepage load correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><head><title>Test App</title></head><body>' + 'x'.repeat(1000) + '</body></html>')
      });

      const result = await (service as any).testHomepageLoad('https://test.vercel.app');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Homepage loads successfully with content');
      expect(result.details.hasTitle).toBe(true);
      expect(result.details.hasContent).toBe(true);
    });

    it('should test API endpoints correctly', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200
        });

      const result = await (service as any).testApiEndpoints('https://test.vercel.app');

      expect(result.success).toBe(true);
      expect(result.message).toContain('2/2 API endpoints accessible');
    });

    it('should test authentication flow correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401 // Expected for invalid credentials
      });

      const result = await (service as any).testAuthenticationFlow('https://test.vercel.app');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Authentication endpoint accessible and responding correctly');
    });

    it('should test security headers correctly', async () => {
      const mockHeaders = new Map([
        ['x-frame-options', 'DENY'],
        ['x-content-type-options', 'nosniff'],
        ['referrer-policy', 'strict-origin-when-cross-origin']
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders
      });

      const result = await (service as any).testSecurityHeaders('https://test.vercel.app');

      expect(result.success).toBe(true);
      expect(result.message).toContain('3/4 security headers present');
    });
  });
});