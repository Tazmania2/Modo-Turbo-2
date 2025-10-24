'use client';

import React, { useState, useCallback } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { ErrorHandlerService, UserFriendlyError } from '@/services/error-handler.service';
import { FallbackService } from '@/services/fallback.service';
import { useOfflineDetection } from './OfflineDetector';

interface ErrorRecoveryProps {
  error: UserFriendlyError;
  onRetry: () => Promise<void>;
  onSuccess?: () => void;
  onGiveUp?: () => void;
  fallbackData?: any;
  cacheKey?: string;
  showFallbackOption?: boolean;
}

type RecoveryState = 'idle' | 'retrying' | 'success' | 'failed' | 'using-fallback';

/**
 * Comprehensive error recovery component with multiple strategies
 */
export function ErrorRecovery({
  error,
  onRetry,
  onSuccess,
  onGiveUp,
  fallbackData,
  cacheKey,
  showFallbackOption = true,
}: ErrorRecoveryProps) {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('idle');
  const [attempts, setAttempts] = useState(0);
  const { isOnline } = useOfflineDetection();
  const fallbackService = new FallbackService();

  const maxAttempts = 3;

  const handleRetry = useCallback(async () => {
    if (attempts >= maxAttempts) {
      setRecoveryState('failed');
      return;
    }

    setRecoveryState('retrying');
    setAttempts((prev) => prev + 1);

    try {
      await ErrorHandlerService.withRetry(
        onRetry,
        {
          maxAttempts: 1, // Single attempt per manual retry
          initialDelay: 1000,
        }
      );

      setRecoveryState('success');
      setAttempts(0);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (attempts + 1 >= maxAttempts) {
        setRecoveryState('failed');
      } else {
        setRecoveryState('idle');
      }
    }
  }, [onRetry, attempts, maxAttempts, onSuccess]);

  const handleUseFallback = useCallback(async () => {
    setRecoveryState('using-fallback');

    if (cacheKey) {
      // Try to get cached data
      const cached = fallbackService.getCache(cacheKey);
      if (cached) {
        console.info('Using cached fallback data');
      }
    }

    // Notify parent that we're using fallback
    if (onSuccess) {
      onSuccess();
    }
  }, [cacheKey, fallbackService, onSuccess]);

  const handleGiveUp = useCallback(() => {
    setRecoveryState('failed');
    if (onGiveUp) {
      onGiveUp();
    }
  }, [onGiveUp]);

  const getStateIcon = () => {
    switch (recoveryState) {
      case 'retrying':
        return <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'using-fallback':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStateMessage = () => {
    switch (recoveryState) {
      case 'retrying':
        return `Attempting to recover... (Attempt ${attempts}/${maxAttempts})`;
      case 'success':
        return 'Successfully recovered!';
      case 'failed':
        return 'Recovery failed. Please try again later.';
      case 'using-fallback':
        return 'Using cached data. Some information may be outdated.';
      default:
        return error.message;
    }
  };

  if (recoveryState === 'success') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3">
          {getStateIcon()}
          <p className="text-sm font-medium text-green-800">{getStateMessage()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-start space-x-4">
          {getStateIcon()}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {recoveryState === 'failed' ? 'Recovery Failed' : 'Error Occurred'}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{getStateMessage()}</p>
            </div>

            {!isOnline && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  You appear to be offline. Please check your internet connection.
                </p>
              </div>
            )}

            {error.suggestions && error.suggestions.length > 0 && recoveryState === 'idle' && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Suggestions:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  {error.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {recoveryState !== 'failed' && error.retryable && (
                <button
                  onClick={handleRetry}
                  disabled={recoveryState === 'retrying' || attempts >= maxAttempts}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className={`h-4 w-4 ${recoveryState === 'retrying' ? 'animate-spin' : ''}`} />
                  <span>
                    {recoveryState === 'retrying'
                      ? 'Retrying...'
                      : attempts > 0
                      ? `Retry (${maxAttempts - attempts} left)`
                      : 'Retry'}
                  </span>
                </button>
              )}

              {showFallbackOption && (fallbackData || cacheKey) && recoveryState !== 'using-fallback' && (
                <button
                  onClick={handleUseFallback}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Use Cached Data</span>
                </button>
              )}

              {(recoveryState === 'failed' || attempts >= maxAttempts) && (
                <button
                  onClick={handleGiveUp}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Dismiss</span>
                </button>
              )}
            </div>

            {attempts > 0 && attempts < maxAttempts && (
              <p className="text-xs text-gray-500">
                {attempts} of {maxAttempts} retry attempts used
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simplified error recovery for inline use
 */
interface InlineErrorRecoveryProps {
  error: UserFriendlyError;
  onRetry: () => Promise<void>;
  compact?: boolean;
}

export function InlineErrorRecovery({ error, onRetry, compact = false }: InlineErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded">
        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-700 flex-1">{error.message}</p>
        {error.retryable && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">{error.message}</p>
          {error.suggestions && error.suggestions.length > 0 && (
            <p className="mt-1 text-xs text-red-700">{error.suggestions[0]}</p>
          )}
        </div>
      </div>
      {error.retryable && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white border border-red-300 rounded text-sm font-medium text-red-700 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400"
        >
          <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
        </button>
      )}
    </div>
  );
}
