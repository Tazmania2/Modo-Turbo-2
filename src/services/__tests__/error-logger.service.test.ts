import { vi } from 'vitest';
import { errorLogger } from '../error-logger.service';
import { ErrorType, ErrorSeverity } from '@/types/error';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('ErrorLoggerService', () => {
  beforeEach(() => {
    errorLogger.clearLog();
  });

  describe('logError', () => {
    it('should log an error with all required fields', () => {
      const error = {
        type: ErrorType.AUTHENTICATION_ERROR,
        message: 'Login failed',
        details: { username: 'testuser' },
        timestamp: new Date(),
        retryable: false,
        userMessage: 'Authentication failed. Please check your credentials.'
      };

      const errorId = errorLogger.logError(error);

      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);

      const recentErrors = errorLogger.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].type).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(recentErrors[0].message).toBe('Login failed');
      expect(recentErrors[0].severity).toBe(ErrorSeverity.HIGH);
    });

    it('should include context information when provided', () => {
      const error = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Connection timeout',
        timestamp: new Date(),
        retryable: true,
        userMessage: 'Network connection issue.'
      };

      const context = {
        userId: 'user123',
        url: '/api/test',
        userAgent: 'Mozilla/5.0'
      };

      errorLogger.logError(error, context);

      const recentErrors = errorLogger.getRecentErrors(1);
      expect(recentErrors[0].userId).toBe('user123');
      expect(recentErrors[0].url).toBe('/api/test');
      expect(recentErrors[0].userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('logCustomError', () => {
    it('should create and log a custom error', () => {
      const errorId = errorLogger.logCustomError(
        ErrorType.VALIDATION_ERROR,
        'Invalid input provided',
        { field: 'email' }
      );

      expect(errorId).toBeDefined();

      const recentErrors = errorLogger.getRecentErrors(1);
      expect(recentErrors[0].type).toBe(ErrorType.VALIDATION_ERROR);
      expect(recentErrors[0].message).toBe('Invalid input provided');
      expect(recentErrors[0].details).toEqual({ field: 'email' });
      expect(recentErrors[0].retryable).toBe(false);
    });
  });

  describe('getErrorMetrics', () => {
    beforeEach(() => {
      // Log some test errors
      errorLogger.logCustomError(ErrorType.AUTHENTICATION_ERROR, 'Auth error 1');
      errorLogger.logCustomError(ErrorType.AUTHENTICATION_ERROR, 'Auth error 2');
      errorLogger.logCustomError(ErrorType.NETWORK_ERROR, 'Network error 1');
      errorLogger.logCustomError(ErrorType.VALIDATION_ERROR, 'Validation error 1');
    });

    it('should return correct error metrics', () => {
      const metrics = errorLogger.getErrorMetrics();

      expect(metrics.totalErrors).toBe(4);
      expect(metrics.errorsByType[ErrorType.AUTHENTICATION_ERROR]).toBe(2);
      expect(metrics.errorsByType[ErrorType.NETWORK_ERROR]).toBe(1);
      expect(metrics.errorsByType[ErrorType.VALIDATION_ERROR]).toBe(1);
      expect(metrics.errorsBySeverity[ErrorSeverity.HIGH]).toBe(2); // Auth errors
      expect(metrics.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1); // Network error
      expect(metrics.errorsBySeverity[ErrorSeverity.LOW]).toBe(1); // Validation error
    });

    it('should filter errors by time window', () => {
      const oneHourAgo = 3600000;
      const metrics = errorLogger.getErrorMetrics(oneHourAgo);

      expect(metrics.totalErrors).toBe(4); // All errors are recent
    });
  });

  describe('getErrorsByType', () => {
    beforeEach(() => {
      errorLogger.logCustomError(ErrorType.AUTHENTICATION_ERROR, 'Auth error 1');
      errorLogger.logCustomError(ErrorType.AUTHENTICATION_ERROR, 'Auth error 2');
      errorLogger.logCustomError(ErrorType.NETWORK_ERROR, 'Network error 1');
    });

    it('should return errors of specific type', () => {
      const authErrors = errorLogger.getErrorsByType(ErrorType.AUTHENTICATION_ERROR);
      
      expect(authErrors).toHaveLength(2);
      expect(authErrors.every(error => error.type === ErrorType.AUTHENTICATION_ERROR)).toBe(true);
    });

    it('should respect limit parameter', () => {
      const authErrors = errorLogger.getErrorsByType(ErrorType.AUTHENTICATION_ERROR, 1);
      
      expect(authErrors).toHaveLength(1);
    });
  });

  describe('onError callback', () => {
    it('should call registered callbacks when errors are logged', () => {
      const callback = vi.fn();
      const unsubscribe = errorLogger.onError(callback);

      errorLogger.logCustomError(ErrorType.NETWORK_ERROR, 'Test error');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.NETWORK_ERROR,
          message: 'Test error'
        })
      );

      unsubscribe();

      errorLogger.logCustomError(ErrorType.NETWORK_ERROR, 'Another error');
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
    });
  });

  describe('error severity determination', () => {
    it('should assign correct severity levels', () => {
      errorLogger.logCustomError(ErrorType.AUTHENTICATION_ERROR, 'Auth error');
      errorLogger.logCustomError(ErrorType.FUNIFIER_API_ERROR, 'API error');
      errorLogger.logCustomError(ErrorType.CONFIGURATION_ERROR, 'Config error');
      errorLogger.logCustomError(ErrorType.VALIDATION_ERROR, 'Validation error');
      errorLogger.logCustomError(ErrorType.NETWORK_ERROR, 'Network error');
      errorLogger.logCustomError(ErrorType.WHITE_LABEL_ERROR, 'White label error');

      const errors = errorLogger.getRecentErrors(6);

      expect(errors.find(e => e.type === ErrorType.AUTHENTICATION_ERROR)?.severity).toBe(ErrorSeverity.HIGH);
      expect(errors.find(e => e.type === ErrorType.FUNIFIER_API_ERROR)?.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errors.find(e => e.type === ErrorType.CONFIGURATION_ERROR)?.severity).toBe(ErrorSeverity.HIGH);
      expect(errors.find(e => e.type === ErrorType.VALIDATION_ERROR)?.severity).toBe(ErrorSeverity.LOW);
      expect(errors.find(e => e.type === ErrorType.NETWORK_ERROR)?.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errors.find(e => e.type === ErrorType.WHITE_LABEL_ERROR)?.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('log size management', () => {
    it('should maintain maximum log size', () => {
      // Log more than max size (1000 errors)
      for (let i = 0; i < 1100; i++) {
        errorLogger.logCustomError(ErrorType.NETWORK_ERROR, `Error ${i}`);
      }

      const allErrors = errorLogger.exportLog();
      expect(allErrors.length).toBe(1000);
      
      // Should keep the most recent errors
      expect(allErrors[allErrors.length - 1].message).toBe('Error 1099');
    });
  });
});