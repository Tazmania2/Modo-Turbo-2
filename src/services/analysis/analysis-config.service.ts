import * as fs from 'fs/promises';
import * as path from 'path';
import { RepositoryConfig } from './repository-analyzer.service';

export interface AnalysisConfiguration {
  repositories: {
    essencia: RepositoryConfig;
    fnpRanking: RepositoryConfig;
    current: RepositoryConfig;
  };
  analysisRules: AnalysisRule[];
  prioritizationCriteria: PrioritizationCriteria;
  compatibilityRules: CompatibilityRule[];
  security: SecurityConfig;
}

export interface AnalysisRule {
  id: string;
  name: string;
  description: string;
  type: 'file-pattern' | 'dependency' | 'structure' | 'performance';
  pattern: string;
  weight: number;
  enabled: boolean;
}

export interface PrioritizationCriteria {
  businessValue: {
    high: string[];
    medium: string[];
    low: string[];
  };
  technicalComplexity: {
    high: string[];
    medium: string[];
    low: string[];
  };
  riskLevel: {
    high: string[];
    medium: string[];
    low: string[];
  };
}

export interface CompatibilityRule {
  id: string;
  name: string;
  description: string;
  type: 'whiteLabelCompatibility' | 'apiCompatibility' | 'databaseCompatibility' | 'uiCompatibility';
  pattern: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface SecurityConfig {
  tokenStorage: 'environment' | 'file' | 'keychain';
  encryptTokens: boolean;
  tokenExpirationDays: number;
  allowedRepositories: string[];
  requireTwoFactor: boolean;
}

export interface RepositoryCredentials {
  repository: string;
  accessToken: string;
  tokenType: 'github' | 'gitlab' | 'bitbucket' | 'generic';
  expiresAt?: Date;
  scopes: string[];
}

export class AnalysisConfigService {
  private configPath: string;
  private credentialsPath: string;
  private defaultConfig: AnalysisConfiguration;

  constructor() {
    this.configPath = path.join(process.cwd(), '.kiro', 'analysis', 'config.json');
    this.credentialsPath = path.join(process.cwd(), '.kiro', 'analysis', 'credentials.json');
    this.defaultConfig = this.createDefaultConfig();
  }

