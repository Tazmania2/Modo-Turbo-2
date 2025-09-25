import { FunifierDatabaseRecord } from '@/types/funifier';
import { funifierApiClient } from './funifier-api-client';

export interface DatabaseQuery {
  filter?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

export interface AggregateQuery {
  pipeline: Record<string, unknown>[];
}

export interface DatabaseInsertResult {
  _id: string;
  acknowledged: boolean;
}

export interface DatabaseUpdateResult {
  matchedCount: number;
  modifiedCount: number;
  acknowledged: boolean;
}

export interface DatabaseDeleteResult {
  deletedCount: number;
  acknowledged: boolean;
}

export class FunifierDatabaseService {
  private static instance: FunifierDatabaseService;

  private constructor() {}

  static getInstance(): FunifierDatabaseService {
    if (!FunifierDatabaseService.instance) {
      FunifierDatabaseService.instance = new FunifierDatabaseService();
    }
    return FunifierDatabaseService.instance;
  }

  /**
   * Create a new collection
   */
  async createCollection(collectionName: string): Promise<void> {
    try {
      await funifierApiClient.post(`/database/${collectionName}/create`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    try {
      await funifierApiClient.get(`/database/${collectionName}/info`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Insert a single document into collection
   */
  async insertOne<T extends Record<string, unknown>>(
    collectionName: string,
    document: T
  ): Promise<DatabaseInsertResult> {
    try {
      const result = await funifierApiClient.post<DatabaseInsertResult>(
        `/database/${collectionName}`,
        document
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Insert multiple documents into collection
   */
  async insertMany<T extends Record<string, unknown>>(
    collectionName: string,
    documents: T[]
  ): Promise<DatabaseInsertResult[]> {
    try {
      const result = await funifierApiClient.post<DatabaseInsertResult[]>(
        `/database/${collectionName}/many`,
        { documents }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find documents in collection
   */
  async find<T extends FunifierDatabaseRecord>(
    collectionName: string,
    query: DatabaseQuery = {}
  ): Promise<T[]> {
    try {
      const result = await funifierApiClient.post<T[]>(
        `/database/${collectionName}/find`,
        query
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find a single document by ID
   */
  async findById<T extends FunifierDatabaseRecord>(
    collectionName: string,
    id: string
  ): Promise<T | null> {
    try {
      const result = await funifierApiClient.get<T>(
        `/database/${collectionName}/${id}`
      );
      return result;
    } catch (error) {
      // Return null if document not found
      if (error && typeof error === 'object' && 'type' in error) {
        const apiError = error as { type: string };
        if (apiError.type === 'FUNIFIER_API_ERROR') {
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * Find one document matching query
   */
  async findOne<T extends FunifierDatabaseRecord>(
    collectionName: string,
    query: DatabaseQuery = {}
  ): Promise<T | null> {
    try {
      const results = await this.find<T>(collectionName, { ...query, limit: 1 });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a single document by ID
   */
  async updateById<T extends Record<string, unknown>>(
    collectionName: string,
    id: string,
    update: Partial<T>
  ): Promise<DatabaseUpdateResult> {
    try {
      const result = await funifierApiClient.put<DatabaseUpdateResult>(
        `/database/${collectionName}/${id}`,
        update
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update multiple documents matching query
   */
  async updateMany<T extends Record<string, unknown>>(
    collectionName: string,
    filter: Record<string, unknown>,
    update: Partial<T>
  ): Promise<DatabaseUpdateResult> {
    try {
      const result = await funifierApiClient.put<DatabaseUpdateResult>(
        `/database/${collectionName}/many`,
        { filter, update }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Replace a document by ID
   */
  async replaceById<T extends Record<string, unknown>>(
    collectionName: string,
    id: string,
    document: T
  ): Promise<DatabaseUpdateResult> {
    try {
      const result = await funifierApiClient.put<DatabaseUpdateResult>(
        `/database/${collectionName}/${id}/replace`,
        document
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a document by ID
   */
  async deleteById(collectionName: string, id: string): Promise<DatabaseDeleteResult> {
    try {
      const result = await funifierApiClient.delete<DatabaseDeleteResult>(
        `/database/${collectionName}/${id}`
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete multiple documents matching query
   */
  async deleteMany(
    collectionName: string,
    filter: Record<string, unknown>
  ): Promise<DatabaseDeleteResult> {
    try {
      const result = await funifierApiClient.delete<DatabaseDeleteResult>(
        `/database/${collectionName}/many`,
        { data: { filter } }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Perform aggregation query
   */
  async aggregate<T>(
    collectionName: string,
    pipeline: Record<string, unknown>[]
  ): Promise<T[]> {
    try {
      const result = await funifierApiClient.post<T[]>(
        `/database/${collectionName}/aggregate`,
        { pipeline }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Count documents matching query
   */
  async count(collectionName: string, filter: Record<string, unknown> = {}): Promise<number> {
    try {
      const result = await funifierApiClient.post<{ count: number }>(
        `/database/${collectionName}/count`,
        { filter }
      );
      return result.count;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName: string): Promise<Record<string, unknown>> {
    try {
      const result = await funifierApiClient.get<Record<string, unknown>>(
        `/database/${collectionName}/stats`
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Drop/delete a collection
   */
  async dropCollection(collectionName: string): Promise<void> {
    try {
      await funifierApiClient.delete(`/database/${collectionName}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    try {
      const result = await funifierApiClient.get<{ collections: string[] }>('/database');
      return result.collections;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create index on collection
   */
  async createIndex(
    collectionName: string,
    keys: Record<string, 1 | -1>,
    options?: Record<string, unknown>
  ): Promise<void> {
    try {
      await funifierApiClient.post(`/database/${collectionName}/index`, {
        keys,
        options,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upsert (update or insert) a document
   */
  async upsert<T extends Record<string, unknown>>(
    collectionName: string,
    filter: Record<string, unknown>,
    document: T
  ): Promise<DatabaseUpdateResult> {
    try {
      const result = await funifierApiClient.post<DatabaseUpdateResult>(
        `/database/${collectionName}/upsert`,
        { filter, document }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const funifierDatabaseService = FunifierDatabaseService.getInstance();