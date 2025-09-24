import { NextResponse } from 'next/server';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  handleApiError,
  createApiError,
  createNotFoundResponse,
  createValidationErrorResponse,
  ErrorType,
} from '../error-handler';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      json: data,
      status: init?.status || 200,
    })),
  },
}));

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createApiError', () => {
    it('should create a standardized API error', () => {
      const error = createApiError(
        ErrorType.VALIDATION_ERROR,
        'Test error',
        'User message',
        { field: 'test' },
        true,
        400
      );

      expect(error).toMatchObject({
        type: ErrorType.VALIDATION_ERROR,
        message: 'Test error',
        userMessage: 'User message',
        details: { field: 'test' },
        retryable: true,
        statusCode: 400,
      });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use default user message when not provided', () => {
      const error = createApiError(
        ErrorType.AUTHENTICATION_ERROR,
        'Auth failed'
      );

      expect(error.userMessage).toBe('Authentication failed. Please log in again.');
    });
  });

  describe('handleApiError', () => {
    it('should handle known API errors', () => {
      const apiError = createApiError(
        ErrorType.FUNIFIER_API_ERROR,
        'Funifier down',
        undefined,
        undefined,
        true,
        503
      );

      const response = handleApiError(apiError, 'test context');

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unable to connect to Funifier services. Please try again later.',
          type: ErrorType.FUNIFIER_API_ERROR,
          retryable: true,
        }),
        { status: 503 }
      );
    });

    it('should handle Funifier API errors by message', () => {
      const error = new Error('Funifier API connection failed');

      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unable to connect to Funifier services. Please try again later.',
          type: ErrorType.FUNIFIER_API_ERROR,
          retryable: true,
        }),
        { status: 503 }
      );
    });

    it('should handle validation errors by message', () => {
      const error = new Error('validation failed for field');

      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request data. Please check your input and try again.',
          type: ErrorType.VALIDATION_ERROR,
          retryable: false,
        }),
        { status: 400 }
      );
    });

    it('should handle network errors by message', () => {
      const error = new Error('network timeout occurred');

      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network connection error. Please check your connection and try again.',
          type: ErrorType.NETWORK_ERROR,
          retryable: true,
        }),
        { status: 503 }
      );
    });

    it('should handle authentication errors by message', () => {
      const error = new Error('unauthorized access');

      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication failed. Please log in again.',
          type: ErrorType.AUTHENTICATION_ERROR,
          retryable: false,
        }),
        { status: 401 }
      );
    });

    it('should handle permission errors by message', () => {
      const error = new Error('access denied for user');

      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'You do not have permission to access this resource.',
          type: ErrorType.PERMISSION_ERROR,
          retryable: false,
        }),
        { status: 403 }
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unable to connect to Funifier services. Please try again later.',
          type: ErrorType.FUNIFIER_API_ERROR,
          retryable: false,
        }),
        { status: 500 }
      );
    });

    it('should include details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const response = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.any(String), // Stack trace
        }),
        expect.any(Object)
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createNotFoundResponse', () => {
    it('should create a 404 response', () => {
      const response = createNotFoundResponse('User');

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'The requested resource was not found.',
          type: ErrorType.NOT_FOUND_ERROR,
          retryable: false,
        }),
        { status: 404 }
      );
    });

    it('should create a generic 404 response without resource', () => {
      const response = createNotFoundResponse();

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'The requested resource was not found.',
          type: ErrorType.NOT_FOUND_ERROR,
        }),
        { status: 404 }
      );
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create a validation error response', () => {
      const response = createValidationErrorResponse(
        'Invalid input',
        { field: 'username' }
      );

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request data. Please check your input and try again.',
          type: ErrorType.VALIDATION_ERROR,
          retryable: false,
          details: { field: 'username' },
        }),
        { status: 400 }
      );
    });
  });
});