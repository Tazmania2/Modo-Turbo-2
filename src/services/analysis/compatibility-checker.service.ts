import { 
  CompatibilityAnalysis, 
  WhiteLabelCompatibility, 
  CompatibilityIssue,
  ApiCompatibility,
  ApiBreakingChange,
  ApiDeprecation,
  FileAnalysis,
  ChangeImpact,
  RiskLevel
} from '@/types/analysis.types';
import { 
  WhiteLabelConfiguration, 
  WhiteLabelFeatures 
} from '@/types/funifier';
import { featureToggleService } from '../feature-toggle.service';
import { brandingDatabaseService } from '../branding-database.service';

export interface FeatureCompatibilityCheck {
  featureKey: string;
  isCompatible: boolean;
  issues: CompatibilityIssue[];
  migrationRequired: boolean;
  riskLevel: RiskLevel;
}

export interface ThemeCompatibilityCheck {
  component: string;
  isCompatible: boolean;
  themeProperties: string[];
  missingProperties: string[];
  conflictingProperties: string[];
  recommendations: string[];
}

export interface BrandingCompatibilityCheck {
  element: string;
  isCompatible: boolean;
  brandingSupport: boolean;
  customizationLevel: 'none' | 'basic' | 'advanced' | 'full';
  issues: CompatibilityIssue[];
}

export interface UIChangeCompatibilityResult {
  component: string;
  changeType: 'added' | 'modified' | 'removed';
  whiteLabelImpact: 'none' | 'low' | 'medium' | 'high';
  themeCompatibility: ThemeCompatibilityCheck;
  brandingCompatibility: BrandingCompatibilityCheck;
  recommendations: string[];
}

/**
 * Service for checking compatibility of new features and changes with white-label system
 */
export class CompatibilityCheckerService {
  private static instance: CompatibilityCheckerService;

  private constructor() {}

  static getInstance(): CompatibilityCheckerService {
    if (!CompatibilityCheckerService.instance) {
      CompatibilityCheckerService.instance = new CompatibilityCheckerService();
    }
    return CompatibilityCheckerService.instance;
  }

  /**
   * Perform comprehensive compatibility analysis
   */
  async performCompatibilityAnalysis(
    newFeatures: FileAnalysis[],
    existingConfig?: WhiteLabelConfiguration
  ): Promise<CompatibilityAnalysis> {
    const whiteLabel = await this.checkWhiteLabelCompatibility(newFeatures, existingConfig);
    const api = await this.checkApiCompatibility(newFeatures);
    
    return {
      whiteLabel,
      api,
      database: {
        migrationRequired: false,
        migrations: [],
        dataIntegrity: true,
        performanceImpact: 'none'
      },
      browser: {
        supported: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+'],
        unsupported: ['IE 11'],
        polyfillsRequired: [],
        features: []
      },
      mobile: {
        responsive: true,
        touchOptimized: true,
        performanceScore: 85,
        issues: []
      }
    };
  }

  /**
   * Check white-label compatibility for new features
   */
  async checkWhiteLabelCompatibility(
    newFeatures: FileAnalysis[],
    existingConfig?: WhiteLabelConfiguration
  ): Promise<WhiteLabelCompatibility> {
    const issues: CompatibilityIssue[] = [];
    const recommendations: string[] = [];
    let score = 100;
    let themeSupport = true;
    let brandingFlexibility = 100;

    // Check component compatibility
    const componentFiles = newFeatures.filter(f => f.type === 'component');
    for (const component of componentFiles) {
      const componentCheck = await this.checkComponentCompatibility(component);
      if (!componentCheck.isCompatible) {
        issues.push(...componentCheck.issues);
        score -= 10;
        if (!componentCheck.themeCompatibility.isCompatible) {
          themeSupport = false;
          brandingFlexibility -= 20;
        }
      }
    }

    // Check feature toggle compatibility
    const featureChecks = await this.checkFeatureToggleCompatibility(newFeatures);
    for (const check of featureChecks) {
      if (!check.isCompatible) {
        issues.push(...check.issues);
        score -= 15;
        recommendations.push(`Update feature toggle system for ${check.featureKey}`);
      }
    }

    // Check branding system compatibility
    const brandingChecks = await this.checkBrandingSystemCompatibility(newFeatures);
    for (const check of brandingChecks) {
      if (!check.isCompatible) {
        issues.push(...check.issues);
        score -= 10;
        brandingFlexibility -= 15;
      }
    }

    // Add general recommendations
    if (issues.length > 0) {
      recommendations.push('Review and update white-label configuration');
      recommendations.push('Test with existing white-label instances');
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
      themeSupport,
      brandingFlexibility: Math.max(0, brandingFlexibility)
    };
  }

