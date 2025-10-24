# Enhanced Error Handling System

## Overview

This document describes the comprehensive error handling system implemented for the Funifier API integration. The system provides robust error management, retry mechanisms with exponential backoff, user-friendly error messages, and fallback strategies.

## Key Components

### 1. ErrorHandlerService

The central error handling service that provides:

- **Comprehensive error type handling** (Authentication, API, Network, Validation)
- **Retry mechanisms** with exponential backoff and jitter
- **Circuit breaker pattern** for preventing cascading failures
- **Error tracking and analysis** for monitoring patterns
- **User-friendly error messages** with actionable suggestions

### 2. FallbackService

Provides caching and fallback strategies:

- **Cache management** with LRU eviction
- **Stale-while-revalidate** strategy for better UX
- **Batch operations** for efficient data fetching
- **Cache health monitoring** and metrics
- **Emergency fallback** to expired cache data

### 3. Enhanced FunifierApiClient

Integrated with error handling:

- **Automatic retry** with exponential backoff
- **Request/response interceptors** for consistent error handling
- **Token management** with automatic refresh
- **Comprehensive error types** for all API responses

## Error Types

### ErrorType Enum

```typescript
enum ErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  FUNIFIER_API_ERROR = 'FUNIFIER_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
```

### UserFriendlyError Interface

```typescript
interface UserFriendlyError {
  message: string;              // User-friendly error message
  action: ErrorAction;          // Recommended action
  retryable: boolean;           // Whether the operation can be retried
  details?: unknown;            // Original error details
  errorCode?: string;           // Specific error code
  severity?: ErrorSeverity;     // Error severity level
  suggestions?: string[];       // Recovery suggestions
}
```

## Usage Examples

### Basic API Call with Retry

```typescript
import { ErrorHandlerService } from './error-handler.service';
import { funifierApiClient } from './funifier-api-client';

async function fetchUserData(userId: string) {
  try {
    return await ErrorHandlerService.withRetry(
      () => funifierApiClient.getUserProfile(userId),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitterEnabled: true,
      },
      {
        operation: 'fetchUserData',
        userId,
      }
    );
  } catch (error) {
    const userError = ErrorHandlerService.handleFunifierError(error);
    console.error(userError.message);
    console.error('Suggestions:', userError.suggestions);
    throw error;
  }
}
```

### API Call with Fallback to Cache

```typescript
import { FallbackService } from './fallback.service';

const fallbackService = new FallbackService();

async function fetchDashboard(userId: string) {
  return fallbackService.getWithFallback(
    () => funifierApiClient.getUserDashboard(userId),
    {
      cacheKey: `dashboard-${userId}`,
      cacheDuration: 5 * 60 * 1000, // 5 minutes
      fallbackData: { /* minimal data */ },
      errorContext: { operation: 'fetchDashboard', userId },
      retryOnError: true,
      staleWhileRevalidate: true,
    }
  );
}
```

### Circuit Breaker Pattern

```typescript
async function saveConfiguration(config: any) {
  return ErrorHandlerService.withCircuitBreaker(
    () => funifierApiClient.saveWhiteLabelConfig(config),
    {
      failureThreshold: 5,
      resetTimeout: 60000,
      onOpen: () => console.warn('Circuit breaker opened'),
      onClose: () => console.info('Circuit breaker closed'),
    }
  );
}
```

### Timeout Handling

```typescript
async function fetchWithTimeout<T>(operation: () => Promise<T>) {
  return ErrorHandlerService.withTimeout(
    operation,
    10000, // 10 seconds
    'Operation timed out'
  );
}
```

### Batch Operations

```typescript
const fallbackService = new FallbackService();

async function batchFetchUsers(userIds: string[]) {
  const fetchers = userIds.map(userId => ({
    key: `user-${userId}`,
    fetcher: () => funifierApiClient.getUserProfile(userId),
    fallback: { _id: userId, name: 'Unknown' },
  }));

  return fallbackService.batchGetWithFallback(fetchers, {
    cacheDuration: 10 * 60 * 1000,
    parallel: true,
  });
}
```

## Error Handling Strategies

### 1. Retry with Exponential Backoff

Automatically retries failed requests with increasing delays:

- **Initial delay**: 1 second
- **Backoff multiplier**: 2x
- **Max delay**: 10 seconds
- **Jitter**: Up to 30% randomization to prevent thundering herd

### 2. Circuit Breaker

Prevents cascading failures by temporarily stopping requests after repeated failures:

- **Failure threshold**: 5 consecutive failures
- **Reset timeout**: 60 seconds
- **States**: Closed → Open → Half-Open → Closed

### 3. Stale-While-Revalidate

Returns cached data immediately while fetching fresh data in the background:

- Improves perceived performance
- Ensures data freshness
- Graceful degradation

### 4. Emergency Fallback

Uses expired cache data as last resort:

- Better than complete failure
- Clearly indicates stale data
- Allows partial functionality

## Error Severity Levels

- **Low**: Validation errors, expected failures
- **Medium**: Temporary API issues, network problems
- **High**: Authentication failures, service outages
- **Critical**: System-wide failures, data corruption

## Error Actions

