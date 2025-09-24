'use client';

import React, { Component, ReactNode } from 'react';
import { ErrorBoundaryState } from '@/types/error';
import { errorLogger } from '@/services/error-logger.service';
import { ErrorType } from '@/types/error';
import { ErrorDisplay } from './ErrorDisplay';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log the error
    const errorId = errorLogger.logCustomError(
      ErrorType.CONFIGURATION_ERROR,
      error.message,
      {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      },
      {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }
    );

    this.setState({
      hasError: true,
      error,
      errorInfo,
      errorId
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          title="Something went wrong"
          message="An unexpected error occurred while rendering this component."
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          showDetails={process.env.NODE_ENV === 'development'}
          details={this.state.error?.stack}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}