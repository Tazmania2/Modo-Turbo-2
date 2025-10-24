'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, WifiOff, AlertCircle } from 'lucide-react';
import { ErrorHandlerService } from '@/services/error-handler.service';
import { ApiError } from '@/services/funifier-api-client';

interface RetryHandlerProps {
  onRetry: () => Promise<void>;
  error?: ApiError;
  maxAttempts?: number;
  children?: React.ReactNode;
  showAttempts?: boolean;
}

/**
 * Component that handles retry logic with exponential backoff
 * Shows retry button and tracks retry attempts
 */
export function RetryHandler({
  onRetry,
  error,
  maxAttempts = 3,
  children,
  showAttempts = true,
}: RetryHandlerProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState<number | null>(null);

  const canRetry = attempts < maxAttempts && (!error || error.retryable);

  const calculateDelay = (attempt: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  };

  const handleRetry = useCallback(async () => {
    if (!canRetry || isRetrying) return;

    setIsRetrying(true);
    const currentAttempt = attempts + 1;
    setAttempts(currentAttempt);

    try {
      await onRetry();
      // Success - reset attempts
      setAttempts(0);
      setNextRetryIn(null);
    } catch (err) {
      // Failed - schedule next retry if available
      if (currentAttempt < maxAttempts) {
        const delay = calculateDelay(currentAttempt);
        setNextRetryIn(delay);

        // Countdown timer
        const startTime = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, delay - elapsed);
          setNextRetryIn(remaining);

          if (remaining === 0) {
            clearInterval(interval);
          }
        }, 100);
      }
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, attempts, maxAttempts, canRetry, isRetrying]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="space-y-4">
      {children}

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isRetrying ? 'Retrying...' : 'Operation failed'}
            </p>
            {showAttempts && attempts > 0 && (
              <p className="text-xs text-gray-500">
                Attempt {attempts} of {maxAttempts}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleRetry}
          disabled={!canRetry || isRetrying || (nextRetryIn !== null && nextRetryIn > 0)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>
            {isRetrying
              ? 'Retrying...'
              : nextRetryIn && nextRetryIn > 0
              ? `Retry in ${formatTime(nextRetryIn)}`
              : attempts >= maxAttempts
              ? 'Max attempts reached'
              : 'Retry'}
          </span>
        </button>
      </div>

      {attempts >= maxAttempts && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Maximum retry attempts reached. Please check your connection or try again later.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Automatic retry component that retries without user interaction
 */
interface AutoRetryProps {
  onRetry: () => Promise<void>;
  maxAttempts?: number;
  initialDelay?: number;
  onMaxAttemptsReached?: () => void;
  children: (state: { isRetrying: boolean; attempts: number }) => React.ReactNode;
}

export function AutoRetry({
  onRetry,
  maxAttempts = 3,
  initialDelay = 1000,
  onMaxAttemptsReached,
  children,
}: AutoRetryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (attempts === 0) return;

    if (attempts >= maxAttempts) {
      if (onMaxAttemptsReached) {
        onMaxAttemptsReached();
      }
      return;
    }

    const delay = initialDelay * Math.pow(2, attempts - 1);
    const timeout = setTimeout(async () => {
      setIsRetrying(true);
      try {
        await onRetry();
        setAttempts(0); // Success - reset
      } catch (err) {
        setAttempts((prev) => prev + 1);
      } finally {
        setIsRetrying(false);
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [attempts, maxAttempts, initialDelay, onRetry, onMaxAttemptsReached]);

  return <>{children({ isRetrying, attempts })}</>;
}
