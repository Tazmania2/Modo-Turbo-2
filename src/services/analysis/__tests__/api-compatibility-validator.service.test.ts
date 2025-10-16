import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiCompatibilityValidatorService } from '../api-compatibility-validator.service';
import { FileAnalysis, ApiCompatibility } from '@/types/analysis.types';

describe('ApiCompatibilityValidatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateApiCompatibility', () => {
    it('should validate API compatibility for new endpoints', async () => {
      // Arrange
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/users/route.ts',
          type: 'api',
          size: 1024,
          lines: 50,
          complexity: 'medium',
          dependencies: ['next'],
          exports: ['GET', 'POST'],
          imports: [
            {
              module: 'next/server',
              type: 'named',
              specifiers: ['NextRequest', 'NextResponse'],
              isExternal: true
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      // Act
      const result = await apiCompatibilityValidatorService.validateApiCompatibility(newApiFiles);

      // Assert
      expect(result).toBeDefined();
      expect(result.backwardCompatible).toBeDefined();
      expect(result.breakingChanges).toBeDefined();
      expect(result.deprecations).toBeDefined();
      expect(result.versionCompatibility).toBeDefined();
      expect(Array.isArray(result.breakingChanges)).toBe(true);
      expect(Array.isArray(result.deprecations)).toBe(true);
      expect(Array.isArray(result.versionCompatibility)).toBe(true);
    });

    it('should identify backward compatible changes', async () => {
      // Arrange
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/health/route.ts',
          type: 'api',
          size: 256,
          lines: 15,
          complexity: 'low',
          dependencies: ['next'],
          exports: ['GET'],
          imports: [
            {
              module: 'next/server',
              type: 'named',
              specifiers: ['NextResponse'],
              isExternal: true
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      // Act
      const result = await apiCompatibilityValidatorService.validateApiCompatibility(newApiFiles);

      // Assert
      expect(result.backwardCompatible).toBe(true);
      expect(result.breakingChanges).toHaveLength(0);
      expect(result.versionCompatibility).toContain('1.0.0');
    });
  });

  describe('validateEndpointCompatibility', () => {
    it('should validate new endpoints as compatible', async () => {
      // Arrange
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/dashboard/route.ts',
          type: 'api',
          size: 512,
          lines: 30,
          complexity: 'medium',
          dependencies: ['next'],
          exports: ['GET', 'POST'],
          imports: [],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      // Act
      const results = await apiCompatibilityValidatorService.validateEndpointCompatibility(newApiFiles);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        const result = results[0];
        expect(result.endpoint).toBeDefined();
        expect(result.method).toBeDefined();
        expect(result.isCompatible).toBeDefined();
        expect(result.riskLevel).toBeDefined();
        expect(result.migrationRequired).toBeDefined();
        expect(Array.isArray(result.breakingChanges)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      }
    });

    it('should handle multiple endpoints in a single file', async () => {
      // Arrange
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/admin/users/route.ts',
          type: 'api',
          size: 2048,
          lines: 100,
          complexity: 'high',
          dependencies: ['next', 'auth'],
          exports: ['GET', 'POST', 'PUT', 'DELETE'],
          imports: [
            {
              module: 'next/server',
              type: 'named',
              specifiers: ['NextRequest', 'NextResponse'],
              isExternal: true
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 2
        }
      ];

      // Act
      const results = await apiCompatibilityValidatorService.validateEndpointCompatibility(newApiFiles);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Should have multiple endpoints for different HTTP methods
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateDataFormatCompatibility', () => {
    it('should validate data format compatibility', async () => {
      // Arrange
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/data/route.ts',
          type: 'api',
          size: 1024,
          lines: 60,
          complexity: 'medium',
          dependencies: ['next', 'zod'],
          exports: ['GET', 'POST'],
          imports: [
            {
              module: 'zod',
              type: 'named',
              specifiers: ['z'],
              isExternal: true
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      // Act
      const results = await apiCompatibilityValidatorService.validateDataFormatCompatibility(newApiFiles);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('validateAuthFlowCompatibility', () => {
    it('should validate authentication flow compatibility', async () => {
      // Arrange
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/auth/login/route.ts',
          type: 'api',
          size: 1536,
          lines: 80,
          complexity: 'high',
          dependencies: ['next', 'auth', 'bcrypt'],
          exports: ['POST'],
          imports: [
            {
              module: 'next/server',
              type: 'named',
              specifiers: ['NextRequest', 'NextResponse'],
              isExternal: true
            },
            {
              module: 'bcrypt',
              type: 'default',
              specifiers: ['bcrypt'],
              isExternal: true
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 3
        }
      ];

      // Act
      const results = await apiCompatibilityValidatorService.validateAuthFlowCompatibility(newApiFiles);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('endpoint comparison', () => {
    it('should handle comparison with existing endpoints', async () => {
      // Arrange
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/users/route.ts',
          type: 'api',
          size: 1024,
          lines: 50,
          complexity: 'medium',
          dependencies: ['next'],
          exports: ['GET', 'POST'],
          imports: [],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      const existingApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/users/route.ts',
          type: 'api',
          size: 512,
          lines: 30,
          complexity: 'low',
          dependencies: ['next'],
          exports: ['GET'],
          imports: [],
          lastModified: new Date('2023-01-01'),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      // Act
      const result = await apiCompatibilityValidatorService.validateApiCompatibility(
        newApiFiles,
        existingApiFiles
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.backwardCompatible).toBeDefined();
    });
  });

  describe('breaking change detection', () => {
    it('should detect breaking changes in API modifications', async () => {
      // This would be more complex in a real implementation
      // For now, we test the basic structure
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/breaking-change/route.ts',
          type: 'api',
          size: 1024,
          lines: 50,
          complexity: 'medium',
          dependencies: ['next'],
          exports: ['GET'],
          imports: [],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      // Act
      const result = await apiCompatibilityValidatorService.validateApiCompatibility(newApiFiles);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result.backwardCompatible).toBe('boolean');
      expect(Array.isArray(result.breakingChanges)).toBe(true);
    });
  });

  describe('version compatibility', () => {
    it('should determine appropriate version compatibility', async () => {
      // Arrange
      const newApiFiles: FileAnalysis[] = [
        {
          path: 'src/app/api/version-test/route.ts',
          type: 'api',
          size: 256,
          lines: 15,
          complexity: 'low',
          dependencies: ['next'],
          exports: ['GET'],
          imports: [],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      // Act
      const result = await apiCompatibilityValidatorService.validateApiCompatibility(newApiFiles);

      // Assert
      expect(result.versionCompatibility).toBeDefined();
      expect(Array.isArray(result.versionCompatibility)).toBe(true);
      expect(result.versionCompatibility.length).toBeGreaterThan(0);
      
      // Should include semantic version strings
      result.versionCompatibility.forEach(version => {
        expect(typeof version).toBe('string');
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });

  describe('error handling', () => {
    it('should handle empty API file list', async () => {
      // Act
      const result = await apiCompatibilityValidatorService.validateApiCompatibility([]);

      // Assert
      expect(result).toBeDefined();
      expect(result.backwardCompatible).toBe(true);
      expect(result.breakingChanges).toHaveLength(0);
      expect(result.deprecations).toHaveLength(0);
    });

    it('should handle invalid API files gracefully', async () => {
      // Arrange
      const invalidApiFiles: FileAnalysis[] = [
        {
          path: 'invalid/path',
          type: 'api',
          size: 0,
          lines: 0,
          complexity: 'low',
          dependencies: [],
          exports: [],
          imports: [],
          lastModified: new Date(),
          author: 'unknown',
          changeFrequency: 0
        }
      ];

      // Act
      const result = await apiCompatibilityValidatorService.validateApiCompatibility(invalidApiFiles);

      // Assert
      expect(result).toBeDefined();
      expect(result.backwardCompatible).toBeDefined();
    });
  });
});