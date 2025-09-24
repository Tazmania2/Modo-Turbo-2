'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/error/ErrorToast';
import { errorLogger } from '@/services/error-logger.service';
import { fallbackManager } from '@/services/fallback-manager.service';
import { ErrorType, ApiError } from '@/types/error';

export interface UseErrorHandlerOptions {
  enableFallback?: boolean;
  fallbackKey?: string;
  showToast?: boolean;
  logError?: boolean;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    enableFallback = true,
    fallbackKey,
    showToast = true,
    logError = true
  } = options;

  const toast = useToast();

  const handleError = useCallback(async (
    error: Error | ApiError,
    context?: Record<string, any>
  ): Promise<any> => {
    let apiError: ApiError;

    // Convert Error to ApiError if needed
    if (error instanceof Error && !('type' in error)) {
      apiError = {
        type: ErrorType.CONFIGURATION_ERROR,
        message: error.message,
        details: { stack: error.stack },
        timestamp: new Date(),
        retryable: false,
        userMessage: 'An unexpected error occurred. Please try again.'
      };
    } else {
      apiError = error as ApiError;
    }

    // Log the error
    if (logError) {
      const errorId = errorLogger.logError(apiError, {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      });
      
      // Add error ID to context for potential fallback
      context = { ...context, errorId };
    }

    // Show toast notification
    if (showToast) {
      toast.showError(
        getErrorTitle(apiError.type),
        apiError.userMessage
      );
    }

    // Try fallback if enabled and available
    if (enableFallback && fallbackKey && fallbackManager.isFallbackAvailable(fallbackKey)) {
      try {
        return await fallbackManager.executeWithFallback(
          () => Promise.reject(apiError),
          fallbackKey,
          context
        );
      } catch (fallbackError) {
        // Fallback also failed, return null or throw
        console.error('Fallback mechanism failed:', fallbackError);
        return null;
      }
    }

    // Re-throw the error if no fallback or fallback disabled
    throw apiError;
  }, [enableFallback, fallbackKey, showToast, logError, toast]);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationContext?: Record<string, any>
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      return await handleError(error as Error, operationContext);
    }
  }, [handleError]);

  const createErrorHandler = useCallback((
    operationName: string,
    customFallbackKey?: string
  ) => {
    return async <T>(operation: () => Promise<T>): Promise<T | null> => {
      return handleAsyncOperation(operation, {
        operation: operationName,
        fallbackKey: customFallbackKey || fallbackKey
      });
    };
  }, [handleAsyncOperation, fallbackKey]);

  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }

    throw lastError!;
  }, []);

  return {
    handleError,
    handleAsyncOperation,
    createErrorHandler,
    retryOperation
  };
}

function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.AUTHENTICATION_ERROR:
      return 'Authentication Failed';
    case ErrorType.FUNIFIER_API_ERROR:
      return 'Service Unavailable';
    case ErrorType.CONFIGURATION_ERROR:
      return 'Configuration Error';
    case ErrorType.VALIDATION_ERROR:
      return 'Invalid Input';
    case ErrorType.NETWORK_ERROR:
      return 'Connection Problem';
    case ErrorType.WHITE_LABEL_ERROR:
      return 'System Error';
    default:
      return 'Unexpected Error';
  }
}