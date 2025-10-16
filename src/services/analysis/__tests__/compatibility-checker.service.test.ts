import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { compatibilityCheckerService } from '../compatibility-checker.service';
import { featureToggleService } from '../../feature-toggle.service';
import { brandingDatabaseService } from '../../branding-database.service';
import { FileAnalysis, WhiteLabelCompatibility, CompatibilityAnalysis } from '@/types/analysis.types';
import { WhiteLabelConfiguration } from '@/types/funifier';

// Mock dependencies
vi.mock('../../feature-toggle.service');
vi.mock('../../branding-database.service');

describe('CompatibilityCheckerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performCompatibilityAnalysis', () => {
    it('should perform comprehensive compatibility analysis', async () => {
      // Arrange
      const mockFeatures: FileAnalysis[] = [
        {
          path: 'src/components/NewDashboard.tsx',
          type: 'component',
          size: 1024,
          lines: 50,
          complexity: 'medium',
          dependencies: ['react', 'theme'],
          exports: ['NewDashboard'],
          imports: [
            {
              module: 'react',
              type: 'default',
              specifiers: ['React'],
              isExternal: true
            },
            {
              module: '@/hooks/useFeatureToggle',
              type: 'named',
              specifiers: ['useFeatureToggle'],
              isExternal: false
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      const mockConfig: WhiteLabelConfiguration = {
        instanceId: 'test-instance',
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1F2937',
          accentColor: '#10B981',
          logo: '',
          favicon: '',
          companyName: 'Test Company',
          tagline: 'Test Tagline'
        },
        features: {
          ranking: true,
          dashboards: {
            carteira_i: true,
            carteira_ii: false,
            carteira_iii: false,
            carteira_iv: false
          },
          history: true,
          personalizedRanking: false
        },
        funifierIntegration: {
          apiKey: '',
          serverUrl: '',
          authToken: '',
          customCollections: []
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      (featureToggleService.getAvailableFeatures as Mock).mockReturnValue([
        {
          key: 'newdashboard',
          name: 'New Dashboard',
          description: 'New dashboard component',
          category: 'dashboard',
          defaultEnabled: true
        }
      ]);

      // Act
      const result = await compatibilityCheckerService.performCompatibilityAnalysis(
        mockFeatures,
        mockConfig
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.whiteLabel).toBeDefined();
      expect(result.api).toBeDefined();
      expect(result.database).toBeDefined();
      expect(result.browser).toBeDefined();
      expect(result.mobile).toBeDefined();
      expect(result.whiteLabel.score).toBeGreaterThanOrEqual(0);
      expect(result.whiteLabel.score).toBeLessThanOrEqual(100);
    });
  });

  describe('checkWhiteLabelCompatibility', () => {
    it('should return high compatibility score for compatible features', async () => {
      // Arrange
      const mockFeatures: FileAnalysis[] = [
        {
          path: 'src/components/ThemeAwareComponent.tsx',
          type: 'component',
          size: 512,
          lines: 25,
          complexity: 'low',
          dependencies: ['react', 'theme'],
          exports: ['ThemeAwareComponent'],
          imports: [
            {
              module: '@/hooks/useFeatureToggle',
              type: 'named',
              specifiers: ['useFeatureToggle'],
              isExternal: false
            },
            {
              module: '@/theme',
              type: 'named',
              specifiers: ['colors', 'typography'],
              isExternal: false
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      (featureToggleService.getAvailableFeatures as Mock).mockReturnValue([
        {
          key: 'themeawarecomponent',
          name: 'Theme Aware Component',
          description: 'Component with theme support',
          category: 'core',
          defaultEnabled: true
        }
      ]);

      // Act
      const result = await compatibilityCheckerService.checkWhiteLabelCompatibility(mockFeatures);

      // Assert
      expect(result.score).toBeGreaterThan(80);
      expect(result.themeSupport).toBe(true);
      expect(result.brandingFlexibility).toBeGreaterThan(80);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify compatibility issues for non-compatible features', async () => {
      // Arrange
      const mockFeatures: FileAnalysis[] = [
        {
          path: 'src/components/HardcodedComponent.tsx',
          type: 'component',
          size: 256,
          lines: 15,
          complexity: 'low',
          dependencies: ['react'],
          exports: ['HardcodedComponent'],
          imports: [
            {
              module: 'react',
              type: 'default',
              specifiers: ['React'],
              isExternal: true
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      (featureToggleService.getAvailableFeatures as Mock).mockReturnValue([]);

      // Act
      const result = await compatibilityCheckerService.checkWhiteLabelCompatibility(mockFeatures);

      // Assert
      expect(result.score).toBeLessThan(100);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('checkFeatureToggleCompatibility', () => {
    it('should identify missing feature toggle integration', async () => {
      // Arrange
      const mockFeatures: FileAnalysis[] = [
        {
          path: 'src/components/NewFeature.tsx',
          type: 'component',
          size: 512,
          lines: 30,
          complexity: 'medium',
          dependencies: ['react'],
          exports: ['NewFeature'],
          imports: [
            {
              module: 'react',
              type: 'default',
              specifiers: ['React'],
              isExternal: true
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      (featureToggleService.getAvailableFeatures as Mock).mockReturnValue([]);

      // Act
      const result = await compatibilityCheckerService.checkFeatureToggleCompatibility(mockFeatures);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isCompatible).toBe(false);
      expect(result[0].migrationRequired).toBe(true);
      expect(result[0].issues.length).toBeGreaterThan(0);
      expect(result[0].issues[0].type).toBe('missing-feature-toggle');
    });

    it('should validate existing feature toggle integration', async () => {
      // Arrange
      const mockFeatures: FileAnalysis[] = [
        {
          path: 'src/components/ExistingFeature.tsx',
          type: 'component',
          size: 512,
          lines: 30,
          complexity: 'medium',
          dependencies: ['react'],
          exports: ['ExistingFeature'],
          imports: [
            {
              module: '@/hooks/useFeatureToggle',
              type: 'named',
              specifiers: ['useFeatureToggle'],
              isExternal: false
            }
          ],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      (featureToggleService.getAvailableFeatures as Mock).mockReturnValue([
        {
          key: 'existingfeature',
          name: 'Existing Feature',
          description: 'Feature with toggle support',
          category: 'core',
          defaultEnabled: true
        }
      ]);

      // Act
      const result = await compatibilityCheckerService.checkFeatureToggleCompatibility(mockFeatures);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isCompatible).toBe(true);
      expect(result[0].migrationRequired).toBe(false);
      expect(result[0].riskLevel).toBe('low');
    });
  });

  describe('theme compatibility checking', () => {
    it('should validate theme property usage', async () => {
      // This test would be more detailed in a real implementation
      // For now, we test the basic structure
      const mockComponent: FileAnalysis = {
        path: 'src/components/ThemedButton.tsx',
        type: 'component',
        size: 256,
        lines: 20,
        complexity: 'low',
        dependencies: ['react', 'theme'],
        exports: ['ThemedButton'],
        imports: [
          {
            module: '@/theme',
            type: 'named',
            specifiers: ['colors'],
            isExternal: false
          }
        ],
        lastModified: new Date(),
        author: 'developer',
        changeFrequency: 1
      };

      // Act
      const result = await compatibilityCheckerService.checkWhiteLabelCompatibility([mockComponent]);

      // Assert
      expect(result).toBeDefined();
      expect(result.themeSupport).toBeDefined();
      expect(result.brandingFlexibility).toBeGreaterThanOrEqual(0);
    });
  });

  describe('branding compatibility checking', () => {
    it('should assess branding customization support', async () => {
      const mockComponent: FileAnalysis = {
        path: 'src/components/BrandedHeader.tsx',
        type: 'component',
        size: 512,
        lines: 40,
        complexity: 'medium',
        dependencies: ['react'],
        exports: ['BrandedHeader'],
        imports: [
          {
            module: '@/theme',
            type: 'named',
            specifiers: ['colors', 'typography'],
            isExternal: false
          }
        ],
        lastModified: new Date(),
        author: 'developer',
        changeFrequency: 1
      };

      // Act
      const result = await compatibilityCheckerService.checkWhiteLabelCompatibility([mockComponent]);

      // Assert
      expect(result).toBeDefined();
      expect(result.brandingFlexibility).toBeGreaterThanOrEqual(0);
      expect(result.brandingFlexibility).toBeLessThanOrEqual(100);
    });
  });

  describe('error handling', () => {
    it('should handle empty feature list gracefully', async () => {
      // Act
      const result = await compatibilityCheckerService.checkWhiteLabelCompatibility([]);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(result.themeSupport).toBe(true);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      (featureToggleService.getAvailableFeatures as Mock).mockImplementation(() => {
        throw new Error('Service error');
      });

      const mockFeatures: FileAnalysis[] = [
        {
          path: 'src/components/TestComponent.tsx',
          type: 'component',
          size: 256,
          lines: 15,
          complexity: 'low',
          dependencies: ['react'],
          exports: ['TestComponent'],
          imports: [],
          lastModified: new Date(),
          author: 'developer',
          changeFrequency: 1
        }
      ];

      // Act & Assert
      await expect(
        compatibilityCheckerService.checkWhiteLabelCompatibility(mockFeatures)
      ).rejects.toThrow('Service error');
    });
  });
});