- **REDIRECT_TO_LOGIN**: Session expired, re-authentication needed
- **RETRY_WITH_BACKOFF**: Temporary failure, retry with delay
- **RETRY_ONCE**: Single retry recommended
- **SHOW_SETUP_GUIDE**: Missing configuration
- **CONTACT_SUPPORT**: Requires manual intervention
- **CHECK_CONFIGURATION**: Configuration issue
- **WAIT_AND_RETRY**: Rate limited, wait before retry
- **NONE**: No automatic action available

## Monitoring and Analytics

### Error Pattern Analysis

```typescript
const analysis = ErrorHandlerService.analyzeErrorPatterns();
console.log({
  totalErrors: analysis.totalErrors,
  recentErrors: analysis.recentErrors,
  errorsByType: analysis.errorsByType,
  suggestions: analysis.suggestions,
});
```

### Cache Health Monitoring

```typescript
const health = fallbackService.getCacheHealth();
console.log({
  totalEntries: health.totalEntries,
  validEntries: health.validEntries,
  hitRate: health.hitRate,
  averageAge: health.averageAge,
});
```

### Error History

```typescript
const history = ErrorHandlerService.getErrorHistory();
// Returns last 50 errors with timestamps and context
```

## Best Practices

### 1. Always Provide Context

```typescript
const context = {
  operation: 'saveUserProfile',
  userId: user.id,
  endpoint: '/api/users',
  timestamp: new Date(),
};

await ErrorHandlerService.withRetry(operation, config, context);
```

### 2. Use Appropriate Cache Duration

- **User profiles**: 10-15 minutes
- **Dashboard data**: 5 minutes
- **Ranking data**: 2-3 minutes
- **Configuration**: 30 minutes

### 3. Implement Graceful Degradation

Always provide fallback data for critical UI components:

```typescript
fallbackData: {
  player: { _id: userId, name: 'User' },
  achievements: [],
  recentActivity: [],
}
```

### 4. Handle Errors in UI Components

```typescript
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  const userError = ErrorHandlerService.handleFunifierError(error);
  setError(userError);
  // Display error.message and error.suggestions to user
}
```

### 5. Monitor Error Patterns

Regularly check error patterns to identify systemic issues:

```typescript
// Run periodically or on dashboard
const analysis = ErrorHandlerService.analyzeErrorPatterns();
if (analysis.recentErrors > 10) {
  // Alert operations team
}
```

### 6. Clear Error History Periodically

```typescript
// Clear old errors to prevent memory issues
ErrorHandlerService.clearErrorHistory();
```

### 7. Use Circuit Breaker for Critical Operations

Protect critical operations from cascading failures:

```typescript
await ErrorHandlerService.withCircuitBreaker(
  criticalOperation,
  { failureThreshold: 5, resetTimeout: 60000 }
);
```

## Integration with External Services

### Error Tracking Services

The system is designed to integrate with error tracking services:

```typescript
// In production, errors are automatically sent to tracking service
if (typeof window !== 'undefined' && window.errorTracker) {
  window.errorTracker.captureError(errorData);
}
```

Supported services:
- Sentry
- LogRocket
- DataDog
- New Relic

### Monitoring Dashboards

Error metrics can be exported to monitoring dashboards:

```typescript
const stats = {
  errors: ErrorHandlerService.analyzeErrorPatterns(),
  cache: fallbackService.getCacheHealth(),
};

// Send to monitoring service
monitoringService.sendMetrics(stats);
```

## Testing

### Unit Tests

Test error handling logic:

```typescript
describe('ErrorHandlerService', () => {
  it('should retry failed requests', async () => {
    let attempts = 0;
    const operation = () => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
      return Promise.resolve('success');
    };

    const result = await ErrorHandlerService.withRetry(operation);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```

### Integration Tests

Test with actual API calls:

```typescript
describe('Funifier API with error handling', () => {
  it('should handle network errors gracefully', async () => {
    // Simulate network failure
    const result = await fallbackService.getWithFallback(
      () => Promise.reject(new Error('Network error')),
      {
        cacheKey: 'test',
        fallbackData: { default: true },
      }
    );

    expect(result).toEqual({ default: true });
  });
});
```

## Troubleshooting

### High Error Rate

If you see many errors:

1. Check error patterns: `ErrorHandlerService.analyzeErrorPatterns()`
2. Verify Funifier service status
3. Check network connectivity
4. Review recent code changes

### Low Cache Hit Rate

If cache performance is poor:

1. Check cache health: `fallbackService.getCacheHealth()`
2. Adjust cache duration
3. Implement cache warming
4. Review cache invalidation logic

### Circuit Breaker Frequently Opening

If circuit breaker opens often:

1. Increase failure threshold
2. Increase reset timeout
3. Investigate root cause of failures
4. Consider service degradation

## Future Enhancements

Potential improvements:

1. **Distributed caching** with Redis
2. **Advanced circuit breaker** with half-open state
3. **Request deduplication** for identical concurrent requests
4. **Adaptive retry strategies** based on error patterns
5. **Real-time error dashboards** with WebSocket updates
6. **Automatic error recovery** for known issues
7. **Machine learning** for error prediction

## References

- [Exponential Backoff Algorithm](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Stale-While-Revalidate](https://web.dev/stale-while-revalidate/)
- [Error Handling Best Practices](https://www.joyent.com/node-js/production/design/errors)

## Support

For questions or issues with the error handling system:

1. Check this documentation
2. Review error-handling-examples.ts
3. Check error logs and patterns
4. Contact the development team
