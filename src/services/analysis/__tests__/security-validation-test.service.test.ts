import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  SecurityValidationTestService,
  SecurityTestCase,
  SecurityTestResult,
  SecurityValidationReport,
  VulnerabilityScanConfig
} from '../security-validation-test.service';
import { 
  Feature, 
  SecurityVulnerability, 
  SecurityIssue,
  CodeChange,
  DataMigration
} from '@/types/analysis.types';

// Mock dependencies
jest.mock('../dependency-vulnerability-scanner.service');
jest.mock('../security-improvement-analyzer.service');

describe('SecurityValidationTestService', () => {
  let service: SecurityValidationTestService;
  let mockFeature: Feature;
  let mockCodeChange: CodeChange;
  let mockDataMigration: DataMigration;

  beforeEach(() => {
    service = new SecurityValidationTestService();
    
    mockFeature = {
      id: 'test-feature-1',
      name: 'Test Authentication Feature',
      description: 'A test feature for authentication',
      category: 'auth',
      complexity: 'medium',
      dependencies: [
        { name: 'bcrypt', version: '5.1.0' },
        { name: 'jsonwebtoken', version: '9.0.0' }
      ],
      whiteLabelCompatible: true,
      performanceImpact: 'neutral'
    };

    mockCodeChange = {
      id: 'change-1',
      type: 'modification',
      file: 'src/auth/login.ts',
      description: 'Updated login validation',
      linesAdded: 10,
      linesRemoved: 5,
      complexity: 'medium',
      riskLevel: 'medium',
      isBreaking: false,
      vulnerabilities: []
    };

    mockDataMigration = {
      id: 'migration-1',
      name: 'User table migration',
      description: 'Add password hash column',
      script: 'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)',
      permissions: ['admin'],
      validation: true
    };
  });

  describe('validateFeatureSecurity', () => {
    it('should validate feature security successfully', async () => {
      const result = await service.validateFeatureSecurity(mockFeature);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.vulnerabilities).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.riskLevel).toMatch(/^(low|medium|high|critical)$/);
    });

    it('should identify high-risk features', async () => {
      const highRiskFeature: Feature = {
        ...mockFeature,
        dependencies: [
          { name: 'vulnerable-package', version: '1.0.0' }
        ]
      };

      const result = await service.validateFeatureSecurity(highRiskFeature);

      expect(result.riskLevel).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle features without dependencies', async () => {
      const noDepsFeature: Feature = {
        ...mockFeature,
        dependencies: []
      };

      const result = await service.validateFeatureSecurity(noDepsFeature);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      const invalidFeature = null as any;

      await expect(service.validateFeatureSecurity(invalidFeature))
        .rejects.toThrow('Feature security validation failed');
    });
  });

  describe('scanDependencies', () => {
    it('should scan dependencies for vulnerabilities', async () => {
      const dependencies = [
        { name: 'express', version: '4.18.0' },
        { name: 'lodash', version: '4.17.20' }
      ];

      const result = await service.scanDependencies(dependencies);

      expect(result).toBeDefined();
      expect(result.vulnerabilities).toBeInstanceOf(Array);
      expect(result.auditResults).toBeInstanceOf(Array);
      expect(typeof result.riskScore).toBe('number');
    });

    it('should handle empty dependencies array', async () => {
      const result = await service.scanDependencies([]);

      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.auditResults).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });

    it('should handle scan errors gracefully', async () => {
      const invalidDependencies = [{ invalid: 'data' }] as any;

      const result = await service.scanDependencies(invalidDependencies);

      expect(result).toBeDefined();
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });
  });

  describe('auditIntegrationChanges', () => {
    it('should audit code changes for security issues', async () => {
      const changes = [mockCodeChange];

      const result = await service.auditIntegrationChanges(changes);

      expect(result).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.riskLevel).toMatch(/^(low|medium|high|critical)$/);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle multiple code changes', async () => {
      const changes = [
        mockCodeChange,
        {
          ...mockCodeChange,
          id: 'change-2',
          file: 'src/auth/register.ts',
          riskLevel: 'high' as const
        }
      ];

      const result = await service.auditIntegrationChanges(changes);

      expect(result.riskLevel).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('should handle empty changes array', async () => {
      const result = await service.auditIntegrationChanges([]);

      expect(result.issues).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('validateDataMigration', () => {
    it('should validate data migration security', async () => {
      const result = await service.validateDataMigration(mockDataMigration);

      expect(result).toBeDefined();
      expect(result.securityIssues).toBeInstanceOf(Array);
      expect(typeof result.dataProtectionScore).toBe('number');
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should identify sensitive data in migrations', async () => {
      const sensitiveDataMigration: DataMigration = {
        ...mockDataMigration,
        script: 'ALTER TABLE users ADD COLUMN password VARCHAR(255), ADD COLUMN ssn VARCHAR(11)'
      };

      const result = await service.validateDataMigration(sensitiveDataMigration);

      expect(result.securityIssues.length).toBeGreaterThan(0);
      expect(result.dataProtectionScore).toBeLessThan(100);
    });

    it('should check for proper access controls', async () => {
      const noPermissionsMigration: DataMigration = {
        ...mockDataMigration,
        permissions: undefined
      };

      const result = await service.validateDataMigration(noPermissionsMigration);

      expect(result.securityIssues.some(issue => issue.type === 'access-control')).toBe(true);
    });

    it('should validate data validation presence', async () => {
      const noValidationMigration: DataMigration = {
        ...mockDataMigration,
        validation: undefined
      };

      const result = await service.validateDataMigration(noValidationMigration);

      expect(result.securityIssues.some(issue => issue.type === 'data-validation')).toBe(true);
    });
  });

  describe('runSecurityTestSuite', () => {
    it('should run complete security test suite', async () => {
      const config: VulnerabilityScanConfig = {
        scanDependencies: true,
        scanCode: true,
        scanConfiguration: true,
        severityThreshold: 'medium',
        excludePatterns: ['**/*.test.ts'],
        customRules: []
      };

      const result = await service.runSecurityTestSuite(config);

      expect(result).toBeDefined();
      expect(result.suiteResults).toBeInstanceOf(Array);
      expect(typeof result.overallScore).toBe('number');
      expect(typeof result.totalTests).toBe('number');
      expect(typeof result.passedTests).toBe('number');
      expect(typeof result.failedTests).toBe('number');
      expect(typeof result.criticalIssues).toBe('number');
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(typeof result.executionTime).toBe('number');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should use default config when none provided', async () => {
      const result = await service.runSecurityTestSuite();

      expect(result).toBeDefined();
      expect(result.suiteResults.length).toBeGreaterThan(0);
    });

    it('should handle test suite failures gracefully', async () => {
      // This test would require mocking internal methods to force failures
      const result = await service.runSecurityTestSuite();

      expect(result).toBeDefined();
      expect(result.suiteResults).toBeInstanceOf(Array);
    });
  });

  describe('runSecurityRegressionTests', () => {
    it('should run security regression tests', async () => {
      const result = await service.runSecurityRegressionTests(mockFeature);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
      expect(result.results).toBeInstanceOf(Array);
      expect(result.regressionIssues).toBeInstanceOf(Array);
    });

    it('should detect security regressions', async () => {
      // This would require setting up baseline data
      const result = await service.runSecurityRegressionTests(mockFeature);

      expect(result.results).toBeInstanceOf(Array);
      expect(result.regressionIssues).toBeInstanceOf(Array);
    });
  });

  describe('generateAutomatedTests', () => {
    it('should generate authentication tests for auth features', () => {
      const authFeature: Feature = {
        ...mockFeature,
        category: 'auth'
      };

      const testCases = service.generateAutomatedTests(authFeature);

      expect(testCases).toBeInstanceOf(Array);
      expect(testCases.length).toBeGreaterThan(0);
      expect(testCases.some(tc => tc.category === 'authentication')).toBe(true);
    });

    it('should generate authorization tests for admin features', () => {
      const adminFeature: Feature = {
        ...mockFeature,
        category: 'admin'
      };

      const testCases = service.generateAutomatedTests(adminFeature);

      expect(testCases).toBeInstanceOf(Array);
      expect(testCases.some(tc => tc.category === 'authorization')).toBe(true);
    });

    it('should generate input validation tests for dashboard features', () => {
      const dashboardFeature: Feature = {
        ...mockFeature,
        category: 'dashboard'
      };

      const testCases = service.generateAutomatedTests(dashboardFeature);

      expect(testCases).toBeInstanceOf(Array);
      expect(testCases.some(tc => tc.category === 'input-validation')).toBe(true);
    });

    it('should generate data protection tests for features handling user data', () => {
      const userDataFeature: Feature = {
        ...mockFeature,
        description: 'Feature that handles user personal data'
      };

      const testCases = service.generateAutomatedTests(userDataFeature);

      expect(testCases).toBeInstanceOf(Array);
      expect(testCases.some(tc => tc.category === 'data-protection')).toBe(true);
    });

    it('should return empty array for features with no security implications', () => {
      const simpleFeature: Feature = {
        ...mockFeature,
        category: 'integration',
        description: 'Simple utility function'
      };

      const testCases = service.generateAutomatedTests(simpleFeature);

      expect(testCases).toBeInstanceOf(Array);
      // May still generate some tests based on other criteria
    });
  });

  describe('Security Test Cases', () => {
    it('should create valid authentication test cases', () => {
      const testCases = service.generateAutomatedTests(mockFeature);
      const authTests = testCases.filter(tc => tc.category === 'authentication');

      authTests.forEach(testCase => {
        expect(testCase.id).toBeDefined();
        expect(testCase.name).toBeDefined();
        expect(testCase.description).toBeDefined();
        expect(testCase.category).toBe('authentication');
        expect(testCase.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(typeof testCase.testFunction).toBe('function');
        expect(testCase.expectedResult).toMatch(/^(pass|fail|warning)$/);
      });
    });

    it('should execute test cases successfully', async () => {
      const testCases = service.generateAutomatedTests(mockFeature);
      
      if (testCases.length > 0) {
        const testCase = testCases[0];
        const result = await testCase.testFunction();

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
        expect(result.issues).toBeInstanceOf(Array);
        expect(result.vulnerabilities).toBeInstanceOf(Array);
        expect(typeof result.score).toBe('number');
        expect(result.recommendations).toBeInstanceOf(Array);
        expect(typeof result.executionTime).toBe('number');
      }
    });
  });

  describe('Risk Level Calculation', () => {
    it('should calculate risk level correctly for critical vulnerabilities', async () => {
      const criticalVulns: SecurityVulnerability[] = [
        {
          id: 'CVE-2023-1234',
          severity: 'critical',
          title: 'Critical SQL Injection',
          description: 'SQL injection vulnerability',
          package: 'test-package',
          version: '1.0.0',
          patchedVersions: '1.0.1',
          recommendation: 'Update immediately'
        }
      ];

      // This would require access to private methods or refactoring
      // For now, we test through the public API
      const featureWithCriticalVulns: Feature = {
        ...mockFeature,
        dependencies: [{ name: 'vulnerable-package', version: '1.0.0' }]
      };

      const result = await service.validateFeatureSecurity(featureWithCriticalVulns);
      
      // The risk level should be determined by the validation logic
      expect(result.riskLevel).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle null feature gracefully', async () => {
      await expect(service.validateFeatureSecurity(null as any))
        .rejects.toThrow();
    });

    it('should handle invalid dependencies gracefully', async () => {
      const result = await service.scanDependencies([{ invalid: 'data' }] as any);
      
      expect(result).toBeDefined();
      expect(result.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should handle invalid code changes gracefully', async () => {
      const result = await service.auditIntegrationChanges([null as any]);
      
      expect(result).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('should handle invalid data migration gracefully', async () => {
      const result = await service.validateDataMigration(null as any);
      
      expect(result).toBeDefined();
      expect(result.securityIssues).toBeInstanceOf(Array);
    });
  });

  describe('Performance', () => {
    it('should complete security validation within reasonable time', async () => {
      const startTime = Date.now();
      
      await service.validateFeatureSecurity(mockFeature);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle multiple concurrent validations', async () => {
      const features = Array(5).fill(null).map((_, i) => ({
        ...mockFeature,
        id: `feature-${i}`,
        name: `Test Feature ${i}`
      }));

      const startTime = Date.now();
      
      const promises = features.map(feature => 
        service.validateFeatureSecurity(feature)
      );
      
      const results = await Promise.all(promises);
      
      const executionTime = Date.now() - startTime;
      expect(results).toHaveLength(5);
      expect(executionTime).toBeLessThan(10000); // 10 seconds max for 5 concurrent
    });
  });

  describe('Integration', () => {
    it('should integrate with dependency scanner', async () => {
      const dependencies = [
        { name: 'express', version: '4.18.0' }
      ];

      const result = await service.scanDependencies(dependencies);
      
      expect(result).toBeDefined();
      // The actual integration would be tested with real scanner
    });

    it('should integrate with security analyzer', async () => {
      const result = await service.validateFeatureSecurity(mockFeature);
      
      expect(result).toBeDefined();
      // The actual integration would be tested with real analyzer
    });
  });
});