/**
 * Unit tests for Feature Identification Service
 */

import { FeatureIdentificationService, Feature, ComponentInfo } from '../feature-identification.service';
import { ASTParserService } from '../ast-parser.service';
import { RepositoryAnalyzerService } from '../repository-analyzer.service';

// Mock dependencies
jest.mock('../ast-parser.service');
jest.mock('../repository-analyzer.service');

describe('FeatureIdentificationService', () => {
  let service: FeatureIdentificationService;
  let mockASTParser: jest.Mocked<ASTParserService>;
  let mockRepositoryAnalyzer: jest.Mocked<RepositoryAnalyzerService>;

  beforeEach(() => {
    mockASTParser = new ASTParserService() as jest.Mocked<ASTParserService>;
    mockRepositoryAnalyzer = new RepositoryAnalyzerService() as jest.Mocked<RepositoryAnalyzerService>;
    service = new FeatureIdentificationService(mockASTParser, mockRepositoryAnalyzer);
  });

  describe('identifyFeatures', () => {
    it('should identify features from a project successfully', async () => {
      // Arrange
      const projectPath = '/test/project';
      const sourceProject = 'essencia';
      
      mockRepositoryAnalyzer.analyzeProjectStructure.mockResolvedValue({
        components: [],
        services: [],
        utilities: [],
        configurations: []
      });

      // Act
      const result = await service.identifyFeatures(projectPath, sourceProject);

      // Assert
      expect(result).toBeDefined();
      expect(result.features).toBeInstanceOf(Array);
      expect(result.totalScanned).toBeGreaterThanOrEqual(0);
      expect(result.categoryCounts).toBeDefined();
      expect(result.complexityDistribution).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const projectPath = '/invalid/path';
      const sourceProject = 'essencia';
      
      mockRepositoryAnalyzer.analyzeProjectStructure.mockRejectedValue(
        new Error('Project not found')
      );

      // Act & Assert
      await expect(service.identifyFeatures(projectPath, sourceProject))
        .rejects.toThrow('Failed to identify features from essencia');
    });
  });

  describe('assessComponentComplexity', () => {
    it('should assess low complexity correctly', () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'SimpleComponent',
        path: '/components/SimpleComponent.tsx',
        type: 'component',
        imports: ['react'],
        props: ['title']
      };

      // Act
      const complexity = (service as any).assessComponentComplexity(component);

      // Assert
      expect(complexity).toBe('low');
    });

    it('should assess high complexity correctly', () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'ComplexComponent',
        path: '/components/ComplexComponent.tsx',
        type: 'component',
        imports: Array(15).fill('import'),
        props: Array(10).fill('prop')
      };

      // Act
      const complexity = (service as any).assessComponentComplexity(component);

      // Assert
      expect(complexity).toBe('high');
    });
  });

  describe('assessWhiteLabelCompatibility', () => {
    it('should identify white-label compatible components', async () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'ThemeableComponent',
        path: '/components/ThemeableComponent.tsx',
        type: 'component',
        imports: ['theme-provider', 'branding-service']
      };

      // Act
      const isCompatible = await (service as any).assessWhiteLabelCompatibility(component);

      // Assert
      expect(isCompatible).toBe(true);
    });

    it('should identify non-white-label compatible components', async () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'StaticComponent',
        path: '/components/StaticComponent.tsx',
        type: 'component',
        imports: ['react', 'lodash']
      };

      // Act
      const isCompatible = await (service as any).assessWhiteLabelCompatibility(component);

      // Assert
      expect(isCompatible).toBe(false);
    });
  });

  describe('assessPerformanceImpact', () => {
    it('should identify positive performance impact', () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'LazyLoadedComponent',
        path: '/components/LazyLoadedComponent.tsx',
        type: 'component'
      };

      // Act
      const impact = (service as any).assessPerformanceImpact(component);

      // Assert
      expect(impact).toBe('positive');
    });

    it('should identify negative performance impact', () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'HeavyComponent',
        path: '/components/HeavyComponent.tsx',
        type: 'component'
      };

      // Act
      const impact = (service as any).assessPerformanceImpact(component);

      // Assert
      expect(impact).toBe('negative');
    });

    it('should default to neutral performance impact', () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'RegularComponent',
        path: '/components/RegularComponent.tsx',
        type: 'component'
      };

      // Act
      const impact = (service as any).assessPerformanceImpact(component);

      // Assert
      expect(impact).toBe('neutral');
    });
  });

  describe('createFeatureFromComponent', () => {
    it('should create a feature from a component successfully', async () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'DashboardWidget',
        path: '/components/dashboard/DashboardWidget.tsx',
        type: 'component',
        imports: ['react', 'theme-provider'],
        props: ['data', 'title']
      };

      // Act
      const feature = await (service as any).createFeatureFromComponent(
        component,
        'dashboard',
        'essencia'
      );

      // Assert
      expect(feature).toBeDefined();
      expect(feature.name).toBe('DashboardWidget');
      expect(feature.category).toBe('dashboard');
      expect(feature.sourceProject).toBe('essencia');
      expect(feature.complexity).toBe('low');
      expect(feature.whiteLabelCompatible).toBe(true);
    });

    it('should handle errors when creating feature from component', async () => {
      // Arrange
      const component: ComponentInfo = {
        name: 'InvalidComponent',
        path: '/invalid/path',
        type: 'component'
      };

      // Mock error in assessment
      jest.spyOn(service as any, 'assessComponentComplexity').mockImplementation(() => {
        throw new Error('Assessment failed');
      });

      // Act
      const feature = await (service as any).createFeatureFromComponent(
        component,
        'dashboard',
        'essencia'
      );

      // Assert
      expect(feature).toBeNull();
    });
  });

  describe('generateIdentificationResult', () => {
    it('should generate correct identification result', () => {
      // Arrange
      const features: Feature[] = [
        {
          id: 'test-1',
          name: 'Feature 1',
          description: 'Test feature 1',
          category: 'dashboard',
          complexity: 'low',
          dependencies: [],
          whiteLabelCompatible: true,
          performanceImpact: 'neutral',
          sourceProject: 'essencia',
          files: [],
          components: [],
          apis: [],
          configurations: []
        },
        {
          id: 'test-2',
          name: 'Feature 2',
          description: 'Test feature 2',
          category: 'ranking',
          complexity: 'high',
          dependencies: [],
          whiteLabelCompatible: false,
          performanceImpact: 'positive',
          sourceProject: 'essencia',
          files: [],
          components: [],
          apis: [],
          configurations: []
        }
      ];

      // Act
      const result = (service as any).generateIdentificationResult(features);

      // Assert
      expect(result.features).toHaveLength(2);
      expect(result.totalScanned).toBe(2);
      expect(result.categoryCounts.dashboard).toBe(1);
      expect(result.categoryCounts.ranking).toBe(1);
      expect(result.complexityDistribution.low).toBe(1);
      expect(result.complexityDistribution.high).toBe(1);
    });
  });
});