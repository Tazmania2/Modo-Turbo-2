/**
 * Middleware exports for the white-label gamification platform
 * Provides authentication, validation, error handling, and security middleware
 */

// Authentication middleware
export {
  withAuth,
  withAdminAuth,
  withOptionalAuth,
  validateAuth,
  type AuthMiddlewareOptions,
} from './auth';

// Error handling middleware
export {
  handleApiError,
  createApiError,
  withErrorHandler,
  createNotFoundResponse,
  createValidationErrorResponse,
  ErrorType,
  type ApiError,
} from './error-handler';

// Validation and sanitization middleware
export {
  sanitizeString,
  sanitizeObject,
  validateRequestBody,
  validateQueryParams,
  validateRouteParams,
  validateRequest,
  validateRateLimit,
  withValidation,
  commonSchemas,
} from './validation';

// Security middleware
export { withSecurity, type SecurityOptions } from './security';