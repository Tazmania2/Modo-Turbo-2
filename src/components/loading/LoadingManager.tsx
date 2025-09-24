'use client';

import React from 'react';
import { LoadingOverlay } from './LoadingOverlay';
import { DataFetchingLoader } from './DataFetchingLoader';
import { DashboardSkeleton } from './DashboardSkeleton';
import { RankingSkeleton } from './RankingSkeleton';
import { HistorySkeleton } from './HistorySkeleton';
import { useToast } from '../../contexts/ToastContext';

interface LoadingManagerProps {
  isLoading: boolean;
  loadingType?: 'overlay' | 'skeleton' | 'data-fetching';
  skeletonType?: 'dashboard' | 'ranking' | 'history';
  loadingText?: string;
  showProgress?: boolean;
  maxDuration?: number;
  onTimeout?: () => void;
  children: React.ReactNode;
  errorMessage?: string;
  retryAction?: () => void;
}

export const LoadingManager: React.FC<LoadingManagerProps> = ({
  isLoading,
  loadingType = 'overlay',
  skeletonType = 'dashboard',
  loadingText,
  showProgress = true,
  maxDuration = 5000,
  onTimeout,
  children,
  errorMessage,
  retryAction,
}) => {
  const { showError, showWarning } = useToast();

  const handleTimeout = () => {
    showWarning(
      'Loading is taking longer than expected',
      'Please check your connection and try again.'
    );
    if (onTimeout) {
      onTimeout();
    }
  };

  const handleError = () => {
    if (errorMessage) {
      showError('Loading Error', errorMessage);
    }
  };

  // Show error state if there's an error message
  React.useEffect(() => {
    if (errorMessage) {
      handleError();
    }
  }, [errorMessage]);

  // Render skeleton loading states
  if (isLoading && loadingType === 'skeleton') {
    switch (skeletonType) {
      case 'dashboard':
        return <DashboardSkeleton />;
      case 'ranking':
        return <RankingSkeleton />;
      case 'history':
        return <HistorySkeleton />;
      default:
        return <DashboardSkeleton />;
    }
  }

  // Render data fetching loader
  if (isLoading && loadingType === 'data-fetching') {
    return (
      <DataFetchingLoader
        isLoading={isLoading}
        maxDuration={maxDuration}
        onTimeout={handleTimeout}
        showProgress={showProgress}
      />
    );
  }

  // Render overlay loader
  if (loadingType === 'overlay') {
    return (
      <LoadingOverlay
        isLoading={isLoading}
        text={loadingText}
        type="pulse"
        size="lg"
      >
        {children}
      </LoadingOverlay>
    );
  }

  return <>{children}</>;
};