/**
 * Examples and utilities for using the enhanced error handling system
 * This file demonstrates best practices for error handling in the application
 */

import { ErrorHandlerService, ErrorContext, UserFriendlyError } from './error-handler.service';
import { FallbackService, FallbackOptions } from './fallback.service';
import { funifierApiClient } from './funifier-api-client';
import { ApiError } from './funifier-api-client';

/**
 * Example 1: Basic API call with retry and error handling
 */
export async function fetchUserDataWithRetry(userId: string): Promise<any> {
  const context: ErrorContext = {
    operation: 'fetchUserData',
    userId,
    endpoint: `/users/${userId}`,
  };

  try {
    return await ErrorHandlerService.withRetry(
      () => funifierApiClient.getUserProfile(userId),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitterEnabled: true,
      },
      context
    );
  } catch (error) {
    const apiError = error as ApiError;
    const userError = ErrorHandlerService.handleFunifierError(apiError, context);
    
    // Display user-friendly error
    console.error('User-friendly error:', userError.message);
    console.error('Suggestions:', userError.suggestions);
    
    throw error;
  }
}

/**
 * Example 2: API call with fallback to cached data
 */
export async function fetchDashboardWithFallback(
  userId: string,
  fallbackService: FallbackService
): Promise<any> {
  const options: FallbackOptions<any> = {
    cacheKey: `dashboard-${userId}`,
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    fallbackData: {
      // Minimal fallback data structure
      player: { _id: userId, name: 'User' },
      achievements: [],
      recentActivity: [],
    },
    errorContext: {
      operation: 'fetchDashboard',
      userId,
    },
    retryOnError: true,
    staleWhileRevalidate: true,
  };

  return fallbackService.getWithFallback(
    () => funifierApiClient.getUserDashboard(userId),
    options
  );
}

/**
 * Example 3: Circuit breaker pattern for critical operations
 */
export async function saveConfigurationWithCircuitBreaker(
  config: any
): Promise<void> {
  try {
    await ErrorHandlerService.withCircuitBreaker(
      () => funifierApiClient.saveWhiteLabelConfig(config),
      {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        onOpen: () => {
          console.warn('Circuit breaker opened - too many failures');
          // Notify user or trigger alert
        },
        onHalfOpen: () => {
          console.info('Circuit breaker half-open - testing recovery');
        },
        onClose: () => {
          console.info('Circuit breaker closed - service recovered');
        },
      }
    );
  } catch (error) {
    const apiError = error as ApiError;
    ErrorHandlerService.logError(apiError, {
      operation: 'saveConfiguration',
      additionalInfo: { configId: config.instanceId },
    });
    throw error;
  }
}

/**
 * Example 4: Batch operations with individual error handling
 */
export async function batchFetchUserData(
  userIds: string[],
  fallbackService: FallbackService
): Promise<Map<string, any>> {
  const fetchers = userIds.map((userId) => ({
    key: `user-${userId}`,
    fetcher: () => funifierApiClient.getUserProfile(userId),
    fallback: { _id: userId, name: 'Unknown User' },
  }));

  return fallbackService.batchGetWithFallback(fetchers, {
    cacheDuration: 10 * 60 * 1000, // 10 minutes
    parallel: true,
    errorContext: {
      operation: 'batchFetchUserData',
    },
  });
}

/**
 * Example 5: Timeout handling for slow operations
 */
export async function fetchWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  try {
    return await ErrorHandlerService.withTimeout(
      operation,
      timeoutMs,
      `Operation timed out after ${timeoutMs}ms`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      console.error('Operation timeout:', error.message);
      // Handle timeout specifically
    }
    throw error;
  }
}

/**
 * Example 6: Error pattern analysis for monitoring
 */
export function analyzeAndReportErrors(): void {
  const analysis = ErrorHandlerService.analyzeErrorPatterns();
  
  console.log('Error Analysis:', {
    total: analysis.totalErrors,
    recent: analysis.recentErrors,
    byType: analysis.errorsByType,
  });

  if (analysis.suggestions.length > 0) {
    console.warn('Error Pattern Suggestions:');
    analysis.suggestions.forEach((suggestion) => {
      console.warn(`- ${suggestion}`);
    });
  }

  // In production, send this to monitoring service
  // e.g., DataDog, New Relic, etc.
}

/**
 * Example 7: Format error for UI display
 */
