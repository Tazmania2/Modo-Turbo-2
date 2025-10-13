import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface RepositoryConfig {
  url: string;
  branch: string;
  accessToken?: string;
  localPath?: string;
}

export interface FileChange {
  path: string;
  type: 'component' | 'service' | 'utility' | 'config' | 'test';
  changeType: 'added' | 'modified' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
  complexity: 'low' | 'medium' | 'high';
  impact: 'breaking' | 'additive' | 'neutral';
}

export interface DependencyChange {
  name: string;
  oldVersion?: string;
  newVersion?: string;
  changeType: 'added' | 'updated' | 'removed';
}

export interface ConfigChange {
  file: string;
  changes: string[];
  impact: 'breaking' | 'additive' | 'neutral';
}

export interface ChangeAnalysis {
  addedFiles: FileChange[];
  modifiedFiles: FileChange[];
  deletedFiles: FileChange[];
  dependencyChanges: DependencyChange[];
  configurationChanges: ConfigChange[];
}

export interface ProjectStructure {
  directories: string[];
  files: string[];
  components: string[];
  services: string[];
  utilities: string[];
  tests: string[];
}

export class RepositoryAnalyzerService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), '.temp', 'analysis');
  }

  /**
   * Analyze changes between base repository and current repository
   */
  async analyzeChanges(baseRepo: RepositoryConfig, currentRepo: RepositoryConfig): Promise<ChangeAnalysis> {
    try {
      // Ensure temp directory exists
      await this.ensureTempDirectory();

      // Clone or update repositories
      const baseRepoPath = await this.prepareRepository(baseRepo, 'base');
      const currentRepoPath = await this.prepareRepository(currentRepo, 'current');

      // Perform diff analysis
      const changes = await this.performDiffAnalysis(baseRepoPath, currentRepoPath);

      return changes;
    } catch (error) {
      throw new Error(`Failed to analyze repository changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get project structure from repository
   */
  async getProjectStructure(repoPath: string): Promise<ProjectStructure> {
    try {
      const structure: ProjectStructure = {
        directories: [],
        files: [],
        components: [],
        services: [],
        utilities: [],
        tests: []
      };

      await this.scanDirectory(repoPath, structure);
      return structure;
    } catch (error) {
      throw new Error(`Failed to get project structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare project structures between repositories
   */
  async compareProjectStructures(
    baseStructure: ProjectStructure,
    currentStructure: ProjectStructure
  ): Promise<{
    newComponents: string[];
    newServices: string[];
    newUtilities: string[];
    removedComponents: string[];
    removedServices: string[];
    removedUtilities: string[];
  }> {
    return {
      newComponents: currentStructure.components.filter(c => !baseStructure.components.includes(c)),
      newServices: currentStructure.services.filter(s => !baseStructure.services.includes(s)),
      newUtilities: currentStructure.utilities.filter(u => !baseStructure.utilities.includes(u)),
      removedComponents: baseStructure.components.filter(c => !currentStructure.components.includes(c)),
      removedServices: baseStructure.services.filter(s => !currentStructure.services.includes(s)),
      removedUtilities: baseStructure.utilities.filter(u => !currentStructure.utilities.includes(u))
    };
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  private async prepareRepository(config: RepositoryConfig, name: string): Promise<string> {
    const repoPath = path.join(this.tempDir, name);
    
    try {
      // Check if repository already exists
      const exists = await this.directoryExists(repoPath);
      
      if (exists) {
        // Update existing repository
        await this.updateRepository(repoPath, config);
      } else {
        // Clone repository
        await this.cloneRepository(config, repoPath);
      }

      return repoPath;
    } catch (error) {
      throw new Error(`Failed to prepare repository ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private async cloneRepository(config: RepositoryConfig, targetPath: string): Promise<void> {
    const gitUrl = this.buildGitUrl(config);
    const command = `git clone --branch ${config.branch} --depth 1 "${gitUrl}" "${targetPath}"`;
    
    try {
      await execAsync(command);
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateRepository(repoPath: string, config: RepositoryConfig): Promise<void> {
    try {
      // Fetch latest changes
      await execAsync('git fetch origin', { cwd: repoPath });
      
      // Reset to latest commit on branch
      await execAsync(`git reset --hard origin/${config.branch}`, { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to update repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildGitUrl(config: RepositoryConfig): string {
    if (config.accessToken) {
      // For GitHub, insert token into URL
      const urlParts = config.url.split('://');
      if (urlParts.length === 2) {
        return `${urlParts[0]}://${config.accessToken}@${urlParts[1]}`;
      }
    }
    return config.url;
  }

  private async performDiffAnalysis(baseRepoPath: string, currentRepoPath: string): Promise<ChangeAnalysis> {
    const changes: ChangeAnalysis = {
      addedFiles: [],
      modifiedFiles: [],
      deletedFiles: [],
      dependencyChanges: [],
      configurationChanges: []
    };

    // Get file lists from both repositories
    const baseFiles = await this.getFileList(baseRepoPath);
    const currentFiles = await this.getFileList(currentRepoPath);

    // Identify added, modified, and deleted files
    const baseFileSet = new Set(baseFiles);
    const currentFileSet = new Set(currentFiles);

    // Added files
    for (const file of currentFiles) {
      if (!baseFileSet.has(file)) {
        const fileChange = await this.analyzeFileChange(file, 'added', currentRepoPath);
        changes.addedFiles.push(fileChange);
      }
    }

    // Deleted files
    for (const file of baseFiles) {
      if (!currentFileSet.has(file)) {
        const fileChange = await this.analyzeFileChange(file, 'deleted', baseRepoPath);
        changes.deletedFiles.push(fileChange);
      }
    }

    // Modified files
    for (const file of currentFiles) {
      if (baseFileSet.has(file)) {
        const isModified = await this.isFileModified(file, baseRepoPath, currentRepoPath);
        if (isModified) {
          const fileChange = await this.analyzeFileChange(file, 'modified', currentRepoPath, baseRepoPath);
          changes.modifiedFiles.push(fileChange);
        }
      }
    }

    // Analyze dependency changes
    changes.dependencyChanges = await this.analyzeDependencyChanges(baseRepoPath, currentRepoPath);

    // Analyze configuration changes
    changes.configurationChanges = await this.analyzeConfigurationChanges(baseRepoPath, currentRepoPath);

    return changes;
  }

  private async getFileList(repoPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" | grep -v node_modules | grep -v .git', { cwd: repoPath });
      return stdout.trim().split('\n').filter(line => line.length > 0);
    } catch (error) {
      return [];
    }
  }

  private async analyzeFileChange(
    filePath: string, 
    changeType: 'added' | 'modified' | 'deleted',
    primaryRepoPath: string,
    secondaryRepoPath?: string
  ): Promise<FileChange> {
    const fileType = this.determineFileType(filePath);
    const complexity = await this.determineComplexity(filePath, primaryRepoPath);
    const impact = this.determineImpact(filePath, changeType);

    let linesAdded = 0;
    let linesRemoved = 0;

    if (changeType === 'modified' && secondaryRepoPath) {
      const diffStats = await this.getFileDiffStats(filePath, secondaryRepoPath, primaryRepoPath);
      linesAdded = diffStats.added;
      linesRemoved = diffStats.removed;
    } else if (changeType === 'added') {
      linesAdded = await this.getFileLineCount(filePath, primaryRepoPath);
    } else if (changeType === 'deleted') {
      linesRemoved = await this.getFileLineCount(filePath, primaryRepoPath);
    }

    return {
      path: filePath,
      type: fileType,
      changeType,
      linesAdded,
      linesRemoved,
      complexity,
      impact
    };
  }

  private determineFileType(filePath: string): 'component' | 'service' | 'utility' | 'config' | 'test' {
    if (filePath.includes('test') || filePath.includes('spec')) return 'test';
    if (filePath.includes('component') || filePath.endsWith('.tsx')) return 'component';
    if (filePath.includes('service')) return 'service';
    if (filePath.includes('util') || filePath.includes('helper')) return 'utility';
    if (filePath.endsWith('.json') || filePath.includes('config')) return 'config';
    return 'utility';
  }

  private async determineComplexity(filePath: string, repoPath: string): Promise<'low' | 'medium' | 'high'> {
    try {
      const lineCount = await this.getFileLineCount(filePath, repoPath);
      if (lineCount < 50) return 'low';
      if (lineCount < 200) return 'medium';
      return 'high';
    } catch {
      return 'low';
    }
  }

  private determineImpact(filePath: string, changeType: 'added' | 'modified' | 'deleted'): 'breaking' | 'additive' | 'neutral' {
    if (changeType === 'deleted') return 'breaking';
    if (changeType === 'added') return 'additive';
    
    // For modified files, check if it's a core file
    if (filePath.includes('api') || filePath.includes('service') || filePath.includes('config')) {
      return 'breaking';
    }
    
    return 'neutral';
  }

  private async isFileModified(filePath: string, baseRepoPath: string, currentRepoPath: string): Promise<boolean> {
    try {
      const baseFilePath = path.join(baseRepoPath, filePath);
      const currentFilePath = path.join(currentRepoPath, filePath);

      const baseContent = await fs.readFile(baseFilePath, 'utf-8');
      const currentContent = await fs.readFile(currentFilePath, 'utf-8');

      return baseContent !== currentContent;
    } catch {
      return false;
    }
  }

  private async getFileLineCount(filePath: string, repoPath: string): Promise<number> {
    try {
      const fullPath = path.join(repoPath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  private async getFileDiffStats(filePath: string, baseRepoPath: string, currentRepoPath: string): Promise<{ added: number; removed: number }> {
    try {
      const baseFilePath = path.join(baseRepoPath, filePath);
      const currentFilePath = path.join(currentRepoPath, filePath);

      const baseContent = await fs.readFile(baseFilePath, 'utf-8');
      const currentContent = await fs.readFile(currentFilePath, 'utf-8');

      const baseLines = baseContent.split('\n');
      const currentLines = currentContent.split('\n');

      // Simple diff calculation (can be improved with proper diff algorithm)
      const added = Math.max(0, currentLines.length - baseLines.length);
      const removed = Math.max(0, baseLines.length - currentLines.length);

      return { added, removed };
    } catch {
      return { added: 0, removed: 0 };
    }
  }

  private async analyzeDependencyChanges(baseRepoPath: string, currentRepoPath: string): Promise<DependencyChange[]> {
    const changes: DependencyChange[] = [];

    try {
      const basePackageJson = await this.readPackageJson(baseRepoPath);
      const currentPackageJson = await this.readPackageJson(currentRepoPath);

      if (!basePackageJson || !currentPackageJson) return changes;

      const baseDeps = { ...basePackageJson.dependencies, ...basePackageJson.devDependencies };
      const currentDeps = { ...currentPackageJson.dependencies, ...currentPackageJson.devDependencies };

      // Find added dependencies
      for (const [name, version] of Object.entries(currentDeps)) {
        if (!baseDeps[name]) {
          changes.push({
            name,
            newVersion: version as string,
            changeType: 'added'
          });
        } else if (baseDeps[name] !== version) {
          changes.push({
            name,
            oldVersion: baseDeps[name] as string,
            newVersion: version as string,
            changeType: 'updated'
          });
        }
      }

      // Find removed dependencies
      for (const [name, version] of Object.entries(baseDeps)) {
        if (!currentDeps[name]) {
          changes.push({
            name,
            oldVersion: version as string,
            changeType: 'removed'
          });
        }
      }
    } catch (error) {
      console.warn('Failed to analyze dependency changes:', error);
    }

    return changes;
  }

  private async readPackageJson(repoPath: string): Promise<any> {
    try {
      const packageJsonPath = path.join(repoPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async analyzeConfigurationChanges(baseRepoPath: string, currentRepoPath: string): Promise<ConfigChange[]> {
    const changes: ConfigChange[] = [];
    const configFiles = ['next.config.js', 'next.config.ts', 'tailwind.config.js', 'tailwind.config.ts', 'tsconfig.json'];

    for (const configFile of configFiles) {
      try {
        const baseConfigPath = path.join(baseRepoPath, configFile);
        const currentConfigPath = path.join(currentRepoPath, configFile);

        const baseExists = await this.fileExists(baseConfigPath);
        const currentExists = await this.fileExists(currentConfigPath);

        if (!baseExists && currentExists) {
          changes.push({
            file: configFile,
            changes: ['File added'],
            impact: 'additive'
          });
        } else if (baseExists && !currentExists) {
          changes.push({
            file: configFile,
            changes: ['File removed'],
            impact: 'breaking'
          });
        } else if (baseExists && currentExists) {
          const baseContent = await fs.readFile(baseConfigPath, 'utf-8');
          const currentContent = await fs.readFile(currentConfigPath, 'utf-8');

          if (baseContent !== currentContent) {
            changes.push({
              file: configFile,
              changes: ['File modified'],
              impact: 'neutral'
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to analyze config file ${configFile}:`, error);
      }
    }

    return changes;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async scanDirectory(dirPath: string, structure: ProjectStructure, relativePath = ''): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativeEntryPath = path.join(relativePath, entry.name);

        // Skip node_modules, .git, and other common ignore patterns
        if (this.shouldIgnoreEntry(entry.name)) continue;

        if (entry.isDirectory()) {
          structure.directories.push(relativeEntryPath);
          await this.scanDirectory(fullPath, structure, relativeEntryPath);
        } else if (entry.isFile()) {
          structure.files.push(relativeEntryPath);
          
          // Categorize files
          if (this.isComponent(relativeEntryPath)) {
            structure.components.push(relativeEntryPath);
          } else if (this.isService(relativeEntryPath)) {
            structure.services.push(relativeEntryPath);
          } else if (this.isUtility(relativeEntryPath)) {
            structure.utilities.push(relativeEntryPath);
          } else if (this.isTest(relativeEntryPath)) {
            structure.tests.push(relativeEntryPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  private shouldIgnoreEntry(name: string): boolean {
    const ignorePatterns = [
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      '.env',
      '.env.local',
      '.env.production',
      '.DS_Store',
      'Thumbs.db'
    ];

    return ignorePatterns.some(pattern => name.includes(pattern));
  }

  private isComponent(filePath: string): boolean {
    return filePath.includes('component') || 
           filePath.endsWith('.tsx') || 
           (filePath.endsWith('.jsx') && !this.isTest(filePath));
  }

  private isService(filePath: string): boolean {
    return filePath.includes('service') || 
           filePath.includes('api/') ||
           (filePath.includes('lib/') && !this.isTest(filePath));
  }

  private isUtility(filePath: string): boolean {
    return filePath.includes('util') || 
           filePath.includes('helper') ||
           filePath.includes('hook') ||
           (filePath.includes('lib/') && !this.isService(filePath) && !this.isTest(filePath));
  }

  private isTest(filePath: string): boolean {
    return filePath.includes('test') || 
           filePath.includes('spec') ||
           filePath.includes('__tests__') ||
           filePath.endsWith('.test.ts') ||
           filePath.endsWith('.test.tsx') ||
           filePath.endsWith('.spec.ts') ||
           filePath.endsWith('.spec.tsx');
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      await execAsync(`rm -rf "${this.tempDir}"`);
    } catch (error) {
      console.warn('Failed to cleanup temporary files:', error);
    }
  }
}