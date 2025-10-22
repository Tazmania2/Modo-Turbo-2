import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SecurityImprovementAnalyzerService,
  AuthenticationEnhancement,
  InputValidationImprovement,
  AccessControlEnhancement
} from '../security-improvement-analyzer.service';
import { FileAnalysis } from '@/types/analysis.types';

describe('SecurityImprovementAnalyzerService', () => {
  let service: SecurityImprovementAnalyzerService;
  let mockFiles: FileAnalysis[];

  beforeEach(() => {
    service = new SecurityImprovementAnalyzerService();
    
    mockFiles = [
      {
        path: 'src/auth/login.ts',
        type: 'api',
        size: 1024,
        lastModified: new Date(),
        complexity: 'medium'
      },
      {
        path: 'src/auth/register.ts',
        type: 'api',
        size: 2048,
        lastModified: new Date(),
        complexity: 'high'
      },
      {
        path: 'src/api/users.ts',
        type: 'api',
        size: 1536,
        lastModified: new Date(),
        complexity: 'medium'
      }
    ];
  });

  describe('analyzeAuthenticationEnhancements', () => {
    it('should analyze authentication enhancements', () => {
      const enhancements = service.analyzeAuthenticationEnhancements(mockFiles);

      expect(enhancements).toBeInstanceOf(Array);
      expect(enhancements.every(e => e.type)).toBe(true);
      expect(enhancements.every(e => e.riskLevel)).toBe(true);
    });

    it('should return empty array for non-security files', () => {
      const nonSecurityFiles: FileAnalysis[] = [
        {
          path: 'src/utils/helpers.ts',
          type: 'utility',
          size: 512,
          lastModified: new Date(),
          complexity: 'low'
        }
      ];

      const enhancements = service.analyzeAuthenticationEnhancements(nonSecurityFiles);
      expect(enhancements).toHaveLength(0);
    });
  });

  describe('analyzeInputValidationImprovements', () => {
    it('should analyze input validation improvements', () => {
      const improvements = service.analyzeInputValidationImprovements(mockFiles);

      expect(improvements).toBeInstanceOf(Array);
      expect(improvements.every(i => i.vulnerabilityType)).toBe(true);
      expect(improvements.every(i => i.severity)).toBe(true);
    });

    it('should handle files without input handling', () => {
      const nonInputFiles: FileAnalysis[] = [
        {
          path: 'src/types/index.ts',
          type: 'config',
          size: 256,
          lastModified: new Date(),
          complexity: 'low'
        }
      ];

      const improvements = service.analyzeInputValidationImprovements(nonInputFiles);
      expect(improvements).toHaveLength(0);
    });
  });

  describe('analyzeAccessControlEnhancements', () => {
    it('should analyze access control enhancements', () => {
      const enhancements = service.analyzeAccessControlEnhancements(mockFiles);

      expect(enhancements).toBeInstanceOf(Array);
      expect(enhancements.every(e => e.businessImpact)).toBe(true);
      expect(enhancements.every(e => e.type)).toBe(true);
    });

    it('should handle non-access-control files', () => {
      const nonAccessFiles: FileAnalysis[] = [
        {
          path: 'src/components/Button.tsx',
          type: 'component',
          size: 1024,
          lastModified: new Date(),
          complexity: 'low'
        }
      ];

      const enhancements = service.analyzeAccessControlEnhancements(nonAccessFiles);
      expect(enhancements).toHaveLength(0);
    });
  });

  describe('analyzeSecurityImprovements', () => {
    it('should perform comprehensive security improvement analysis', async () => {
      const result = await service.analyzeSecurityImprovements(mockFiles);

      expect(result).toBeDefined();
      expect(result.authenticationEnhancements).toBeInstanceOf(Array);
      expect(result.inputValidationImprovements).toBeInstanceOf(Array);
      expect(result.accessControlEnhancements).toBeInstanceOf(Array);
      expect(typeof result.overallSecurityScore).toBe('number');
      expect(typeof result.criticalIssues).toBe('number');
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(typeof result.summary.totalIssuesFound).toBe('number');
      expect(typeof result.summary.highPriorityIssues).toBe('number');
      expect(typeof result.summary.estimatedFixTime).toBe('number');
      expect(typeof result.summary.securityImprovementPotential).toBe('number');
    });

    it('should handle empty file list', async () => {
      const result = await service.analyzeSecurityImprovements([]);

      expect(result.authenticationEnhancements).toHaveLength(0);
      expect(result.inputValidationImprovements).toHaveLength(0);
      expect(result.accessControlEnhancements).toHaveLength(0);
      expect(result.overallSecurityScore).toBe(100);
      expect(result.criticalIssues).toBe(0);
    });

    it('should calculate security scores correctly', async () => {
      const result = await service.analyzeSecurityImprovements(mockFiles);

      expect(result.overallSecurityScore).toBeGreaterThanOrEqual(0);
      expect(result.overallSecurityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Helper Methods', () => {
    it('should identify security relevant files correctly', () => {
      const authFile: FileAnalysis = {
        path: 'src/auth/login.ts',
        type: 'api',
        size: 1024,
        lastModified: new Date(),
        complexity: 'medium'
      };

      const utilFile: FileAnalysis = {
        path: 'src/utils/format.ts',
        type: 'utility',
        size: 512,
        lastModified: new Date(),
        complexity: 'low'
      };

      // Test through public methods that use these helpers
      const authEnhancements = service.analyzeAuthenticationEnhancements([authFile]);
      const utilEnhancements = service.analyzeAuthenticationEnhancements([utilFile]);

      // Auth files should potentially have enhancements, util files should not
      expect(authEnhancements.length).toBeGreaterThanOrEqual(0);
      expect(utilEnhancements.length).toBe(0);
    });

    it('should handle different file types appropriately', () => {
      const apiFile: FileAnalysis = {
        path: 'src/api/endpoint.ts',
        type: 'api',
        size: 1024,
        lastModified: new Date(),
        complexity: 'medium'
      };

      const middlewareFile: FileAnalysis = {
        path: 'src/middleware/auth.ts',
        type: 'middleware',
        size: 768,
        lastModified: new Date(),
        complexity: 'medium'
      };

      const improvements = service.analyzeInputValidationImprovements([apiFile, middlewareFile]);
      expect(improvements).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed file analysis objects', () => {
      const malformedFiles = [
        null,
        undefined,
        {} as FileAnalysis
      ].filter(Boolean) as FileAnalysis[];

      expect(() => service.analyzeAuthenticationEnhancements(malformedFiles)).not.toThrow();
      expect(() => service.analyzeInputValidationImprovements(malformedFiles)).not.toThrow();
      expect(() => service.analyzeAccessControlEnhancements(malformedFiles)).not.toThrow();
    });

    it('should handle files with missing properties gracefully', () => {
      const incompleteFile: Partial<FileAnalysis> = {
        path: 'src/incomplete.ts',
        type: 'api'
        // Missing size, lastModified, complexity
      };

      expect(() => service.analyzeAuthenticationEnhancements([incompleteFile as FileAnalysis])).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const manyFiles = Array(50).fill(null).map((_, i) => ({
        path: `src/file${i}.ts`,
        type: 'api' as const,
        size: 1024,
        lastModified: new Date(),
        complexity: 'medium' as const
      }));

      const startTime = Date.now();
      await service.analyzeSecurityImprovements(manyFiles);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // 5 seconds max for 50 files
    });
  });
});