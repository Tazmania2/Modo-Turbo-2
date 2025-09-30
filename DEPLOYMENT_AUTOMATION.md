# Deployment Automation

This document describes the Vercel deployment automation system implemented for the white-label gamification platform.

## Overview

The deployment automation system provides:

- Automated deployment triggers
- Environment variable management
- Deployment verificationsssssssssssssssssssssssssssssssssssssssssssssssssssssaaaaaaaaaaeee

# GitHub Integration (Optional)

GITHUB_REPO=username/repository-name
DEFAULT_BRANCH=main

# Deployment Settings

AUTO_DEPLOY_ON_CONFIG_CHANGE=true
ROLLBACK_ON_FAILURE=true
HEALTH_CHECK_TIMEOUT=300000 # 5 minutes in milliseconds

````

### Vercel Token Setup

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Settings > Tokens
3. Create a new token with appropriate permissions
4. Add the token to your environment variables

### Project ID Setup

1. Go to your project in Vercel Dashboard
2. Navigate to Settings > General
3. Copy the Project ID from the project settings
4. Add it to your environment variables

## API Endpoints

### Trigger Deployment

```http
POST /api/deployment/trigger
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "instanceId": "your-instance-id",
  "target": "production",
  "branch": "main",
  "environmentVariables": {
    "CUSTOM_VAR": "value"
  },
  "skipHealthCheck": false
}
````

### Get Deployment Status

```http
GET /api/deployment/status/{deploymentId}?includeLogs=true
Authorization: Bearer <admin_token>
```

### Verify Deployment

```http
POST /api/deployment/verify/{deploymentId}
Authorization: Bearer <admin_token>
```

### Rollback Deployment

```http
POST /api/deployment/rollback
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "deploymentId": "deployment-to-rollback-to",
  "reason": "Rollback reason",
  "skipHealthCheck": false
}
```

### Manage Environment Variables

```http
# Get environment variables
GET /api/deployment/env-vars
Authorization: Bearer <admin_token>

# Update environment variables
POST /api/deployment/env-vars
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "variables": {
    "VAR_NAME": "value"
  },
  "target": ["production", "preview", "development"]
}

# Delete environment variable
DELETE /api/deployment/env-vars
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "key": "VAR_NAME"
}
```

### Get Deployment History

```http
GET /api/deployment/history?limit=20
Authorization: Bearer <admin_token>
```

## Deployment Verification

The system performs comprehensive verification tests on each deployment:

### Critical Tests

- **Health Check**: Verifies `/api/health` endpoint responds correctly
- **Homepage Load**: Ensures the homepage loads with proper content
- **API Endpoints**: Tests critical API endpoints are accessible

### Non-Critical Tests

- **Authentication Flow**: Verifies auth endpoints respond appropriately
- **Static Assets**: Checks static asset availability
- **Performance Check**: Measures page load performance
- **Security Headers**: Validates security header configuration

### Verification Report

Each verification generates a detailed report including:

- Overall success status
- Individual test results
- Performance metrics
- Recommendations for improvements

## Automated Environment Variables

When triggering a deployment, the system automatically sets these environment variables based on white-label configuration:

### Public Variables

```bash
NEXT_PUBLIC_INSTANCE_ID=your-instance-id
NEXT_PUBLIC_PRIMARY_COLOR=#3B82F6
NEXT_PUBLIC_SECONDARY_COLOR=#1F2937
NEXT_PUBLIC_COMPANY_NAME=Your Company Name
NEXT_PUBLIC_FEATURE_RANKING=true
NEXT_PUBLIC_FEATURE_DASHBOARD_CARTEIRA_I=true
# ... other feature flags
```

### Private Variables (Encrypted)

```bash
FUNIFIER_API_KEY=encrypted_api_key
FUNIFIER_SERVER_URL=https://your-funifier-server.com
FUNIFIER_AUTH_TOKEN=encrypted_auth_token
NODE_ENV=production
```

## Security Considerations

### Encryption

- Sensitive environment variables are automatically encrypted
- API keys and tokens are never exposed in logs
- Encryption keys are managed securely

### Access Control

- All deployment endpoints require admin authentication
- Role-based access control prevents unauthorized deployments
- Audit logging tracks all deployment activities

### Variable Management

- Sensitive variables are identified automatically
- Values are encrypted before storage in Vercel
- Decryption only occurs during deployment

## Usage Examples

### Basic Deployment

```typescript
import { DeploymentAutomationService } from "@/services/deployment-automation.service";

const deploymentService = new DeploymentAutomationService(
  config,
  configService,
  errorLogger
);

// Trigger deployment
const result =
  await deploymentService.triggerAutomatedDeployment("instance-id");

if (result.success) {
  console.log(`Deployment successful: ${result.url}`);
} else {
  console.error(`Deployment failed: ${result.error}`);
}
```

### Custom Environment Variables

```typescript
// Trigger deployment with custom variables
const result = await deploymentService.triggerAutomatedDeployment(
  "instance-id",
  {
    target: "production",
    environmentVariables: {
      CUSTOM_FEATURE_FLAG: "true",
      API_ENDPOINT: "https://api.example.com",
    },
  }
);
```

### Rollback Example

```typescript
// Rollback to previous deployment
const rollbackResult = await deploymentService.rollbackDeployment({
  deploymentId: "previous-deployment-id",
  reason: "Critical bug found in current deployment",
});
```

## Troubleshooting

### Common Issues

1. **Vercel Token Invalid**
   - Verify token has correct permissions
   - Check token hasn't expired
   - Ensure team ID is correct if using team account

2. **Deployment Verification Fails**
   - Check health endpoint is implemented
   - Verify application starts correctly
   - Review deployment logs for errors

3. **Environment Variables Not Applied**
   - Confirm variables are properly encrypted
   - Check target environments are correct
   - Verify Vercel project configuration

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG_DEPLOYMENT=true
```

This will provide detailed logs of:

- API requests to Vercel
- Environment variable processing
- Verification test results
- Error details

## Monitoring

The system provides monitoring capabilities:

### Metrics Tracked

- Deployment frequency
- Success/failure rates
- Verification test results
- Performance metrics
- Error patterns

### Alerts

- Failed deployments
- Verification failures
- Performance degradation
- Security issues

### Logging

- All deployment activities
- API interactions
- Error conditions
- Performance data

## Best Practices

1. **Test Deployments**
   - Always test in preview environment first
   - Run verification tests before promoting to production
   - Monitor deployment logs for warnings

2. **Environment Management**
   - Keep sensitive variables encrypted
   - Use appropriate target environments
   - Regularly rotate API keys

3. **Rollback Strategy**
   - Keep recent deployments available for rollback
   - Document rollback procedures
   - Test rollback process regularly

4. **Security**
   - Limit admin access to deployment functions
   - Monitor deployment activities
   - Use secure token management

## Integration with White-Label System

The deployment automation integrates seamlessly with the white-label configuration:

1. **Configuration Changes**: Automatically trigger deployments when white-label settings change
2. **Environment Sync**: Sync white-label configuration to environment variables
3. **Instance Management**: Support multiple white-label instances
4. **Branding Updates**: Deploy branding changes automatically

This ensures that white-label customizations are immediately reflected in deployed applications.
