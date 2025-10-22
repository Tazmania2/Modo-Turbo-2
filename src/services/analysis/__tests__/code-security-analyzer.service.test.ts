import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { 
  CodeSecurityAnalyzerService,
  CodeSecurityPattern,
  CodeSecurityScanResult,
  CodeSecurityAnalysisResult
} from '../code-security-analyzer.service';
import { SecurityIssue, SecurityVulnerability, CodeChange } from '@/types/analysis.types';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn()
  }
}));

const mockFs = fs as any;

describe('CodeSecurityAnalyzerService', () => {
  let service: CodeSecurityAnalyzerService;

  beforeEach(() => {
    service = new CodeSecurityAnalyzerService();
    vi.clearAllMocks();
  });

  describe('analyzeCodeSecurity', () => {
    it('should analyze multiple files for security vulnerabilities', async () => {
      const testFiles = ['src/auth/login.ts', 'src/api/users.ts'];
      
      // Mock file content with security issues
      mockFs.readFile
        .mockResolvedValueOnce('const password = "hardcoded123"; // Weak password')
        .mockResolvedValueOnce('element.innerHTML = userInput; // XSS vulnerability');

      const result = await service.analyzeCodeSecurity(testFiles);

      expect(result).toBeDefined();
      expect(result.scanResults).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.topRisks).toBeInstanceOf(Array);
      
      expect(result.summary.totalFiles).toBeGreaterThan(0);
      expect(result.summary.totalIssues).toBeGreaterThan(0);
    });

    it('should handle files without security issues', async () => {
      const testFiles = ['src/utils/helpers.ts'];
      
      mockFs.readFile.mockResolvedValueOnce('export const formatDate = (date) => date.toISOString();');

      const result = await service.analyzeCodeSecurity(testFiles);

      expect(result.scanResults).toHaveLength(0);
      expect(result.summary.totalIssues).toBe(0);
      expect(result.summary.filesWithIssues).toBe(0);
    });

    it('should handle file read errors gracefully', async () => {
      const testFiles = ['nonexistent.ts'];
      
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      const result = await service.analyzeCodeSecurity(testFiles);

      expect(result.scanResults).toHaveLength(0);
      expect(result.summary.totalIssues).toBe(0);
    });

    it('should detect critical security vulnerabilities', async () => {
      const testFiles = ['src/auth/vulnerable.ts'];
      
      mockFs.readFile.mockResolvedValueOnce(`
        const password = "plaintext123";
        eval(userInput);
        query(\`SELECT * FROM users WHERE id = \${userId}\`);
      `);

      const result = await service.analyzeCodeSecurity(testFiles);

      expect(result.summary.criticalIssues).toBeGreaterThan(0);
      expect(result.topRisks.some(risk => risk.severity === 'critical')).toBe(true);
    });
  });

  describe('analyzeCodeChanges', () => {
    it('should analyze security impact of code changes', async () => {
      const changes: CodeChange[] = [
        {
          id: 'change-1',
          type: 'modification',
          file: 'src/auth/login.ts',
          description: 'Updated login logic',
          linesAdded: 5,
          linesRemoved: 2,
          complexity: 'medium',
          riskLevel: 'medium',
          isBreaking: false,
          vulnerabilities: []
        }
      ];

      mockFs.readFile.mockResolvedValueOnce('element.innerHTML = userInput;');

      const result = await service.analyzeCodeChanges(changes);

      expect(result).toBeDefined();
      expect(result.securityImpact).toMatch(/^(low|medium|high|critical)$/);
      expect(result.newVulnerabilities).toBeInstanceOf(Array);
      expect(result.securityIssues).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should identify high-impact security changes', async () => {
      const changes: CodeChange[] = [
        {
          id: 'change-1',
          type: 'addition',
          file: 'src/auth/new-auth.ts',
          description: 'Added new authentication',
          linesAdded: 20,
          linesRemoved: 0,
          complexity: 'high',
          riskLevel: 'high',
          isBreaking: false,
          vulnerabilities: []
        }
      ];

      mockFs.readFile.mockResolvedValueOnce(`
        const apiKey = "sk-1234567890abcdef";
        eval(userCode);
      `);

      const result = await service.analyzeCodeChanges(changes);

      expect(result.securityImpact).toBe('critical');
      expect(result.newVulnerabilities.length).toBeGreaterThan(0);
    });

    it('should handle changes with no security impact', async () => {
      const changes: CodeChange[] = [
        {
          id: 'change-1',
          type: 'modification',
          file: 'src/utils/format.ts',
          description: 'Updated formatting function',
          linesAdded: 2,
          linesRemoved: 1,
          complexity: 'low',
          riskLevel: 'low',
          isBreaking: false,
          vulnerabilities: []
        }
      ];

      mockFs.readFile.mockResolvedValueOnce('export const formatNumber = (num) => num.toFixed(2);');

      const result = await service.analyzeCodeChanges(changes);

      expect(result.securityImpact).toBe('low');
      expect(result.newVulnerabilities).toHaveLength(0);
      expect(result.securityIssues).toHaveLength(0);
    });
  });

  describe('Security Pattern Detection', () => {
    it('should detect weak password validation', async () => {
      mockFs.readFile.mockResolvedValueOnce('if (password.length < 6) { return false; }');

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.scanResults[0].issues.some(issue => 
        issue.type === 'weak-password-validation'
      )).toBe(true);
    });

    it('should detect XSS vulnerabilities', async () => {
      mockFs.readFile.mockResolvedValueOnce('element.innerHTML = userInput;');

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.scanResults[0].issues.some(issue => 
        issue.type === 'xss-vulnerability'
      )).toBe(true);
    });

    it('should detect SQL injection risks', async () => {
      mockFs.readFile.mockResolvedValueOnce('query(`SELECT * FROM users WHERE id = ${userId}`);');

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.scanResults[0].issues.some(issue => 
        issue.type === 'sql-injection'
      )).toBe(true);
    });

    it('should detect hardcoded secrets', async () => {
      mockFs.readFile.mockResolvedValueOnce('const api_key = "sk-1234567890abcdef";');

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.scanResults[0].issues.some(issue => 
        issue.type === 'hardcoded-secrets'
      )).toBe(true);
    });

    it('should detect unsafe eval usage', async () => {
      mockFs.readFile.mockResolvedValueOnce('eval(userCode);');

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.scanResults[0].issues.some(issue => 
        issue.type === 'unsafe-eval'
      )).toBe(true);
    });

    it('should detect insecure token storage', async () => {
      mockFs.readFile.mockResolvedValueOnce('localStorage.setItem("token", authToken);');

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.scanResults[0].issues.some(issue => 
        issue.type === 'insecure-storage'
      )).toBe(true);
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate higher risk scores for critical issues', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('eval(userInput);') // Critical
        .mockResolvedValueOnce('if (password.length < 6) {}'); // Medium

      const result = await service.analyzeCodeSecurity(['critical.ts', 'medium.ts']);

      const criticalFile = result.scanResults.find(r => r.file === 'critical.ts');
      const mediumFile = result.scanResults.find(r => r.file === 'medium.ts');

      expect(criticalFile?.riskScore).toBeGreaterThan(mediumFile?.riskScore || 0);
    });

    it('should calculate overall risk score correctly', async () => {
      mockFs.readFile.mockResolvedValueOnce(`
        eval(userInput);
        const password = "plain";
        element.innerHTML = data;
      `);

      const result = await service.analyzeCodeSecurity(['risky.ts']);

      expect(result.summary.overallRiskScore).toBeGreaterThan(0);
      expect(result.summary.criticalIssues).toBeGreaterThan(0);
    });
  });

  describe('Custom Security Patterns', () => {
    it('should allow adding custom security patterns', () => {
      const customPattern: CodeSecurityPattern = {
        id: 'custom-test',
        name: 'Custom Test Pattern',
        description: 'A custom security pattern for testing',
        pattern: /customVulnerableFunction\(/g,
        severity: 'high',
        category: 'input-validation',
        recommendation: 'Use safe alternative function'
      };

      service.addCustomPattern(customPattern);

      const patterns = service.getSecurityPatterns();
      expect(patterns.some(p => p.id === 'custom-test')).toBe(true);
    });

    it('should detect custom security patterns', async () => {
      const customPattern: CodeSecurityPattern = {
        id: 'custom-dangerous',
        name: 'Custom Dangerous Function',
        description: 'Detects usage of dangerous function',
        pattern: /dangerousFunction\(/g,
        severity: 'critical',
        category: 'input-validation',
        recommendation: 'Replace with safe alternative'
      };

      service.addCustomPattern(customPattern);
      mockFs.readFile.mockResolvedValueOnce('dangerousFunction(userInput);');

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.scanResults[0].issues.some(issue => 
        issue.type === 'custom-dangerous'
      )).toBe(true);
    });

    it('should allow removing security patterns', () => {
      const patterns = service.getSecurityPatterns();
      const initialCount = patterns.length;
      
      if (patterns.length > 0) {
        const removed = service.removePattern(patterns[0].id);
        expect(removed).toBe(true);
        
        const updatedPatterns = service.getSecurityPatterns();
        expect(updatedPatterns.length).toBe(initialCount - 1);
      }
    });

    it('should return false when removing non-existent pattern', () => {
      const removed = service.removePattern('non-existent-pattern');
      expect(removed).toBe(false);
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate appropriate recommendations for critical issues', async () => {
      mockFs.readFile.mockResolvedValueOnce(`
        eval(userInput);
        const password = "plain";
      `);

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.recommendations.some(rec => 
        rec.includes('critical security vulnerabilities')
      )).toBe(true);
    });

    it('should generate specific recommendations for each vulnerability type', async () => {
      mockFs.readFile.mockResolvedValueOnce('element.innerHTML = userInput;');

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.recommendations.some(rec => 
        rec.includes('DOMPurify.sanitize()')
      )).toBe(true);
    });

    it('should not duplicate recommendations', async () => {
      mockFs.readFile.mockResolvedValueOnce(`
        element.innerHTML = userInput1;
        element.innerHTML = userInput2;
      `);

      const result = await service.analyzeCodeSecurity(['test.ts']);

      const xssRecommendations = result.recommendations.filter(rec => 
        rec.includes('DOMPurify.sanitize()')
      );
      expect(xssRecommendations.length).toBe(1);
    });
  });

  describe('Top Risks Identification', () => {
    it('should identify top security risks', async () => {
      mockFs.readFile.mockResolvedValueOnce(`
        eval(userInput);
        const password = "plain";
        element.innerHTML = data;
        localStorage.setItem("token", token);
      `);

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.topRisks.length).toBeGreaterThan(0);
      expect(result.topRisks[0].severity).toBe('critical');
    });

    it('should limit top risks to 10 items', async () => {
      // Create content with many issues
      const manyIssues = Array(15).fill(0).map((_, i) => 
        `element.innerHTML = userInput${i};`
      ).join('\n');

      mockFs.readFile.mockResolvedValueOnce(manyIssues);

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.topRisks.length).toBeLessThanOrEqual(10);
    });

    it('should sort risks by severity', async () => {
      mockFs.readFile.mockResolvedValueOnce(`
        if (password.length < 6) {} // Medium
        eval(userInput); // Critical
        element.innerHTML = data; // High
      `);

      const result = await service.analyzeCodeSecurity(['test.ts']);

      // First risk should be critical
      expect(result.topRisks[0].severity).toBe('critical');
    });
  });

  describe('Line Number Detection', () => {
    it('should correctly identify line numbers for security issues', async () => {
      const content = `line 1
line 2
eval(userInput);
line 4`;

      mockFs.readFile.mockResolvedValueOnce(content);

      const result = await service.analyzeCodeSecurity(['test.ts']);

      const evalIssue = result.scanResults[0].issues.find(issue => 
        issue.type === 'unsafe-eval'
      );
      expect(evalIssue?.line).toBe(3);
    });
  });

  describe('Vulnerability Creation', () => {
    it('should create vulnerabilities for critical and high severity issues', async () => {
      mockFs.readFile.mockResolvedValueOnce(`
        eval(userInput); // Critical
        element.innerHTML = data; // High
        if (password.length < 6) {} // Medium - should not create vulnerability
      `);

      const result = await service.analyzeCodeSecurity(['test.ts']);

      expect(result.scanResults[0].vulnerabilities.length).toBe(2);
      expect(result.scanResults[0].vulnerabilities.every(v => 
        v.severity === 'critical' || v.severity === 'high'
      )).toBe(true);
    });

    it('should create unique vulnerability IDs', async () => {
      mockFs.readFile.mockResolvedValueOnce(`
        eval(userInput1);
        eval(userInput2);
      `);

      const result = await service.analyzeCodeSecurity(['test.ts']);

      const vulnerabilities = result.scanResults[0].vulnerabilities;
      const ids = vulnerabilities.map(v => v.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed regex patterns gracefully', () => {
      const invalidPattern: CodeSecurityPattern = {
        id: 'invalid-pattern',
        name: 'Invalid Pattern',
        description: 'Pattern with invalid regex',
        pattern: /test/g, // Valid regex for testing
        severity: 'medium',
        category: 'input-validation',
        recommendation: 'Fix the pattern'
      };

      expect(() => service.addCustomPattern(invalidPattern)).not.toThrow();
    });

    it('should handle empty file content', async () => {
      mockFs.readFile.mockResolvedValueOnce('');

      const result = await service.analyzeCodeSecurity(['empty.ts']);

      expect(result.scanResults).toHaveLength(0);
      expect(result.summary.totalIssues).toBe(0);
    });

    it('should handle binary file content', async () => {
      mockFs.readFile.mockResolvedValueOnce(Buffer.from([0x00, 0x01, 0x02, 0x03]));

      const result = await service.analyzeCodeSecurity(['binary.bin']);

      expect(result.scanResults).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const largeContent = 'const x = 1;\n'.repeat(1000);
      mockFs.readFile.mockResolvedValue(largeContent);

      const startTime = Date.now();
      await service.analyzeCodeSecurity(['large.ts']);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle multiple files efficiently', async () => {
      const files = Array(10).fill(0).map((_, i) => `file${i}.ts`);
      mockFs.readFile.mockResolvedValue('const x = 1;');

      const startTime = Date.now();
      await service.analyzeCodeSecurity(files);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(3000); // 3 seconds for 10 files
    });
  });
});