  /**
   * Check API compatibility for new endpoints and changes
   */
  async checkApiCompatibility(newFeatures: FileAnalysis[]): Promise<ApiCompatibility> {
    const apiFiles = newFeatures.filter(f => f.type === 'api');
    const breakingChanges: ApiBreakingChange[] = [];
    const deprecations: ApiDeprecation[] = [];
    let backwardCompatible = true;

    for (const apiFile of apiFiles) {
      // Analyze API file for breaking changes
      const changes = await this.analyzeApiChanges(apiFile);
      breakingChanges.push(...changes.breaking);
      deprecations.push(...changes.deprecations);
      
      if (changes.breaking.length > 0) {
        backwardCompatible = false;
      }
    }

    return {
      backwardCompatible,
      breakingChanges,
      deprecations,
      versionCompatibility: ['1.0.0', '1.1.0', '1.2.0']
    };
  }

  /**
   * Check feature toggle compatibility
   */
  async checkFeatureToggleCompatibility(
    newFeatures: FileAnalysis[]
  ): Promise<FeatureCompatibilityCheck[]> {
    const checks: FeatureCompatibilityCheck[] = [];
    const availableFeatures = featureToggleService.getAvailableFeatures();

    // Check if new features can be controlled by feature toggles
    for (const feature of newFeatures) {
      if (feature.type === 'component' || feature.type === 'service') {
        const featureKey = this.extractFeatureKey(feature.path);
        const existingFeature = availableFeatures.find(f => f.key === featureKey);
        
        const issues: CompatibilityIssue[] = [];
        let isCompatible = true;
        let migrationRequired = false;
        let riskLevel: RiskLevel = 'low';

        if (!existingFeature) {
          // New feature needs to be added to feature toggle system
          issues.push({
            type: 'missing-feature-toggle',
            severity: 'medium',
            file: feature.path,
            description: `Feature ${featureKey} is not registered in feature toggle system`,
            recommendation: 'Add feature definition to feature toggle service',
            autoFixable: true
          });
          migrationRequired = true;
          riskLevel = 'medium';
        }

        // Check if feature has proper toggle integration
        if (!this.hasFeatureToggleIntegration(feature)) {
          issues.push({
            type: 'missing-toggle-integration',
            severity: 'high',
            file: feature.path,
            description: 'Component/service does not integrate with feature toggle system',
            recommendation: 'Add feature toggle checks to component/service',
            autoFixable: false
          });
          isCompatible = false;
          riskLevel = 'high';
        }

        checks.push({
          featureKey,
          isCompatible,
          issues,
          migrationRequired,
          riskLevel
        });
      }
    }

    return checks;
  }

  /**
   * Check component compatibility with theming system
   */
  private async checkComponentCompatibility(
    component: FileAnalysis
  ): Promise<UIChangeCompatibilityResult> {
    const themeCompatibility = await this.checkThemeCompatibility(component);
    const brandingCompatibility = await this.checkBrandingCompatibility(component);
    
    const whiteLabelImpact = this.assessWhiteLabelImpact(
      themeCompatibility,
      brandingCompatibility
    );

    const recommendations: string[] = [];
    if (!themeCompatibility.isCompatible) {
      recommendations.push('Update component to support theme variables');
    }
    if (!brandingCompatibility.isCompatible) {
      recommendations.push('Add branding customization support');
    }

    return {
      component: component.path,
      changeType: 'added', // Assuming new component for now
      whiteLabelImpact,
      themeCompatibility,
      brandingCompatibility,
      recommendations
    };
  }

  /**
   * Check theme compatibility for a component
   */
  private async checkThemeCompatibility(
    component: FileAnalysis
  ): Promise<ThemeCompatibilityCheck> {
    // Define expected theme properties
    const requiredThemeProperties = [
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'backgroundColor',
      'textColor',
      'borderColor'
    ];

    const optionalThemeProperties = [
      'fontFamily',
      'fontSize',
      'borderRadius',
      'spacing',
      'shadows'
    ];

    // Simulate checking component for theme property usage
    const usedProperties = this.extractThemeProperties(component);
    const missingProperties = requiredThemeProperties.filter(
      prop => !usedProperties.includes(prop)
    );
    const conflictingProperties = this.findConflictingProperties(component);

    const isCompatible = missingProperties.length === 0 && conflictingProperties.length === 0;

    const recommendations: string[] = [];
    if (missingProperties.length > 0) {
      recommendations.push(`Add support for theme properties: ${missingProperties.join(', ')}`);
    }
    if (conflictingProperties.length > 0) {
      recommendations.push(`Resolve conflicting properties: ${conflictingProperties.join(', ')}`);
    }

    return {
      component: component.path,
      isCompatible,
      themeProperties: [...requiredThemeProperties, ...optionalThemeProperties],
      missingProperties,
      conflictingProperties,
      recommendations
    };
  }

