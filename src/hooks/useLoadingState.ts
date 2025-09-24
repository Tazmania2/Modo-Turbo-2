'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface LoadingStateOptions {
  timeout?: number;
  onTimeout?: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  progress: number;
  elapsedTime: number;
  hasTimedOut: boolean;
}

interface LoadingActions {
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: Error) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
  executeWithLoading: <T>(
    asyncFn: () => Promise<T>,
    options?: LoadingStateOptions
  ) => Promise<T>;
}

export const useLoadingState = (
  defaultOptions: LoadingStateOptions = {}
): [LoadingState, LoadingActions] => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    progress: 0,
    elapsedTime: 0,
    hasTimedOut: false,
  });

  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    clearTimers();
    startTimeRef.current = Date.now();
    
    setState({
      isLoading: true,
      error: null,
      progress: 0,
      elapsedTime: 0,
      hasTimedOut: false,
    });

    // Start elapsed time tracking
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        setState(prev => ({ ...prev, elapsedTime: elapsed }));
      }
    }, 100);
  }, [clearTimers]);

  const stopLoading = useCallback(() => {
    clearTimers();
    setState(prev => ({ ...prev, isLoading: false }));
    startTimeRef.current = null;
  }, [clearTimers]);

  const setError = useCallback((error: Error) => {
    clearTimers();
    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
    }));
    startTimeRef.current = null;
  }, [clearTimers]);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress: Math.min(Math.max(progress, 0), 100) }));
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setState({
      isLoading: false,
      error: null,
      progress: 0,
      elapsedTime: 0,
      hasTimedOut: false,
    });
    startTimeRef.current = null;
  }, [clearTimers]);

  const executeWithLoading = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: LoadingStateOptions = {}
    ): Promise<T> => {
      const mergedOptions = { ...defaultOptions, ...options };
      const { timeout, onTimeout, onSuccess, onError } = mergedOptions;

      startLoading();

      // Set up timeout if specified
      if (timeout && timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, hasTimedOut: true }));
          if (onTimeout) {
            onTimeout();
          }
        }, timeout);
      }

      try {
        const result = await asyncFn();
        stopLoading();
        if (onSuccess) {
          onSuccess();
        }
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setError(errorObj);
        if (onError) {
          onError(errorObj);
        }
        throw error;
      }
    },
    [defaultOptions, startLoading, stopLoading, setError]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return [
    state,
    {
      startLoading,
      stopLoading,
      setError,
      setProgress,
      reset,
      executeWithLoading,
    },
  ];
};