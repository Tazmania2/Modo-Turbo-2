# Funifier API Integration Services

This directory contains the core services for integrating with the Funifier API. These services provide a comprehensive interface for authentication, data management, and player interactions.

## Services Overview

### 1. FunifierApiClient (`funifier-api-client.ts`)

The base HTTP client that handles all communication with the Funifier API.

**Features:**
- Automatic token management and refresh
- Exponential backoff retry logic
- Comprehensive error handling and classification
- Request/response interceptors for authentication
- Support for multiple Funifier server instances

**Usage:**
```typescript
import { funifierApiClient } from '@/services';

// Set credentials
funifierApiClient.setCredentials({
  apiKey: 'your-api-key',
  serverUrl: 'https://your-funifier-instance.com',
  authToken: 'your-auth-token',
});

// Make API calls
const data = await funifierApiClient.get('/v3/player/123/status');
```

### 2. FunifierAuthService (`funifier-auth.service.ts`)

Handles user authentication and session management.

**Features:**
- User login/logout with username/password
- Admin role verification via Funifier principal endpoint
- JWT token management and automatic refresh
- Session validation and persistence
- Credential validation

**Usage:**
```typescript
import { funifierAuthService } from '@/services';

// Initialize with credentials
funifierAuthService.initialize(credentials);

// Login
const authResponse = await funifierAuthService.login({
  username: 'user@example.com',
  password: 'password',
});

// Verify admin role
const adminCheck = await funifierAuthService.verifyAdminRole();

// Check authentication status
const isAuthenticated = funifierAuthService.isAuthenticated();
```

### 3. FunifierDatabaseService (`funifier-database.service.ts`)

Provides CRUD operations for Funifier's custom database collections.

**Features:**
- Collection management (create, drop, check existence)
- Document operations (insert, find, update, delete)
- Aggregation queries for complex data processing
- Batch operations for performance
- Index management

**Usage:**
```typescript
import { funifierDatabaseService } from '@/services';

// Create a collection
await funifierDatabaseService.createCollection('my_collection');

// Insert a document
const result = await funifierDatabaseService.insertOne('my_collection', {
  name: 'Test Document',
  value: 123,
});

// Find documents
const documents = await funifierDatabaseService.find('my_collection', {
  filter: { name: 'Test Document' },
  limit: 10,
});

// Update a document
await funifierDatabaseService.updateById('my_collection', documentId, {
  value: 456,
});
```

### 4. FunifierPlayerService (`funifier-player.service.ts`)

Manages player data, leaderboards, and performance metrics.

**Features:**
- Player status and profile retrieval
- Leaderboard management and ranking queries
- Contextual ranking (top players + user context)
- Team management and member queries
- Performance data aggregation
- Historical data access

**Usage:**
```typescript
import { funifierPlayerService } from '@/services';

// Get player status
const player = await funifierPlayerService.getPlayerStatus('player123');

// Get leaderboards
const leaderboards = await funifierPlayerService.getLeaderboards({ active: true });

// Get contextual ranking
const ranking = await funifierPlayerService.getContextualRanking(
  'leaderboard123',
  'player123'
);

// Get team members
const teamMembers = await funifierPlayerService.getTeamMembers('team-alpha');
```

## Error Handling

All services use a consistent error handling approach:

```typescript
import { ErrorType, type ApiError } from '@/services';

try {
  const data = await funifierPlayerService.getPlayerStatus('player123');
} catch (error) {
  const apiError = error as ApiError;
  
  switch (apiError.type) {
    case ErrorType.AUTHENTICATION_ERROR:
      // Handle authentication issues
      break;
    case ErrorType.NETWORK_ERROR:
      // Handle network connectivity issues
      break;
    case ErrorType.FUNIFIER_API_ERROR:
      // Handle Funifier API errors
      break;
    default:
      // Handle other errors
      break;
  }
}
```

## Configuration

### Environment Variables

The services can be configured using environment variables:

```env
NEXT_PUBLIC_FUNIFIER_SERVER_URL=https://service2.funifier.com
FUNIFIER_API_KEY=your-api-key
FUNIFIER_AUTH_TOKEN=your-auth-token
```

### Credentials Management

For production deployments, credentials should be encrypted and stored securely:

```typescript
import { funifierAuthService } from '@/services';

// Validate credentials before use
const isValid = await funifierAuthService.validateCredentials({
  apiKey: process.env.FUNIFIER_API_KEY!,
  serverUrl: process.env.NEXT_PUBLIC_FUNIFIER_SERVER_URL!,
  authToken: process.env.FUNIFIER_AUTH_TOKEN!,
});

if (isValid) {
  funifierAuthService.initialize(credentials);
}
```

## Testing

All services include comprehensive unit tests. Run tests with:

```bash
npm test src/services
```

The tests use Vitest and include:
- Unit tests for all public methods
- Error handling scenarios
- Mock implementations for external dependencies
- Integration test examples

## Integration Example

See `examples/integration-example.ts` for a complete example of how to use all services together to:

1. Authenticate with Funifier
2. Set up white-label configurations
3. Fetch player dashboard data
4. Manage leaderboards and rankings
5. Handle team data

## Performance Considerations

### Caching

The services implement several caching strategies:

- **Token Caching**: Access tokens are cached until expiration
- **Player Data**: Consider implementing Redis caching for frequently accessed player data
- **Leaderboard Data**: Cache leaderboard results for improved performance

### Rate Limiting

The API client includes automatic retry logic with exponential backoff to handle rate limits gracefully.

### Batch Operations

Use batch operations when possible:

```typescript
// Instead of multiple individual calls
const players = await Promise.all(
  playerIds.map(id => funifierPlayerService.getPlayerStatus(id))
);

// Use batch operation
const players = await funifierPlayerService.getPlayersStatus(playerIds);
```

## Security

### Authentication

- All API calls use Bearer token authentication
- Tokens are automatically refreshed when expired
- Session validation prevents unauthorized access

### Data Protection

- Sensitive credentials are never logged
- API responses are validated before processing
- Input sanitization prevents injection attacks

### HTTPS

All communication with Funifier APIs uses HTTPS/TLS encryption.

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify credentials are correct
   - Check if tokens have expired
   - Ensure proper admin role assignment

2. **Network Errors**
   - Check internet connectivity
   - Verify Funifier server URL
   - Review firewall settings

3. **API Rate Limits**
   - Implement proper caching
   - Use batch operations
   - Add delays between requests

### Debug Mode

Enable debug logging by setting the log level:

```typescript
// Add to your environment variables
DEBUG=funifier:*
```

## Contributing

When adding new functionality:

1. Follow the existing service patterns
2. Add comprehensive error handling
3. Include unit tests
4. Update this documentation
5. Add TypeScript types for all interfaces

## API Reference

For detailed API documentation, refer to the Funifier API documentation at your Funifier instance's `/docs` endpoint.