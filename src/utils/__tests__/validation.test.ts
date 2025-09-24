import { describe, it, expect } from 'vitest';
import {
  validateBranding,
  validateFeatures,
  validateFunifierIntegration,
  validateWhiteLabelConfiguration,
  validateSetupRequest,
  sanitizeConfiguration
} from '../validation';
import {
  WhiteLabelBranding,
  WhiteLabelFeatures,
  WhiteLabelFunifierIntegration,
  WhiteLabelConfiguration,
  SetupRequest
} from '@/types/funifier';

describe('Validation Utils', () => {
  describe('validateBranding', () => {
    const validBranding: WhiteLabelBranding = {
      primaryColor: '#FF0000',
      secondaryColor: '#00FF00',
      accentColor: '#0000FF',
      logo: 'https://example.com/logo.png',
      favicon: 'https://example.com/favicon.ico',
      companyName: 'Test Company',
      tagline: 'Test Tagline'
    };

    it('should validate correct branding configuration', () => {
      const result = validateBranding(validBranding);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid hex colors', () => {
      const invalidBranding = {
        ...validBranding,
        primaryColor: 'invalid-color',
        secondaryColor: '#GG0000',
        accentColor: 'blue'
      };

      const result = validateBranding(invalidBranding);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Primary color must be a valid hex color (e.g., #FF0000)');
      expect(result.errors).toContain('Secondary color must be a valid hex color (e.g., #00FF00)');
      expect(result.errors).toContain('Accent color must be a valid hex color (e.g., #0000FF)');
    });

    it('should accept short hex colors', () => {
      const shortHexBranding = {
        ...validBranding,
        primaryColor: '#F00',
        secondaryColor: '#0F0',
        accentColor: '#00F'
      };

      const result = validateBranding(shortHexBranding);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid URLs', () => {
      const invalidUrlBranding = {
        ...validBranding,
        logo: 'not-a-url',
        favicon: 'also-not-a-url'
      };

      const result = validateBranding(invalidUrlBranding);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Logo must be a valid URL');
      expect(result.errors).toContain('Favicon must be a valid URL');
    });

    it('should reject empty company name', () => {
      const emptyNameBranding = {
        ...validBranding,
        companyName: ''
      };

      const result = validateBranding(emptyNameBranding);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company name is required');
    });

    it('should warn about long company name and tagline', () => {
      const longTextBranding = {
        ...validBranding,
        companyName: 'A'.repeat(101),
        tagline: 'B'.repeat(201)
      };

      const result = validateBranding(longTextBranding);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Company name is quite long, consider shortening for better display');
      expect(result.warnings).toContain('Tagline is quite long, consider shortening for better display');
    });

    it('should allow empty logo and favicon URLs', () => {
      const emptyUrlBranding = {
        ...validBranding,
        logo: '',
        favicon: ''
      };

      const result = validateBranding(emptyUrlBranding);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateFeatures', () => {
    const validFeatures: WhiteLabelFeatures = {
      ranking: true,
      dashboards: {
        carteira_i: true,
        carteira_ii: false,
        carteira_iii: true,
        carteira_iv: false
      },
      history: true,
      personalizedRanking: true
    };

    it('should validate correct features configuration', () => {
      const result = validateFeatures(validFeatures);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-boolean feature values', () => {
      const invalidFeatures = {
        ...validFeatures,
        ranking: 'true' as any,
        history: 1 as any,
        personalizedRanking: null as any
      };

      const result = validateFeatures(invalidFeatures);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ranking feature must be a boolean value');
      expect(result.errors).toContain('History feature must be a boolean value');
      expect(result.errors).toContain('Personalized ranking feature must be a boolean value');
    });

    it('should reject invalid dashboards object', () => {
      const invalidFeatures = {
        ...validFeatures,
        dashboards: null as any
      };

      const result = validateFeatures(invalidFeatures);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dashboards must be an object with boolean values');
    });

    it('should reject non-boolean dashboard values', () => {
      const invalidFeatures = {
        ...validFeatures,
        dashboards: {
          carteira_i: 'true' as any,
          carteira_ii: 1 as any,
          carteira_iii: null as any
        }
      };

      const result = validateFeatures(invalidFeatures);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dashboard feature "carteira_i" must be a boolean value');
      expect(result.errors).toContain('Dashboard feature "carteira_ii" must be a boolean value');
      expect(result.errors).toContain('Dashboard feature "carteira_iii" must be a boolean value');
    });

    it('should warn when personalized ranking is enabled without ranking', () => {
      const inconsistentFeatures = {
        ...validFeatures,
        ranking: false,
        personalizedRanking: true
      };

      const result = validateFeatures(inconsistentFeatures);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Personalized ranking requires the ranking feature to be enabled');
    });
  });

  describe('validateFunifierIntegration', () => {
    const validIntegration: WhiteLabelFunifierIntegration = {
      apiKey: 'test-api-key',
      serverUrl: 'https://test.funifier.com',
      authToken: 'test-auth-token',
      customCollections: ['collection1', 'collection2']
    };

    it('should validate correct Funifier integration', () => {
      const result = validateFunifierIntegration(validIntegration);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty required fields', () => {
      const invalidIntegration = {
        ...validIntegration,
        apiKey: '',
        serverUrl: '',
        authToken: ''
      };

      const result = validateFunifierIntegration(invalidIntegration);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Funifier API key is required');
      expect(result.errors).toContain('Funifier server URL is required');
      expect(result.errors).toContain('Funifier auth token is required');
    });

    it('should reject invalid server URL', () => {
      const invalidIntegration = {
        ...validIntegration,
        serverUrl: 'not-a-valid-url'
      };

      const result = validateFunifierIntegration(invalidIntegration);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Funifier server URL must be a valid URL');
    });

    it('should reject non-array custom collections', () => {
      const invalidIntegration = {
        ...validIntegration,
        customCollections: 'not-an-array' as any
      };

      const result = validateFunifierIntegration(invalidIntegration);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Custom collections must be an array');
    });

    it('should reject empty strings in custom collections', () => {
      const invalidIntegration = {
        ...validIntegration,
        customCollections: ['valid-collection', '', '   ', 123 as any]
      };

      const result = validateFunifierIntegration(invalidIntegration);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Custom collection at index 1 must be a non-empty string');
      expect(result.errors).toContain('Custom collection at index 2 must be a non-empty string');
      expect(result.errors).toContain('Custom collection at index 3 must be a non-empty string');
    });
  });

  describe('validateWhiteLabelConfiguration', () => {
    const validConfiguration: WhiteLabelConfiguration = {
      instanceId: 'test-instance',
      branding: {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        accentColor: '#0000FF',
        logo: 'https://example.com/logo.png',
        favicon: 'https://example.com/favicon.ico',
        companyName: 'Test Company',
        tagline: 'Test Tagline'
      },
      features: {
        ranking: true,
        dashboards: {
          carteira_i: true,
          carteira_ii: false
        },
        history: true,
        personalizedRanking: true
      },
      funifierIntegration: {
        apiKey: 'test-api-key',
        serverUrl: 'https://test.funifier.com',
        authToken: 'test-auth-token',
        customCollections: ['collection1']
      }
    };

    it('should validate complete configuration', () => {
      const result = validateWhiteLabelConfiguration(validConfiguration);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty instance ID', () => {
      const invalidConfiguration = {
        ...validConfiguration,
        instanceId: ''
      };

      const result = validateWhiteLabelConfiguration(invalidConfiguration);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Instance ID is required');
    });

    it('should aggregate errors from all sub-validations', () => {
      const invalidConfiguration = {
        ...validConfiguration,
        instanceId: '',
        branding: {
          ...validConfiguration.branding,
          primaryColor: 'invalid-color',
          companyName: ''
        },
        features: {
          ...validConfiguration.features,
          ranking: 'true' as any
        },
        funifierIntegration: {
          ...validConfiguration.funifierIntegration,
          apiKey: ''
        }
      };

      const result = validateWhiteLabelConfiguration(invalidConfiguration);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
      expect(result.errors).toContain('Instance ID is required');
      expect(result.errors).toContain('Primary color must be a valid hex color (e.g., #FF0000)');
      expect(result.errors).toContain('Company name is required');
      expect(result.errors).toContain('Ranking feature must be a boolean value');
      expect(result.errors).toContain('Funifier API key is required');
    });
  });

  describe('validateSetupRequest', () => {
    it('should validate demo mode setup request', () => {
      const demoRequest: SetupRequest = {
        mode: 'demo'
      };

      const result = validateSetupRequest(demoRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Funifier mode setup request with credentials', () => {
      const funifierRequest: SetupRequest = {
        mode: 'funifier',
        funifierCredentials: {
          apiKey: 'test-api-key',
          serverUrl: 'https://test.funifier.com',
          authToken: 'test-auth-token'
        }
      };

      const result = validateSetupRequest(funifierRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid mode', () => {
      const invalidRequest: SetupRequest = {
        mode: 'invalid' as any
      };

      const result = validateSetupRequest(invalidRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mode must be either "demo" or "funifier"');
    });

    it('should reject Funifier mode without credentials', () => {
      const invalidRequest: SetupRequest = {
        mode: 'funifier'
      };

      const result = validateSetupRequest(invalidRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Funifier credentials are required when mode is "funifier"');
    });

    it('should reject Funifier mode with incomplete credentials', () => {
      const invalidRequest: SetupRequest = {
        mode: 'funifier',
        funifierCredentials: {
          apiKey: '',
          serverUrl: 'https://test.funifier.com',
          authToken: ''
        }
      };

      const result = validateSetupRequest(invalidRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Funifier API key is required');
      expect(result.errors).toContain('Funifier auth token is required');
    });

    it('should reject invalid Funifier server URL', () => {
      const invalidRequest: SetupRequest = {
        mode: 'funifier',
        funifierCredentials: {
          apiKey: 'test-api-key',
          serverUrl: 'invalid-url',
          authToken: 'test-auth-token'
        }
      };

      const result = validateSetupRequest(invalidRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Funifier server URL must be a valid URL');
    });
  });

  describe('sanitizeConfiguration', () => {
    it('should sanitize configuration data', () => {
      const unsanitizedConfig: WhiteLabelConfiguration = {
        instanceId: '  test-instance  ',
        branding: {
          primaryColor: '#ff0000',
          secondaryColor: '#00ff00',
          accentColor: '#0000ff',
          logo: 'https://example.com/logo.png',
          favicon: 'https://example.com/favicon.ico',
          companyName: '  Test Company  ',
          tagline: '  Test Tagline  '
        },
        features: {
          ranking: true,
          dashboards: { carteira_i: true },
          history: true,
          personalizedRanking: true
        },
        funifierIntegration: {
          apiKey: 'test-api-key',
          serverUrl: '  https://test.funifier.com  ',
          authToken: 'test-auth-token',
          customCollections: ['  collection1  ', '', '  collection2  ', '   ']
        }
      };

      const sanitized = sanitizeConfiguration(unsanitizedConfig);
      
      expect(sanitized.instanceId).toBe('test-instance');
      expect(sanitized.branding.companyName).toBe('Test Company');
      expect(sanitized.branding.tagline).toBe('Test Tagline');
      expect(sanitized.branding.primaryColor).toBe('#FF0000');
      expect(sanitized.branding.secondaryColor).toBe('#00FF00');
      expect(sanitized.branding.accentColor).toBe('#0000FF');
      expect(sanitized.funifierIntegration.serverUrl).toBe('https://test.funifier.com');
      expect(sanitized.funifierIntegration.customCollections).toEqual(['collection1', 'collection2']);
    });

    it('should handle empty tagline', () => {
      const configWithEmptyTagline: WhiteLabelConfiguration = {
        instanceId: 'test-instance',
        branding: {
          primaryColor: '#FF0000',
          secondaryColor: '#00FF00',
          accentColor: '#0000FF',
          logo: '',
          favicon: '',
          companyName: 'Test Company',
          tagline: undefined as any
        },
        features: {
          ranking: true,
          dashboards: {},
          history: true,
          personalizedRanking: true
        },
        funifierIntegration: {
          apiKey: 'test-api-key',
          serverUrl: 'https://test.funifier.com',
          authToken: 'test-auth-token',
          customCollections: []
        }
      };

      const sanitized = sanitizeConfiguration(configWithEmptyTagline);
      
      expect(sanitized.branding.tagline).toBe('');
    });
  });
});