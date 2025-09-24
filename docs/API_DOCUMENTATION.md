# API Documentation

## Overview

The White-Label Gamification Platform provides a comprehensive REST API for managing gamification data, white-label configurations, and administrative functions. All endpoints return JSON responses and follow RESTful conventions.

## Base URL

```
Production: https://your-domain.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT tokens obtained through the Funifier authentication system.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login

Authenticate user with Funifier credentials.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "string",
  "user": {
    "_id": "string",
    "name": "string",
    "image": {
      "small": { "url": "string", "size": 0, "width": 0, "height": 0 },
      "medium": { "url": "string", "size": 0, "width": 0, "height": 0 },
      "original": { "url": "string", "size": 0, "width": 0, "height": 0 }
    },
    "total_points": 0,
    "teams": ["string"],
    "extra": {}
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Authentication service unavailable

#### GET /api/auth/verify-admin

Verify if the authenticated user has admin privileges.

**Headers Required:** Authorization

**Response (200):**
```json
{
  "isAdmin": true,
  "roles": ["admin", "user"],
  "playerData": {
    "_id": "string",
    "name": "string",
    "total_points": 0
  }
}
```

### Configuration Endpoints

#### GET /api/config/white-label

Retrieve current white-label configuration.

**Response (200):**
```json
{
  "_id": "string",
  "instanceId": "string",
  "branding": {
    "primaryColor": "#3B82F6",
    "secondaryColor": "#1E40AF",
    "accentColor": "#F59E0B",
    "logo": "string",
    "favicon": "string",
    "companyName": "string",
    "tagline": "string"
  },
  "features": {
    "ranking": true,
    "dashboards": {
      "carteira_i": true,
      "carteira_ii": true,
      "carteira_iii": false,
      "carteira_iv": false
    },
    "history": true,
    "personalizedRanking": true
  },
  "funifierConfig": {
    "isConfigured": true,
    "serverUrl": "string"
  }
}
```

#### POST /api/config/setup

Initial system setup configuration.

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

**Response (200):**
```json
{
  "success": true,
  "message": "Setup completed successfully",
  "redirectUrl": "/admin/login"
}
```

### Dashboard Endpoints

#### GET /api/dashboard/player/{playerId}

Retrieve dashboard data for a specific player.

**Parameters:**
- `playerId` (path): Player ID from Funifier

**Headers Required:** Authorization

**Response (200):**
```json
{
  "playerName": "string",
  "totalPoints": 0,
  "pointsLocked": false,
  "currentCycleDay": 15,
  "totalCycleDays": 30,
  "primaryGoal": {
    "name": "string",
    "percentage": 75,
    "description": "string",
    "emoji": "🎯",
    "target": 100,
    "current": 75,
    "unit": "points",
    "hasBoost": true,
    "isBoostActive": false,
    "daysRemaining": 5
  },
  "secondaryGoal1": {
    "name": "string",
    "percentage": 50,
    "description": "string",
    "emoji": "⭐"
  },
  "secondaryGoal2": {
    "name": "string",
    "percentage": 25,
    "description": "string",
    "emoji": "🚀"
  }
}
```

#### GET /api/dashboard/history/{playerId}

Retrieve historical performance data for a player.

**Parameters:**
- `playerId` (path): Player ID from Funifier

**Headers Required:** Authorization

**Response (200):**
```json
{
  "seasons": [
    {
      "_id": "string",
      "name": "Season 2024-Q1",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-03-31T23:59:59Z",
      "playerStats": {
        "totalPoints": 1500,
        "finalPosition": 3,
        "achievements": ["Top Performer", "Goal Crusher"],
        "goals": []
      }
    }
  ],
  "currentSeasonGraphs": [
    {
      "type": "points",
      "data": [
        { "date": "2024-01-01", "value": 100 },
        { "date": "2024-01-02", "value": 150 }
      ]
    }
  ]
}
```

### Ranking Endpoints

#### GET /api/ranking/leaderboards

Retrieve available leaderboards.

**Headers Required:** Authorization

**Response (200):**
```json
{
  "leaderboards": [
    {
      "_id": "string",
      "name": "Global Ranking",
      "description": "Overall performance ranking",
      "type": "points",
      "isActive": true
    }
  ]
}
```

#### GET /api/ranking/{leaderboardId}/personal/{playerId}

Get personalized ranking data for a specific player.

**Parameters:**
- `leaderboardId` (path): Leaderboard ID
- `playerId` (path): Player ID

**Headers Required:** Authorization

**Response (200):**
```json
{
  "raceData": {
    "totalDistance": 1000,
    "players": [
      {
        "playerId": "string",
        "playerName": "string",
        "position": 1,
        "points": 2500,
        "avatar": "string",
        "distanceFromStart": 900
      }
    ]
  },
  "personalCard": {
    "playerId": "string",
    "playerName": "string",
    "avatar": "string",
    "currentPosition": 5,
    "totalPoints": 1800,
    "pointsGainedToday": 150
  },
  "topThree": [
    {
      "playerId": "string",
      "playerName": "string",
      "position": 1,
      "points": 2500,
      "avatar": "string"
    }
  ],
  "contextualRanking": {
    "above": {
      "playerId": "string",
      "playerName": "string",
      "position": 4,
      "points": 1900
    },
    "current": {
      "playerId": "string",
      "playerName": "string",
      "position": 5,
      "points": 1800
    },
    "below": {
      "playerId": "string",
      "playerName": "string",
      "position": 6,
      "points": 1700
    }
  }
}
```

#### GET /api/ranking/{leaderboardId}/global

Get global ranking data for display purposes.

**Parameters:**
- `leaderboardId` (path): Leaderboard ID

**Headers Required:** Authorization

**Response (200):**
```json
{
  "raceData": {
    "totalDistance": 1000,
    "players": []
  },
  "fullRanking": [
    {
      "playerId": "string",
      "playerName": "string",
      "position": 1,
      "points": 2500,
      "avatar": "string",
      "team": "string"
    }
  ]
}
```

### Admin Endpoints

#### GET /api/admin/features

Retrieve current feature toggle configuration.

**Headers Required:** Authorization (Admin role)

**Response (200):**
```json
{
  "features": {
    "ranking": true,
    "dashboards": {
      "carteira_i": true,
      "carteira_ii": true,
      "carteira_iii": false,
      "carteira_iv": false
    },
    "history": true,
    "personalizedRanking": true
  }
}
```

#### PUT /api/admin/features/{feature}

Update a specific feature toggle.

**Parameters:**
- `feature` (path): Feature name (e.g., "ranking", "history")

**Headers Required:** Authorization (Admin role)

**Request Body:**
```json
{
  "enabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "feature": "ranking",
  "enabled": true
}
```

#### POST /api/admin/features/reset

Reset all features to default configuration.

**Headers Required:** Authorization (Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Features reset to defaults"
}
```

