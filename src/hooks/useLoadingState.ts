'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface LoadingStateOptions {
  timeout?: number;
  onTimeout?: () => void;
  minDuration?: number;
}

interface LoadingState {
  isLoading: boolean;
  startTime: number | null;
  elapsedTime: number;
}

/**
 * Hook for managing loading states with timeout and minimum duration
 */
export function useLoadingState(options: LoadingStateOptions = {}) {
  const { timeout = 30000, onTimeout, minDuration = 0 } = options;
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    startTime: null,
    elapsedTime: 0,
  });
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const startLoading = useCallback(() => {
    const startTime = Date.now();
    setState({
      isLoading: true,
      startTime,
      elapsedTime: 0,
    });

    // Set up elapsed time tracking
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (!prev.startTime) return prev;
        return {
          ...prev,
          elapsedTime: Date.now() - prev.startTime,
        };
      });
    }, 100);

    // Set up timeout
    if (timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        if (onTimeout) {
          onTimeout();
        }
      }, timeout);
    }
  }, [timeout, onTimeout]);

  const stopLoading = useCallback(async () => {
    const elapsed = state.startTime ? Date.now() - state.startTime : 0;
    const remaining = Math.max(0, minDuration - elapsed);

    // Clear timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Wait for minimum duration if needed
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    setState({
      isLoading: false,
      startTime: null,
      elapsedTime: 0,
    });
  }, [state.startTime, minDuration]);

  const resetLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setState({
      isLoading: false,
      startTime: null,
      elapsedTime: 0,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isLoading: state.isLoading,
    elapsedTime: state.elapsedTime,
    startLoading,
    stopLoading,
    resetLoading,
  };
}

/**
 * Hook for managing multiple loading states
 */
export function useMultiLoadingState() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [key]: isLoading,
    }));
  }, []);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some((loading) => loading);
  }, [loadingStates]);

  const isLoading = useCallback(
    (key: string) => {
      return loadingStates[key] || false;
    },
    [loadingStates]
  );

  const resetAll = useCallback(() => {
    setLoadingStates({});
  }, []);

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading: isAnyLoading(),
    resetAll,
  };
}

/**
 * Hook for async operations with automatic loading state management
 */
export function useAsyncLoading<T, Args extends any[]>(
  asyncFn: (...args: Args) => Promise<T>,
  options: LoadingStateOptions & {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { onSuccess, onError, ...loadingOptions } = options;
  const loadingState = useLoadingState(loadingOptions);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Args) => {
      loadingState.startLoading();
      setError(null);

      try {
        const result = await asyncFn(...args);
        setData(result);
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        if (onError) {
          onError(error);
        }
        throw error;
      } finally {
        await loadingState.stopLoading();
      }
    },
    [asyncFn, loadingState, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    loadingState.resetLoading();
  }, [loadingState]);

  return {
    data,
    error,
    isLoading: loadingState.isLoading,
    elapsedTime: loadingState.elapsedTime,
    execute,
    reset,
  };
}

/**
 * Hook for progress tracking
 */
export function useProgress(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const progress = (completedSteps.size / totalSteps) * 100;

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const previousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
    },
    [totalSteps]
  );

  const completeStep = useCallback((step: number) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  }, []);

  const completeCurrentStep = useCallback(() => {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    nextStep();
  }, [currentStep, nextStep]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  }, []);

  return {
    currentStep,
    progress,
    completedSteps: Array.from(completedSteps),
    isStepCompleted: (step: number) => completedSteps.has(step),
    nextStep,
    previousStep,
    goToStep,
    completeStep,
    completeCurrentStep,
    reset,
  };
}
