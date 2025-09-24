import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WhiteLabelConfigService } from '../white-label-config.service';
import { funifierDatabaseService } from '../funifier-database.service';
import { whiteLabelConfigCache } from '@/utils/cache';
import { WhiteLabelConfiguration, SetupRequest } from '@/types/funifier';

// Mock the dependencies
vi.mock('../funifier-database.service');
vi.mock('@/utils/cache');
vi.mock('@/utils/encryption', () => ({
  encrypt: vi.fn((data: string) => `encrypted_${data}`),
  decrypt: vi.fn((data: string) => data.replace('encrypted_', '')),
  hash: vi.fn((data: string) => `hash_${data}`),
  generateSecureToken: vi.fn(() => 'test-token-123'),
}));

describe('WhiteLabelConfigService', () => {
  let service: WhiteLabelConfigService;
  const mockInstanceId = 'test-instance-123';
  const mockUserId = 'test-user-456';

  const mockConfiguration: WhiteLabelConfiguration = {
    instanceId: mockInstanceId,
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      accentColor: '#10B981',
      logo: 'https://example.com/logo.png',
      favicon: 'https://example.com/favicon.ico',
      companyName: 'Test Company',
      tagline: 'Test Tagline'
    },
    features: {
      ranking: true,
      dashboards: {
        carteira_i: true,
        carteira_ii: false,
        carteira_iii: true,
        carteira_iv: false
      },
      history: true,
      personalizedRanking: true
    },
    funifierIntegration: {
      apiKey: 'test-api-key',
      serverUrl: 'https://test.funifier.com',
      authToken: 'test-auth-token',
      customCollections: ['whitelabel__c']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  beforeEach(() => {
    service = WhiteLabelConfigService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeCollection', () => {
    it('should create collection if it does not exist', async () => {
      vi.mocked(funifierDatabaseService.collectionExists).mockResolvedValue(false);
      vi.mocked(funifierDatabaseService.createCollection).mockResolvedValue(undefined);
      vi.mocked(funifierDatabaseService.createIndex).mockResolvedValue(undefined);

      await service.initializeCollection();

      expect(funifierDatabaseService.collectionExists).toHaveBeenCalledWith('whitelabel__c');
      expect(funifierDatabaseService.createCollection).toHaveBeenCalledWith('whitelabel__c');
      expect(funifierDatabaseService.createIndex).toHaveBeenCalledWith(
        'whitelabel__c',
        { instanceId: 1 },
        { unique: true }
      );
    });

    it('should not create collection if it already exists', async () => {
      vi.mocked(funifierDatabaseService.collectionExists).mockResolvedValue(true);

      await service.initializeCollection();

      expect(funifierDatabaseService.collectionExists).toHaveBeenCalledWith('whitelabel__c');
      expect(funifierDatabaseService.createCollection).not.toHaveBeenCalled();
      expect(funifierDatabaseService.createIndex).not.toHaveBeenCalled();
    });

    it('should throw error if collection creation fails', async () => {
      vi.mocked(funifierDatabaseService.collectionExists).mockResolvedValue(false);
      vi.mocked(funifierDatabaseService.createCollection).mockRejectedValue(new Error('Creation failed'));

      await expect(service.initializeCollection()).rejects.toThrow('Failed to initialize white-label collection');
    });
  });

  describe('saveConfiguration', () => {
    it('should save new configuration successfully', async () => {
      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(null);
      vi.mocked(funifierDatabaseService.insertOne).mockResolvedValue({
        _id: 'new-config-id',
        acknowledged: true
      });
      vi.mocked(whiteLabelConfigCache.setConfiguration).mockReturnValue(undefined);

      const result = await service.saveConfiguration(mockInstanceId, mockConfiguration, mockUserId);

      expect(result.success).toBe(true);
      expect(result.configuration).toBeDefined();
      expect(result.errors).toBeUndefined();
      expect(funifierDatabaseService.insertOne).toHaveBeenCalled();
      expect(whiteLabelConfigCache.setConfiguration).toHaveBeenCalledWith(mockInstanceId, expect.any(Object));
    });

    it('should update existing configuration successfully', async () => {
      const existingRecord = {
        _id: 'existing-config-id',
        instanceId: mockInstanceId,
        config: mockConfiguration,
        isActive: true,
        createdBy: 'old-user',
        lastModifiedBy: 'old-user',
        time: Date.now()
      };

      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(existingRecord);
      vi.mocked(funifierDatabaseService.updateById).mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true
      });
      vi.mocked(whiteLabelConfigCache.setConfiguration).mockReturnValue(undefined);

      const result = await service.saveConfiguration(mockInstanceId, mockConfiguration, mockUserId);

      expect(result.success).toBe(true);
      expect(result.configuration).toBeDefined();
      expect(funifierDatabaseService.updateById).toHaveBeenCalledWith(
        'whitelabel__c',
        'existing-config-id',
        expect.any(Object)
      );
    });

    it('should return validation errors for invalid configuration', async () => {
      const invalidConfig = {
        ...mockConfiguration,
        branding: {
          ...mockConfiguration.branding,
          primaryColor: 'invalid-color', // Invalid hex color
          companyName: '' // Empty company name
        }
      };

      const result = await service.saveConfiguration(mockInstanceId, invalidConfig, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(funifierDatabaseService.insertOne).not.toHaveBeenCalled();
    });

    it('should handle database save failure', async () => {
      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(null);
      vi.mocked(funifierDatabaseService.insertOne).mockResolvedValue({
        _id: 'new-config-id',
        acknowledged: false // Simulate failure
      });

      const result = await service.saveConfiguration(mockInstanceId, mockConfiguration, mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to save configuration to database');
    });
  });

  describe('getConfiguration', () => {
    it('should return cached configuration if available', async () => {
      vi.mocked(whiteLabelConfigCache.getConfiguration).mockReturnValue(mockConfiguration);

      const result = await service.getConfiguration(mockInstanceId);

      expect(result).toEqual(mockConfiguration);
      expect(whiteLabelConfigCache.getConfiguration).toHaveBeenCalledWith(mockInstanceId);
      expect(funifierDatabaseService.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      const dbRecord = {
        _id: 'config-id',
        instanceId: mockInstanceId,
        config: mockConfiguration,
        isActive: true,
        createdBy: mockUserId,
        lastModifiedBy: mockUserId,
        time: Date.now()
      };

      vi.mocked(whiteLabelConfigCache.getConfiguration).mockReturnValue(null);
      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(dbRecord);
      vi.mocked(whiteLabelConfigCache.setConfiguration).mockReturnValue(undefined);

      const result = await service.getConfiguration(mockInstanceId);

      expect(result).toBeDefined();
      expect(funifierDatabaseService.findOne).toHaveBeenCalledWith(
        'whitelabel__c',
        { filter: { instanceId: mockInstanceId, isActive: true } }
      );
      expect(whiteLabelConfigCache.setConfiguration).toHaveBeenCalled();
    });

    it('should return null if configuration not found', async () => {
      vi.mocked(whiteLabelConfigCache.getConfiguration).mockReturnValue(null);
      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(null);

      const result = await service.getConfiguration(mockInstanceId);

      expect(result).toBeNull();
    });

    it('should return null if configuration is inactive', async () => {
      const inactiveRecord = {
        _id: 'config-id',
        instanceId: mockInstanceId,
        config: mockConfiguration,
        isActive: false, // Inactive
        createdBy: mockUserId,
        lastModifiedBy: mockUserId,
        time: Date.now()
      };

      vi.mocked(whiteLabelConfigCache.getConfiguration).mockReturnValue(null);
      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(inactiveRecord);

      const result = await service.getConfiguration(mockInstanceId);

      expect(result).toBeNull();
    });
  });

  describe('getConfigurationResponse', () => {
    it('should return configuration response without sensitive data', async () => {
      vi.mocked(whiteLabelConfigCache.getConfiguration).mockReturnValue(mockConfiguration);

      const result = await service.getConfigurationResponse(mockInstanceId);

      expect(result).toBeDefined();
      expect(result!.instanceId).toBe(mockInstanceId);
      expect(result!.branding).toEqual(mockConfiguration.branding);
      expect(result!.features).toEqual(mockConfiguration.features);
      expect(result!.funifierConfig.isConfigured).toBe(true);
      expect(result!.funifierConfig.serverUrl).toBe(mockConfiguration.funifierIntegration.serverUrl);
      // Should not contain sensitive data
      expect((result as any).funifierIntegration).toBeUndefined();
    });

    it('should return null if configuration not found', async () => {
      vi.mocked(whiteLabelConfigCache.getConfiguration).mockReturnValue(null);
      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(null);

      const result = await service.getConfigurationResponse(mockInstanceId);

      expect(result).toBeNull();
    });
  });

  describe('handleSetup', () => {
    it('should handle demo mode setup successfully', async () => {
      const setupRequest: SetupRequest = {
        mode: 'demo'
      };

      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(null);
      vi.mocked(funifierDatabaseService.insertOne).mockResolvedValue({
        _id: 'new-config-id',
        acknowledged: true
      });

      const result = await service.handleSetup(setupRequest, mockInstanceId);

      expect(result.success).toBe(true);
      expect(result.instanceId).toBe(mockInstanceId);
      expect(result.redirectUrl).toContain('/dashboard');
    });

    it('should handle Funifier mode setup successfully', async () => {
      const setupRequest: SetupRequest = {
        mode: 'funifier',
        funifierCredentials: {
          apiKey: 'test-api-key',
          serverUrl: 'https://test.funifier.com',
          authToken: 'test-auth-token'
        }
      };

      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(null);
      vi.mocked(funifierDatabaseService.insertOne).mockResolvedValue({
        _id: 'new-config-id',
        acknowledged: true
      });

      const result = await service.handleSetup(setupRequest, mockInstanceId);

      expect(result.success).toBe(true);
      expect(result.instanceId).toBe(mockInstanceId);
      expect(result.redirectUrl).toContain('/admin/login');
    });

    it('should return validation errors for invalid setup request', async () => {
      const invalidSetupRequest: SetupRequest = {
        mode: 'invalid' as any
      };

      const result = await service.handleSetup(invalidSetupRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return error for Funifier mode without credentials', async () => {
      const setupRequest: SetupRequest = {
        mode: 'funifier'
        // Missing funifierCredentials
      };

      const result = await service.handleSetup(setupRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Funifier credentials are required when mode is "funifier"');
    });
  });

  describe('resetConfiguration', () => {
    it('should reset configuration to demo defaults', async () => {
      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(null);
      vi.mocked(funifierDatabaseService.insertOne).mockResolvedValue({
        _id: 'reset-config-id',
        acknowledged: true
      });
      vi.mocked(whiteLabelConfigCache.invalidateInstance).mockReturnValue(undefined);

      const result = await service.resetConfiguration(mockInstanceId, mockUserId);

      expect(result.success).toBe(true);
      expect(result.configuration).toBeDefined();
      expect(result.configuration!.branding.companyName).toBe('Demo Company');
      expect(whiteLabelConfigCache.invalidateInstance).toHaveBeenCalledWith(mockInstanceId);
    });
  });

  describe('deleteConfiguration', () => {
    it('should delete configuration successfully', async () => {
      const existingRecord = {
        _id: 'config-to-delete',
        instanceId: mockInstanceId,
        config: mockConfiguration,
        isActive: true,
        createdBy: mockUserId,
        lastModifiedBy: mockUserId,
        time: Date.now()
      };

      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(existingRecord);
      vi.mocked(funifierDatabaseService.deleteById).mockResolvedValue({
        deletedCount: 1,
        acknowledged: true
      });
      vi.mocked(whiteLabelConfigCache.invalidateInstance).mockReturnValue(undefined);

      const result = await service.deleteConfiguration(mockInstanceId);

      expect(result).toBe(true);
      expect(funifierDatabaseService.deleteById).toHaveBeenCalledWith('whitelabel__c', 'config-to-delete');
      expect(whiteLabelConfigCache.invalidateInstance).toHaveBeenCalledWith(mockInstanceId);
    });

    it('should return false if configuration not found', async () => {
      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(null);

      const result = await service.deleteConfiguration(mockInstanceId);

      expect(result).toBe(false);
      expect(funifierDatabaseService.deleteById).not.toHaveBeenCalled();
    });

    it('should return false if deletion fails', async () => {
      const existingRecord = {
        _id: 'config-to-delete',
        instanceId: mockInstanceId,
        config: mockConfiguration,
        isActive: true,
        createdBy: mockUserId,
        lastModifiedBy: mockUserId,
        time: Date.now()
      };

      vi.mocked(funifierDatabaseService.findOne).mockResolvedValue(existingRecord);
      vi.mocked(funifierDatabaseService.deleteById).mockResolvedValue({
        deletedCount: 0, // No records deleted
        acknowledged: true
      });

      const result = await service.deleteConfiguration(mockInstanceId);

      expect(result).toBe(false);
    });
  });

  describe('validateConfiguration', () => {
    it('should return valid result for correct configuration', () => {
      const result = service.validateConfiguration(mockConfiguration);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid configuration', () => {
      const invalidConfig = {
        ...mockConfiguration,
        instanceId: '', // Empty instance ID
        branding: {
          ...mockConfiguration.branding,
          primaryColor: 'invalid-color',
          companyName: ''
        }
      };

      const result = service.validateConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('listConfigurations', () => {
    it('should return list of configurations', async () => {
      const mockRecords = [
        {
          _id: 'config-1',
          instanceId: 'instance-1',
          config: mockConfiguration,
          isActive: true,
          createdBy: 'user-1',
          lastModifiedBy: 'user-1',
          time: Date.now()
        },
        {
          _id: 'config-2',
          instanceId: 'instance-2',
          config: { ...mockConfiguration, instanceId: 'instance-2' },
          isActive: true,
          createdBy: 'user-2',
          lastModifiedBy: 'user-2',
          time: Date.now()
        }
      ];

      vi.mocked(funifierDatabaseService.find).mockResolvedValue(mockRecords);

      const result = await service.listConfigurations();

      expect(result).toHaveLength(2);
      expect(result[0].instanceId).toBe('instance-1');
      expect(result[1].instanceId).toBe('instance-2');
      expect(funifierDatabaseService.find).toHaveBeenCalledWith(
        'whitelabel__c',
        { filter: { isActive: true } }
      );
    });

    it('should return empty array if no configurations found', async () => {
      vi.mocked(funifierDatabaseService.find).mockResolvedValue([]);

      const result = await service.listConfigurations();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(funifierDatabaseService.find).mockRejectedValue(new Error('Database error'));

      const result = await service.listConfigurations();

      expect(result).toHaveLength(0);
    });
  });
});