'use client';

import { useState, useCallback } from 'react';
import { ErrorHandlerService, UserFriendlyError, ErrorContext } from '@/services/error-handler.service';
import { ApiError } from '@/services/funifier-api-client';
import { useToast } from '@/components/error/ErrorToast';

interface UseFunifierErrorOptions {
  showToast?: boolean;
  context?: ErrorContext;
  onError?: (error: UserFriendlyError) => void;
}

interface UseFunifierErrorReturn {
  error: UserFriendlyError | null;
  setError: (error: UserFriendlyError | null) => void;
  handleError: (error: unknown) => void;
  clearError: () => void;
  retry: () => void;
  isRetrying: boolean;
}

/**
 * Hook for handling Funifier API errors in components
 * Provides error state management and integration with toast notifications
 */
export function useFunifierError(options: UseFunifierErrorOptions = {}): UseFunifierErrorReturn {
  const { showToast = true, context, onError } = options;
  const [error, setErrorState] = useState<UserFriendlyError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const toast = useToast();

  const setError = useCallback(
    (newError: UserFriendlyError | null) => {
      setErrorState(newError);

      if (newError && showToast) {
        // Show toast notification based on severity
        if (newError.severity === 'critical' || newError.severity === 'high') {
          toast.showError(newError.message, newError.suggestions?.[0]);
        } else if (newError.severity === 'medium') {
          toast.showWarning(newError.message, newError.suggestions?.[0]);
        } else {
          toast.showInfo(newError.message, newError.suggestions?.[0]);
        }
      }

      if (newError && onError) {
        onError(newError);
      }
    },
    [showToast, onError, toast]
  );

  const handleError = useCallback(
    (err: unknown) => {
      const apiError = err as ApiError;
      const userError = ErrorHandlerService.handleFunifierError(apiError, context);

      // Log error for monitoring
      ErrorHandlerService.logError(apiError, context);

      setError(userError);
    },
    [context, setError]
  );

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const retry = useCallback(() => {
    setIsRetrying(true);
    clearError();
    // The actual retry logic should be implemented by the component
    setTimeout(() => setIsRetrying(false), 100);
  }, [clearError]);

  return {
    error,
    setError,
    handleError,
    clearError,
    retry,
    isRetrying,
  };
}

/**
 * Hook for executing async operations with automatic error handling
 */
export function useAsyncError<T>(
  asyncFn: () => Promise<T>,
  options: UseFunifierErrorOptions & {
    onSuccess?: (data: T) => void;
    retryConfig?: {
      maxAttempts?: number;
      initialDelay?: number;
    };
  } = {}
) {
  const { showToast = true, context, onError, onSuccess, retryConfig } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const errorHandler = useFunifierError({ showToast, context, onError });

  const execute = useCallback(async () => {
    setIsLoading(true);
    errorHandler.clearError();

    try {
      let result: T;

      if (retryConfig) {
        result = await ErrorHandlerService.withRetry(asyncFn, retryConfig, context);
      } else {
        result = await asyncFn();
      }

      setData(result);
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (err) {
      errorHandler.handleError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, retryConfig, context, onSuccess, errorHandler]);

  const retry = useCallback(async () => {
    return execute();
  }, [execute]);

  return {
    data,
    isLoading,
    error: errorHandler.error,
    execute,
    retry,
    clearError: errorHandler.clearError,
  };
}

/**
 * Hook for monitoring error patterns
 */
export function useErrorMonitoring() {
  const getErrorStats = useCallback(() => {
    return ErrorHandlerService.analyzeErrorPatterns();
  }, []);

  const getErrorHistory = useCallback(() => {
    return ErrorHandlerService.getErrorHistory();
  }, []);

  const clearHistory = useCallback(() => {
    ErrorHandlerService.clearErrorHistory();
  }, []);

  return {
    getErrorStats,
    getErrorHistory,
    clearHistory,
  };
}
