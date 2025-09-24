# API Routes Documentation

This document describes all API routes implemented in the white-label gamification platform.

## Authentication Routes

### POST /api/auth/login
Authenticates a user with Funifier credentials.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "user": "FunifierPlayerStatus",
  "expires_in": "number"
}
```

### POST /api/auth/logout
Logs out the current user and clears session cookies.

### GET /api/auth/me
Returns current user information.

### POST /api/auth/refresh
Refreshes the authentication token.

### GET /api/auth/verify-admin
Verifies if the current user has admin privileges.

## Dashboard Routes

### GET /api/dashboard/player/[playerId]
Retrieves dashboard data for a specific player.

**Query Parameters:**
- `refresh`: boolean - Force refresh from Funifier API
- `type`: string - Dashboard type (default, carteira_i, etc.)

**Response:**
```json
{
  "playerName": "string",
  "totalPoints": "number",
  "pointsLocked": "boolean",
  "currentCycleDay": "number",
  "totalCycleDays": "number",
  "primaryGoal": "Goal",
  "secondaryGoal1": "Goal",
  "secondaryGoal2": "Goal"
}
```

### GET /api/dashboard/history/[playerId]
Retrieves historical data for a player.

**Response:**
```json
{
  "seasons": "Season[]",
  "currentSeasonGraphs": "PerformanceGraph[]"
}
```

## Ranking Routes

### GET /api/ranking/leaderboards
Retrieves all available leaderboards.

### GET /api/ranking/[leaderboardId]/personal/[playerId]
Retrieves personalized ranking data for a player.

**Query Parameters:**
- `refresh`: boolean - Force refresh from cache

**Response:**
```json
{
  "raceData": "RaceVisualization",
  "personalCard": "PersonalCard",
  "topThree": "Player[]",
  "contextualRanking": {
    "above": "Player | null",
    "current": "Player",
    "below": "Player | null"
  }
}
```

### GET /api/ranking/[leaderboardId]/global
Retrieves global ranking data for display purposes.

## Configuration Routes

### GET /api/config/white-label
Retrieves current white-label configuration.

**Response:**
```json
{
  "_id": "string",
  "instanceId": "string",
  "branding": {
    "primaryColor": "string",
    "secondaryColor": "string",
    "accentColor": "string",
    "logo": "string",
    "companyName": "string",
    "tagline": "string"
  },
  "features": {
    "ranking": "boolean",
    "dashboards": "Record<string, boolean>",
    "history": "boolean"
  }
}
```

### PUT /api/config/white-label
Updates white-label configuration (Admin only).

**Request Body:**
```json
{
  "branding": {
    "primaryColor": "#RRGGBB",
    "secondaryColor": "#RRGGBB",
    "companyName": "string"
  },
  "features": {
    "ranking": "boolean"
  }
}
```

### POST /api/config/white-label?action=reset
Resets configuration to neutral defaults (Admin only).

## Admin Routes

### GET /api/admin/features
Retrieves all feature toggle configurations.

### PUT /api/admin/features/[feature]
Updates a specific feature toggle (Admin only).

### POST /api/admin/features/reset
Resets all features to default state (Admin only).

### GET /api/admin/branding
Retrieves branding configuration.

### PUT /api/admin/branding
Updates branding configuration (Admin only).

### GET /api/admin/funifier-credentials
Retrieves Funifier credentials status.

### PUT /api/admin/funifier-credentials
Updates Funifier credentials (Admin only).

## Setup Routes

### POST /api/setup
Initializes system setup with demo mode or Funifier integration.

**Request Body:**
```json
{
  "mode": "demo" | "funifier",
  "funifierCredentials": {
    "apiKey": "string",
    "serverUrl": "string",
    "authToken": "string"
  }
}
```

### POST /api/setup/validate-credentials
Validates Funifier credentials.

## Theme Routes

### GET /api/theme
Retrieves current theme configuration.

### GET /api/theme/css
Generates dynamic CSS based on current theme.

## Utility Routes

### GET /api/health
System health check endpoint.

**Response:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "string",
  "version": "string",
  "services": {
    "funifier": { "status": "up" | "down", "responseTime": "number" },
    "database": { "status": "up" | "down", "responseTime": "number" },
    "configuration": { "status": "up" | "down", "isConfigured": "boolean" }
  },
  "uptime": "number"
}
```

### GET /api/demo-data
Retrieves demo data for testing purposes.

## Middleware

All API routes are protected by the following middleware layers:

### Authentication Middleware
- `withAuth`: Requires valid authentication
- `withAdminAuth`: Requires admin privileges
- `withOptionalAuth`: Optional authentication

### Validation Middleware
- `withValidation`: Validates request body, query params, and route params
- Input sanitization and XSS prevention
- Request size limits

### Security Middleware
- `withSecurity`: Applies security headers and CORS
- `withAdminSecurity`: Enhanced security for admin endpoints
- `withPublicSecurity`: Relaxed security for public endpoints
- Rate limiting and CSRF protection

### Error Handling Middleware
- Standardized error responses
- Error logging and monitoring
- User-friendly error messages
- Retry indicators for transient errors

## Error Responses

All API routes return standardized error responses:

```json
{
  "error": "User-friendly error message",
  "type": "ERROR_TYPE",
  "retryable": "boolean",
  "timestamp": "ISO string",
  "details": "object (development only)"
}
```

## Status Codes

- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error
- `503`: Service Unavailable (external service down)

## Rate Limiting

- Public endpoints: 200 requests per minute
- Authenticated endpoints: 100 requests per minute  
- Admin endpoints: 30 requests per minute

## Security Features

- HTTPS enforcement in production
- HTTP-only cookies for session management
- CSRF protection for state-changing operations
- XSS prevention through input sanitization
- Security headers (HSTS, X-Frame-Options, etc.)
- Request size limits
- Input validation and sanitization