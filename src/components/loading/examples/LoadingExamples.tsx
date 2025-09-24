'use client';

import React, { useState } from 'react';
import {
  LoadingSpinner,
  LoadingDots,
  LoadingPulse,
  ProgressBar,
  CircularProgress,
  LoadingOverlay,
  DataFetchingLoader,
  DashboardSkeleton,
  RankingSkeleton,
  HistorySkeleton,
  LoadingManager,
} from '../index';
import { useLoadingState } from '../../../hooks/useLoadingState';
import { useToast } from '../../../contexts/ToastContext';

export const LoadingExamples: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showDataFetching, setShowDataFetching] = useState(false);
  const [skeletonType, setSkeletonType] = useState<'dashboard' | 'ranking' | 'history'>('dashboard');
  
  const [loadingState, loadingActions] = useLoadingState();
  const { showSuccess, showError, showInfo, showWarning } = useToast();

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const simulateAsyncOperation = async () => {
    try {
      await loadingActions.executeWithLoading(
        () => new Promise((resolve) => setTimeout(resolve, 2000)),
        {
          timeout: 5000,
          onTimeout: () => showWarning('Operation timed out', 'Please try again'),
          onSuccess: () => showSuccess('Operation completed', 'Data loaded successfully'),
        }
      );
    } catch (error) {
      showError('Operation failed', 'Something went wrong');
    }
  };

  const simulateError = () => {
    loadingActions.executeWithLoading(
      () => Promise.reject(new Error('Simulated error'))
    );
  };

  return (
    <div className="p-8 space-y-12 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Loading Components Examples</h1>

      {/* Basic Loading Indicators */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Basic Loading Indicators</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Loading Spinner</h3>
            <div className="flex items-center justify-center space-x-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Loading Dots</h3>
            <div className="flex items-center justify-center space-x-4">
              <LoadingDots size="sm" />
              <LoadingDots size="md" />
              <LoadingDots size="lg" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Loading Pulse</h3>
            <div className="flex items-center justify-center">
              <LoadingPulse size="md" text="Loading..." />
            </div>
          </div>
        </div>
      </section>

      {/* Progress Indicators */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Progress Indicators</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Progress Bar</h3>
            <div className="space-y-4">
              <ProgressBar progress={progress} showPercentage label="Upload Progress" />
              <button
                onClick={simulateProgress}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Simulate Progress
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Circular Progress</h3>
            <div className="flex items-center justify-center">
              <CircularProgress progress={progress} />
            </div>
          </div>
        </div>
      </section>

      {/* Loading Overlays */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Loading Overlays</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Loading Overlay</h3>
            <LoadingOverlay isLoading={showOverlay} text="Processing...">
              <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-600">Content behind overlay</p>
              </div>
            </LoadingOverlay>
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className="mt-4 px-4 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700"
            >
              Toggle Overlay
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Data Fetching Loader</h3>
            {showDataFetching ? (
              <DataFetchingLoader
                isLoading={showDataFetching}
                onTimeout={() => {
                  setShowDataFetching(false);
                  showWarning('Loading timed out', 'Please try again');
                }}
              />
            ) : (
              <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-600">Click to start data fetching</p>
              </div>
            )}
            <button
              onClick={() => setShowDataFetching(!showDataFetching)}
              className="mt-4 px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700"
            >
              Toggle Data Fetching
            </button>
          </div>
        </div>
      </section>

      {/* Skeleton Loading States */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Skeleton Loading States</h2>
        
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium mb-4">Skeleton Types</h3>
            <div className="flex space-x-4">
              {(['dashboard', 'ranking', 'history'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSkeletonType(type)}
                  className={`px-4 py-2 rounded-md capitalize ${
                    skeletonType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {skeletonType === 'dashboard' && <DashboardSkeleton />}
            {skeletonType === 'ranking' && <RankingSkeleton />}
            {skeletonType === 'history' && <HistorySkeleton />}
          </div>
        </div>
      </section>

      {/* Loading State Hook */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Loading State Hook</h2>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium mb-4">useLoadingState Hook</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Loading:</span> {loadingState.isLoading ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">Progress:</span> {loadingState.progress}%
              </div>
              <div>
                <span className="font-medium">Elapsed:</span> {Math.round(loadingState.elapsedTime / 1000)}s
              </div>
              <div>
                <span className="font-medium">Timed Out:</span> {loadingState.hasTimedOut ? 'Yes' : 'No'}
              </div>
            </div>
            
            {loadingState.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">Error: {loadingState.error.message}</p>
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={simulateAsyncOperation}
                disabled={loadingState.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Simulate Success
              </button>
              <button
                onClick={simulateError}
                disabled={loadingState.isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Simulate Error
              </button>
              <button
                onClick={loadingActions.reset}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notifications */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Toast Notifications</h2>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium mb-4">Toast Examples</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => showSuccess('Success!', 'Operation completed successfully')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Success Toast
            </button>
            <button
              onClick={() => showError('Error!', 'Something went wrong')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Error Toast
            </button>
            <button
              onClick={() => showWarning('Warning!', 'Please check your input')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Warning Toast
            </button>
            <button
              onClick={() => showInfo('Info', 'Here is some information')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Info Toast
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};