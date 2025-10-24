/**
 * Enhanced error handling service for Funifier API operations
 * Provides comprehensive error management, retry mechanisms, and user-friendly messages
 */

import { ErrorType, ApiError } from './funifier-api-client';

export interface UserFriendlyError {
  message: string;
  action: ErrorAction;
  retryable: boolean;
  details?: unknown;
  errorCode?: string;
  severity?: ErrorSeverity;
  suggestions?: string[];
}

export type ErrorAction =
  | 'REDIRECT_TO_LOGIN'
  | 'RETRY_WITH_BACKOFF'
  | 'RETRY_ONCE'
  | 'SHOW_SETUP_GUIDE'
  | 'CONTACT_SUPPORT'
  | 'REFRESH_PAGE'
  | 'CHECK_CONFIGURATION'
  | 'WAIT_AND_RETRY'
  | 'NONE';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled?: boolean;
  shouldRetry?: (error: ApiError, attempt: number) => boolean;
}

export interface ErrorContext extends Record<string, unknown> {
  operation?: string;
  userId?: string;
  endpoint?: string;
  timestamp?: Date;
  additionalInfo?: Record<string, unknown>;
}

export class ErrorHandlerService {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterEnabled: true,
  };

  private static errorHistory: Array<{ error: ApiError; timestamp: Date; context?: ErrorContext }> = [];
  private static readonly MAX_ERROR_HISTORY = 50;

  /**
   * Convert API errors to user-friendly error messages with enhanced context
   */
  static handleFunifierError(error: ApiError, context?: ErrorContext): UserFriendlyError {
    // Track error in history
    this.trackError(error, context);

    switch (error.type) {
      case ErrorType.AUTHENTICATION_ERROR:
        return this.handleAuthenticationError(error);

      case ErrorType.FUNIFIER_API_ERROR:
        return this.handleApiError(error);

      case ErrorType.NETWORK_ERROR:
        return this.handleNetworkError(error);

      case ErrorType.VALIDATION_ERROR:
        return this.handleValidationError(error);

      default:
        return this.handleUnknownError(error);
    }
  }

  /**
   * Track error in history for pattern analysis
   */
  private static trackError(error: ApiError, context?: ErrorContext): void {
    this.errorHistory.push({
      error,
      timestamp: new Date(),
      context,
    });

    // Keep history size manageable
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory.shift();
    }
  }

  /**
   * Get error history for analysis
   */
  static getErrorHistory(): Array<{ error: ApiError; timestamp: Date; context?: ErrorContext }> {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  static clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Analyze error patterns to detect recurring issues
   */
  static analyzeErrorPatterns(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: number;
    suggestions: string[];
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const recentErrors = this.errorHistory.filter(
      (entry) => entry.timestamp.getTime() > fiveMinutesAgo
    );

    const errorsByType = this.errorHistory.reduce((acc, entry) => {
      const type = entry.error.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const suggestions: string[] = [];

    // Analyze patterns and provide suggestions
    if (errorsByType[ErrorType.NETWORK_ERROR] > 5) {
      suggestions.push('Multiple network errors detected. Check your internet connection.');
    }

    if (errorsByType[ErrorType.AUTHENTICATION_ERROR] > 3) {
      suggestions.push('Repeated authentication failures. Verify your credentials.');
    }

    if (recentErrors.length > 10) {
      suggestions.push('High error rate detected. The service may be experiencing issues.');
    }

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      recentErrors: recentErrors.length,
      suggestions,
    };
  }

  /**
   * Handle authentication errors with enhanced messaging
   */
  private static handleAuthenticationError(error: ApiError): UserFriendlyError {
    const details = error.details as any;
    const statusCode = details?.response?.status;
    const errorMessage = details?.response?.data?.message || details?.response?.data?.error;

    if (statusCode === 401) {
      const suggestions = [
        'Log in again with your credentials',
        'Check if your session has expired',
        'Verify your authentication token is valid',
      ];

      return {
        message: 'Your session has expired or is invalid. Please log in again.',
        action: 'REDIRECT_TO_LOGIN',
        retryable: false,
        details: error.details,
        errorCode: 'AUTH_401',
        severity: 'high',
        suggestions,
      };
    }

    if (statusCode === 403) {
      const suggestions = [
        'Contact your administrator for access',
        'Verify you have the required permissions',
        'Check if your account is active',
      ];

      return {
        message: 'You do not have permission to perform this action.',
        action: 'CONTACT_SUPPORT',
        retryable: false,
        details: error.details,
        errorCode: 'AUTH_403',
        severity: 'medium',
        suggestions,
      };
    }

    const suggestions = [
      'Verify your username and password',
      'Check if your account is active',
      'Ensure you have the correct API credentials',
    ];

    return {
      message: errorMessage || 'Authentication failed. Please check your credentials and try again.',
      action: 'REDIRECT_TO_LOGIN',
      retryable: false,
      details: error.details,
      errorCode: 'AUTH_FAILED',
      severity: 'high',
      suggestions,
    };
  }

  /**
   * Handle Funifier API errors with comprehensive status code handling
   */
  private static handleApiError(error: ApiError): UserFriendlyError {
    const details = error.details as any;
    const statusCode = details?.response?.status;
    const errorMessage = details?.response?.data?.message || details?.response?.data?.error || error.message;

    if (statusCode === 404) {
      const suggestions = [
        'Verify the resource ID is correct',
        'Check if the data exists in Funifier',
        'Complete initial setup if this is a new configuration',
      ];

      return {
        message: 'The requested data was not found. This might be a new user or missing configuration.',
        action: 'SHOW_SETUP_GUIDE',
        retryable: false,
        details: error.details,
        errorCode: 'API_404',
        severity: 'medium',
        suggestions,
      };
    }

    if (statusCode === 400) {
      const suggestions = [
        'Check the request parameters',
        'Verify the data format is correct',
        'Review the API documentation for required fields',
      ];

      return {
        message: `Invalid request: ${errorMessage}`,
        action: 'NONE',
        retryable: false,
        details: error.details,
        errorCode: 'API_400',
        severity: 'medium',
        suggestions,
      };
    }

    if (statusCode === 422) {
      const suggestions = [
        'Validate your input data',
        'Check for missing required fields',
        'Ensure data types match the expected format',
      ];

      return {
        message: `Validation error: ${errorMessage}`,
        action: 'NONE',
        retryable: false,
        details: error.details,
        errorCode: 'API_422',
        severity: 'medium',
        suggestions,
      };
    }

    if (statusCode === 429) {
      const retryAfter = details?.response?.headers?.['retry-after'];
      const waitTime = retryAfter ? `${retryAfter} seconds` : 'a moment';
      
      const suggestions = [
        `Wait ${waitTime} before retrying`,
        'Reduce the frequency of your requests',
        'Consider implementing request throttling',
      ];

      return {
        message: `Too many requests. Please wait ${waitTime} and try again.`,
        action: 'WAIT_AND_RETRY',
        retryable: true,
        details: error.details,
        errorCode: 'API_429',
        severity: 'low',
        suggestions,
      };
    }

    if (statusCode === 500) {
      const suggestions = [
        'Wait a few moments and try again',
        'Check Funifier service status',
        'Contact support if the issue persists',
      ];

      return {
        message: 'The Funifier service encountered an internal error. Please try again shortly.',
        action: 'RETRY_WITH_BACKOFF',
        retryable: true,
        details: error.details,
        errorCode: 'API_500',
        severity: 'high',
        suggestions,
      };
    }

    if (statusCode === 502 || statusCode === 503) {
      const suggestions = [
        'The service is temporarily unavailable',
        'Wait a few minutes and try again',
        'Check if there is scheduled maintenance',
      ];

      return {
        message: 'The service is temporarily unavailable. Please try again in a few moments.',
        action: 'RETRY_WITH_BACKOFF',
        retryable: true,
        details: error.details,
        errorCode: `API_${statusCode}`,
        severity: 'high',
        suggestions,
      };
    }

    if (statusCode === 504) {
      const suggestions = [
        'The request took too long to complete',
        'Try again with a smaller data set',
        'Check your network connection',
      ];

      return {
        message: 'The request timed out. Please try again.',
        action: 'RETRY_ONCE',
        retryable: true,
        details: error.details,
        errorCode: 'API_504',
        severity: 'medium',
        suggestions,
      };
    }

    if (statusCode && statusCode >= 500) {
      return {
        message: 'The service is experiencing issues. Please try again later.',
        action: 'RETRY_WITH_BACKOFF',
        retryable: true,
        details: error.details,
        errorCode: `API_${statusCode}`,
        severity: 'high',
        suggestions: ['Wait and retry', 'Contact support if issue persists'],
      };
    }

    return {
      message: errorMessage || 'An error occurred while processing your request.',
      action: 'RETRY_ONCE',
      retryable: true,
      details: error.details,
      errorCode: 'API_UNKNOWN',
      severity: 'medium',
      suggestions: ['Try again', 'Check your request parameters'],
    };
  }

  /**
   * Handle network errors with detailed diagnostics
   */
  private static handleNetworkError(error: ApiError): UserFriendlyError {
    const details = error.details as any;
    const errorCode = details?.code;

    const suggestions = [
      'Check your internet connection',
      'Verify the Funifier service URL is correct',
      'Check if a firewall is blocking the connection',
      'Try again in a few moments',
    ];

    if (errorCode === 'ECONNABORTED') {
      return {
        message: 'The connection timed out. Please check your internet connection and try again.',
        action: 'RETRY_WITH_BACKOFF',
        retryable: true,
        details: error.details,
        errorCode: 'NET_TIMEOUT',
        severity: 'medium',
        suggestions,
      };
    }

    if (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED') {
      return {
        message: 'Unable to reach the Funifier service. Please check your connection and service configuration.',
        action: 'CHECK_CONFIGURATION',
        retryable: true,
        details: error.details,
        errorCode: 'NET_UNREACHABLE',
        severity: 'high',
        suggestions: [
          'Verify the Funifier service URL in your configuration',
          'Check if the service is online',
          'Verify your network allows outbound connections',
        ],
      };
    }

    return {
      message: 'Connection failed. Please check your internet connection and try again.',
      action: 'RETRY_WITH_BACKOFF',
      retryable: true,
      details: error.details,
      errorCode: 'NET_ERROR',
      severity: 'medium',
      suggestions,
    };
  }

  /**
   * Handle validation errors with field-specific guidance
   */
  private static handleValidationError(error: ApiError): UserFriendlyError {
    const details = error.details as any;
    const validationErrors = details?.validationErrors || [];

    const suggestions = [
      'Review the highlighted fields',
      'Ensure all required fields are filled',
      'Check data format requirements',
    ];

    if (validationErrors.length > 0) {
      const fieldErrors = validationErrors.map((err: any) => err.field).join(', ');
      return {
        message: `Validation failed for: ${fieldErrors}. ${error.message}`,
        action: 'NONE',
        retryable: false,
        details: error.details,
        errorCode: 'VALIDATION_FAILED',
        severity: 'low',
        suggestions,
      };
    }

    return {
      message: error.message || 'The provided data is invalid. Please check your input.',
      action: 'NONE',
      retryable: false,
      details: error.details,
      errorCode: 'VALIDATION_ERROR',
      severity: 'low',
      suggestions,
    };
  }

  /**
   * Handle unknown errors with fallback guidance
   */
  private static handleUnknownError(error: ApiError): UserFriendlyError {
    const suggestions = [
      'Try refreshing the page',
      'Clear your browser cache',
      'Try again in a few moments',
      'Contact support if the issue persists',
    ];

    return {
      message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      action: 'RETRY_ONCE',
      retryable: true,
      details: error.details,
      errorCode: 'UNKNOWN_ERROR',
      severity: 'medium',
      suggestions,
    };
  }

  /**
   * Execute a function with enhanced retry logic and exponential backoff
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: ErrorContext
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;
    let delay = retryConfig.initialDelay;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const apiError = error as ApiError;

        // Check custom retry condition if provided
        if (retryConfig.shouldRetry && !retryConfig.shouldRetry(apiError, attempt)) {
          throw error;
        }

        // Don't retry if error is not retryable
        if (!apiError.retryable || attempt === retryConfig.maxAttempts) {
          // Log final failure
          this.logError(apiError, {
            ...context,
            attempts: attempt,
            finalAttempt: true,
          });
          throw error;
        }

        // Calculate delay with optional jitter
        let nextDelay = delay;
        if (retryConfig.jitterEnabled) {
          const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
          nextDelay = delay + jitter;
        }

        // Log retry attempt
        console.warn(
          `Retry attempt ${attempt}/${retryConfig.maxAttempts} after ${Math.round(nextDelay)}ms delay`,
          {
            error: apiError.message,
            type: apiError.type,
            operation: context?.operation,
          }
        );

        // Wait before retrying with exponential backoff
        await this.sleep(nextDelay);
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Execute multiple operations with circuit breaker pattern
   */
  static async withCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
      onOpen?: () => void;
      onHalfOpen?: () => void;
      onClose?: () => void;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      resetTimeout = 60000, // 1 minute
      onOpen,
      onHalfOpen,
      onClose,
    } = options;

    // Simple circuit breaker implementation
    // In production, consider using a library like opossum
    const recentErrors = this.errorHistory.filter(
      (entry) => Date.now() - entry.timestamp.getTime() < resetTimeout
    );

    if (recentErrors.length >= failureThreshold) {
      if (onOpen) onOpen();
      throw new Error('Circuit breaker is open. Too many recent failures.');
    }

    try {
      const result = await fn();
      if (onClose) onClose();
      return result;
    } catch (error) {
      if (recentErrors.length + 1 >= failureThreshold && onHalfOpen) {
        onHalfOpen();
      }
      throw error;
    }
  }

  /**
   * Execute a function with timeout
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Sleep for a specified duration
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log error with enhanced context and tracking
   */
  static logError(error: ApiError | Error, context?: Record<string, unknown>): void {
    const errorData = {
      message: error.message,
      timestamp: new Date().toISOString(),
      context,
      ...(error instanceof Error && { stack: error.stack }),
      ...('type' in error && { type: error.type }),
      ...('details' in error && { details: error.details }),
      ...('retryable' in error && { retryable: error.retryable }),
    };

    // Determine log level based on error type
    const logLevel = this.getLogLevel(error as ApiError);
    
    if (logLevel === 'error') {
      console.error('Error occurred:', errorData);
    } else if (logLevel === 'warn') {
      console.warn('Warning:', errorData);
    } else {
      console.info('Info:', errorData);
    }

    // In production, send to error tracking service
    // e.g., Sentry, LogRocket, DataDog, etc.
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      (window as any).errorTracker.captureError(errorData);
    }
  }

  /**
   * Determine appropriate log level for error
   */
  private static getLogLevel(error: ApiError): 'error' | 'warn' | 'info' {
    if (error.type === ErrorType.AUTHENTICATION_ERROR) {
      return 'warn';
    }
    if (error.type === ErrorType.VALIDATION_ERROR) {
      return 'info';
    }
    if (error.retryable) {
      return 'warn';
    }
    return 'error';
  }

  /**
   * Create a fallback error response with enhanced options
   */
  static createFallbackError(
    message: string,
    options: {
      action?: ErrorAction;
      retryable?: boolean;
      severity?: ErrorSeverity;
      suggestions?: string[];
    } = {}
  ): UserFriendlyError {
    return {
      message,
      action: options.action || 'RETRY_ONCE',
      retryable: options.retryable ?? true,
      errorCode: 'FALLBACK_ERROR',
      severity: options.severity || 'medium',
      suggestions: options.suggestions || ['Try again', 'Contact support if issue persists'],
    };
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverableError(error: ApiError): boolean {
    return error.retryable && error.type !== ErrorType.AUTHENTICATION_ERROR;
  }

  /**
   * Get user-friendly error message for display
   */
  static getUserMessage(error: ApiError, context?: ErrorContext): string {
    const userError = this.handleFunifierError(error, context);
    return userError.message;
  }

  /**
   * Get error recovery suggestions
   */
  static getRecoverySuggestions(error: ApiError): string[] {
    const userError = this.handleFunifierError(error);
    return userError.suggestions || [];
  }

  /**
   * Format error for user display
   */
  static formatErrorForDisplay(error: ApiError, context?: ErrorContext): {
    title: string;
    message: string;
    severity: ErrorSeverity;
    suggestions: string[];
    canRetry: boolean;
  } {
    const userError = this.handleFunifierError(error, context);
    
    return {
      title: this.getErrorTitle(error.type),
      message: userError.message,
      severity: userError.severity || 'medium',
      suggestions: userError.suggestions || [],
      canRetry: userError.retryable,
    };
  }

  /**
   * Get error title based on type
   */
  private static getErrorTitle(errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.AUTHENTICATION_ERROR:
        return 'Authentication Error';
      case ErrorType.NETWORK_ERROR:
        return 'Connection Error';
      case ErrorType.VALIDATION_ERROR:
        return 'Validation Error';
      case ErrorType.FUNIFIER_API_ERROR:
        return 'Service Error';
      default:
        return 'Error';
    }
  }
}
