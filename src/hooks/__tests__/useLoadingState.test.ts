import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useLoadingState());
    const [state] = result.current;

    expect(state).toEqual({
      isLoading: false,
      error: null,
      progress: 0,
      elapsedTime: 0,
      hasTimedOut: false,
    });
  });

  it('starts and stops loading correctly', () => {
    const { result } = renderHook(() => useLoadingState());
    const [, actions] = result.current;

    act(() => {
      actions.startLoading();
    });

    expect(result.current[0].isLoading).toBe(true);
    expect(result.current[0].error).toBe(null);

    act(() => {
      actions.stopLoading();
    });

    expect(result.current[0].isLoading).toBe(false);
  });

  it('sets error correctly', () => {
    const { result } = renderHook(() => useLoadingState());
    const [, actions] = result.current;
    const testError = new Error('Test error');

    act(() => {
      actions.setError(testError);
    });

    expect(result.current[0].error).toBe(testError);
    expect(result.current[0].isLoading).toBe(false);
  });

  it('sets progress correctly', () => {
    const { result } = renderHook(() => useLoadingState());
    const [, actions] = result.current;

    act(() => {
      actions.setProgress(50);
    });

    expect(result.current[0].progress).toBe(50);

    // Test clamping
    act(() => {
      actions.setProgress(-10);
    });

    expect(result.current[0].progress).toBe(0);

    act(() => {
      actions.setProgress(150);
    });

    expect(result.current[0].progress).toBe(100);
  });

  it('resets state correctly', () => {
    const { result } = renderHook(() => useLoadingState());
    const [, actions] = result.current;

    act(() => {
      actions.startLoading();
      actions.setProgress(75);
      actions.setError(new Error('Test'));
    });

    act(() => {
      actions.reset();
    });

    expect(result.current[0]).toEqual({
      isLoading: false,
      error: null,
      progress: 0,
      elapsedTime: 0,
      hasTimedOut: false,
    });
  });

  it('tracks elapsed time during loading', () => {
    const { result } = renderHook(() => useLoadingState());
    const [, actions] = result.current;

    act(() => {
      actions.startLoading();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0].elapsedTime).toBeGreaterThan(0);
  });

  it('executes async function with loading state', async () => {
    const { result } = renderHook(() => useLoadingState());
    const [, actions] = result.current;
    const mockAsyncFn = vi.fn().mockResolvedValue('success');

    let promise: Promise<string>;
    act(() => {
      promise = actions.executeWithLoading(mockAsyncFn);
    });

    expect(result.current[0].isLoading).toBe(true);

    await act(async () => {
      const result = await promise;
      expect(result).toBe('success');
    });

    expect(result.current[0].isLoading).toBe(false);
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
  });

  it('handles async function errors', async () => {
    const { result } = renderHook(() => useLoadingState());
    const [, actions] = result.current;
    const testError = new Error('Async error');
    const mockAsyncFn = vi.fn().mockRejectedValue(testError);

    let promise: Promise<any>;
    act(() => {
      promise = actions.executeWithLoading(mockAsyncFn);
    });

    await act(async () => {
      try {
        await promise;
      } catch (error) {
        expect(error).toBe(testError);
      }
    });

    expect(result.current[0].error).toBe(testError);
    expect(result.current[0].isLoading).toBe(false);
  });

  it('handles timeout correctly', () => {
    const mockOnTimeout = vi.fn();
    const { result } = renderHook(() => useLoadingState());
    const [, actions] = result.current;
    const mockAsyncFn = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

    act(() => {
      actions.executeWithLoading(mockAsyncFn, { timeout: 1000, onTimeout: mockOnTimeout });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0].hasTimedOut).toBe(true);
    expect(mockOnTimeout).toHaveBeenCalledTimes(1);
  });
});