#### GET /api/admin/branding

Retrieve current branding configuration.

**Headers Required:** Authorization (Admin role)

**Response (200):**
```json
{
  "branding": {
    "primaryColor": "#3B82F6",
    "secondaryColor": "#1E40AF",
    "accentColor": "#F59E0B",
    "logo": "string",
    "favicon": "string",
    "companyName": "string",
    "tagline": "string"
  }
}
```

#### PUT /api/admin/branding

Update branding configuration.

**Headers Required:** Authorization (Admin role)

**Request Body:**
```json
{
  "primaryColor": "#3B82F6",
  "secondaryColor": "#1E40AF",
  "accentColor": "#F59E0B",
  "companyName": "My Company",
  "tagline": "Excellence in Gamification"
}
```

#### PUT /api/admin/branding/colors

Update color scheme only.

**Headers Required:** Authorization (Admin role)

**Request Body:**
```json
{
  "primaryColor": "#3B82F6",
  "secondaryColor": "#1E40AF",
  "accentColor": "#F59E0B"
}
```

#### PUT /api/admin/branding/company

Update company information only.

**Headers Required:** Authorization (Admin role)

**Request Body:**
```json
{
  "companyName": "My Company",
  "tagline": "Excellence in Gamification"
}
```

#### GET /api/admin/funifier-credentials

Test Funifier credentials connectivity.

**Headers Required:** Authorization (Admin role)

**Response (200):**
```json
{
  "isValid": true,
  "serverUrl": "string",
  "lastTested": "2024-01-01T12:00:00Z"
}
```

#### POST /api/admin/funifier-credentials/test

Test new Funifier credentials.

**Headers Required:** Authorization (Admin role)

**Request Body:**
```json
{
  "apiKey": "string",
  "serverUrl": "string",
  "authToken": "string"
}
```

**Response (200):**
```json
{
  "isValid": true,
  "message": "Credentials are valid"
}
```

### Theme Endpoints

#### GET /api/theme

Get current theme configuration.

**Response (200):**
```json
{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#1E40AF",
    "accent": "#F59E0B"
  },
  "branding": {
    "companyName": "string",
    "logo": "string"
  }
}
```

#### GET /api/theme/css

Get dynamic CSS for current theme.

**Response (200):**
```css
:root {
  --color-primary: #3B82F6;
  --color-secondary: #1E40AF;
  --color-accent: #F59E0B;
}
```

### Deployment Endpoints

#### POST /api/deployment/trigger

Trigger a new deployment.

**Headers Required:** Authorization (Admin role)