  /**
   * Load analysis configuration
   */
  async loadConfiguration(): Promise<AnalysisConfiguration> {
    try {
      await this.ensureConfigDirectory();
      
      const configExists = await this.fileExists(this.configPath);
      if (!configExists) {
        await this.saveConfiguration(this.defaultConfig);
        return this.defaultConfig;
      }

      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configContent) as AnalysisConfiguration;
      
      // Merge with default config to ensure all properties exist
      return this.mergeWithDefaults(config);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save analysis configuration
   */
  async saveConfiguration(config: AnalysisConfiguration): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      
      const configContent = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, configContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load repository credentials
   */
  async loadCredentials(): Promise<RepositoryCredentials[]> {
    try {
      const credentialsExist = await this.fileExists(this.credentialsPath);
      if (!credentialsExist) {
        return [];
      }

      const credentialsContent = await fs.readFile(this.credentialsPath, 'utf-8');
      const credentials = JSON.parse(credentialsContent) as RepositoryCredentials[];
      
      // Filter out expired tokens
      const validCredentials = credentials.filter(cred => 
        !cred.expiresAt || new Date(cred.expiresAt) > new Date()
      );

      return validCredentials;
    } catch (error) {
      throw new Error(`Failed to load credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save repository credentials
   */
  async saveCredentials(credentials: RepositoryCredentials[]): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      
      const credentialsContent = JSON.stringify(credentials, null, 2);
      await fs.writeFile(this.credentialsPath, credentialsContent, 'utf-8');
      
      // Set restrictive permissions on credentials file
      await fs.chmod(this.credentialsPath, 0o600);
    } catch (error) {
      throw new Error(`Failed to save credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add or update repository credentials
   */
  async setRepositoryCredentials(
    repository: string,
    accessToken: string,
    tokenType: 'github' | 'gitlab' | 'bitbucket' | 'generic' = 'github',
    scopes: string[] = ['repo'],
    expirationDays?: number
  ): Promise<void> {
    try {
      const credentials = await this.loadCredentials();
      
      // Remove existing credentials for this repository
      const filteredCredentials = credentials.filter(cred => cred.repository !== repository);
      
      // Add new credentials
      const newCredential: RepositoryCredentials = {
        repository,
        accessToken,
        tokenType,
        scopes,
        expiresAt: expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000) : undefined
      };
      
      filteredCredentials.push(newCredential);
      await this.saveCredentials(filteredCredentials);
    } catch (error) {
      throw new Error(`Failed to set repository credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get credentials for a specific repository
   */
  async getRepositoryCredentials(repository: string): Promise<RepositoryCredentials | null> {
    try {
      const credentials = await this.loadCredentials();
      return credentials.find(cred => cred.repository === repository) || null;
    } catch (error) {
      throw new Error(`Failed to get repository credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove credentials for a repository
   */
  async removeRepositoryCredentials(repository: string): Promise<void> {
    try {
      const credentials = await this.loadCredentials();
      const filteredCredentials = credentials.filter(cred => cred.repository !== repository);
      await this.saveCredentials(filteredCredentials);
    } catch (error) {
      throw new Error(`Failed to remove repository credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate repository access with credentials
   */
  async validateRepositoryAccess(repository: string): Promise<boolean> {
    try {
      const credentials = await this.getRepositoryCredentials(repository);
      if (!credentials) {
        return false;
      }

      // Check if token is expired
      if (credentials.expiresAt && new Date(credentials.expiresAt) <= new Date()) {
        return false;
      }

      // For GitHub, validate token by making a test API call
      if (credentials.tokenType === 'github') {
        return await this.validateGitHubToken(credentials.accessToken, repository);
      }

      // For other providers, assume valid if not expired
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository configuration with credentials
   */
  async getRepositoryConfigWithCredentials(repositoryName: 'essencia' | 'fnpRanking' | 'current'): Promise<RepositoryConfig> {
    try {
      const config = await this.loadConfiguration();
      const repoConfig = config.repositories[repositoryName];
      
      if (!repoConfig) {
        throw new Error(`Repository configuration not found for ${repositoryName}`);
      }

      // Get credentials for this repository
      const credentials = await this.getRepositoryCredentials(repoConfig.url);
      
      return {
        ...repoConfig,
        accessToken: credentials?.accessToken
      };
    } catch (error) {
      throw new Error(`Failed to get repository config with credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update repository configuration
   */
  async updateRepositoryConfig(
    repositoryName: 'essencia' | 'fnpRanking' | 'current',
    config: Partial<RepositoryConfig>
  ): Promise<void> {
    try {
      const currentConfig = await this.loadConfiguration();
      currentConfig.repositories[repositoryName] = {
        ...currentConfig.repositories[repositoryName],
        ...config
      };
      
      await this.saveConfiguration(currentConfig);
    } catch (error) {
      throw new Error(`Failed to update repository config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add or update analysis rule
   */
  async updateAnalysisRule(rule: AnalysisRule): Promise<void> {
    try {
      const config = await this.loadConfiguration();
      const existingRuleIndex = config.analysisRules.findIndex(r => r.id === rule.id);
      
      if (existingRuleIndex >= 0) {
        config.analysisRules[existingRuleIndex] = rule;
      } else {
        config.analysisRules.push(rule);
      }
      
      await this.saveConfiguration(config);
    } catch (error) {
      throw new Error(`Failed to update analysis rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove analysis rule
   */
  async removeAnalysisRule(ruleId: string): Promise<void> {
    try {
      const config = await this.loadConfiguration();
      config.analysisRules = config.analysisRules.filter(r => r.id !== ruleId);
      await this.saveConfiguration(config);
    } catch (error) {
      throw new Error(`Failed to remove analysis rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get analysis rules by type
   */
  async getAnalysisRulesByType(type: AnalysisRule['type']): Promise<AnalysisRule[]> {
    try {
      const config = await this.loadConfiguration();
      return config.analysisRules.filter(rule => rule.type === type && rule.enabled);
    } catch (error) {
      throw new Error(`Failed to get analysis rules by type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async ensureConfigDirectory(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private createDefaultConfig(): AnalysisConfiguration {
    return {
      repositories: {
        essencia: {
          url: 'https://github.com/your-org/essencia.git',
          branch: 'main',
          localPath: '.temp/analysis/essencia'
        },
        fnpRanking: {
          url: 'https://github.com/your-org/fnp-ranking.git',
          branch: 'main',
          localPath: '.temp/analysis/fnp-ranking'
        },
        current: {
          url: '.',
          branch: 'main',
          localPath: '.'
        }
      },
      analysisRules: [
        {
          id: 'component-analysis',
          name: 'Component Analysis',
          description: 'Analyze React components for improvements',
          type: 'file-pattern',
          pattern: '**/*.{tsx,jsx}',
          weight: 1.0,
          enabled: true
        },
        {
          id: 'service-analysis',
          name: 'Service Analysis',
          description: 'Analyze service layer improvements',
          type: 'file-pattern',
          pattern: '**/services/**/*.{ts,js}',
          weight: 1.2,
          enabled: true
        },
        {
          id: 'api-analysis',
          name: 'API Analysis',
          description: 'Analyze API endpoint improvements',
          type: 'file-pattern',
          pattern: '**/api/**/*.{ts,js}',
          weight: 1.5,
          enabled: true
        },
        {
          id: 'dependency-analysis',
          name: 'Dependency Analysis',
          description: 'Analyze package.json changes',
          type: 'dependency',
          pattern: 'package.json',
          weight: 1.3,
          enabled: true
        }
      ],
      prioritizationCriteria: {
        businessValue: {
          high: ['dashboard', 'ranking', 'auth', 'admin'],
          medium: ['ui', 'performance', 'security'],
          low: ['documentation', 'testing', 'tooling']
        },
        technicalComplexity: {
          high: ['database', 'authentication', 'api-breaking'],
          medium: ['components', 'services', 'configuration'],
          low: ['styling', 'documentation', 'minor-fixes']
        },
        riskLevel: {
          high: ['breaking-changes', 'security', 'data-migration'],
          medium: ['api-changes', 'ui-changes', 'configuration'],
          low: ['additions', 'improvements', 'optimizations']
        }
      },
      compatibilityRules: [
        {
          id: 'white-label-theme',
          name: 'White Label Theme Compatibility',
          description: 'Ensure changes are compatible with white-label theming',
          type: 'whiteLabelCompatibility',
          pattern: '**/components/**/*.{tsx,jsx}',
          severity: 'error',
          enabled: true
        },
        {
          id: 'api-backward-compatibility',
          name: 'API Backward Compatibility',
          description: 'Ensure API changes maintain backward compatibility',
          type: 'apiCompatibility',
          pattern: '**/api/**/*.{ts,js}',
          severity: 'error',
          enabled: true
        },
        {
          id: 'database-migration',
          name: 'Database Migration Safety',
          description: 'Ensure database changes have proper migrations',
          type: 'databaseCompatibility',
          pattern: '**/migrations/**/*.{ts,js,sql}',
          severity: 'warning',
          enabled: true
        }
      ],
      security: {
        tokenStorage: 'file',
        encryptTokens: false,
        tokenExpirationDays: 90,
        allowedRepositories: [],
        requireTwoFactor: false
      }
    };
  }

  private mergeWithDefaults(config: Partial<AnalysisConfiguration>): AnalysisConfiguration {
    return {
      repositories: { ...this.defaultConfig.repositories, ...config.repositories },
      analysisRules: config.analysisRules || this.defaultConfig.analysisRules,
      prioritizationCriteria: { ...this.defaultConfig.prioritizationCriteria, ...config.prioritizationCriteria },
      compatibilityRules: config.compatibilityRules || this.defaultConfig.compatibilityRules,
      security: { ...this.defaultConfig.security, ...config.security }
    };
  }

  private async validateGitHubToken(token: string, repository: string): Promise<boolean> {
    try {
      // Extract owner/repo from URL
      const repoMatch = repository.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (!repoMatch) return false;
      
      const [, owner, repo] = repoMatch;
      
      // Make a test API call to validate token
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Analysis-Tool'
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Export configuration for backup
   */
  async exportConfiguration(): Promise<string> {
    try {
      const config = await this.loadConfiguration();
      return JSON.stringify(config, null, 2);
    } catch (error) {
      throw new Error(`Failed to export configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import configuration from backup
   */
  async importConfiguration(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as AnalysisConfiguration;
      const mergedConfig = this.mergeWithDefaults(config);
      await this.saveConfiguration(mergedConfig);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration(): Promise<void> {
    try {
      await this.saveConfiguration(this.defaultConfig);
    } catch (error) {
      throw new Error(`Failed to reset configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}