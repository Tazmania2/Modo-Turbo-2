'use client';

import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ProgressBar } from './ProgressBar';
import { Loader2, Wifi, Database, RefreshCw, CheckCircle } from 'lucide-react';

interface FunifierLoadingStateProps {
  operation: 'authentication' | 'fetching' | 'saving' | 'loading' | 'processing';
  message?: string;
  showProgress?: boolean;
  estimatedDuration?: number;
  onTimeout?: () => void;
  compact?: boolean;
}

const operationMessages = {
  authentication: 'Authenticating with Funifier...',
  fetching: 'Fetching data from Funifier...',
  saving: 'Saving changes to Funifier...',
  loading: 'Loading...',
  processing: 'Processing your request...',
};

const operationIcons = {
  authentication: Loader2,
  fetching: Database,
  saving: RefreshCw,
  loading: Loader2,
  processing: Loader2,
};

/**
 * Loading state component specifically for Funifier API operations
 * Shows appropriate messages and progress indicators
 */
export function FunifierLoadingState({
  operation,
  message,
  showProgress = true,
  estimatedDuration = 5000,
  onTimeout,
  compact = false,
}: FunifierLoadingStateProps) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  const displayMessage = message || operationMessages[operation];
  const Icon = operationIcons[operation];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      // Calculate progress (asymptotic approach to 100%)
      const calculatedProgress = Math.min((elapsed / estimatedDuration) * 90, 95);
      setProgress(calculatedProgress);

      // Detect slow connection
      if (elapsed > estimatedDuration * 0.8) {
        setIsSlowConnection(true);
      }

      // Timeout handling
      if (elapsed >= estimatedDuration * 2 && onTimeout) {
        clearInterval(interval);
        onTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [estimatedDuration, onTimeout]);

  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-600">{displayMessage}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        <Icon className="h-12 w-12 text-blue-600 animate-spin" />
        {isSlowConnection && (
          <Wifi className="absolute -bottom-1 -right-1 h-5 w-5 text-yellow-500" />
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="text-base font-medium text-gray-900">{displayMessage}</p>
        {isSlowConnection && (
          <p className="text-sm text-yellow-600">
            Connection is slower than usual. Please wait...
          </p>
        )}
      </div>

      {showProgress && (
        <div className="w-full max-w-xs">
          <ProgressBar
            progress={progress}
            color={isSlowConnection ? 'warning' : 'primary'}
            size="sm"
            animated
          />
        </div>
      )}

      <p className="text-xs text-gray-500">
        {Math.round(elapsedTime / 1000)}s elapsed
      </p>
    </div>
  );
}

/**
 * Multi-step loading indicator for complex operations
 */
interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
}

interface FunifierMultiStepLoadingProps {
  steps: LoadingStep[];
  currentStep?: string;
}

export function FunifierMultiStepLoading({ steps, currentStep }: FunifierMultiStepLoadingProps) {
  return (
    <div className="space-y-4 p-6">
      <h3 className="text-lg font-semibold text-gray-900">Processing...</h3>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.status === 'completed';
          const isError = step.status === 'error';

          return (
            <div
              key={step.id}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50' : isCompleted ? 'bg-green-50' : isError ? 'bg-red-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : isError ? (
                  <div className="h-5 w-5 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                ) : isActive ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : isError ? 'text-red-900' : 'text-gray-600'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Inline loading indicator for buttons and small spaces
 */
interface InlineLoadingProps {
  text?: string;
  size?: 'sm' | 'md';
}

export function InlineLoading({ text = 'Loading...', size = 'sm' }: InlineLoadingProps) {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner size={size} />
      <span className={`${size === 'sm' ? 'text-sm' : 'text-base'} text-gray-600`}>{text}</span>
    </div>
  );
}

/**
 * Loading overlay for full-page operations
 */
interface FunifierLoadingOverlayProps {
  isLoading: boolean;
  operation?: 'authentication' | 'fetching' | 'saving' | 'loading' | 'processing';
  message?: string;
  children: React.ReactNode;
}

export function FunifierLoadingOverlay({
  isLoading,
  operation = 'loading',
  message,
  children,
}: FunifierLoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <FunifierLoadingState operation={operation} message={message} />
      </div>
    </div>
  );
}
