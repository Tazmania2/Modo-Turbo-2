/**
 * AdminOperationsService - Service for admin operations through Funifier APIs
 * 
 * This service provides:
 * - User management operations
 * - System configuration operations
 * - Batch operations for multiple users
 * - Quick actions for common admin tasks
 */

import { getFunifierDirectService } from './funifier-direct.service';
import { ErrorHandlerService, ErrorContext } from './error-handler.service';
import {
  QuickAction,
  ActionResult,
  UserProfile,
} from '@/types/funifier-api-responses';

export interface UserManagementOperation {
  userId: string;
  operation: 'update' | 'reset' | 'delete' | 'activate' | 'deactivate';
  data?: Record<string, unknown>;
}

export interface BatchOperationResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    userId: string;
    success: boolean;
    message: string;
  }>;
}

export interface SystemConfigUpdate {
  key: string;
  value: unknown;
  category?: string;
}

/**
 * AdminOperationsService - Handles all admin operations
 */
export class AdminOperationsService {
  private funifierService = getFunifierDirectService();

  // ============================================================================
  // Quick Actions
  // ============================================================================

  /**
   * Execute a quick action
   */
  async executeQuickAction(
    actionType: string,
    targetUserId?: string,
    parameters?: Record<string, unknown>
  ): Promise<ActionResult> {
    const errorContext: ErrorContext = {
      operation: 'executeQuickAction',
      actionType,
      targetUserId,
    };

    try {
      const action: QuickAction = {
        type: actionType,
        targetUserId,
        parameters,
      };

      const result = await ErrorHandlerService.withRetry(
        () => this.funifierService.executeQuickAction(action),
        {},
        errorContext
      );

      return {
        success: true,
        message: `Quick action '${actionType}' executed successfully`,
        data: result.data,
        timestamp: Date.now(),
      };
    } catch (error) {
      ErrorHandlerService.logError(error as any, errorContext);
      
      return {
        success: false,
        message: `Failed to execute quick action: ${(error as Error).message}`,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Refresh system status
   */
  async refreshSystemStatus(): Promise<ActionResult> {
    try {
      const healthCheck = await this.funifierService.healthCheck();
      
      return {
        success: healthCheck.status === 'ok',
        message: healthCheck.status === 'ok' 
          ? 'System status refreshed successfully' 
          : 'System health check failed',
        data: healthCheck,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to refresh system status: ${(error as Error).message}`,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<ActionResult> {
    try {
      this.funifierService.clearAllCaches();
      
      return {
        success: true,
        message: 'All caches cleared successfully',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear caches: ${(error as Error).message}`,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Sync configuration with Funifier
   */
  async syncConfiguration(): Promise<ActionResult> {
    try {
      // Invalidate white label cache to force fresh fetch
      const instanceId = this.funifierService.getInstanceId();
      this.funifierService.clearAllCaches();
      
      // Fetch fresh configuration
      const config = await this.funifierService.getWhiteLabelConfig();
      
      return {
        success: true,
        message: 'Configuration synced successfully',
        data: config,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync configuration: ${(error as Error).message}`,
        timestamp: Date.now(),
      };
    }
  }

  // ============================================================================
  // User Management Operations
  // ============================================================================

  /**
   * Update user data
   */
  async updateUser(userId: string, updates: Record<string, unknown>): Promise<ActionResult> {
    const errorContext: ErrorContext = {
      operation: 'updateUser',
      userId,
    };

    try {
      const result = await ErrorHandlerService.withRetry(
        () => this.funifierService.adminUpdateUser(userId, updates),
        {},
        errorContext
      );

      return {
        success: true,
        message: `User ${userId} updated successfully`,
        data: result.data,
        timestamp: Date.now(),
      };
    } catch (error) {
      ErrorHandlerService.logError(error as any, errorContext);
      
      return {
        success: false,
        message: `Failed to update user: ${(error as Error).message}`,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Reset user progress
   */
  async resetUserProgress(userId: string): Promise<ActionResult> {
    return this.executeQuickAction('reset_progress', userId);
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string): Promise<ActionResult> {
    return this.updateUser(userId, { active: true });
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<ActionResult> {
    return this.updateUser(userId, { active: false });
  }

  /**
   * Award points to user
   */
  async awardPoints(
    userId: string,
    points: number,
    category?: string,
    reason?: string
  ): Promise<ActionResult> {
    return this.executeQuickAction('award_points', userId, {
      points,
      category: category || 'default',
      reason: reason || 'Admin award',
    });
  }

  /**
   * Remove points from user
   */
  async removePoints(
    userId: string,
    points: number,
    category?: string,
    reason?: string
  ): Promise<ActionResult> {
    return this.executeQuickAction('remove_points', userId, {
      points,
      category: category || 'default',
      reason: reason || 'Admin removal',
    });
  }

  /**
   * Grant achievement to user
   */
  async grantAchievement(
    userId: string,
    achievementId: string,
    reason?: string
  ): Promise<ActionResult> {
    return this.executeQuickAction('grant_achievement', userId, {
      achievementId,
      reason: reason || 'Admin grant',
    });
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Execute batch operation on multiple users
   */
  async executeBatchOperation(
    operations: UserManagementOperation[]
  ): Promise<BatchOperationResult> {
    const results: Array<{
      userId: string;
      success: boolean;
      message: string;
    }> = [];

    let successCount = 0;
    let failureCount = 0;

    for (const operation of operations) {
      try {
        let result: ActionResult;

        switch (operation.operation) {
          case 'update':
            result = await this.updateUser(operation.userId, operation.data || {});
            break;
          case 'reset':
            result = await this.resetUserProgress(operation.userId);
            break;
          case 'activate':
            result = await this.activateUser(operation.userId);
            break;
          case 'deactivate':
            result = await this.deactivateUser(operation.userId);
            break;
          default:
            result = {
              success: false,
              message: `Unknown operation: ${operation.operation}`,
              timestamp: Date.now(),
            };
        }

        results.push({
          userId: operation.userId,
          success: result.success,
          message: result.message,
        });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        results.push({
          userId: operation.userId,
          success: false,
          message: (error as Error).message,
        });
        failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      totalProcessed: operations.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Bulk update users with same data
   */
  async bulkUpdateUsers(
    userIds: string[],
    updates: Record<string, unknown>
  ): Promise<BatchOperationResult> {
    const operations: UserManagementOperation[] = userIds.map(userId => ({
      userId,
      operation: 'update',
      data: updates,
    }));

    return this.executeBatchOperation(operations);
  }

  /**
   * Bulk award points to users
   */
  async bulkAwardPoints(
    userIds: string[],
    points: number,
    category?: string,
    reason?: string
  ): Promise<BatchOperationResult> {
    const results: Array<{
      userId: string;
      success: boolean;
      message: string;
    }> = [];

    let successCount = 0;
    let failureCount = 0;

    for (const userId of userIds) {
      const result = await this.awardPoints(userId, points, category, reason);
      
      results.push({
        userId,
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      totalProcessed: userIds.length,
      successCount,
      failureCount,
      results,
    };
  }

  // ============================================================================
  // System Configuration Operations
  // ============================================================================

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<Record<string, unknown>> {
    try {
      // For now, return white label config as system config
      const config = await this.funifierService.getWhiteLabelConfig();
      return config as unknown as Record<string, unknown>;
    } catch (error) {
      ErrorHandlerService.logError(error as any, {
        operation: 'getSystemConfig',
      });
      throw error;
    }
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(updates: SystemConfigUpdate[]): Promise<ActionResult> {
    try {
      // Get current config
      const currentConfig = await this.funifierService.getWhiteLabelConfig();
      
      // Apply updates
      const updatedConfig = { ...currentConfig };
      
      for (const update of updates) {
        if (update.category) {
          // Update nested property
          if (!updatedConfig[update.category as keyof typeof updatedConfig]) {
            (updatedConfig as any)[update.category] = {};
          }
          (updatedConfig as any)[update.category][update.key] = update.value;
        } else {
          // Update top-level property
          (updatedConfig as any)[update.key] = update.value;
        }
      }
      
      // Save updated config
      await this.funifierService.saveWhiteLabelConfig(updatedConfig);
      
      return {
        success: true,
        message: 'System configuration updated successfully',
        data: updatedConfig,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update system configuration: ${(error as Error).message}`,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Toggle feature
   */
  async toggleFeature(featureName: string, enabled: boolean): Promise<ActionResult> {
    return this.updateSystemConfig([
      {
        key: featureName,
        value: enabled,
        category: 'features',
      },
    ]);
  }

  // ============================================================================
  // User Search and Listing
  // ============================================================================

  /**
   * Search users (placeholder - would need proper Funifier endpoint)
   */
  async searchUsers(query: string): Promise<UserProfile[]> {
    // This would need a proper search endpoint in Funifier
    // For now, return empty array
    console.warn('User search not yet implemented - needs Funifier search endpoint');
    return [];
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<UserProfile> {
    return this.funifierService.getUserProfile(userId);
  }

  // ============================================================================
  // Analytics and Reporting
  // ============================================================================

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.funifierService.getCacheStats();
  }

  /**
   * Get cache health metrics
   */
  getCacheHealth() {
    return this.funifierService.getCacheHealth();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let adminOperationsServiceInstance: AdminOperationsService | null = null;

/**
 * Get or create singleton instance of AdminOperationsService
 */
export function getAdminOperationsService(): AdminOperationsService {
  if (!adminOperationsServiceInstance) {
    adminOperationsServiceInstance = new AdminOperationsService();
  }
  
  return adminOperationsServiceInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetAdminOperationsService(): void {
  adminOperationsServiceInstance = null;
}

// Export singleton instance
export const adminOperationsService = getAdminOperationsService();
