import {
  ApiCompatibility,
  ApiBreakingChange,
  ApiDeprecation,
  FileAnalysis,
  RiskLevel
} from '@/types/analysis.types';

export interface EndpointAnalysis {
  path: string;
  method: string;
  parameters: ParameterInfo[];
  responseSchema: ResponseSchemaInfo;
  authentication: AuthenticationInfo;
  deprecated: boolean;
  version: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  location: 'query' | 'body' | 'path' | 'header';
  description?: string;
  validation?: ValidationRule[];
}

export interface ResponseSchemaInfo {
  statusCode: number;
  contentType: string;
  schema: any;
  examples?: any[];
}

export interface AuthenticationInfo {
  required: boolean;
  type: 'bearer' | 'basic' | 'api-key' | 'oauth' | 'none';
  scopes?: string[];
  roles?: string[];
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum';
  value: any;
  message?: string;
}

export interface EndpointCompatibilityResult {
  endpoint: string;
  method: string;
  isCompatible: boolean;
  breakingChanges: ApiBreakingChange[];
  deprecations: ApiDeprecation[];
  riskLevel: RiskLevel;
  migrationRequired: boolean;
  recommendations: string[];
}

export interface DataFormatValidationResult {
  field: string;
  isCompatible: boolean;
  changeType: 'added' | 'removed' | 'modified' | 'type-changed';
  oldType?: string;
  newType?: string;
  impact: 'breaking' | 'additive' | 'neutral';
  recommendation: string;
}

export interface AuthFlowCompatibilityResult {
  flowType: string;
  isCompatible: boolean;
  changes: AuthFlowChange[];
  securityImpact: 'improved' | 'degraded' | 'unchanged';
  migrationRequired: boolean;
  recommendations: string[];
}

export interface AuthFlowChange {
  component: string;
  changeType: 'added' | 'removed' | 'modified';
  description: string;
  impact: 'breaking' | 'additive' | 'neutral';
  securityImplication: string;
}

/**
 * Service for validating API compatibility with existing integrations
 */
export class ApiCompatibilityValidatorService {
  private static instance: ApiCompatibilityValidatorService;

  private constructor() {}

  static getInstance(): ApiCompatibilityValidatorService {
    if (!ApiCompatibilityValidatorService.instance) {
      ApiCompatibilityValidatorService.instance = new ApiCompatibilityValidatorService();
    }
    return ApiCompatibilityValidatorService.instance;
  }

  /**
   * Validate API compatibility for all endpoints
   */
  async validateApiCompatibility(
    newApiFiles: FileAnalysis[],
    existingApiFiles?: FileAnalysis[]
  ): Promise<ApiCompatibility> {
    const endpointResults = await this.validateEndpointCompatibility(newApiFiles, existingApiFiles);
    const dataFormatResults = await this.validateDataFormatCompatibility(newApiFiles, existingApiFiles);
    const authFlowResults = await this.validateAuthFlowCompatibility(newApiFiles, existingApiFiles);

    const breakingChanges: ApiBreakingChange[] = [];
    const deprecations: ApiDeprecation[] = [];
    let backwardCompatible = true;

    // Collect breaking changes from endpoint validation
    for (const result of endpointResults) {
      breakingChanges.push(...result.breakingChanges);
      deprecations.push(...result.deprecations);
      if (!result.isCompatible) {
        backwardCompatible = false;
      }
    }

    // Collect breaking changes from data format validation
    for (const result of dataFormatResults) {
      if (result.impact === 'breaking') {
        breakingChanges.push({
          endpoint: 'data-format',
          method: 'ALL',
          changeType: 'parameter-changed',
          description: `Data format change in field: ${result.field}`,
          impact: 'high',
          migration: result.recommendation
        });
        backwardCompatible = false;
      }
    }

    // Collect breaking changes from auth flow validation
    for (const result of authFlowResults) {
      if (!result.isCompatible) {
        const authBreakingChanges = result.changes
          .filter(change => change.impact === 'breaking')
          .map(change => ({
            endpoint: 'auth-flow',
            method: 'ALL',
            changeType: 'modified' as const,
            description: `Authentication flow change: ${change.description}`,
            impact: 'high' as const,
            migration: `Update authentication integration: ${change.securityImplication}`
          }));
        breakingChanges.push(...authBreakingChanges);
        backwardCompatible = false;
      }
    }

    return {
      backwardCompatible,
      breakingChanges,
      deprecations,
      versionCompatibility: this.determineVersionCompatibility(breakingChanges)
    };
  }

