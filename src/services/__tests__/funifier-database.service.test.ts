import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FunifierDatabaseService } from '../funifier-database.service';
import { funifierApiClient } from '../funifier-api-client';

// Mock the API client
vi.mock('../funifier-api-client', () => ({
  funifierApiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FunifierDatabaseService', () => {
  let databaseService: FunifierDatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    databaseService = FunifierDatabaseService.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FunifierDatabaseService.getInstance();
      const instance2 = FunifierDatabaseService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createCollection', () => {
    it('should create a new collection', async () => {
      vi.mocked(funifierApiClient.post).mockResolvedValue({});

      await databaseService.createCollection('test_collection');

      expect(funifierApiClient.post).toHaveBeenCalledWith('/database/test_collection/create');
    });
  });

  describe('collectionExists', () => {
    it('should return true if collection exists', async () => {
      vi.mocked(funifierApiClient.get).mockResolvedValue({ name: 'test_collection' });

      const exists = await databaseService.collectionExists('test_collection');

      expect(exists).toBe(true);
      expect(funifierApiClient.get).toHaveBeenCalledWith('/database/test_collection/info');
    });

    it('should return false if collection does not exist', async () => {
      vi.mocked(funifierApiClient.get).mockRejectedValue(new Error('Not found'));

      const exists = await databaseService.collectionExists('nonexistent_collection');

      expect(exists).toBe(false);
    });
  });

  describe('insertOne', () => {
    it('should insert a single document', async () => {
      const document = { name: 'Test Document', value: 123 };
      const mockResult = { _id: 'doc123', acknowledged: true };

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockResult);

      const result = await databaseService.insertOne('test_collection', document);

      expect(funifierApiClient.post).toHaveBeenCalledWith('/database/test_collection', document);
      expect(result).toEqual(mockResult);
    });
  });

  describe('find', () => {
    it('should find documents with query', async () => {
      const query = { filter: { name: 'Test' }, limit: 10 };
      const mockResults = [
        { _id: 'doc1', name: 'Test 1', time: 123456789 },
        { _id: 'doc2', name: 'Test 2', time: 123456790 },
      ];

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockResults);

      const results = await databaseService.find('test_collection', query);

      expect(funifierApiClient.post).toHaveBeenCalledWith('/database/test_collection/find', query);
      expect(results).toEqual(mockResults);
    });

    it('should find documents with empty query', async () => {
      const mockResults = [{ _id: 'doc1', name: 'Test', time: 123456789 }];

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockResults);

      const results = await databaseService.find('test_collection');

      expect(funifierApiClient.post).toHaveBeenCalledWith('/database/test_collection/find', {});
      expect(results).toEqual(mockResults);
    });
  });

  describe('findById', () => {
    it('should find document by ID', async () => {
      const mockDocument = { _id: 'doc123', name: 'Test Document', time: 123456789 };

      vi.mocked(funifierApiClient.get).mockResolvedValue(mockDocument);

      const result = await databaseService.findById('test_collection', 'doc123');

      expect(funifierApiClient.get).toHaveBeenCalledWith('/database/test_collection/doc123');
      expect(result).toEqual(mockDocument);
    });

    it('should return null if document not found', async () => {
      vi.mocked(funifierApiClient.get).mockRejectedValue({
        type: 'FUNIFIER_API_ERROR',
        message: 'Not found',
      });

      const result = await databaseService.findById('test_collection', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateById', () => {
    it('should update document by ID', async () => {
      const update = { name: 'Updated Name' };
      const mockResult = { matchedCount: 1, modifiedCount: 1, acknowledged: true };

      vi.mocked(funifierApiClient.put).mockResolvedValue(mockResult);

      const result = await databaseService.updateById('test_collection', 'doc123', update);

      expect(funifierApiClient.put).toHaveBeenCalledWith('/database/test_collection/doc123', update);
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteById', () => {
    it('should delete document by ID', async () => {
      const mockResult = { deletedCount: 1, acknowledged: true };

      vi.mocked(funifierApiClient.delete).mockResolvedValue(mockResult);

      const result = await databaseService.deleteById('test_collection', 'doc123');

      expect(funifierApiClient.delete).toHaveBeenCalledWith('/database/test_collection/doc123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('aggregate', () => {
    it('should perform aggregation query', async () => {
      const pipeline = [
        { $match: { status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ];
      const mockResults = [
        { _id: 'category1', count: 5 },
        { _id: 'category2', count: 3 },
      ];

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockResults);

      const results = await databaseService.aggregate('test_collection', pipeline);

      expect(funifierApiClient.post).toHaveBeenCalledWith(
        '/database/test_collection/aggregate',
        { pipeline }
      );
      expect(results).toEqual(mockResults);
    });
  });

  describe('count', () => {
    it('should count documents with filter', async () => {
      const filter = { status: 'active' };
      const mockResult = { count: 42 };

      vi.mocked(funifierApiClient.post).mockResolvedValue(mockResult);

      const count = await databaseService.count('test_collection', filter);

      expect(funifierApiClient.post).toHaveBeenCalledWith(
        '/database/test_collection/count',
        { filter }
      );
      expect(count).toBe(42);
    });
  });
});