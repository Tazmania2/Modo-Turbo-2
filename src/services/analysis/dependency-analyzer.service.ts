import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  DependencyAuditResult, 
  SecurityVulnerability, 
  AnalysisIssue 
} from '../../types/analysis.types';

const execAsync = promisify(exec);

export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface DependencyComparison {
  added: string[];
  removed: string[];
  updated: Array<{
    name: string;
    oldVersion: string;
    newVersion: string;
    isBreaking: boolean;
  }>;
  unchanged: string[];
}

export interface DependencyTreeNode {
  name: string;
  version: string;
  dependencies: DependencyTreeNode[];
  depth: number;
  isDirect: boolean;
}

export interface VulnerabilityReport {
  package: string;
  version: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  patchedVersions: string;
  cve?: string;
}

export class DependencyAnalyzerService {
  private auditCache = new Map<string, VulnerabilityReport[]>();
  private treeCache = new Map<string, DependencyTreeNode[]>();

  /**
   * Parse package.json file and extract dependency information
   */
  async parsePackageJson(packageJsonPath: string): Promise<PackageInfo> {
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageData = JSON.parse(content);
      
      return {
        name: packageData.name || 'unknown',
        version: packageData.version || '0.0.0',
        description: packageData.description,
        dependencies: packageData.dependencies || {},
        devDependencies: packageData.devDependencies || {},
        peerDependencies: packageData.peerDependencies || {}
      };
    } catch (error) {
      throw new Error(`Failed to parse package.json at ${packageJsonPath}: ${error}`);
    }
  }

  /**
   * Compare two package.json files to identify dependency changes
   */
  async compareDependencies(
    basePackageJsonPath: string, 
    targetPackageJsonPath: string
  ): Promise<DependencyComparison> {
    const basePackage = await this.parsePackageJson(basePackageJsonPath);
    const targetPackage = await this.parsePackageJson(targetPackageJsonPath);

    const baseDeps = { ...basePackage.dependencies, ...basePackage.devDependencies };
    const targetDeps = { ...targetPackage.dependencies, ...targetPackage.devDependencies };

    const baseKeys = new Set(Object.keys(baseDeps));
    const targetKeys = new Set(Object.keys(targetDeps));

    const added = Array.from(targetKeys).filter(key => !baseKeys.has(key));
    const removed = Array.from(baseKeys).filter(key => !targetKeys.has(key));
    const unchanged: string[] = [];
    const updated: Array<{
      name: string;
      oldVersion: string;
      newVersion: string;
      isBreaking: boolean;
    }> = [];

    for (const key of baseKeys) {
      if (targetKeys.has(key)) {
        const oldVersion = baseDeps[key];
        const newVersion = targetDeps[key];
        
        if (oldVersion === newVersion) {
          unchanged.push(key);
        } else {
          updated.push({
            name: key,
            oldVersion,
            newVersion,
            isBreaking: this.isBreakingChange(oldVersion, newVersion)
          });
        }
      }
    }

    return { added, removed, updated, unchanged };
  }

  /**
   * Build dependency tree for a project
   */
  async buildDependencyTree(projectPath: string): Promise<DependencyTreeNode[]> {
    const cacheKey = projectPath;
    if (this.treeCache.has(cacheKey)) {
      return this.treeCache.get(cacheKey)!;
    }

    try {
      const { stdout } = await execAsync('npm list --json --all', { 
        cwd: projectPath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      const npmListOutput = JSON.parse(stdout);
      const tree = this.parseNpmListOutput(npmListOutput, 0, true);
      
      this.treeCache.set(cacheKey, tree);
      return tree;
    } catch (error) {
      // Fallback to parsing package.json directly
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageInfo = await this.parsePackageJson(packageJsonPath);
      
      const tree: DependencyTreeNode[] = [];
      const allDeps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
      
      for (const [name, version] of Object.entries(allDeps)) {
        tree.push({
          name,
          version: version.replace(/[\^~]/, ''), // Remove version prefixes
          dependencies: [],
          depth: 0,
          isDirect: true
        });
      }
      
      return tree;
    }
  }

  /**
   * Scan for security vulnerabilities in dependencies
   */
  async scanVulnerabilities(projectPath: string): Promise<VulnerabilityReport[]> {
    const cacheKey = projectPath;
    if (this.auditCache.has(cacheKey)) {
      return this.auditCache.get(cacheKey)!;
    }

    try {
      const { stdout } = await execAsync('npm audit --json', { 
        cwd: projectPath,
        maxBuffer: 1024 * 1024 * 5 // 5MB buffer
      });
      
      const auditOutput = JSON.parse(stdout);
      const vulnerabilities = this.parseAuditOutput(auditOutput);
      
      this.auditCache.set(cacheKey, vulnerabilities);
      return vulnerabilities;
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      // Try to parse the error output if it contains JSON
      try {
        const errorOutput = (error as any).stdout || (error as any).stderr || '';
        if (errorOutput.trim().startsWith('{')) {
          const auditOutput = JSON.parse(errorOutput);
          const vulnerabilities = this.parseAuditOutput(auditOutput);
          this.auditCache.set(cacheKey, vulnerabilities);
          return vulnerabilities;
        }
      } catch (parseError) {
        // If we can't parse the audit output, return empty array
        console.warn(`Failed to parse npm audit output for ${projectPath}:`, parseError);
      }
      
      return [];
    }
  }

  /**
   * Analyze dependency impact and generate recommendations
   */
  async analyzeDependencyImpact(
    baseProjectPath: string,
    targetProjectPath: string
  ): Promise<DependencyAuditResult[]> {
    const basePackageJsonPath = path.join(baseProjectPath, 'package.json');
    const targetPackageJsonPath = path.join(targetProjectPath, 'package.json');
    
    const comparison = await this.compareDependencies(basePackageJsonPath, targetPackageJsonPath);
    const targetVulnerabilities = await this.scanVulnerabilities(targetProjectPath);
    
    const results: DependencyAuditResult[] = [];

    // Analyze added dependencies
    for (const addedDep of comparison.added) {
      const vulnerabilities = targetVulnerabilities.filter(v => v.package === addedDep);
      const maxSeverity = this.getMaxSeverity(vulnerabilities.map(v => v.severity));
      
      results.push({
        package: addedDep,
        version: 'new',
        vulnerabilities: vulnerabilities.length,
        severity: maxSeverity || 'low',
        recommendation: vulnerabilities.length > 0 ? 'update' : 'monitor'
      });
    }

    // Analyze updated dependencies
    for (const updatedDep of comparison.updated) {
      const vulnerabilities = targetVulnerabilities.filter(v => v.package === updatedDep.name);
      const maxSeverity = this.getMaxSeverity(vulnerabilities.map(v => v.severity));
      
      results.push({
        package: updatedDep.name,
        version: updatedDep.newVersion,
        vulnerabilities: vulnerabilities.length,
        severity: maxSeverity || 'low',
        recommendation: updatedDep.isBreaking ? 'monitor' : 'update'
      });
    }

    return results;
  }

  /**
   * Generate analysis issues from dependency problems
   */
  async generateDependencyIssues(projectPath: string): Promise<AnalysisIssue[]> {
    const vulnerabilities = await this.scanVulnerabilities(projectPath);
    const issues: AnalysisIssue[] = [];

    for (const vuln of vulnerabilities) {
      issues.push({
        id: `dep-vuln-${vuln.package}-${Date.now()}`,
        ruleId: 'dependency-vulnerability',
        severity: vuln.severity === 'critical' || vuln.severity === 'high' ? 'error' : 'warning',
        message: `Security vulnerability in ${vuln.package}@${vuln.version}: ${vuln.title}`,
        file: 'package.json',
        suggestion: vuln.recommendation,
        autoFixable: false
      });
    }

    return issues;
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.auditCache.clear();
    this.treeCache.clear();
  }

  // Private helper methods

  private parseNpmListOutput(
    npmOutput: any, 
    depth: number = 0, 
    isDirect: boolean = true
  ): DependencyTreeNode[] {
    const nodes: DependencyTreeNode[] = [];
    
    if (npmOutput.dependencies) {
      for (const [name, info] of Object.entries(npmOutput.dependencies)) {
        const depInfo = info as any;
        const node: DependencyTreeNode = {
          name,
          version: depInfo.version || 'unknown',
          dependencies: this.parseNpmListOutput(depInfo, depth + 1, false),
          depth,
          isDirect
        };
        nodes.push(node);
      }
    }
    
    return nodes;
  }

  private parseAuditOutput(auditOutput: any): VulnerabilityReport[] {
    const vulnerabilities: VulnerabilityReport[] = [];
    
    if (auditOutput.vulnerabilities) {
      for (const [packageName, vulnInfo] of Object.entries(auditOutput.vulnerabilities)) {
        const info = vulnInfo as any;
        
        if (info.via && Array.isArray(info.via)) {
          for (const via of info.via) {
            if (typeof via === 'object' && via.title) {
              vulnerabilities.push({
                package: packageName,
                version: info.range || 'unknown',
                severity: via.severity || 'moderate',
                title: via.title,
                description: via.url || 'No description available',
                recommendation: `Update to version ${info.fixAvailable || 'latest'}`,
                patchedVersions: info.fixAvailable || 'unknown',
                cve: via.cve
              });
            }
          }
        }
      }
    }
    
    return vulnerabilities;
  }

  private isBreakingChange(oldVersion: string, newVersion: string): boolean {
    // Simple heuristic: major version changes are breaking
    const oldMajor = this.extractMajorVersion(oldVersion);
    const newMajor = this.extractMajorVersion(newVersion);
    
    return oldMajor !== newMajor && newMajor > oldMajor;
  }

  private extractMajorVersion(version: string): number {
    const cleaned = version.replace(/[\^~>=<]/, '');
    const parts = cleaned.split('.');
    return parseInt(parts[0]) || 0;
  }

  private getMaxSeverity(severities: string[]): 'low' | 'moderate' | 'high' | 'critical' | null {
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('moderate')) return 'moderate';
    if (severities.includes('low')) return 'low';
    return null;
  }
}

export const dependencyAnalyzer = new DependencyAnalyzerService();