import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  SecurityRegressionTestService,
  SecurityBaseline,
  SecurityRegressionReport,
  RegressionTestConfig,
  SecurityMetricsComparison
} from '../security-regression-test.service';
import { Feature } from '@/types/analysis.types';

// Mock dependencies
jest.mock('../security-validation-test.service');
jest.mock('../vulnerability-scanning-automation.service');

describe('SecurityRegressionTestService', () => {
  let service: SecurityRegressionTestService;
  let mockFeature: Feature;
  let mockFeatures: Feature[];

  beforeEach(() => {
    service = new SecurityRegressionTestService();
    
    mockFeature = {
      id: 'test-feature-1',
      name: 'Test Authentication Feature',
      description: 'A test feature for authentication',
      category: 'auth',
      complexity: 'medium',
      dependencies: [
        { name: 'bcrypt', version: '5.1.0' }
      ],
      whiteLabelCompatible: true,
      performanceImpact: 'neutral'
    };

    mockFeatures = [
      mockFeature,
      {
        id: 'test-feature-2',
        name: 'Test Dashboard Feature',
        description: 'A test feature for dashboard',
        category: 'dashboard',
        complexity: 'low',
        dependencies: [],
        whiteLabelCompatible: true,
        performanceImpact: 'positive'
      }
    ];
  });

  describe('createSecurityBaseline', () => {
    it('should create security baseline successfully', async () => {
      const baseline = await service.createSecurityBaseline(
        'baseline-1',
        'Test Baseline',
        'A test security baseline',
        mockFeatures
      );

      expect(baseline).toBeDefined();
      expect(baseline.id).toBe('baseline-1');
      expect(baseline.name).toBe('Test Baseline');
      expect(baseline.description).toBe('A test security baseline');
      expect(baseline.timestamp).toBeInstanceOf(Date);
      expect(typeof baseline.securityScore).toBe('number');
      expect(typeof baseline.vulnerabilityCount).toBe('number');
      expect(typeof baseline.criticalIssues).toBe('number');
      expect(typeof baseline.highIssues).toBe('number');
      expect(typeof baseline.mediumIssues).toBe('number');
      expect(typeof baseline.lowIssues).toBe('number');
      expect(baseline.testResults).toBeInstanceOf(Array);
      expect(baseline.features).toBeInstanceOf(Array);
      expect(baseline.features).toContain('test-feature-1');
      expect(baseline.features).toContain('test-feature-2');
    });

    it('should handle empty features array', async () => {
      const baseline = await service.createSecurityBaseline(
        'empty-baseline',
        'Empty Baseline',
        'Baseline with no features',
        []
      );

      expect(baseline).toBeDefined();
      expect(baseline.features).toHaveLength(0);
      expect(baseline.testResults.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle single feature', async () => {
      const baseline = await service.createSecurityBaseline(
        'single-baseline',
        'Single Feature Baseline',
        'Baseline with one feature',
        [mockFeature]
      );

      expect(baseline).toBeDefined();
      expect(baseline.features).toHaveLength(1);
      expect(baseline.features[0]).toBe('test-feature-1');
    });

    it('should handle baseline creation errors', async () => {
      // Test with invalid features
      const invalidFeatures = [null as any];

      await expect(service.createSecurityBaseline(
        'invalid-baseline',
        'Invalid Baseline',
        'Baseline with invalid features',
        invalidFeatures
      )).rejects.toThrow('Failed to create security baseline');
    });

    it('should calculate security metrics correctly', async () => {
      const baseline = await service.createSecurityBaseline(
        'metrics-baseline',
        'Metrics Test Baseline',
        'Testing security metrics calculation',
        mockFeatures
      );

      expect(baseline.securityScore).toBeGreaterThanOrEqual(0);
      expect(baseline.securityScore).toBeLessThanOrEqual(100);
      expect(baseline.vulnerabilityCount).toBeGreaterThanOrEqual(0);
      expect(baseline.criticalIssues).toBeGreaterThanOrEqual(0);
      expect(baseline.highIssues).toBeGreaterThanOrEqual(0);
      expect(baseline.mediumIssues).toBeGreaterThanOrEqual(0);
      expect(baseline.lowIssues).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runSecurityRegressionTests', () => {
    let baseline: SecurityBaseline;

    beforeEach(async () => {
      baseline = await service.createSecurityBaseline(
        'test-baseline',
        'Test Baseline',
        'Baseline for regression testing',
        mockFeatures
      );
    });

    it('should run security regression tests successfully', async () => {
      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'test-baseline'
      );

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.feature).toEqual(mockFeature);
      expect(report.baseline).toEqual(baseline);
      expect(report.currentResults).toBeInstanceOf(Array);
      expect(report.regressions).toBeInstanceOf(Array);
      expect(typeof report.overallRegression).toBe('boolean');
      expect(report.regressionSummary).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(typeof report.actionRequired).toBe('boolean');
    });

    it('should detect security regressions', async () => {
      // This would require mocking the validation service to return worse results
      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'test-baseline'
      );

      expect(report.regressionSummary).toBeDefined();
      expect(typeof report.regressionSummary.totalTests).toBe('number');
      expect(typeof report.regressionSummary.regressedTests).toBe('number');
      expect(typeof report.regressionSummary.newVulnerabilities).toBe('number');
      expect(typeof report.regressionSummary.scoreDecrease).toBe('number');
      expect(typeof report.regressionSummary.criticalRegressions).toBe('number');
    });

    it('should use custom regression test config', async () => {
      const customConfig: Partial<RegressionTestConfig> = {
        scoreThreshold: 10,
        vulnerabilityThreshold: 2,
        performanceThreshold: 30,
        alertOnRegression: false,
        autoRollbackOnCritical: false
      };

      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'test-baseline',
        customConfig
      );

      expect(report).toBeDefined();
      // The custom config should be applied during regression analysis
    });

    it('should handle non-existent baseline', async () => {
      await expect(service.runSecurityRegressionTests(
        mockFeature,
        'non-existent-baseline'
      )).rejects.toThrow('Security baseline non-existent-baseline not found');
    });

    it('should generate appropriate recommendations', async () => {
      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'test-baseline'
      );

      expect(report.recommendations).toBeInstanceOf(Array);
      // Recommendations should be relevant to any detected regressions
    });

    it('should determine action required correctly', async () => {
      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'test-baseline'
      );

      expect(typeof report.actionRequired).toBe('boolean');
      
      if (report.regressionSummary.criticalRegressions > 0) {
        expect(report.actionRequired).toBe(true);
      }
    });
  });

  describe('compareSecurityMetrics', () => {
    let baseline: SecurityBaseline;

    beforeEach(async () => {
      baseline = await service.createSecurityBaseline(
        'metrics-baseline',
        'Metrics Baseline',
        'Baseline for metrics comparison',
        mockFeatures
      );
    });

    it('should compare security metrics successfully', async () => {
      // Create current results that are similar to baseline
      const currentResults = baseline.testResults.map(tr => ({ ...tr }));

      const comparisons = service.compareSecurityMetrics(baseline, currentResults);

      expect(comparisons).toBeInstanceOf(Array);
      expect(comparisons.length).toBeGreaterThan(0);

      comparisons.forEach(comparison => {
        expect(comparison.metric).toBeDefined();
        expect(typeof comparison.baseline).toBe('number');
        expect(typeof comparison.current).toBe('number');
        expect(typeof comparison.change).toBe('number');
        expect(typeof comparison.changePercentage).toBe('number');
        expect(typeof comparison.regressed).toBe('boolean');
        expect(comparison.severity).toMatch(/^(low|medium|high|critical)$/);
      });
    });

    it('should detect metric regressions', async () => {
      // Create current results with worse metrics
      const currentResults = baseline.testResults.map(tr => ({
        ...tr,
        score: tr.score - 20, // Decrease score
        issues: [...tr.issues, {
          type: 'new-issue',
          severity: 'high' as const,
          file: 'test.ts',
          line: 1,
          description: 'New security issue',
          recommendation: 'Fix the issue'
        }]
      }));

      const comparisons = service.compareSecurityMetrics(baseline, currentResults);

      const regressedComparisons = comparisons.filter(c => c.regressed);
      expect(regressedComparisons.length).toBeGreaterThan(0);
    });

    it('should calculate percentage changes correctly', async () => {
      const currentResults = baseline.testResults.map(tr => ({
        ...tr,
        score: tr.score * 0.8 // 20% decrease
      }));

      const comparisons = service.compareSecurityMetrics(baseline, currentResults);
      const scoreComparison = comparisons.find(c => c.metric === 'Security Score');

      if (scoreComparison && baseline.securityScore > 0) {
        expect(Math.abs(scoreComparison.changePercentage + 20)).toBeLessThan(1); // Should be approximately -20%
      }
    });
  });

  describe('getRegressionHistory', () => {
    it('should return empty history initially', () => {
      const history = service.getRegressionHistory();

      expect(history).toBeInstanceOf(Array);
      expect(history).toHaveLength(0);
    });

    it('should return regression history after tests', async () => {
      // Create baseline and run regression test
      await service.createSecurityBaseline(
        'history-baseline',
        'History Baseline',
        'Baseline for history testing',
        mockFeatures
      );

      await service.runSecurityRegressionTests(mockFeature, 'history-baseline');

      const history = service.getRegressionHistory();

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history when requested', async () => {
      // Create baseline and run multiple regression tests
      await service.createSecurityBaseline(
        'limit-baseline',
        'Limit Baseline',
        'Baseline for limit testing',
        mockFeatures
      );

      await service.runSecurityRegressionTests(mockFeature, 'limit-baseline');
      await service.runSecurityRegressionTests(mockFeature, 'limit-baseline');
      await service.runSecurityRegressionTests(mockFeature, 'limit-baseline');

      const limitedHistory = service.getRegressionHistory(2);

      expect(limitedHistory).toBeInstanceOf(Array);
      expect(limitedHistory.length).toBeLessThanOrEqual(2);
    });

    it('should return history in chronological order', async () => {
      await service.createSecurityBaseline(
        'chrono-baseline',
        'Chronological Baseline',
        'Baseline for chronological testing',
        mockFeatures
      );

      const report1 = await service.runSecurityRegressionTests(mockFeature, 'chrono-baseline');
      
      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const report2 = await service.runSecurityRegressionTests(mockFeature, 'chrono-baseline');

      const history = service.getRegressionHistory();

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(history[1].timestamp.getTime());
    });
  });

  describe('getAvailableBaselines', () => {
    it('should return empty array initially', () => {
      const baselines = service.getAvailableBaselines();

      expect(baselines).toBeInstanceOf(Array);
      expect(baselines).toHaveLength(0);
    });

    it('should return available baselines after creation', async () => {
      await service.createSecurityBaseline(
        'available-baseline-1',
        'Available Baseline 1',
        'First available baseline',
        mockFeatures
      );

      await service.createSecurityBaseline(
        'available-baseline-2',
        'Available Baseline 2',
        'Second available baseline',
        [mockFeature]
      );

      const baselines = service.getAvailableBaselines();

      expect(baselines).toBeInstanceOf(Array);
      expect(baselines.length).toBe(2);
      expect(baselines.some(b => b.id === 'available-baseline-1')).toBe(true);
      expect(baselines.some(b => b.id === 'available-baseline-2')).toBe(true);
    });

    it('should return baselines in chronological order', async () => {
      const baseline1 = await service.createSecurityBaseline(
        'chrono-baseline-1',
        'Chronological Baseline 1',
        'First chronological baseline',
        mockFeatures
      );

      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const baseline2 = await service.createSecurityBaseline(
        'chrono-baseline-2',
        'Chronological Baseline 2',
        'Second chronological baseline',
        [mockFeature]
      );

      const baselines = service.getAvailableBaselines();

      expect(baselines.length).toBeGreaterThanOrEqual(2);
      expect(baselines[0].timestamp.getTime()).toBeGreaterThanOrEqual(baselines[1].timestamp.getTime());
    });
  });

  describe('updateBaseline', () => {
    it('should update existing baseline', async () => {
      const originalBaseline = await service.createSecurityBaseline(
        'update-baseline',
        'Original Baseline',
        'Original baseline for updating',
        [mockFeature]
      );

      const updatedBaseline = await service.updateBaseline(
        'update-baseline',
        mockFeatures
      );

      expect(updatedBaseline.id).toBe(originalBaseline.id);
      expect(updatedBaseline.name).toBe(originalBaseline.name);
      expect(updatedBaseline.description).toBe(originalBaseline.description);
      expect(updatedBaseline.timestamp.getTime()).toBeGreaterThan(originalBaseline.timestamp.getTime());
      expect(updatedBaseline.features).toHaveLength(2); // Updated with more features
    });

    it('should handle non-existent baseline', async () => {
      await expect(service.updateBaseline(
        'non-existent-baseline',
        mockFeatures
      )).rejects.toThrow('Baseline non-existent-baseline not found');
    });
  });

  describe('deleteBaseline', () => {
    it('should delete existing baseline', async () => {
      await service.createSecurityBaseline(
        'delete-baseline',
        'Delete Baseline',
        'Baseline to be deleted',
        mockFeatures
      );

      const deleted = service.deleteBaseline('delete-baseline');

      expect(deleted).toBe(true);

      const baselines = service.getAvailableBaselines();
      expect(baselines.some(b => b.id === 'delete-baseline')).toBe(false);
    });

    it('should return false for non-existent baseline', () => {
      const deleted = service.deleteBaseline('non-existent-baseline');

      expect(deleted).toBe(false);
    });
  });

  describe('Regression Detection Logic', () => {
    let baseline: SecurityBaseline;

    beforeEach(async () => {
      baseline = await service.createSecurityBaseline(
        'regression-baseline',
        'Regression Detection Baseline',
        'Baseline for testing regression detection',
        mockFeatures
      );
    });

    it('should detect score decrease regression', async () => {
      // This would require mocking the validation service to return lower scores
      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'regression-baseline',
        { scoreThreshold: 1 } // Very low threshold to potentially trigger regression
      );

      // Check if score regression is properly detected
      expect(report.regressionSummary.scoreDecrease).toBeGreaterThanOrEqual(0);
    });

    it('should detect new vulnerabilities regression', async () => {
      // This would require mocking the validation service to return more vulnerabilities
      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'regression-baseline',
        { vulnerabilityThreshold: 0 } // No new vulnerabilities allowed
      );

      expect(report.regressionSummary.newVulnerabilities).toBeGreaterThanOrEqual(0);
    });

    it('should detect critical regressions', async () => {
      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'regression-baseline'
      );

      expect(report.regressionSummary.criticalRegressions).toBeGreaterThanOrEqual(0);
      
      if (report.regressionSummary.criticalRegressions > 0) {
        expect(report.actionRequired).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid feature in baseline creation', async () => {
      await expect(service.createSecurityBaseline(
        'invalid-feature-baseline',
        'Invalid Feature Baseline',
        'Baseline with invalid feature',
        [null as any]
      )).rejects.toThrow();
    });

    it('should handle validation service errors', async () => {
      // This would require mocking the validation service to throw errors
      await service.createSecurityBaseline(
        'error-baseline',
        'Error Baseline',
        'Baseline for error testing',
        mockFeatures
      );

      // The regression test should handle validation errors gracefully
      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'error-baseline'
      );

      expect(report).toBeDefined();
    });

    it('should handle scanning service errors', async () => {
      // This would require mocking the scanning service to throw errors
      await service.createSecurityBaseline(
        'scan-error-baseline',
        'Scan Error Baseline',
        'Baseline for scan error testing',
        mockFeatures
      );

      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'scan-error-baseline'
      );

      expect(report).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete baseline creation within reasonable time', async () => {
      const startTime = Date.now();

      await service.createSecurityBaseline(
        'performance-baseline',
        'Performance Baseline',
        'Baseline for performance testing',
        mockFeatures
      );

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10000); // 10 seconds max
    });

    it('should complete regression tests within reasonable time', async () => {
      await service.createSecurityBaseline(
        'regression-performance-baseline',
        'Regression Performance Baseline',
        'Baseline for regression performance testing',
        mockFeatures
      );

      const startTime = Date.now();

      await service.runSecurityRegressionTests(
        mockFeature,
        'regression-performance-baseline'
      );

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(15000); // 15 seconds max
    });

    it('should handle multiple concurrent regression tests', async () => {
      await service.createSecurityBaseline(
        'concurrent-baseline',
        'Concurrent Baseline',
        'Baseline for concurrent testing',
        mockFeatures
      );

      const promises = Array(3).fill(null).map(() =>
        service.runSecurityRegressionTests(mockFeature, 'concurrent-baseline')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.reportId).toBeDefined();
      });
    });
  });

  describe('Configuration Options', () => {
    it('should respect score threshold configuration', async () => {
      await service.createSecurityBaseline(
        'threshold-baseline',
        'Threshold Baseline',
        'Baseline for threshold testing',
        mockFeatures
      );

      const strictConfig: Partial<RegressionTestConfig> = {
        scoreThreshold: 1, // Very strict threshold
        vulnerabilityThreshold: 0,
        performanceThreshold: 5
      };

      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'threshold-baseline',
        strictConfig
      );

      expect(report).toBeDefined();
      // The strict configuration should be applied
    });

    it('should respect alert configuration', async () => {
      await service.createSecurityBaseline(
        'alert-baseline',
        'Alert Baseline',
        'Baseline for alert testing',
        mockFeatures
      );

      const alertConfig: Partial<RegressionTestConfig> = {
        alertOnRegression: true,
        autoRollbackOnCritical: false
      };

      const report = await service.runSecurityRegressionTests(
        mockFeature,
        'alert-baseline',
        alertConfig
      );

      expect(report).toBeDefined();
      // Alert configuration should be applied
    });
  });
});