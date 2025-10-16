/**
 * Unit tests for Feature Gap Analysis Service
 */

import { FeatureGapAnalysisService } from '../feature-gap-analysis.service';
import { FeatureIdentificationService, Feature } from '../feature-identification.service';

// Mock dependencies
jest.mock('../feature-identification.service');

describe('FeatureGapAnalysisService', () => {
  let service: FeatureGapAnalysisService;
  let mockFeatureIdentificationService: jest.Mocked<FeatureIdentificationService>;

  beforeEach(() => {
    mockFeatureIdentificationService = new FeatureIdentificationService(null as any, null as any) as jest.Mocked<FeatureIdentificationService>;
    service = new FeatureGapAnalysisService(mockFeatureIdentificationService);
  });

  const createMockFeature = (overrides: Partial<Feature> = {}): Feature => ({
    id: 'test-feature',
    name: 'Test Feature',
    description: 'A test feature',
    category: 'dashboard',
    complexity: 'medium',
    dependencies: [],
    whiteLabelCompatible: true,
    performanceImpact: 'neutral',
    sourceProject: 'essencia',
    files: [],
    components: [],
    apis: [],
    configurations: [],
    ...overrides
  });

  describe('performGapAnalysis', () => {
    it('should perform comprehensive gap analysis successfully', async () => {
      // Arrange
      const essenciaFeatures = [
        createMockFeature({ id: 'essencia-1', name: 'Essencia Feature 1' })
      ];

      const fnpFeatures = [
        createMockFeature({ id: 'fnp-1', name: 'FNP Feature 1', sourceProject: 'fnp-ranking' })
      ];

      const currentFeatures = [
        createMockFeature({ id: 'current-1', name: 'Current Feature 1', sourceProject: 'current' })
      ];

      mockFeatureIdentificationService.identifyFeatures
        .mockResolvedValueOnce({
          features: essenciaFeatures,
          totalScanned: 1,
          categoryCounts: { dashboard: 1 },
          complexityDistribution: { medium: 1 }
        })
        .mockResolvedValueOnce({
          features: fnpFeatures,
          totalScanned: 1,
          categoryCounts: { dashboard: 1 },
          complexityDistribution: { medium: 1 }
        })
        .mockResolvedValueOnce({
          features: currentFeatures,
          totalScanned: 1,
          categoryCounts: { dashboard: 1 },
          complexityDistribution: { medium: 1 }
        });

      // Act
      const result = await service.performGapAnalysis('/essencia', '/fnp', '/current');

      // Assert
      expect(result).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.prioritizedGaps).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.riskAssessment).toBeDefined();
      expect(result.implementationRoadmap).toBeInstanceOf(Array);
    });
  });

  describe('assessBusinessValue', () => {
    it('should assess high value for dashboard features', () => {
      // Arrange
      const feature = createMockFeature({ category: 'dashboard' });

      // Act
      const value = (service as any).assessBusinessValue(feature);

      // Assert
      expect(value).toBe('high');
    });

    it('should assess low value for UI features', () => {
      // Arrange
      const feature = createMockFeature({ category: 'ui' });

      // Act
      const value = (service as any).assessBusinessValue(feature);

      // Assert
      expect(value).toBe('low');
    });
  });

  describe('calculatePriority', () => {
    it('should calculate priority within valid range', () => {
      // Act
      const priority = (service as any).calculatePriority('medium', 'medium', 'medium');

      // Assert
      expect(priority).toBeGreaterThanOrEqual(1);
      expect(priority).toBeLessThanOrEqual(10);
    });
  });
});