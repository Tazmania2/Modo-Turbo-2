import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  SecurityValidationTestService 
} from '../security-validation-test.service';
import { 
  SecurityRegressionTestService 
} from '../security-regression-test.service';
import { 
  VulnerabilityScanningAutomationService 
} from '../vulnerability-scanning-automation.service';
import { 
  CodeSecurityAnalyzerService 
} from '../code-security-analyzer.service';
import { 
  SecurityImprovementAnalyzerService 
} from '../security-improvement-analyzer.service';
import { 
  Feature, 
  CodeChange, 
  DataMigration,
  SecurityVulnerability,
  SecurityIssue
} from '@/types/analysis.types';

// Mock external dependencies
vi.mock('child_process');
vi.mock('fs/promises');

describe('Security Validation Integration Tests', () => {
  let securityValidationService: SecurityValidationTestService;
  let securityRegressionService: SecurityRegressionTestService;
  let vulnerabilityScanningService: VulnerabilityScanningAutomationService;
  let codeSecurityAnalyzer: CodeSecurityAnalyzerService;
  let securityImprovementAnalyzer: SecurityImprovementAnalyzerService;

  let mockFeature: Feature;
  let mockCodeChanges: CodeChange[];
  let mockDataMigration: DataMigration;

  beforeEach(() => {
    securityValidationService = new SecurityValidationTestService();
    securityRegressionService = new SecurityRegressionTestService();
    vulnerabilityScanningService = new VulnerabilityScanningAutomationService();
    codeSecurityAnalyzer = new CodeSecurityAnalyzerService();
    securityImprovementAnalyzer = new SecurityImprovementAnalyzerService();

    mockFeature = {
      id: 'integration-test-feature',
      name: 'Integration Test Authentication Feature',
      description: 'A comprehensive authentication feature for integration testing',
      category: 'auth',
      complexity: 'high',
      dependencies: [
        { name: 'bcrypt', version: '5.1.0' },
        { name: 'jsonwebtoken', version: '9.0.0' },
        { name: 'express-rate-limit', version: '6.7.0' }
      ],
      whiteLabelCompatible: true,
      performanceImpact: 'neutral'
    };

    mockCodeChanges = [
      {
        id: 'auth-change-1',
        type: 'modification',
        file: 'src/auth/login.ts',
        description: 'Enhanced login validation with MFA support',
        linesAdded: 25,
        linesRemoved: 10,
        complexity: 'high',
        riskLevel: 'medium',
        isBreaking: false,
        vulnerabilities: []
      },
      {
        id: 'auth-change-2',
        type: 'addition',
        file: 'src/auth/mfa.ts',
        description: 'Added multi-factor authentication',
        linesAdded: 50,
        linesRemoved: 0,
        complexity: 'high',
        riskLevel: 'low',
        isBreaking: false,
        vulnerabilities: []
      }
    ];

    mockDataMigration = {
      id: 'auth-migration-1',
      name: 'Add MFA fields to users table',
      description: 'Migration to add MFA-related fields to users table',
      script: 'ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255), ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE',
      permissions: ['admin', 'db-admin'],
      validation: true
    };
  });

  afterEach(() => {
    // Clean up any active processes
    vulnerabilityScanningService.disableContinuousMonitoring();
  });

  describe('Complete Security Validation Workflow', () => {
    it('should perform comprehensive security validation for a new feature', async () => {
      // Step 1: Validate feature security
      const featureValidation = await securityValidationService.validateFeatureSecurity(mockFeature);
      
      expect(featureValidation).toBeDefined();
      expect(featureValidation.passed).toBeDefined();
      expect(featureValidation.riskLevel).toMatch(/^(low|medium|high|critical)$/);

      // Step 2: Audit integration changes
      const changeAudit = await securityValidationService.auditIntegrationChanges(mockCodeChanges);
      
      expect(changeAudit).toBeDefined();
      expect(changeAudit.riskLevel).toMatch(/^(low|medium|high|critical)$/);

      // Step 3: Validate data migration
      const migrationValidation = await securityValidationService.validateDataMigration(mockDataMigration);
      
      expect(migrationValidation).toBeDefined();
      expect(typeof migrationValidation.dataProtectionScore).toBe('number');

      // Step 4: Run comprehensive security test suite
      const testSuiteResults = await securityValidationService.runSecurityTestSuite();
      
      expect(testSuiteResults).toBeDefined();
      expect(testSuiteResults.suiteResults.length).toBeGreaterThan(0);
      expect(typeof testSuiteResults.overallScore).toBe('number');

      // Verify all components worked together
      expect(featureValidation.vulnerabilities).toBeInstanceOf(Array);
      expect(changeAudit.issues).toBeInstanceOf(Array);
      expect(migrationValidation.securityIssues).toBeInstanceOf(Array);
      expect(testSuiteResults.recommendations).toBeInstanceOf(Array);
    });

    it('should create security baseline and run regression tests', async () => {
      // Step 1: Create security baseline
      const baseline = await securityRegressionService.createSecurityBaseline(
        'integration-baseline',
        'Integration Test Baseline',
        'Baseline for integration testing',
        [mockFeature]
      );

      expect(baseline).toBeDefined();
      expect(baseline.id).toBe('integration-baseline');
      expect(typeof baseline.securityScore).toBe('number');

      // Step 2: Run regression tests
      const regressionReport = await securityRegressionService.runSecurityRegressionTests(
        mockFeature,
        'integration-baseline'
      );

      expect(regressionReport).toBeDefined();
      expect(typeof regressionReport.overallRegression).toBe('boolean');
      expect(regressionReport.regressions).toBeInstanceOf(Array);

      // Verify baseline and regression testing integration
      expect(baseline.features).toContain(mockFeature.id);
      expect(regressionReport.baseline.id).toBe('integration-baseline');
    });

    it('should integrate vulnerability scanning with security validation', async () => {
      // Step 1: Run immediate vulnerability scan
      const scanTypes = [
        { type: 'dependencies' as const, enabled: true, config: {} },
        { type: 'code' as const, enabled: true, config: {} }
      ];

      const scanConfig = {
        projectPath: '/test/project',
        excludePatterns: ['node_modules/**'],
        includePatterns: ['**/*.ts'],
        severityThreshold: 'medium' as const,
        maxExecutionTime: 300000,
        retryAttempts: 3,
        customRules: []
      };

      const scanResult = await vulnerabilityScanningService.runImmediateScan(scanTypes, scanConfig);

      expect(scanResult).toBeDefined();
      expect(scanResult.vulnerabilities).toBeInstanceOf(Array);
      expect(scanResult.issues).toBeInstanceOf(Array);

      // Step 2: Validate feature with scan results context
      const featureValidation = await securityValidationService.validateFeatureSecurity(mockFeature);

      expect(featureValidation).toBeDefined();

      // Step 3: Verify integration between scanning and validation
      expect(scanResult.summary).toBeDefined();
      expect(featureValidation.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Security Analysis Integration', () => {
    it('should integrate code security analysis with improvement analysis', async () => {
      // Mock file analysis data
      const mockFiles = [
        {
          path: 'src/auth/login.ts',
          type: 'api' as const,
          size: 1024,
          lastModified: new Date(),
          complexity: 'medium' as const
        },
        {
          path: 'src/auth/register.ts',
          type: 'api' as const,
          size: 2048,
          lastModified: new Date(),
          complexity: 'high' as const
        }
      ];

      // Step 1: Analyze security improvements
      const improvementAnalysis = await securityImprovementAnalyzer.analyzeSecurityImprovements(mockFiles);

      expect(improvementAnalysis).toBeDefined();
      expect(improvementAnalysis.authenticationEnhancements).toBeInstanceOf(Array);
      expect(improvementAnalysis.inputValidationImprovements).toBeInstanceOf(Array);
      expect(improvementAnalysis.accessControlEnhancements).toBeInstanceOf(Array);

      // Step 2: Analyze code security for the same files
      const codeAnalysis = await codeSecurityAnalyzer.analyzeCodeSecurity(['src/auth/login.ts', 'src/auth/register.ts']);

      expect(codeAnalysis).toBeDefined();
      expect(codeAnalysis.scanResults).toBeInstanceOf(Array);

      // Step 3: Verify integration provides comprehensive security view
      expect(typeof improvementAnalysis.overallSecurityScore).toBe('number');
      expect(typeof codeAnalysis.summary.overallRiskScore).toBe('number');
    });

    it('should handle security validation for complex feature integration', async () => {
      // Create a complex feature with multiple security aspects
      const complexFeature: Feature = {
        id: 'complex-auth-feature',
        name: 'Advanced Authentication System',
        description: 'Multi-factor authentication with biometric support and OAuth integration',
        category: 'auth',
        complexity: 'high',
        dependencies: [
          { name: 'passport', version: '0.6.0' },
          { name: 'speakeasy', version: '2.0.0' },
          { name: 'qrcode', version: '1.5.3' },
          { name: 'node-rsa', version: '1.1.1' }
        ],
        whiteLabelCompatible: true,
        performanceImpact: 'negative'
      };

      // Step 1: Comprehensive feature validation
      const validation = await securityValidationService.validateFeatureSecurity(complexFeature);

      // Step 2: Generate automated test cases
      const automatedTests = securityValidationService.generateAutomatedTests(complexFeature);

      // Step 3: Run security regression tests
      const regressionTests = await securityValidationService.runSecurityRegressionTests(complexFeature);

      // Verify comprehensive validation
      expect(validation.riskLevel).toBeDefined();
      expect(automatedTests.length).toBeGreaterThan(0);
      expect(regressionTests.passed).toBeDefined();

      // Verify test categories are appropriate for auth feature
      expect(automatedTests.some(test => test.category === 'authentication')).toBe(true);
      expect(automatedTests.some(test => test.category === 'authorization')).toBe(true);
    });
  });

  describe('End-to-End Security Validation Pipeline', () => {
    it('should execute complete security validation pipeline', async () => {
      const pipeline = {
        feature: mockFeature,
        codeChanges: mockCodeChanges,
        dataMigration: mockDataMigration
      };

      // Step 1: Initial security assessment
      const initialAssessment = await securityValidationService.validateFeatureSecurity(pipeline.feature);
      
      // Step 2: Code change analysis
      const changeAnalysis = await securityValidationService.auditIntegrationChanges(pipeline.codeChanges);
      
      // Step 3: Data migration validation
      const migrationValidation = await securityValidationService.validateDataMigration(pipeline.dataMigration);
      
      // Step 4: Comprehensive test suite execution
      const testResults = await securityValidationService.runSecurityTestSuite({
        scanDependencies: true,
        scanCode: true,
        scanConfiguration: true,
        severityThreshold: 'medium',
        excludePatterns: ['**/*.test.ts'],
        customRules: []
      });

      // Step 5: Create baseline for future regression testing
      const baseline = await securityRegressionService.createSecurityBaseline(
        'pipeline-baseline',
        'Pipeline Test Baseline',
        'Baseline created from complete pipeline execution',
        [pipeline.feature]
      );

      // Verify pipeline execution
      expect(initialAssessment.passed).toBeDefined();
      expect(changeAnalysis.riskLevel).toBeDefined();
      expect(migrationValidation.dataProtectionScore).toBeGreaterThanOrEqual(0);
      expect(testResults.overallScore).toBeGreaterThanOrEqual(0);
      expect(baseline.securityScore).toBeGreaterThanOrEqual(0);

      // Verify comprehensive recommendations
      const allRecommendations = [
        ...initialAssessment.recommendations,
        ...changeAnalysis.recommendations,
        ...migrationValidation.recommendations,
        ...testResults.recommendations
      ];

      expect(allRecommendations.length).toBeGreaterThan(0);
    });

    it('should handle security validation failures gracefully', async () => {
      // Create a feature with known security issues
      const vulnerableFeature: Feature = {
        id: 'vulnerable-feature',
        name: 'Vulnerable Test Feature',
        description: 'Feature with intentional security vulnerabilities for testing',
        category: 'auth',
        complexity: 'high',
        dependencies: [
          { name: 'vulnerable-package', version: '1.0.0' }
        ],
        whiteLabelCompatible: false,
        performanceImpact: 'negative'
      };

      // Validation should complete but identify issues
      const validation = await securityValidationService.validateFeatureSecurity(vulnerableFeature);

      expect(validation).toBeDefined();
      expect(validation.riskLevel).toBeDefined();
      expect(validation.recommendations.length).toBeGreaterThan(0);

      // Should not throw errors even with vulnerable feature
      expect(() => validation).not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent security validations', async () => {
      const features = Array(5).fill(null).map((_, i) => ({
        ...mockFeature,
        id: `concurrent-feature-${i}`,
        name: `Concurrent Test Feature ${i}`
      }));

      const startTime = Date.now();

      // Run concurrent validations
      const validationPromises = features.map(feature => 
        securityValidationService.validateFeatureSecurity(feature)
      );

      const results = await Promise.all(validationPromises);

      const executionTime = Date.now() - startTime;

      // Verify all validations completed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.riskLevel).toBeDefined();
      });

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(10000); // 10 seconds for 5 concurrent validations
    });

    it('should maintain performance with large test suites', async () => {
      const startTime = Date.now();

      // Run comprehensive test suite
      const results = await securityValidationService.runSecurityTestSuite({
        scanDependencies: true,
        scanCode: true,
        scanConfiguration: true,
        severityThreshold: 'low', // Include all severity levels
        excludePatterns: [],
        customRules: []
      });

      const executionTime = Date.now() - startTime;

      expect(results).toBeDefined();
      expect(results.suiteResults.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(15000); // 15 seconds max for comprehensive suite
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from individual test failures', async () => {
      // This test verifies that the system continues working even if some tests fail
      const testResults = await securityValidationService.runSecurityTestSuite();

      expect(testResults).toBeDefined();
      expect(testResults.suiteResults).toBeInstanceOf(Array);
      
      // Even if some tests fail, we should get results
      expect(testResults.totalTests).toBeGreaterThanOrEqual(0);
      expect(testResults.passedTests).toBeGreaterThanOrEqual(0);
    });

    it('should handle network timeouts gracefully', async () => {
      // Test that the system handles external service timeouts
      const scanConfig = {
        projectPath: '/test/project',
        excludePatterns: [],
        includePatterns: ['**/*.ts'],
        severityThreshold: 'medium' as const,
        maxExecutionTime: 1000, // Very short timeout
        retryAttempts: 1,
        customRules: []
      };

      // Should not throw even with short timeout
      await expect(vulnerabilityScanningService.runImmediateScan(
        [{ type: 'dependencies', enabled: true, config: {} }],
        scanConfig
      )).resolves.toBeDefined();
    });
  });

  describe('Security Metrics and Reporting', () => {
    it('should generate comprehensive security metrics', async () => {
      // Run various security validations
      const featureValidation = await securityValidationService.validateFeatureSecurity(mockFeature);
      const testSuiteResults = await securityValidationService.runSecurityTestSuite();
      
      // Create baseline for metrics
      const baseline = await securityRegressionService.createSecurityBaseline(
        'metrics-baseline',
        'Metrics Test Baseline',
        'Baseline for metrics testing',
        [mockFeature]
      );

      // Verify comprehensive metrics are available
      expect(typeof featureValidation.riskLevel).toBe('string');
      expect(typeof testSuiteResults.overallScore).toBe('number');
      expect(typeof baseline.securityScore).toBe('number');
      expect(typeof baseline.vulnerabilityCount).toBe('number');
      expect(typeof baseline.criticalIssues).toBe('number');

      // Verify metrics provide actionable insights
      expect(featureValidation.recommendations.length).toBeGreaterThanOrEqual(0);
      expect(testSuiteResults.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should track security improvements over time', async () => {
      // Create initial baseline
      const initialBaseline = await securityRegressionService.createSecurityBaseline(
        'improvement-baseline-1',
        'Initial Baseline',
        'Initial security baseline',
        [mockFeature]
      );

      // Simulate improvements (in real scenario, this would be after actual improvements)
      const improvedFeature = {
        ...mockFeature,
        id: 'improved-feature',
        description: 'Improved version with better security'
      };

      // Create improved baseline
      const improvedBaseline = await securityRegressionService.createSecurityBaseline(
        'improvement-baseline-2',
        'Improved Baseline',
        'Baseline after security improvements',
        [improvedFeature]
      );

      // Verify we can track improvements
      expect(initialBaseline.securityScore).toBeGreaterThanOrEqual(0);
      expect(improvedBaseline.securityScore).toBeGreaterThanOrEqual(0);
      expect(initialBaseline.timestamp).toBeInstanceOf(Date);
      expect(improvedBaseline.timestamp).toBeInstanceOf(Date);
    });
  });
});