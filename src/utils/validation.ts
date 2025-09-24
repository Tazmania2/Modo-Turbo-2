import { 
  WhiteLabelConfiguration, 
  WhiteLabelBranding, 
  WhiteLabelFeatures, 
  WhiteLabelFunifierIntegration,
  SetupRequest 
} from '@/types/funifier';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate branding configuration
 */
export function validateBrandingConfiguration(branding: WhiteLabelBranding): ValidationResult {
  return validateBranding(branding);
}

/**
 * Validate branding configuration
 */
export function validateBranding(branding: WhiteLabelBranding): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate colors
  if (!isValidHexColor(branding.primaryColor)) {
    errors.push('Primary color must be a valid hex color (e.g., #FF0000)');
  }
  if (!isValidHexColor(branding.secondaryColor)) {
    errors.push('Secondary color must be a valid hex color (e.g., #00FF00)');
  }
  if (!isValidHexColor(branding.accentColor)) {
    errors.push('Accent color must be a valid hex color (e.g., #0000FF)');
  }

  // Validate URLs
  if (branding.logo && !isValidUrl(branding.logo)) {
    errors.push('Logo must be a valid URL');
  }
  if (branding.favicon && !isValidUrl(branding.favicon)) {
    errors.push('Favicon must be a valid URL');
  }

  // Validate text fields
  if (!branding.companyName || branding.companyName.trim().length === 0) {
    errors.push('Company name is required');
  }
  if (branding.companyName && branding.companyName.length > 100) {
    warnings.push('Company name is quite long, consider shortening for better display');
  }
  if (branding.tagline && branding.tagline.length > 200) {
    warnings.push('Tagline is quite long, consider shortening for better display');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate features configuration
 */
export function validateFeatures(features: WhiteLabelFeatures): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate boolean fields
  if (typeof features.ranking !== 'boolean') {
    errors.push('Ranking feature must be a boolean value');
  }
  if (typeof features.history !== 'boolean') {
    errors.push('History feature must be a boolean value');
  }
  if (typeof features.personalizedRanking !== 'boolean') {
    errors.push('Personalized ranking feature must be a boolean value');
  }

  // Validate dashboards object
  if (!features.dashboards || typeof features.dashboards !== 'object') {
    errors.push('Dashboards must be an object with boolean values');
  } else {
    for (const [key, value] of Object.entries(features.dashboards)) {
      if (typeof value !== 'boolean') {
        errors.push(`Dashboard feature "${key}" must be a boolean value`);
      }
    }
  }

  // Logical validations
  if (features.personalizedRanking && !features.ranking) {
    warnings.push('Personalized ranking requires the ranking feature to be enabled');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate Funifier integration configuration
 */
export function validateFunifierIntegration(integration: WhiteLabelFunifierIntegration, allowEmpty: boolean = false): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Skip validation if allowEmpty is true and all fields are empty (demo mode)
  const isEmpty = !integration.apiKey && !integration.serverUrl && !integration.authToken;
  if (allowEmpty && isEmpty) {
    // Still validate custom collections array
    if (!Array.isArray(integration.customCollections)) {
      errors.push('Custom collections must be an array');
    } else {
      integration.customCollections.forEach((collection, index) => {
        if (typeof collection !== 'string' || collection.trim().length === 0) {
          errors.push(`Custom collection at index ${index} must be a non-empty string`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate required fields
  if (!integration.apiKey || integration.apiKey.trim().length === 0) {
    errors.push('Funifier API key is required');
  }
  if (!integration.serverUrl || integration.serverUrl.trim().length === 0) {
    errors.push('Funifier server URL is required');
  }
  if (!integration.authToken || integration.authToken.trim().length === 0) {
    errors.push('Funifier auth token is required');
  }

  // Validate server URL format
  if (integration.serverUrl && !isValidUrl(integration.serverUrl)) {
    errors.push('Funifier server URL must be a valid URL');
  }

  // Validate custom collections array
  if (!Array.isArray(integration.customCollections)) {
    errors.push('Custom collections must be an array');
  } else {
    integration.customCollections.forEach((collection, index) => {
      if (typeof collection !== 'string' || collection.trim().length === 0) {
        errors.push(`Custom collection at index ${index} must be a non-empty string`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate complete white-label configuration
 */
export function validateWhiteLabelConfiguration(config: WhiteLabelConfiguration, allowEmptyIntegration: boolean = false): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate instance ID
  if (!config.instanceId || config.instanceId.trim().length === 0) {
    errors.push('Instance ID is required');
  }

  // Validate sub-configurations
  const brandingResult = validateBranding(config.branding);
  const featuresResult = validateFeatures(config.features);
  const integrationResult = validateFunifierIntegration(config.funifierIntegration, allowEmptyIntegration);

  errors.push(...brandingResult.errors);
  errors.push(...featuresResult.errors);
  errors.push(...integrationResult.errors);

  warnings.push(...brandingResult.warnings);
  warnings.push(...featuresResult.warnings);
  warnings.push(...integrationResult.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate setup request
 */
export function validateSetupRequest(request: SetupRequest): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate mode
  if (!request.mode || !['demo', 'funifier'].includes(request.mode)) {
    errors.push('Mode must be either "demo" or "funifier"');
  }

  // Validate Funifier credentials if mode is funifier
  if (request.mode === 'funifier') {
    if (!request.funifierCredentials) {
      errors.push('Funifier credentials are required when mode is "funifier"');
    } else {
      const { apiKey, serverUrl, authToken } = request.funifierCredentials;
      
      if (!apiKey || apiKey.trim().length === 0) {
        errors.push('Funifier API key is required');
      }
      if (!serverUrl || serverUrl.trim().length === 0) {
        errors.push('Funifier server URL is required');
      }
      if (!authToken || authToken.trim().length === 0) {
        errors.push('Funifier auth token is required');
      }

      if (serverUrl && !isValidUrl(serverUrl)) {
        errors.push('Funifier server URL must be a valid URL');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate feature toggle configuration with dependency checks
 */
export function validateFeatureToggleConfiguration(features: WhiteLabelFeatures): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  const basicValidation = validateFeatures(features);
  errors.push(...basicValidation.errors);
  warnings.push(...basicValidation.warnings);

  // Dependency validation
  if (features.personalizedRanking && !features.ranking) {
    errors.push('Personalized ranking requires the ranking feature to be enabled');
  }

  // Dashboard validation - at least one dashboard should be enabled
  const dashboardsEnabled = Object.values(features.dashboards).some(enabled => enabled);
  if (!dashboardsEnabled) {
    warnings.push('No dashboard types are enabled. Users will have limited functionality.');
  }

  // Feature combination warnings
  if (!features.ranking && !features.history && !dashboardsEnabled) {
    warnings.push('All major features are disabled. Consider enabling at least one feature for user engagement.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize configuration data
 */
export function sanitizeConfiguration(config: WhiteLabelConfiguration): WhiteLabelConfiguration {
  return {
    ...config,
    instanceId: config.instanceId.trim(),
    branding: {
      ...config.branding,
      companyName: config.branding.companyName.trim(),
      tagline: config.branding.tagline?.trim() || '',
      primaryColor: config.branding.primaryColor.toUpperCase(),
      secondaryColor: config.branding.secondaryColor.toUpperCase(),
      accentColor: config.branding.accentColor.toUpperCase(),
    },
    funifierIntegration: {
      ...config.funifierIntegration,
      serverUrl: config.funifierIntegration.serverUrl.trim(),
      customCollections: config.funifierIntegration.customCollections.map(c => c.trim()).filter(c => c.length > 0)
    }
  };
}