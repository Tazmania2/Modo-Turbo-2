# Simplified Deployment Guide

## Overview

This guide explains the new simplified deployment approach that eliminates complex setup flows by using environment variables for Funifier credentials.

## Key Changes

### ✅ What's New
- **Environment-based configuration**: All Funifier credentials are managed via Vercel environment variables
- **No complex setup flow**: Users can directly access the platform after deployment
- **Demo mode in admin**: Demo mode is now accessible as a hidden option in the admin dashboard
- **Automatic API URL handling**: Always uses the correct Funifier API URL (`service2.funifier.com/v3`)

### ❌ What's Removed
- Complex initial setup wizard
- Database-stored credentials (for initial setup)
- Multiple deployment configurations
- Setup validation flows

## Deployment Steps

### 1. Deploy to Vercel

Deploy your application to Vercel as usual:

```bash
vercel --prod
```

### 2. Configure Environment Variables

In your Vercel dashboard, set these environment variables:

#### Required for Funifier Integration:
```
FUNIFIER_API_KEY=your-funifier-api-key-here
FUNIFIER_APP_SECRET=your-funifier-app-secret-here  
FUNIFIER_BASIC_TOKEN=your-funifier-basic-token-here
DEFAULT_FUNIFIER_URL=https://service2.funifier.com
```

#### Optional Configuration:
```
DEMO_MODE_ENABLED=true
ENCRYPTION_KEY=your-32-character-encryption-key
NEXT_PUBLIC_DEFAULT_COMPANY_NAME=Your Company Name
NEXT_PUBLIC_DEFAULT_TAGLINE=Your Tagline
```

### 3. Access Your Platform

After setting environment variables:

1. **For Funifier Integration**: Go to `/admin/login` and sign in with your Funifier credentials
2. **For Demo Mode**: Sign in as admin, then go to the "Demo Mode" tab to access demo functionality

## Multiple Deployments

To create different instances (demo, staging, production), simply deploy multiple times with different environment variables:

### Demo Deployment
```
DEMO_MODE_ENABLED=true
FUNIFIER_API_KEY=demo-key
# ... other demo configs
```

### Production Deployment  
```
DEMO_MODE_ENABLED=false
FUNIFIER_API_KEY=production-key
FUNIFIER_APP_SECRET=production-secret
FUNIFIER_BASIC_TOKEN=production-token
# ... production configs
```

### Staging Deployment
```
DEMO_MODE_ENABLED=false
FUNIFIER_API_KEY=staging-key
# ... staging configs
```

## Benefits

### 🚀 Faster Setup
- No complex wizard to complete
- Direct access after deployment
- Environment variables handle all configuration

### 🔒 Better Security
- Credentials managed securely by Vercel
- No sensitive data in application database
- Easy credential rotation

### 🎯 Easier Management
- Different deployments for different environments
- Clear separation of concerns
- Simplified troubleshooting

### 🎮 Demo Mode Access
- Hidden in admin dashboard for security
- Full functionality with sample data
- Perfect for demonstrations and testing

## Admin Dashboard Features

### Funifier Status Panel
- Shows environment variable configuration status
- Tests API connectivity
- Displays current settings (without exposing credentials)

### Demo Mode Panel
- Hidden option in admin dashboard
- Generates demo instances with sample data
- No real API calls made

### Feature Management
- Toggle platform features on/off
- Customize branding and themes
- Monitor system health

## Troubleshooting

### Common Issues

1. **"Funifier credentials not configured"**
   - Check that all required environment variables are set in Vercel
   - Ensure variable names match exactly (case-sensitive)

2. **"Connection failed"**
   - Verify Funifier API credentials are correct
   - Check that `DEFAULT_FUNIFIER_URL` is set to `https://service2.funifier.com`

3. **"Demo mode not working"**
   - Ensure `DEMO_MODE_ENABLED=true` is set
   - Access demo mode through admin dashboard, not direct URL

### Checking Configuration

Use the admin dashboard's "Funifier Settings" tab to:
- View configuration status
- Test API connectivity  
- See which environment variables are configured

## Migration from Old Setup

If migrating from the old complex setup:

1. Note your existing Funifier credentials
2. Set them as environment variables in Vercel
3. Remove any old setup-related database entries
4. Test the new simplified flow

The new approach is backward compatible - existing configurations will continue to work, but new deployments should use environment variables.