  /**
   * Validate endpoint compatibility
   */
  async validateEndpointCompatibility(
    newApiFiles: FileAnalysis[],
    existingApiFiles?: FileAnalysis[]
  ): Promise<EndpointCompatibilityResult[]> {
    const results: EndpointCompatibilityResult[] = [];

    for (const apiFile of newApiFiles) {
      const endpoints = await this.extractEndpoints(apiFile);
      
      for (const endpoint of endpoints) {
        const existingEndpoint = existingApiFiles ? 
          await this.findExistingEndpoint(endpoint, existingApiFiles) : null;

        const result = await this.compareEndpoints(endpoint, existingEndpoint);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Validate data format compatibility
   */
  async validateDataFormatCompatibility(
    newApiFiles: FileAnalysis[],
    existingApiFiles?: FileAnalysis[]
  ): Promise<DataFormatValidationResult[]> {
    const results: DataFormatValidationResult[] = [];

    for (const apiFile of newApiFiles) {
      const dataFormats = await this.extractDataFormats(apiFile);
      
      for (const format of dataFormats) {
        const existingFormat = existingApiFiles ? 
          await this.findExistingDataFormat(format, existingApiFiles) : null;

        const formatResults = await this.compareDataFormats(format, existingFormat);
        results.push(...formatResults);
      }
    }

    return results;
  }

  /**
   * Validate authentication flow compatibility
   */
  async validateAuthFlowCompatibility(
    newApiFiles: FileAnalysis[],
    existingApiFiles?: FileAnalysis[]
  ): Promise<AuthFlowCompatibilityResult[]> {
    const results: AuthFlowCompatibilityResult[] = [];

    // Extract authentication flows from API files
    const newAuthFlows = await this.extractAuthFlows(newApiFiles);
    const existingAuthFlows = existingApiFiles ? 
      await this.extractAuthFlows(existingApiFiles) : [];

    for (const newFlow of newAuthFlows) {
      const existingFlow = existingAuthFlows.find(f => f.flowType === newFlow.flowType);
      const result = await this.compareAuthFlows(newFlow, existingFlow);
      results.push(result);
    }

    return results;
  }

  // Private helper methods

  private async extractEndpoints(apiFile: FileAnalysis): Promise<EndpointAnalysis[]> {
    // Extract endpoint information from API file
    // This would typically involve parsing the route file
    const endpoints: EndpointAnalysis[] = [];

    // Simulate endpoint extraction based on file path
    const pathSegments = apiFile.path.split('/');
    const routeName = pathSegments[pathSegments.length - 1].replace('.ts', '');

    if (routeName === 'route') {
      // Next.js API route
      const basePath = pathSegments.slice(0, -1).join('/').replace('src/app/api', '');
      
      endpoints.push({
        path: basePath || '/',
        method: 'GET',
        parameters: [],
        responseSchema: {
          statusCode: 200,
          contentType: 'application/json',
          schema: {}
        },
        authentication: {
          required: false,
          type: 'none'
        },
        deprecated: false,
        version: '1.0.0'
      });

      endpoints.push({
        path: basePath || '/',
        method: 'POST',
        parameters: [],
        responseSchema: {
          statusCode: 200,
          contentType: 'application/json',
          schema: {}
        },
        authentication: {
          required: true,
          type: 'bearer'
        },
        deprecated: false,
        version: '1.0.0'
      });
    }

    return endpoints;
  }

  private async findExistingEndpoint(
    endpoint: EndpointAnalysis,
    existingApiFiles: FileAnalysis[]
  ): Promise<EndpointAnalysis | null> {
    // Find matching endpoint in existing files
    // This would involve parsing existing API files
    return null; // Simplified for now
  }

  private async compareEndpoints(
    newEndpoint: EndpointAnalysis,
    existingEndpoint: EndpointAnalysis | null
  ): Promise<EndpointCompatibilityResult> {
    const breakingChanges: ApiBreakingChange[] = [];
    const deprecations: ApiDeprecation[] = [];
    const recommendations: string[] = [];
    let isCompatible = true;
    let riskLevel: RiskLevel = 'low';
    let migrationRequired = false;

    if (!existingEndpoint) {
      // New endpoint - generally safe
      recommendations.push('Document new endpoint in API documentation');
      return {
        endpoint: newEndpoint.path,
        method: newEndpoint.method,
        isCompatible: true,
        breakingChanges,
        deprecations,
        riskLevel: 'low',
        migrationRequired: false,
        recommendations
      };
    }

    // Compare parameters
    const parameterChanges = this.compareParameters(
      newEndpoint.parameters,
      existingEndpoint.parameters
    );

    for (const change of parameterChanges) {
      if (change.impact === 'breaking') {
        breakingChanges.push({
          endpoint: newEndpoint.path,
          method: newEndpoint.method,
          changeType: 'parameter-changed',
          description: change.description,
          impact: 'high',
          migration: change.migration
        });
        isCompatible = false;
        riskLevel = 'high';
        migrationRequired = true;
      }
    }

    // Compare response schemas
    const responseChanges = this.compareResponseSchemas(
      newEndpoint.responseSchema,
      existingEndpoint.responseSchema
    );

    if (responseChanges.isBreaking) {
      breakingChanges.push({
        endpoint: newEndpoint.path,
        method: newEndpoint.method,
        changeType: 'modified',
        description: 'Response schema changed',
        impact: 'medium',
        migration: 'Update client code to handle new response format'
      });
      isCompatible = false;
      riskLevel = 'medium';
    }

    // Compare authentication requirements
    const authChanges = this.compareAuthentication(
      newEndpoint.authentication,
      existingEndpoint.authentication
    );

    if (authChanges.isBreaking) {
      breakingChanges.push({
        endpoint: newEndpoint.path,
        method: newEndpoint.method,
        changeType: 'modified',
        description: 'Authentication requirements changed',
        impact: 'high',
        migration: 'Update authentication flow in client applications'
      });
      isCompatible = false;
      riskLevel = 'high';
      migrationRequired = true;
    }

    return {
      endpoint: newEndpoint.path,
      method: newEndpoint.method,
      isCompatible,
      breakingChanges,
      deprecations,
      riskLevel,
      migrationRequired,
      recommendations
    };
  }

  private compareParameters(
    newParams: ParameterInfo[],
    existingParams: ParameterInfo[]
  ): Array<{ impact: 'breaking' | 'additive' | 'neutral'; description: string; migration: string }> {
    const changes: Array<{ impact: 'breaking' | 'additive' | 'neutral'; description: string; migration: string }> = [];

    // Check for removed parameters
    for (const existingParam of existingParams) {
      const newParam = newParams.find(p => p.name === existingParam.name);
      if (!newParam && existingParam.required) {
        changes.push({
          impact: 'breaking',
          description: `Required parameter '${existingParam.name}' was removed`,
          migration: `Remove '${existingParam.name}' parameter from API calls`
        });
      }
    }

    // Check for added required parameters
    for (const newParam of newParams) {
      const existingParam = existingParams.find(p => p.name === newParam.name);
      if (!existingParam && newParam.required) {
        changes.push({
          impact: 'breaking',
          description: `New required parameter '${newParam.name}' was added`,
          migration: `Add '${newParam.name}' parameter to API calls`
        });
      }
    }

    // Check for parameter type changes
    for (const newParam of newParams) {
      const existingParam = existingParams.find(p => p.name === newParam.name);
      if (existingParam && existingParam.type !== newParam.type) {
        changes.push({
          impact: 'breaking',
          description: `Parameter '${newParam.name}' type changed from ${existingParam.type} to ${newParam.type}`,
          migration: `Update '${newParam.name}' parameter type in API calls`
        });
      }
    }

    return changes;
  }

  private compareResponseSchemas(
    newSchema: ResponseSchemaInfo,
    existingSchema: ResponseSchemaInfo
  ): { isBreaking: boolean; changes: string[] } {
    const changes: string[] = [];
    let isBreaking = false;

    if (newSchema.statusCode !== existingSchema.statusCode) {
      changes.push(`Status code changed from ${existingSchema.statusCode} to ${newSchema.statusCode}`);
      isBreaking = true;
    }

    if (newSchema.contentType !== existingSchema.contentType) {
      changes.push(`Content type changed from ${existingSchema.contentType} to ${newSchema.contentType}`);
      isBreaking = true;
    }

    // Schema comparison would be more complex in real implementation
    if (JSON.stringify(newSchema.schema) !== JSON.stringify(existingSchema.schema)) {
      changes.push('Response schema structure changed');
      // This could be breaking or not depending on the specific changes
    }

    return { isBreaking, changes };
  }

  private compareAuthentication(
    newAuth: AuthenticationInfo,
    existingAuth: AuthenticationInfo
  ): { isBreaking: boolean; changes: string[] } {
    const changes: string[] = [];
    let isBreaking = false;

    if (newAuth.required !== existingAuth.required) {
      changes.push(`Authentication requirement changed from ${existingAuth.required} to ${newAuth.required}`);
      isBreaking = true;
    }

    if (newAuth.type !== existingAuth.type) {
      changes.push(`Authentication type changed from ${existingAuth.type} to ${newAuth.type}`);
      isBreaking = true;
    }

    return { isBreaking, changes };
  }

  private async extractDataFormats(apiFile: FileAnalysis): Promise<any[]> {
    // Extract data formats from API file
    return []; // Simplified for now
  }

  private async findExistingDataFormat(format: any, existingApiFiles: FileAnalysis[]): Promise<any | null> {
    // Find existing data format
    return null; // Simplified for now
  }

  private async compareDataFormats(newFormat: any, existingFormat: any | null): Promise<DataFormatValidationResult[]> {
    // Compare data formats
    return []; // Simplified for now
  }

  private async extractAuthFlows(apiFiles: FileAnalysis[]): Promise<AuthFlowCompatibilityResult[]> {
    // Extract authentication flows
    return []; // Simplified for now
  }

  private async compareAuthFlows(
    newFlow: AuthFlowCompatibilityResult,
    existingFlow: AuthFlowCompatibilityResult | undefined
  ): Promise<AuthFlowCompatibilityResult> {
    // Compare authentication flows
    return newFlow; // Simplified for now
  }

  private determineVersionCompatibility(breakingChanges: ApiBreakingChange[]): string[] {
    // Determine version compatibility based on breaking changes
    if (breakingChanges.length === 0) {
      return ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
    } else {
      return ['2.0.0']; // Breaking changes require major version bump
    }
  }
}

// Export singleton instance
export const apiCompatibilityValidatorService = ApiCompatibilityValidatorService.getInstance();