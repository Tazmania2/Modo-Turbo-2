import { AnalysisConfigService } from '../analysis-config.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('AnalysisConfigService', () => {
  let service: AnalysisConfigService;
  const mockConfigPath = '.kiro/analysis/config.json';
  const mockCredentialsPath = '.kiro/analysis/credentials.json';

  beforeEach(() => {
    service = new AnalysisConfigService();
    jest.clearAllMocks();
  });

  describe('loadConfiguration', () => {
    it('should load existing configuration', async () => {
      const mockConfig = {
        repositories: {
          essencia: { url: 'test-url', branch: 'main' },
          fnpRanking: { url: 'test-url-2', branch: 'main' },
          current: { url: '.', branch: 'main' }
        },
        analysisRules: [],
        prioritizationCriteria: {
          businessValue: { high: [], medium: [], low: [] },
          technicalComplexity: { high: [], medium: [], low: [] },
          riskLevel: { high: [], medium: [], low: [] }
        },
        compatibilityRules: [],
        security: {
          tokenStorage: 'file' as const,
          encryptTokens: false,
          tokenExpirationDays: 90,
          allowedRepositories: [],
          requireTwoFactor: false
        }
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await service.loadConfiguration();

      expect(result).toEqual(expect.objectContaining({
        repositories: expect.objectContaining({
          essencia: expect.objectContaining({ url: 'test-url' }),
          fnpRanking: expect.objectContaining({ url: 'test-url-2' }),
          current: expect.objectContaining({ url: '.' })
        })
      }));
    });

    it('should create default configuration if none exists', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await service.loadConfiguration();

      expect(result).toEqual(expect.objectContaining({
        repositories: expect.any(Object),
        analysisRules: expect.any(Array),
        prioritizationCriteria: expect.any(Object),
        compatibilityRules: expect.any(Array),
        security: expect.any(Object)
      }));

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('saveConfiguration', () => {
    it('should save configuration to file', async () => {
      const mockConfig = {
        repositories: {
          essencia: { url: 'test-url', branch: 'main' },
          fnpRanking: { url: 'test-url-2', branch: 'main' },
          current: { url: '.', branch: 'main' }
        },
        analysisRules: [],
        prioritizationCriteria: {
          businessValue: { high: [], medium: [], low: [] },
          technicalComplexity: { high: [], medium: [], low: [] },
          riskLevel: { high: [], medium: [], low: [] }
        },
        compatibilityRules: [],
        security: {
          tokenStorage: 'file' as const,
          encryptTokens: false,
          tokenExpirationDays: 90,
          allowedRepositories: [],
          requireTwoFactor: false
        }
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await service.saveConfiguration(mockConfig);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        JSON.stringify(mockConfig, null, 2),
        'utf-8'
      );
    });
  });

  describe('setRepositoryCredentials', () => {
    it('should add new credentials', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      await service.setRepositoryCredentials(
        'https://github.com/test/repo.git',
        'test-token',
        'github',
        ['repo'],
        90
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('credentials.json'),
        expect.stringContaining('test-token'),
        'utf-8'
      );

      expect(mockFs.chmod).toHaveBeenCalledWith(
        expect.stringContaining('credentials.json'),
        0o600
      );
    });

    it('should update existing credentials', async () => {
      const existingCredentials = [{
        repository: 'https://github.com/test/repo.git',
        accessToken: 'old-token',
        tokenType: 'github' as const,
        scopes: ['repo']
      }];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingCredentials));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      await service.setRepositoryCredentials(
        'https://github.com/test/repo.git',
        'new-token',
        'github',
        ['repo'],
        90
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('credentials.json'),
        expect.stringContaining('new-token'),
        'utf-8'
      );
    });
  });

  describe('getRepositoryCredentials', () => {
    it('should return credentials for existing repository', async () => {
      const credentials = [{
        repository: 'https://github.com/test/repo.git',
        accessToken: 'test-token',
        tokenType: 'github' as const,
        scopes: ['repo']
      }];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(credentials));

      const result = await service.getRepositoryCredentials('https://github.com/test/repo.git');

      expect(result).toEqual(expect.objectContaining({
        repository: 'https://github.com/test/repo.git',
        accessToken: 'test-token',
        tokenType: 'github'
      }));
    });

    it('should return null for non-existing repository', async () => {
      const credentials = [{
        repository: 'https://github.com/other/repo.git',
        accessToken: 'test-token',
        tokenType: 'github' as const,
        scopes: ['repo']
      }];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(credentials));

      const result = await service.getRepositoryCredentials('https://github.com/test/repo.git');

      expect(result).toBeNull();
    });

    it('should filter out expired credentials', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const credentials = [{
        repository: 'https://github.com/test/repo.git',
        accessToken: 'test-token',
        tokenType: 'github' as const,
        scopes: ['repo'],
        expiresAt: expiredDate
      }];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(credentials));

      const result = await service.loadCredentials();

      expect(result).toEqual([]);
    });
  });

  describe('validateRepositoryAccess', () => {
    it('should return false for non-existing credentials', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await service.validateRepositoryAccess('https://github.com/test/repo.git');

      expect(result).toBe(false);
    });

    it('should return false for expired credentials', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const credentials = [{
        repository: 'https://github.com/test/repo.git',
        accessToken: 'test-token',
        tokenType: 'github' as const,
        scopes: ['repo'],
        expiresAt: expiredDate
      }];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(credentials));

      const result = await service.validateRepositoryAccess('https://github.com/test/repo.git');

      expect(result).toBe(false);
    });
  });

  describe('updateRepositoryConfig', () => {
    it('should update specific repository configuration', async () => {
      const mockConfig = {
        repositories: {
          essencia: { url: 'old-url', branch: 'main' },
          fnpRanking: { url: 'test-url-2', branch: 'main' },
          current: { url: '.', branch: 'main' }
        },
        analysisRules: [],
        prioritizationCriteria: {
          businessValue: { high: [], medium: [], low: [] },
          technicalComplexity: { high: [], medium: [], low: [] },
          riskLevel: { high: [], medium: [], low: [] }
        },
        compatibilityRules: [],
        security: {
          tokenStorage: 'file' as const,
          encryptTokens: false,
          tokenExpirationDays: 90,
          allowedRepositories: [],
          requireTwoFactor: false
        }
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await service.updateRepositoryConfig('essencia', {
        url: 'new-url',
        branch: 'develop'
      });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.stringContaining('new-url'),
        'utf-8'
      );
    });
  });
});