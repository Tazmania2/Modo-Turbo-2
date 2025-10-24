'use client';

import React, { Component, ReactNode } from 'react';
import { ErrorHandlerService, UserFriendlyError } from '@/services/error-handler.service';
import { ApiError } from '@/services/funifier-api-client';
import { FunifierErrorDisplay } from './FunifierErrorDisplay';

interface FunifierErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: UserFriendlyError, retry: () => void) => ReactNode;
  onError?: (error: ApiError, userError: UserFriendlyError) => void;
  context?: {
    operation?: string;
    userId?: string;
    endpoint?: string;
  };
}

interface FunifierErrorBoundaryState {
  hasError: boolean;
  error?: ApiError;
  userError?: UserFriendlyError;
}

/**
 * Enhanced Error Boundary specifically for Funifier API errors
 * Integrates with ErrorHandlerService for comprehensive error handling
 */
export class FunifierErrorBoundary extends Component<
  FunifierErrorBoundaryProps,
  FunifierErrorBoundaryState
> {
  constructor(props: FunifierErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FunifierErrorBoundaryState {
    const apiError = error as unknown as ApiError;
    const userError = ErrorHandlerService.handleFunifierError(apiError);

    return {
      hasError: true,
      error: apiError,
      userError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const apiError = error as unknown as ApiError;
    const userError = ErrorHandlerService.handleFunifierError(apiError, {
      ...this.props.context,
      componentStack: errorInfo.componentStack,
    });

    // Log error with full context
    ErrorHandlerService.logError(apiError, {
      ...this.props.context,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'FunifierErrorBoundary',
    });

    this.setState({
      hasError: true,
      error: apiError,
      userError,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(apiError, userError);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, userError: undefined });
  };

  render() {
    if (this.state.hasError && this.state.userError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.userError, this.handleRetry);
      }

      // Use default Funifier error display
      return (
        <FunifierErrorDisplay
          error={this.state.userError}
          onRetry={this.state.userError.retryable ? this.handleRetry : undefined}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with Funifier error boundary
 */
export function withFunifierErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: (error: UserFriendlyError, retry: () => void) => ReactNode;
    context?: {
      operation?: string;
      userId?: string;
      endpoint?: string;
    };
  }
) {
  return function WrappedComponent(props: P) {
    return (
      <FunifierErrorBoundary fallback={options?.fallback} context={options?.context}>
        <Component {...props} />
      </FunifierErrorBoundary>
    );
  };
}