export function displayErrorToUser(error: ApiError): {
  title: string;
  message: string;
  severity: string;
  suggestions: string[];
  canRetry: boolean;
} {
  return ErrorHandlerService.formatErrorForDisplay(error, {
    operation: 'userAction',
    timestamp: new Date(),
  });
}

/**
 * Example 8: Custom retry logic based on error type
 */
export async function fetchWithCustomRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  return ErrorHandlerService.withRetry(
    operation,
    {
      maxAttempts: 5,
      initialDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      shouldRetry: (error: ApiError, attempt: number) => {
        // Don't retry authentication errors
        if (error.type === 'AUTHENTICATION_ERROR') {
          return false;
        }
        
        // Only retry network errors up to 3 times
        if (error.type === 'NETWORK_ERROR' && attempt >= 3) {
          return false;
        }
        
        // Retry all other retryable errors
        return error.retryable;
      },
    },
    {
      operation: 'customRetryOperation',
    }
  );
}

/**
 * Example 9: Cache warming for frequently accessed data
 */
export async function warmUpFrequentlyAccessedData(
  fallbackService: FallbackService,
  userIds: string[]
): Promise<void> {
  const entries = userIds.map((userId) => ({
    key: `user-profile-${userId}`,
    fetcher: () => funifierApiClient.getUserProfile(userId),
    duration: 15 * 60 * 1000, // 15 minutes
  }));

  await fallbackService.warmUpCache(entries);
  console.info(`Warmed up cache for ${userIds.length} users`);
}

/**
 * Example 10: Monitor cache health
 */
export function monitorCacheHealth(fallbackService: FallbackService): void {
  const health = fallbackService.getCacheHealth();
  
  console.log('Cache Health:', {
    total: health.totalEntries,
    valid: health.validEntries,
    expired: health.expiredEntries,
    hitRate: `${(health.hitRate * 100).toFixed(2)}%`,
    avgAge: `${(health.averageAge / 1000).toFixed(2)}s`,
  });

  // Alert if cache health is poor
  if (health.hitRate < 0.5) {
    console.warn('Cache hit rate is low - consider adjusting cache duration');
  }

  if (health.expiredEntries > health.validEntries) {
    console.warn('Many expired entries - consider cache cleanup');
  }
}

/**
 * Utility: Create a resilient API wrapper
 */
export function createResilientApiWrapper<T>(
  apiCall: () => Promise<T>,
  options: {
    cacheKey?: string;
    fallbackData?: T;
    timeout?: number;
    retryAttempts?: number;
    context?: ErrorContext;
  } = {}
): () => Promise<T> {
  const {
    cacheKey,
    fallbackData,
    timeout = 30000,
    retryAttempts = 3,
    context,
  } = options;

  return async () => {
    try {
      // Apply timeout
      const withTimeout = () =>
        ErrorHandlerService.withTimeout(apiCall, timeout);

      // Apply retry logic
      const withRetry = () =>
        ErrorHandlerService.withRetry(
          withTimeout,
          {
            maxAttempts: retryAttempts,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            jitterEnabled: true,
          },
          context
        );

      // Apply caching if cache key provided
      if (cacheKey) {
        const fallbackService = new FallbackService();
        return await fallbackService.getWithFallback(withRetry, {
          cacheKey,
          fallbackData,
          errorContext: context,
          retryOnError: false, // Already handled by withRetry
        });
      }

      return await withRetry();
    } catch (error) {
      const apiError = error as ApiError;
      ErrorHandlerService.logError(apiError, context);
      throw error;
    }
  };
}

/**
 * Utility: Handle error in React component
 */
export function handleComponentError(
  error: unknown,
  setError: (error: UserFriendlyError) => void,
  context?: ErrorContext
): void {
  const apiError = error as ApiError;
  const userError = ErrorHandlerService.handleFunifierError(apiError, context);
  setError(userError);
  
  // Log for debugging
  ErrorHandlerService.logError(apiError, context);
}

/**
 * Utility: Check if operation should be retried
 */
export function shouldRetryOperation(error: ApiError): boolean {
  return ErrorHandlerService.isRecoverableError(error);
}

/**
 * Utility: Get error statistics for dashboard
 */
export function getErrorStatistics(): {
  totalErrors: number;
  errorsByType: Record<string, number>;
  recentErrors: number;
  suggestions: string[];
  history: Array<{ error: ApiError; timestamp: Date }>;
} {
  const analysis = ErrorHandlerService.analyzeErrorPatterns();
  const history = ErrorHandlerService.getErrorHistory();
  
  return {
    ...analysis,
    history,
  };
}
