import { ErrorType, ApiError, ErrorSeverity } from '@/types/error';

export interface ErrorLogEntry {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
  retryable: boolean;
  userMessage: string;
  context?: Record<string, any>;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: ErrorLogEntry[];
  errorRate: number;
}

class ErrorLoggerService {
  private errorLog: ErrorLogEntry[] = [];
  private maxLogSize = 1000;
  private errorCallbacks: ((error: ErrorLogEntry) => void)[] = [];

  /**
   * Log an error with comprehensive tracking
   */
  logError(error: ApiError, context?: Record<string, any>): string {
    const errorId = this.generateErrorId();
    
    const logEntry: ErrorLogEntry = {
      id: errorId,
      type: error.type,
      severity: this.determineSeverity(error.type),
      message: error.message,
      details: error.details,
      timestamp: error.timestamp || new Date(),
      userId: context?.userId,
      sessionId: context?.sessionId,
      userAgent: context?.userAgent,
      url: context?.url,
      stack: error.details?.stack,
      retryable: error.retryable,
      userMessage: error.userMessage,
      context
    };

    this.addToLog(logEntry);
    this.notifyCallbacks(logEntry);
    
    // Send to external monitoring if configured
    this.sendToExternalMonitoring(logEntry);
    
    return errorId;
  }

  /**
   * Log a custom error
   */
  logCustomError(
    type: ErrorType,
    message: string,
    details?: any,
    context?: Record<string, any>
  ): string {
    const error: ApiError = {
      type,
      message,
      details,
      timestamp: new Date(),
      retryable: this.isRetryableError(type),
      userMessage: this.generateUserMessage(type, message)
    };

    return this.logError(error, context);
  }

  /**
   * Get error metrics for monitoring
   */
  getErrorMetrics(timeWindow?: number): ErrorMetrics {
    const cutoffTime = timeWindow 
      ? new Date(Date.now() - timeWindow)
      : new Date(0);

    const recentErrors = this.errorLog.filter(
      error => error.timestamp >= cutoffTime
    );

    const errorsByType = recentErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    const errorsBySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const errorRate = timeWindow 
      ? (recentErrors.length / (timeWindow / 1000 / 60)) // errors per minute
      : 0;

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: recentErrors.slice(-10),
      errorRate
    };
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorType, limit = 50): ErrorLogEntry[] {
    return this.errorLog
      .filter(error => error.type === type)
      .slice(-limit);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 50): ErrorLogEntry[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Subscribe to error notifications
   */
  onError(callback: (error: ErrorLogEntry) => void): () => void {
    this.errorCallbacks.push(callback);
    
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log for analysis
   */
  exportLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  private addToLog(entry: ErrorLogEntry): void {
    this.errorLog.push(entry);
    
    // Maintain max log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  private notifyCallbacks(error: ErrorLogEntry): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTHENTICATION_ERROR:
        return ErrorSeverity.HIGH;
      case ErrorType.FUNIFIER_API_ERROR:
        return ErrorSeverity.MEDIUM;
      case ErrorType.CONFIGURATION_ERROR:
        return ErrorSeverity.HIGH;
      case ErrorType.VALIDATION_ERROR:
        return ErrorSeverity.LOW;
      case ErrorType.NETWORK_ERROR:
        return ErrorSeverity.MEDIUM;
      case ErrorType.WHITE_LABEL_ERROR:
        return ErrorSeverity.HIGH;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private isRetryableError(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.FUNIFIER_API_ERROR
    ].includes(type);
  }

  private generateUserMessage(type: ErrorType, message: string): string {
    switch (type) {
      case ErrorType.AUTHENTICATION_ERROR:
        return 'Authentication failed. Please check your credentials and try again.';
      case ErrorType.FUNIFIER_API_ERROR:
        return 'Service temporarily unavailable. Please try again in a moment.';
      case ErrorType.CONFIGURATION_ERROR:
        return 'Configuration error detected. Please contact your administrator.';
      case ErrorType.VALIDATION_ERROR:
        return 'Invalid input provided. Please check your data and try again.';
      case ErrorType.NETWORK_ERROR:
        return 'Network connection issue. Please check your internet connection.';
      case ErrorType.WHITE_LABEL_ERROR:
        return 'System configuration error. Please contact support.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private async sendToExternalMonitoring(error: ErrorLogEntry): Promise<void> {
    try {
      // Only send high severity errors to external monitoring
      if (error.severity === ErrorSeverity.HIGH) {
        // This would integrate with external services like Sentry, LogRocket, etc.
        console.error('High severity error logged:', {
          id: error.id,
          type: error.type,
          message: error.message,
          timestamp: error.timestamp
        });
      }
    } catch (err) {
      console.error('Failed to send error to external monitoring:', err);
    }
  }
}

export const errorLogger = new ErrorLoggerService();