**Request Body:**
```json
{
  "environment": "production",
  "envVars": {
    "FUNIFIER_API_KEY": "string",
    "FUNIFIER_SERVER_URL": "string"
  }
}
```

#### GET /api/deployment/status/{deploymentId}

Get deployment status.

**Parameters:**
- `deploymentId` (path): Deployment ID

**Headers Required:** Authorization (Admin role)

**Response (200):**
```json
{
  "id": "string",
  "status": "READY" | "BUILDING" | "ERROR",
  "url": "string",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

#### GET /api/deployment/history

Get deployment history.

**Headers Required:** Authorization (Admin role)

**Response (200):**
```json
{
  "deployments": [
    {
      "id": "string",
      "status": "READY",
      "url": "string",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### POST /api/deployment/rollback

Rollback to a previous deployment.

**Headers Required:** Authorization (Admin role)

**Request Body:**
```json
{
  "deploymentId": "string"
}
```

### Health Check Endpoints

#### GET /api/health

General health check.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "funifier": "healthy",
    "cache": "healthy",
    "database": "healthy"
  }
}
```

#### GET /api/health/cache

Cache service health check.

**Response (200):**
```json
{
  "status": "healthy",
  "cacheHitRate": 0.85,
  "totalKeys": 150
}
```

#### GET /api/health/database

Database connectivity health check.

**Response (200):**
```json
{
  "status": "healthy",
  "responseTime": 45,
  "lastSync": "2024-01-01T12:00:00Z"
}
```

### Monitoring Endpoints

#### GET /api/monitoring/dashboard

Get monitoring dashboard data.

**Headers Required:** Authorization (Admin role)

**Response (200):**
```json
{
  "metrics": {
    "totalUsers": 150,
    "activeUsers": 45,
    "apiCalls": 1250,
    "errorRate": 0.02
  },
  "performance": {
    "avgResponseTime": 250,
    "cacheHitRate": 0.85
  }
}
```

#### GET /api/monitoring/errors

Get error logs and statistics.

**Headers Required:** Authorization (Admin role)

**Response (200):**
```json
{
  "errors": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "level": "error",
      "message": "string",
      "stack": "string",
      "userId": "string"
    }
  ],
  "summary": {
    "total": 5,
    "last24h": 2,
    "criticalErrors": 0
  }
}
```

### Cache Management Endpoints

#### POST /api/cache/invalidate

Invalidate cache entries.

**Headers Required:** Authorization (Admin role)

**Request Body:**
```json
{
  "keys": ["dashboard:player:123", "ranking:leaderboard:456"],
  "pattern": "dashboard:*"
}
```

**Response (200):**
```json
{
  "success": true,
  "invalidatedKeys": 15,
  "message": "Cache invalidated successfully"
}
```

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Invalid credentials provided",
    "details": {},
    "timestamp": "2024-01-01T12:00:00Z",
    "retryable": false,
    "userMessage": "Please check your username and password"
  }
}
```

### Error Types

- `AUTHENTICATION_ERROR`: Authentication failures
- `FUNIFIER_API_ERROR`: Funifier service issues
- `CONFIGURATION_ERROR`: Configuration problems
- `VALIDATION_ERROR`: Input validation failures
- `NETWORK_ERROR`: Network connectivity issues
- `WHITE_LABEL_ERROR`: White-label configuration issues

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **Dashboard endpoints**: 60 requests per minute per user
- **Admin endpoints**: 30 requests per minute per admin
- **General endpoints**: 100 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## SDK and Integration Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-domain.vercel.app/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login example
const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  localStorage.setItem('auth_token', response.data.access_token);
  return response.data;
};

// Get dashboard data
const getDashboard = async (playerId: string) => {
  const response = await api.get(`/dashboard/player/${playerId}`);
  return response.data;
};
```

### cURL Examples

```bash
# Login
curl -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user@example.com","password":"password"}'

# Get dashboard (with auth token)
curl -X GET https://your-domain.vercel.app/api/dashboard/player/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update branding
curl -X PUT https://your-domain.vercel.app/api/admin/branding \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"primaryColor":"#FF0000","companyName":"My Company"}'
```

## Webhooks

The platform supports webhooks for real-time updates:

### Webhook Events

- `player.updated`: Player data changed
- `ranking.updated`: Ranking positions changed
- `config.updated`: Configuration modified
- `deployment.completed`: Deployment finished

### Webhook Payload

```json
{
  "event": "player.updated",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "playerId": "string",
    "changes": ["points", "position"]
  }
}
```

## Versioning

The API uses URL versioning. Current version is v1 (implicit). Future versions will be explicitly versioned:

- Current: `/api/endpoint`
- Future: `/api/v2/endpoint`

Backward compatibility is maintained for at least 6 months after new version releases.