  /**
   * Check branding compatibility for a component
   */
  private async checkBrandingCompatibility(
    component: FileAnalysis
  ): Promise<BrandingCompatibilityCheck> {
    const issues: CompatibilityIssue[] = [];
    
    // Check if component supports logo customization
    const hasLogoSupport = this.checkLogoSupport(component);
    const hasColorSupport = this.checkColorSupport(component);
    const hasTypographySupport = this.checkTypographySupport(component);

    let customizationLevel: 'none' | 'basic' | 'advanced' | 'full' = 'none';
    let brandingSupport = false;

    if (hasLogoSupport && hasColorSupport && hasTypographySupport) {
      customizationLevel = 'full';
      brandingSupport = true;
    } else if (hasColorSupport && (hasLogoSupport || hasTypographySupport)) {
      customizationLevel = 'advanced';
      brandingSupport = true;
    } else if (hasColorSupport) {
      customizationLevel = 'basic';
      brandingSupport = true;
    }

    if (!brandingSupport) {
      issues.push({
        type: 'missing-branding-support',
        severity: 'medium',
        file: component.path,
        description: 'Component does not support branding customization',
        recommendation: 'Add branding variable support to component',
        autoFixable: false
      });
    }

    return {
      element: component.path,
      isCompatible: brandingSupport,
      brandingSupport,
      customizationLevel,
      issues
    };
  }

  /**
   * Check branding system compatibility
   */
  private async checkBrandingSystemCompatibility(
    newFeatures: FileAnalysis[]
  ): Promise<BrandingCompatibilityCheck[]> {
    const checks: BrandingCompatibilityCheck[] = [];

    for (const feature of newFeatures) {
      if (feature.type === 'component' || feature.type === 'style') {
        const check = await this.checkBrandingCompatibility(feature);
        checks.push(check);
      }
    }

    return checks;
  }

  // Helper methods

  private extractFeatureKey(filePath: string): string {
    // Extract feature key from file path
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return fileName.replace(/\.(tsx?|jsx?)$/, '').toLowerCase();
  }

  private hasFeatureToggleIntegration(feature: FileAnalysis): boolean {
    // Check if feature has feature toggle integration
    // This would typically involve parsing the file content
    return feature.imports.some(imp => 
      imp.module.includes('feature-toggle') || 
      imp.specifiers.includes('useFeatureToggle')
    );
  }

  private extractThemeProperties(component: FileAnalysis): string[] {
    // Extract theme properties used in component
    // This would typically involve parsing the component code
    const commonThemeProps = ['primaryColor', 'secondaryColor', 'backgroundColor'];
    return commonThemeProps; // Simplified for now
  }

  private findConflictingProperties(component: FileAnalysis): string[] {
    // Find properties that conflict with theme system
    return []; // Simplified for now
  }

  private checkLogoSupport(component: FileAnalysis): boolean {
    // Check if component supports logo customization
    return component.path.includes('logo') || 
           component.imports.some(imp => imp.specifiers.includes('logo'));
  }

  private checkColorSupport(component: FileAnalysis): boolean {
    // Check if component supports color customization
    return component.imports.some(imp => 
      imp.module.includes('theme') || 
      imp.specifiers.includes('colors')
    );
  }

  private checkTypographySupport(component: FileAnalysis): boolean {
    // Check if component supports typography customization
    return component.imports.some(imp => 
      imp.specifiers.includes('typography') ||
      imp.specifiers.includes('font')
    );
  }

  private assessWhiteLabelImpact(
    themeCompatibility: ThemeCompatibilityCheck,
    brandingCompatibility: BrandingCompatibilityCheck
  ): 'none' | 'low' | 'medium' | 'high' {
    if (!themeCompatibility.isCompatible && !brandingCompatibility.isCompatible) {
      return 'high';
    }
    if (!themeCompatibility.isCompatible || !brandingCompatibility.isCompatible) {
      return 'medium';
    }
    if (themeCompatibility.missingProperties.length > 0 || 
        brandingCompatibility.customizationLevel === 'basic') {
      return 'low';
    }
    return 'none';
  }

  private async analyzeApiChanges(apiFile: FileAnalysis): Promise<{
    breaking: ApiBreakingChange[];
    deprecations: ApiDeprecation[];
  }> {
    // Analyze API file for breaking changes and deprecations
    // This would typically involve parsing the API route file
    return {
      breaking: [],
      deprecations: []
    };
  }
}

// Export singleton instance
export const compatibilityCheckerService = CompatibilityCheckerService.getInstance();