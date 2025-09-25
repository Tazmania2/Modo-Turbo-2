import { NextRequest, NextResponse } from 'next/server';
import { errorLogger } from '@/services/error-logger.service';

export enum ErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  FUNIFIER_API_ERROR = 'FUNIFIER_API_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  WHITE_LABEL_ERROR = 'WHITE_LABEL_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
  statusCode: number;
}

/**
 * Creates a standardized API error object
 */
export function createApiError(
  type: ErrorType,
  message: string,
  userMessage?: string,
  details?: any,
  retryable = false,
  statusCode = 500
): ApiError {
  return {
    type,
    message,
    details,
    timestamp: new Date(),
    retryable,
    userMessage: userMessage || getDefaultUserMessage(type),
    statusCode,
  };
}

/**
 * Gets default user-friendly message for error types
 */
function getDefaultUserMessage(type: ErrorType): string {
  switch (type) {
    case ErrorType.AUTHENTICATION_ERROR:
      return 'Authentication failed. Please log in again.';
    case ErrorType.FUNIFIER_API_ERROR:
      return 'Unable to connect to Funifier services. Please try again later.';
    case ErrorType.CONFIGURATION_ERROR:
      return 'System configuration error. Please contact your administrator.';
    case ErrorType.VALIDATION_ERROR:
      return 'Invalid request data. Please check your input and try again.';
    case ErrorType.NETWORK_ERROR:
      return 'Network connection error. Please check your connection and try again.';
    case ErrorType.WHITE_LABEL_ERROR:
      return 'White-label configuration error. Please contact support.';
    case ErrorType.NOT_FOUND_ERROR:
      return 'The requested resource was not found.';
    case ErrorType.PERMISSION_ERROR:
      return 'You do not have permission to access this resource.';
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Handles API errors and returns appropriate NextResponse
 */
export function handleApiError(
  error: unknown,
  context?: string,
  defaultStatusCode = 500,
  request?: NextRequest
): NextResponse {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

  let apiError: ApiError;

  // Handle known API errors
  if (error && typeof error === 'object' && 'type' in error && 'statusCode' in error) {
    apiError = error as ApiError;
  }

  // Handle Funifier API errors
  else if (error instanceof Error && error.message.includes('Funifier')) {
    apiError = createApiError(
      ErrorType.FUNIFIER_API_ERROR,
      error.message,
      undefined,
      error,
      true,
      503
    );
  }

  // Handle validation errors
  else if (error instanceof Error && (
    error.message.includes('validation') ||
    error.message.includes('invalid') ||
    error.message.includes('required')
  )) {
    apiError = createApiError(
      ErrorType.VALIDATION_ERROR,
      error.message,
      undefined,
      error,
      false,
      400
    );
  }

  // Handle network errors
  else if (error instanceof Error && (
    error.message.includes('network') ||
    error.message.includes('timeout') ||
    error.message.includes('connection')
  )) {
    apiError = createApiError(
      ErrorType.NETWORK_ERROR,
      error.message,
      undefined,
      error,
      true,
      503
    );
  }

  // Handle authentication errors
  else if (error instanceof Error && (
    error.message.includes('unauthorized') ||
    error.message.includes('authentication') ||
    error.message.includes('token')
  )) {
    apiError = createApiError(
      ErrorType.AUTHENTICATION_ERROR,
      error.message,
      undefined,
      error,
      false,
      401
    );
  }

  // Handle permission errors
  else if (error instanceof Error && (
    error.message.includes('forbidden') ||
    error.message.includes('permission') ||
    error.message.includes('access denied')
  )) {
    apiError = createApiError(
      ErrorType.PERMISSION_ERROR,
      error.message,
      undefined,
      error,
      false,
      403
    );
  }

  // Handle generic errors
  else {
    apiError = createApiError(
      ErrorType.CONFIGURATION_ERROR,
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      error,
      false,
      defaultStatusCode
    );
  }

  // Log the error with context
  const requestContext = request ? {
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    context
  } : { context };

  const errorId = errorLogger.logError({
    type: apiError.type,
    message: apiError.message,
    details: apiError.details,
    timestamp: apiError.timestamp,
    retryable: apiError.retryable,
    userMessage: apiError.userMessage
  }, requestContext);

  return NextResponse.json(
    {
      error: apiError.userMessage,
      errorId,
      type: apiError.type,
      retryable: apiError.retryable,
      timestamp: apiError.timestamp,
      ...(process.env.NODE_ENV === 'development' && {
        details: apiError.details,
        message: apiError.message,
        stack: error instanceof Error ? error.stack : undefined,
      }),
    },
    { status: apiError.statusCode }
  );
}

/**
 * Middleware wrapper for error handling
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract request from args if available
      const request = args.find(arg => arg && typeof arg === 'object' && 'url' in arg) as NextRequest | undefined;
      return handleApiError(error, undefined, 500, request);
    }
  };
}

/**
 * Creates a 404 Not Found response
 */
export function createNotFoundResponse(resource?: string): NextResponse {
  const message = resource ? `${resource} not found` : 'Resource not found';
  const apiError = createApiError(
    ErrorType.NOT_FOUND_ERROR,
    message,
    undefined,
    undefined,
    false,
    404
  );

  return NextResponse.json(
    {
      error: apiError.userMessage,
      type: apiError.type,
      retryable: apiError.retryable,
      timestamp: apiError.timestamp,
    },
    { status: 404 }
  );
}

/**
 * Creates a validation error response
 */
export function createValidationErrorResponse(
  message: string,
  details?: any
): NextResponse {
  const apiError = createApiError(
    ErrorType.VALIDATION_ERROR,
    message,
    undefined,
    details,
    false,
    400
  );

  return NextResponse.json(
    {
      error: apiError.userMessage,
      type: apiError.type,
      retryable: apiError.retryable,
      timestamp: apiError.timestamp,
      ...(details && { details }),
    },
    { status: 400 }
  );
}