/**
 * Feature Identification Engine
 * Scans and identifies features from different project sources
 */

// TypeScript AST types are imported from the compiler API
import { ASTParserService } from './ast-parser.service';
import { RepositoryAnalyzerService } from './repository-analyzer.service';

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'ranking' | 'auth' | 'admin' | 'integration' | 'ui' | 'api';
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  whiteLabelCompatible: boolean;
  performanceImpact: 'positive' | 'neutral' | 'negative';
  sourceProject: 'essencia' | 'fnp-ranking' | 'current';
  files: string[];
  components: ComponentInfo[];
  apis: APIEndpoint[];
  configurations: ConfigurationInfo[];
}

export interface ComponentInfo {
  name: string;
  path: string;
  type: 'component' | 'page' | 'layout' | 'hook' | 'utility';
  props?: string[];
  exports?: string[];
  imports?: string[];
}

export interface APIEndpoint {
  path: string;
  method: string;
  handler: string;
  middleware?: string[];
  authentication?: boolean;
}

export interface ConfigurationInfo {
  file: string;
  type: 'env' | 'config' | 'package' | 'build';
  keys: string[];
}

export interface FeatureIdentificationResult {
  features: Feature[];
  totalScanned: number;
  categoryCounts: Record<string, number>;
  complexityDistribution: Record<string, number>;
}

export class FeatureIdentificationService {
  constructor(
    private astParser: ASTParserService,
    private repositoryAnalyzer: RepositoryAnalyzerService
  ) {}

  /**
   * Identify features from a project repository
   */
  async identifyFeatures(projectPath: string, sourceProject: 'essencia' | 'fnp-ranking' | 'current'): Promise<FeatureIdentificationResult> {
    try {
      const projectStructure = await this.repositoryAnalyzer.getProjectStructure(projectPath);
      const features: Feature[] = [];

      // Scan for dashboard features
      const dashboardFeatures = await this.identifyDashboardFeatures(projectPath, sourceProject);
      features.push(...dashboardFeatures);

      // Scan for ranking features
      const rankingFeatures = await this.identifyRankingFeatures(projectPath, sourceProject);
      features.push(...rankingFeatures);

      // Scan for authentication features
      const authFeatures = await this.identifyAuthFeatures(projectPath, sourceProject);
      features.push(...authFeatures);

      // Scan for admin features
      const adminFeatures = await this.identifyAdminFeatures(projectPath, sourceProject);
      features.push(...adminFeatures);

      // Scan for API features
      const apiFeatures = await this.identifyAPIFeatures(projectPath, sourceProject);
      features.push(...apiFeatures);

      // Scan for UI/UX features
      const uiFeatures = await this.identifyUIFeatures(projectPath, sourceProject);
      features.push(...uiFeatures);

      return this.generateIdentificationResult(features);
    } catch (error) {
      console.error('Error identifying features:', error);
      throw new Error(`Failed to identify features from ${sourceProject}: ${(error as Error).message}`);
    }
  }

  /**
   * Identify dashboard-related features
   */
  private async identifyDashboardFeatures(projectPath: string, sourceProject: string): Promise<Feature[]> {
    const features: Feature[] = [];
    const dashboardPaths = [
      'src/components/dashboard',
      'src/pages/dashboard',
      'src/app/dashboard',
      'components/dashboard'
    ];

    for (const path of dashboardPaths) {
      try {
        const components = await this.scanComponentsInPath(`${projectPath}/${path}`);
        
        for (const component of components) {
          const feature = await this.createFeatureFromComponent(
            component,
            'dashboard',
            sourceProject as any
          );
          if (feature) {
            features.push(feature);
          }
        }
      } catch (error) {
        // Path might not exist, continue scanning
        continue;
      }
    }

    return features;
  }

