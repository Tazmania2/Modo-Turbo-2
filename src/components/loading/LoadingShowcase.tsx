'use client';

import React, { useState } from 'react';
import { LoadingManager } from './LoadingManager';
import { DataFetchingLoader } from './DataFetchingLoader';
import { ProgressBar } from './ProgressBar';
import { CircularProgress } from './CircularProgress';
import { LoadingSpinner } from './LoadingSpinner';
import { LoadingPulse } from './LoadingPulse';
import { LoadingDots } from './LoadingDots';
import { DashboardSkeleton } from './DashboardSkeleton';
import { RankingSkeleton } from './RankingSkeleton';
import { HistorySkeleton } from './HistorySkeleton';
import { useToast } from '../../contexts/ToastContext';
import { useLoadingState } from '../../hooks/useLoadingState';

/**
 * LoadingShowcase - Demonstrates all loading states and user feedback components
 * This component serves as both documentation and testing for the loading system
 */
export const LoadingShowcase: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [skeletonType, setSkeletonType] = useState<'dashboard' | 'ranking' | 'history'>('dashboard');
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const loadingState = useLoadingState();

  // Simulate progress
  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          showSuccess('Progress Complete', 'The operation has finished successfully!');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Simulate data fetching
  const simulateDataFetching = async () => {
    try {
      loadingState.startLoading();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await loadingState.stopLoading();
      showSuccess('Data loaded successfully!');
    } catch (error) {
      await loadingState.stopLoading();
      showError('Failed to load data', 'An error occurred');
    }
  };

  // Simulate error
  const simulateError = async () => {
    try {
      loadingState.startLoading();
      await Promise.reject(new Error('Simulated network error'));
    } catch (error) {
      await loadingState.stopLoading();
      showError('Operation Failed', 'Simulated network error');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Loading States & User Feedback</h1>
        <p className="text-gray-600">Comprehensive showcase of all loading components and toast notifications</p>
      </div>

      {/* Toast Notifications */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Toast Notifications</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => showSuccess('Success!', 'Operation completed successfully')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Show Success
          </button>
          <button
            onClick={() => showError('Error!', 'Something went wrong')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Show Error
          </button>
          <button
            onClick={() => showWarning('Warning!', 'Please check your input')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Show Warning
          </button>
          <button
            onClick={() => showInfo('Info', 'Here is some useful information')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Show Info
          </button>
        </div>
      </section>

      {/* Progress Indicators */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Progress Indicators</h2>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Linear Progress Bar</h3>
              <button
                onClick={simulateProgress}
                className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 transition-colors"
              >
                Simulate Progress
              </button>
            </div>
            <ProgressBar
              progress={progress}
              label="Upload Progress"
              showPercentage
              color="primary"
              animated
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="font-medium mb-4">Circular Progress</h3>
              <CircularProgress progress={progress} showPercentage />
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4">Loading Spinner</h3>
              <div className="flex justify-center">
                <LoadingSpinner size="lg" color="primary" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4">Loading Pulse</h3>
              <LoadingPulse size="lg" text="Loading..." />
            </div>
          </div>

          <div className="text-center">
            <h3 className="font-medium mb-4">Loading Dots</h3>
            <div className="flex justify-center">
              <LoadingDots size="lg" color="primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Data Fetching Loader */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Data Fetching Loader (5-second max)</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={simulateDataFetching}
              disabled={loadingState.isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingState.isLoading ? 'Loading...' : 'Simulate Data Fetch'}
            </button>
            <button
              onClick={simulateError}
              disabled={loadingState.isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Simulate Error
            </button>
          </div>

          {loadingState.isLoading && (
            <DataFetchingLoader
              isLoading={loadingState.isLoading}
              maxDuration={5000}
              showProgress
            />
          )}


        </div>
      </section>

      {/* Skeleton Loading States */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Skeleton Loading States</h2>
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowSkeletons(!showSkeletons)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {showSkeletons ? 'Hide Skeletons' : 'Show Skeletons'}
            </button>
            
            {showSkeletons && (
              <select
                value={skeletonType}
                onChange={(e) => setSkeletonType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="dashboard">Dashboard Skeleton</option>
                <option value="ranking">Ranking Skeleton</option>
                <option value="history">History Skeleton</option>
              </select>
            )}
          </div>

          {showSkeletons && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {skeletonType === 'dashboard' && <DashboardSkeleton />}
              {skeletonType === 'ranking' && <RankingSkeleton />}
              {skeletonType === 'history' && <HistorySkeleton />}
            </div>
          )}
        </div>
      </section>

      {/* Loading Manager Example */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Loading Manager Integration</h2>
        <p className="text-gray-600 mb-4">
          The LoadingManager component provides a unified way to handle different loading states
          throughout the application. It automatically integrates with the toast system for error handling.
        </p>
        
        <LoadingManager
          isLoading={loadingState.isLoading}
          loadingType="overlay"
          loadingText="Processing your request..."
          errorMessage={undefined}
        >
          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <h3 className="text-lg font-medium mb-2">Content Area</h3>
            <p className="text-gray-600">
              This content will be overlaid with a loading indicator when the LoadingManager is active.
            </p>
          </div>
        </LoadingManager>
      </section>

      {/* Performance Metrics */}
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Loading State Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">
              {loadingState.elapsedTime}ms
            </div>
            <div className="text-sm text-gray-600">Elapsed Time</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`text-2xl font-bold ${loadingState.isLoading ? 'text-yellow-600' : 'text-green-600'}`}>
              {loadingState.isLoading ? 'Active' : 'Idle'}
            </div>
            <div className="text-sm text-gray-600">Status</div>
          </div>
        </div>
      </section>
    </div>
  );
};