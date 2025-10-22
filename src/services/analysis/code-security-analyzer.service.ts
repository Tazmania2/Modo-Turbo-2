import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  SecurityIssue, 
  SecurityVulnerability,
  FileAnalysis,
  CodeChange,
  SecurityAnalysis
} from '@/types/analysis.types';

export interface CodeSecurityPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'input-validation' | 'data-protection' | 'configuration';
  recommendation: string;
  cweId?: string;
}

export interface CodeSecurityScanResult {
  file: string;
  issues: SecurityIssue[];
  vulnerabilities: SecurityVulnerability[];
  riskScore: number;
  recommendations: string[];
}

export interface CodeSecurityAnalysisResult {
  scanResults: CodeSecurityScanResult[];
  summary: {
    totalFiles: number;
    filesWithIssues: number;
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    overallRiskScore: number;
  };
  recommendations: string[];
  topRisks: SecurityIssue[];
}

export class CodeSecurityAnalyzerService {
  private securityPatterns: CodeSecurityPattern[] = [
    // Authentication patterns
    {
      id: 'weak-password-validation',
      name: 'Weak Password Validation',
      description: 'Password validation allows weak passwords',
      pattern: /password\.length\s*[<>=]+\s*[1-7]/g,
      severity: 'medium',
      category: 'authentication',
      recommendation: 'Implement strong password policy with minimum 12 characters',
      cweId: 'CWE-521'
    },
    {
      id: 'plaintext-password',
      name: 'Plain Text Password Storage',
      description: 'Passwords stored in plain text',
      pattern: /password\s*=\s*["'][^"']*["']/g,
      severity: 'critical',
      category: 'authentication',
      recommendation: 'Use bcrypt or Argon2 for password hashing',
      cweId: 'CWE-256'
    },
    {
      id: 'weak-token-generation',
      name: 'Weak Token Generation',
      description: 'Using weak random number generation for tokens',
      pattern: /Math\.random\(\)|Date\.now\(\)/g,
      severity: 'high',
      category: 'authentication',
      recommendation: 'Use crypto.randomBytes() for secure token generation',
      cweId: 'CWE-338'
    },
    
    // Input validation patterns
    {
      id: 'xss-vulnerability',
      name: 'XSS Vulnerability',
      description: 'Direct DOM insertion without sanitization',
      pattern: /innerHTML\s*=\s*[^;]*(?!DOMPurify|sanitize)/g,
      severity: 'high',
      category: 'input-validation',
      recommendation: 'Use DOMPurify.sanitize() or textContent for safe DOM manipulation',
      cweId: 'CWE-79'
    },
    {
      id: 'sql-injection',
      name: 'SQL Injection Risk',
      description: 'SQL query with string interpolation',
      pattern: /query\s*\(\s*["'`][^"'`]*\$\{[^}]*\}/g,
      severity: 'critical',
      category: 'input-validation',
      recommendation: 'Use parameterized queries or prepared statements',
      cweId: 'CWE-89'
    },
    {
      id: 'path-traversal',
      name: 'Path Traversal Risk',
      description: 'User input used directly in file path operations',
      pattern: /path\.join\([^)]*req\.[^)]*\)/g,
      severity: 'high',
      category: 'input-validation',
      recommendation: 'Validate and sanitize file paths, use path.resolve() with whitelist',
      cweId: 'CWE-22'
    },
    {
      id: 'unsafe-eval',
      name: 'Unsafe Code Execution',
      description: 'Using eval() with potentially unsafe input',
      pattern: /eval\s*\(/g,
      severity: 'critical',
      category: 'input-validation',
      recommendation: 'Replace eval() with JSON.parse() or safe alternatives',
      cweId: 'CWE-95'
    },
    
    // Authorization patterns
    {
      id: 'missing-auth-middleware',
      name: 'Missing Authentication Middleware',
      description: 'API routes without authentication middleware',
      pattern: /app\.(get|post|put|delete)\s*\([^)]*\)(?![^{]*auth|authenticate|requireAuth)/g,
      severity: 'medium',
      category: 'authorization',
      recommendation: 'Add authentication middleware to protected routes',
      cweId: 'CWE-306'
    },
    {
      id: 'weak-permission-check',
      name: 'Weak Permission Check',
      description: 'Simple string comparison for role checking',
      pattern: /req\.user\.role\s*===?\s*["']admin["']/g,
      severity: 'medium',
      category: 'authorization',
      recommendation: 'Implement robust permission system with hierarchical roles',
      cweId: 'CWE-285'
    },
    
    // Data protection patterns
    {
      id: 'insecure-storage',
      name: 'Insecure Token Storage',
      description: 'Storing sensitive data in localStorage',
      pattern: /localStorage\.setItem.*(?:token|password|secret)/g,
      severity: 'high',
      category: 'data-protection',
      recommendation: 'Use httpOnly cookies or secure session storage',
      cweId: 'CWE-922'
    },
    {
      id: 'missing-encryption',
      name: 'Missing Data Encryption',
      description: 'Sensitive data stored without encryption',
      pattern: /(?:ssn|credit_card|password|secret)\s*:\s*[^,}]*(?!encrypt|hash)/g,
      severity: 'high',
      category: 'data-protection',
      recommendation: 'Encrypt sensitive data before storage',
      cweId: 'CWE-311'
    },
    
    // Configuration patterns
    {
      id: 'hardcoded-secrets',
      name: 'Hardcoded Secrets',
      description: 'Hardcoded API keys or secrets in code',
      pattern: /(api_key|secret_key|password)\s*=\s*["'][^"']{8,}["']/g,
      severity: 'critical',
      category: 'configuration',
      recommendation: 'Use environment variables for secrets',
      cweId: 'CWE-798'
    },
    {
      id: 'insecure-cookie-settings',
      name: 'Insecure Cookie Settings',
      description: 'Cookies without secure flags',
      pattern: /res\.cookie\([^)]*\)(?![^)]*secure|httpOnly)/g,
      severity: 'medium',
      category: 'configuration',
      recommendation: 'Set secure and httpOnly flags for cookies',
      cweId: 'CWE-614'
    }
  ];

  /**
   * Analyzes code files for security vulnerabilities
   */
  async analyzeCodeSecurity(files: string[]): Promise<CodeSecurityAnalysisResult> {
    const scanResults: CodeSecurityScanResult[] = [];

    for (const file of files) {
      try {
        const result = await this.scanFile(file);
        if (result.issues.length > 0 || result.vulnerabilities.length > 0) {
          scanResults.push(result);
        }
      } catch (error) {
        console.error(`Failed to scan file ${file}:`, error);
      }
    }

    const summary = this.generateSummary(scanResults);
    const recommendations = this.generateRecommendations(scanResults);
    const topRisks = this.getTopRisks(scanResults);

    return {
      scanResults,
      summary,
      recommendations,
      topRisks
    };
  }

  /**
   * Analyzes specific code changes for security impact
   */
  async analyzeCodeChanges(changes: CodeChange[]): Promise<{
    securityImpact: 'low' | 'medium' | 'high' | 'critical';
    newVulnerabilities: SecurityVulnerability[];
    securityIssues: SecurityIssue[];
    recommendations: string[];
  }> {
    const newVulnerabilities: SecurityVulnerability[] = [];
    const securityIssues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    for (const change of changes) {
      if (change.type === 'addition' || change.type === 'modification') {
        try {
          const scanResult = await this.scanFile(change.file);
          newVulnerabilities.push(...scanResult.vulnerabilities);
          securityIssues.push(...scanResult.issues);
        } catch (error) {
          console.error(`Failed to analyze change in ${change.file}:`, error);
        }
      }
    }

    const securityImpact = this.calculateSecurityImpact(securityIssues, newVulnerabilities);
    recommendations.push(...this.generateChangeRecommendations(securityIssues, newVulnerabilities));

    return {
      securityImpact,
      newVulnerabilities,
      securityIssues,
      recommendations
    };
  }

  /**
   * Scans a single file for security issues
   */
  private async scanFile(filePath: string): Promise<CodeSecurityScanResult> {
    const issues: SecurityIssue[] = [];
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const pattern of this.securityPatterns) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          for (const match of matches) {
            const lineNumber = this.findLineNumber(content, match);
            
            const issue: SecurityIssue = {
              type: pattern.id,
              severity: pattern.severity,
              file: filePath,
              line: lineNumber,
              description: pattern.description,
              recommendation: pattern.recommendation
            };

            issues.push(issue);

            // Create vulnerability for critical/high severity issues
            if (pattern.severity === 'critical' || pattern.severity === 'high') {
              const vulnerability: SecurityVulnerability = {
                id: `${pattern.id}-${filePath}-${lineNumber}`,
                severity: pattern.severity === 'critical' ? 'critical' : 'high',
                title: pattern.name,
                description: pattern.description,
                package: path.basename(filePath),
                version: '1.0.0',
                patchedVersions: 'N/A',
                recommendation: pattern.recommendation
              };

              vulnerabilities.push(vulnerability);
            }

            if (!recommendations.includes(pattern.recommendation)) {
              recommendations.push(pattern.recommendation);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
    }

    const riskScore = this.calculateFileRiskScore(issues);

    return {
      file: filePath,
      issues,
      vulnerabilities,
      riskScore,
      recommendations
    };
  }

  /**
   * Finds the line number of a match in the content
   */
  private findLineNumber(content: string, match: string): number {
    const index = content.indexOf(match);
    if (index === -1) return 0;
    
    const beforeMatch = content.substring(0, index);
    return beforeMatch.split('\n').length;
  }

  /**
   * Calculates risk score for a file based on its issues
   */
  private calculateFileRiskScore(issues: SecurityIssue[]): number {
    const severityWeights = {
      critical: 10,
      high: 7,
      medium: 3,
      low: 1
    };

    return issues.reduce((score, issue) => {
      return score + severityWeights[issue.severity];
    }, 0);
  }

  /**
   * Generates summary statistics for scan results
   */
  private generateSummary(scanResults: CodeSecurityScanResult[]): CodeSecurityAnalysisResult['summary'] {
    const allIssues = scanResults.flatMap(result => result.issues);
    
    const criticalIssues = allIssues.filter(issue => issue.severity === 'critical').length;
    const highIssues = allIssues.filter(issue => issue.severity === 'high').length;
    const mediumIssues = allIssues.filter(issue => issue.severity === 'medium').length;
    const lowIssues = allIssues.filter(issue => issue.severity === 'low').length;

    const overallRiskScore = scanResults.reduce((sum, result) => sum + result.riskScore, 0);

    return {
      totalFiles: scanResults.length,
      filesWithIssues: scanResults.filter(result => result.issues.length > 0).length,
      totalIssues: allIssues.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      overallRiskScore
    };
  }

  /**
   * Generates recommendations based on scan results
   */
  private generateRecommendations(scanResults: CodeSecurityScanResult[]): string[] {
    const recommendations = new Set<string>();
    
    scanResults.forEach(result => {
      result.recommendations.forEach(rec => recommendations.add(rec));
    });

    const allIssues = scanResults.flatMap(result => result.issues);
    const criticalCount = allIssues.filter(issue => issue.severity === 'critical').length;
    const highCount = allIssues.filter(issue => issue.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.add(`Immediately address ${criticalCount} critical security vulnerabilities`);
    }

    if (highCount > 0) {
      recommendations.add(`Address ${highCount} high-severity security issues within 24 hours`);
    }

    return Array.from(recommendations);
  }

  /**
   * Gets the top security risks from scan results
   */
  private getTopRisks(scanResults: CodeSecurityScanResult[]): SecurityIssue[] {
    const allIssues = scanResults.flatMap(result => result.issues);
    
    // Sort by severity (critical > high > medium > low) and return top 10
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return allIssues
      .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
      .slice(0, 10);
  }

  /**
   * Calculates security impact of code changes
   */
  private calculateSecurityImpact(
    issues: SecurityIssue[], 
    vulnerabilities: SecurityVulnerability[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = issues.some(issue => issue.severity === 'critical') ||
                       vulnerabilities.some(vuln => vuln.severity === 'critical');
    
    const hasHigh = issues.some(issue => issue.severity === 'high') ||
                   vulnerabilities.some(vuln => vuln.severity === 'high');
    
    const hasMedium = issues.some(issue => issue.severity === 'medium') ||
                     vulnerabilities.some(vuln => vuln.severity === 'moderate');

    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'low';
  }

  /**
   * Generates recommendations for code changes
   */
  private generateChangeRecommendations(
    issues: SecurityIssue[], 
    vulnerabilities: SecurityVulnerability[]
  ): string[] {
    const recommendations: string[] = [];

    if (issues.length > 0) {
      recommendations.push('Review all code changes for security implications');
      recommendations.push('Run security tests before deploying changes');
    }

    if (vulnerabilities.length > 0) {
      recommendations.push('Address all security vulnerabilities before deployment');
    }

    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Critical security issues detected - deployment should be blocked');
    }

    return recommendations;
  }

  /**
   * Adds custom security pattern
   */
  addCustomPattern(pattern: CodeSecurityPattern): void {
    this.securityPatterns.push(pattern);
  }

  /**
   * Gets all security patterns
   */
  getSecurityPatterns(): CodeSecurityPattern[] {
    return [...this.securityPatterns];
  }

  /**
   * Removes a security pattern by ID
   */
  removePattern(patternId: string): boolean {
    const index = this.securityPatterns.findIndex(pattern => pattern.id === patternId);
    if (index !== -1) {
      this.securityPatterns.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const codeSecurityAnalyzerService = new CodeSecurityAnalyzerService();