  /**
   * Identify ranking-related features
   */
  private async identifyRankingFeatures(projectPath: string, sourceProject: string): Promise<Feature[]> {
    const features: Feature[] = [];
    const rankingPaths = [
      'src/components/ranking',
      'src/components/leaderboard',
      'src/pages/ranking',
      'components/ranking'
    ];

    for (const path of rankingPaths) {
      try {
        const components = await this.scanComponentsInPath(`${projectPath}/${path}`);
        
        for (const component of components) {
          const feature = await this.createFeatureFromComponent(
            component,
            'ranking',
            sourceProject as any
          );
          if (feature) {
            features.push(feature);
          }
        }
      } catch (error) {
        continue;
      }
    }

    return features;
  }

  /**
   * Identify authentication-related features
   */
  private async identifyAuthFeatures(projectPath: string, sourceProject: string): Promise<Feature[]> {
    const features: Feature[] = [];
    const authPaths = [
      'src/components/auth',
      'src/pages/auth',
      'src/app/auth',
      'src/services/auth',
      'components/auth'
    ];

    for (const path of authPaths) {
      try {
        const components = await this.scanComponentsInPath(`${projectPath}/${path}`);
        
        for (const component of components) {
          const feature = await this.createFeatureFromComponent(
            component,
            'auth',
            sourceProject as any
          );
          if (feature) {
            features.push(feature);
          }
        }
      } catch (error) {
        continue;
      }
    }

    return features;
  }

  /**
   * Identify admin-related features
   */
  private async identifyAdminFeatures(projectPath: string, sourceProject: string): Promise<Feature[]> {
    const features: Feature[] = [];
    const adminPaths = [
      'src/components/admin',
      'src/pages/admin',
      'src/app/admin',
      'components/admin'
    ];

    for (const path of adminPaths) {
      try {
        const components = await this.scanComponentsInPath(`${projectPath}/${path}`);
        
        for (const component of components) {
          const feature = await this.createFeatureFromComponent(
            component,
            'admin',
            sourceProject as any
          );
          if (feature) {
            features.push(feature);
          }
        }
      } catch (error) {
        continue;
      }
    }

    return features;
  }

  /**
   * Identify API-related features
   */
  private async identifyAPIFeatures(projectPath: string, sourceProject: string): Promise<Feature[]> {
    const features: Feature[] = [];
    const apiPaths = [
      'src/app/api',
      'src/pages/api',
      'api',
      'src/routes'
    ];

    for (const path of apiPaths) {
      try {
        const apiFiles = await this.scanAPIEndpoints(`${projectPath}/${path}`);
        
        for (const apiFile of apiFiles) {
          const feature = await this.createFeatureFromAPI(
            apiFile,
            sourceProject as any
          );
          if (feature) {
            features.push(feature);
          }
        }
      } catch (error) {
        continue;
      }
    }

    return features;
  }

  /**
   * Identify UI/UX features
   */
  private async identifyUIFeatures(projectPath: string, sourceProject: string): Promise<Feature[]> {
    const features: Feature[] = [];
    const uiPaths = [
      'src/components/ui',
      'src/components/common',
      'components/ui',
      'src/styles'
    ];

    for (const path of uiPaths) {
      try {
        const components = await this.scanComponentsInPath(`${projectPath}/${path}`);
        
        for (const component of components) {
          const feature = await this.createFeatureFromComponent(
            component,
            'ui',
            sourceProject as any
          );
          if (feature) {
            features.push(feature);
          }
        }
      } catch (error) {
        continue;
      }
    }

    return features;
  }

  /**
   * Scan components in a specific path
   */
  private async scanComponentsInPath(path: string): Promise<ComponentInfo[]> {
    // This would use file system scanning and AST parsing
    // For now, return mock data structure
    return [];
  }

  /**
   * Scan API endpoints in a specific path
   */
  private async scanAPIEndpoints(path: string): Promise<APIEndpoint[]> {
    // This would scan for API route files and extract endpoint information
    return [];
  }

  /**
   * Create a feature from a component
   */
  private async createFeatureFromComponent(
    component: ComponentInfo,
    category: Feature['category'],
    sourceProject: Feature['sourceProject']
  ): Promise<Feature | null> {
    try {
      const complexity = this.assessComponentComplexity(component);
      const whiteLabelCompatible = await this.assessWhiteLabelCompatibility(component);
      const performanceImpact = this.assessPerformanceImpact(component);

      return {
        id: `${sourceProject}-${category}-${component.name.toLowerCase()}`,
        name: component.name,
        description: `${category} feature: ${component.name}`,
        category,
        complexity,
        dependencies: component.imports || [],
        whiteLabelCompatible,
        performanceImpact,
        sourceProject,
        files: [component.path],
        components: [component],
        apis: [],
        configurations: []
      };
    } catch (error) {
      console.error('Error creating feature from component:', error);
      return null;
    }
  }

  /**
   * Create a feature from an API endpoint
   */
  private async createFeatureFromAPI(
    api: APIEndpoint,
    sourceProject: Feature['sourceProject']
  ): Promise<Feature | null> {
    try {
      const complexity = this.assessAPIComplexity(api);
      const whiteLabelCompatible = await this.assessAPIWhiteLabelCompatibility(api);

      return {
        id: `${sourceProject}-api-${api.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
        name: `API: ${api.method} ${api.path}`,
        description: `API endpoint: ${api.method} ${api.path}`,
        category: 'api',
        complexity,
        dependencies: api.middleware || [],
        whiteLabelCompatible,
        performanceImpact: 'neutral',
        sourceProject,
        files: [api.handler],
        components: [],
        apis: [api],
        configurations: []
      };
    } catch (error) {
      console.error('Error creating feature from API:', error);
      return null;
    }
  }

  /**
   * Assess component complexity
   */
  private assessComponentComplexity(component: ComponentInfo): 'low' | 'medium' | 'high' {
    const importCount = component.imports?.length || 0;
    const propCount = component.props?.length || 0;
    
    if (importCount > 10 || propCount > 8) return 'high';
    if (importCount > 5 || propCount > 4) return 'medium';
    return 'low';
  }

  /**
   * Assess API complexity
   */
  private assessAPIComplexity(api: APIEndpoint): 'low' | 'medium' | 'high' {
    const middlewareCount = api.middleware?.length || 0;
    const hasAuth = api.authentication || false;
    
    if (middlewareCount > 3 || hasAuth) return 'high';
    if (middlewareCount > 1) return 'medium';
    return 'low';
  }

  /**
   * Assess white-label compatibility
   */
  private async assessWhiteLabelCompatibility(component: ComponentInfo): Promise<boolean> {
    // Check if component uses theming, feature flags, or branding systems
    const imports = component.imports || [];
    const whiteLabelIndicators = [
      'theme',
      'branding',
      'feature-toggle',
      'white-label',
      'customization'
    ];

    return imports.some(imp => 
      whiteLabelIndicators.some(indicator => 
        imp.toLowerCase().includes(indicator)
      )
    );
  }

  /**
   * Assess API white-label compatibility
   */
  private async assessAPIWhiteLabelCompatibility(api: APIEndpoint): Promise<boolean> {
    // Check if API supports multi-tenancy or white-label features
    const pathIndicators = ['tenant', 'brand', 'custom', 'config'];
    return pathIndicators.some(indicator => 
      api.path.toLowerCase().includes(indicator)
    );
  }

  /**
   * Assess performance impact
   */
  private assessPerformanceImpact(component: ComponentInfo): 'positive' | 'neutral' | 'negative' {
    const name = component.name.toLowerCase();
    
    // Positive indicators
    if (name.includes('lazy') || name.includes('memo') || name.includes('cache')) {
      return 'positive';
    }
    
    // Negative indicators
    if (name.includes('heavy') || name.includes('complex') || name.includes('large')) {
      return 'negative';
    }
    
    return 'neutral';
  }

  /**
   * Generate identification result summary
   */
  private generateIdentificationResult(features: Feature[]): FeatureIdentificationResult {
    const categoryCounts: Record<string, number> = {};
    const complexityDistribution: Record<string, number> = {};

    features.forEach(feature => {
      categoryCounts[feature.category] = (categoryCounts[feature.category] || 0) + 1;
      complexityDistribution[feature.complexity] = (complexityDistribution[feature.complexity] || 0) + 1;
    });

    return {
      features,
      totalScanned: features.length,
      categoryCounts,
      complexityDistribution
    };
  }
}