# Admin User Guide - White-Label Configuration

## Table of Contents

1. [Getting Started](#getting-started)
2. [Initial Setup](#initial-setup)
3. [Admin Panel Overview](#admin-panel-overview)
4. [Branding Configuration](#branding-configuration)
5. [Feature Management](#feature-management)
6. [Funifier Integration](#funifier-integration)
7. [Deployment Management](#deployment-management)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Getting Started

The White-Label Gamification Platform allows you to customize and brand the gamification experience for your organization. This guide will walk you through all administrative functions and configuration options.

### Prerequisites

- Admin access to your Funifier instance
- Valid Funifier API credentials
- Basic understanding of your organization's branding requirements

### Accessing the Admin Panel

1. Navigate to your platform URL
2. If this is the first time accessing the system, you'll see the initial setup screen
3. For existing installations, go to `/admin/login` and authenticate with your Funifier credentials

## Initial Setup

### Setup Mode Selection

When accessing the platform for the first time, you'll be presented with two options:

#### Demo Mode
- **Purpose**: Evaluate the platform with sample data
- **Features**: Full functionality with mock data
- **Use Case**: Testing, demonstrations, proof of concept
- **Limitations**: No real user data, resets on configuration changes

#### Funifier Integration
- **Purpose**: Connect to your live Funifier instance
- **Features**: Real-time data from your gamification system
- **Use Case**: Production deployment
- **Requirements**: Valid Funifier credentials

### Funifier Setup Process

1. **Select "Set up Funifier"** from the initial setup screen
2. **Enter Credentials**:
   - **API Key**: Your Funifier API key
   - **Server URL**: Your Funifier server URL (e.g., `https://service2.funifier.com`)
   - **Auth Token**: Basic authentication token for API access
3. **Validate Connection**: The system will test your credentials
4. **Complete Setup**: Once validated, you'll be redirected to admin login

### Admin Authentication

After Funifier setup:
1. Navigate to `/admin/login`
2. Enter your Funifier admin credentials
3. The system verifies your admin role via Funifier's `/v3/database/principal` endpoint
4. Upon successful authentication, you'll access the admin panel

## Admin Panel Overview

The admin panel provides centralized control over all white-label configurations:

### Dashboard Sections

1. **Configuration Overview**: Current settings summary
2. **Branding Panel**: Visual customization options
3. **Feature Toggles**: Enable/disable platform features
4. **Funifier Settings**: Integration management
5. **Deployment Panel**: Deployment automation controls
6. **Monitoring Dashboard**: System health and performance metrics

### Navigation

- **Main Dashboard**: Overview of all configurations
- **Branding**: Color schemes, logos, company information
- **Features**: Toggle individual features on/off
- **Settings**: Funifier credentials and system settings
- **Deploy**: Manage deployments and environment variables
- **Monitor**: View system health and error logs

## Branding Configuration

### Color Scheme Customization

#### Primary Colors
- **Primary Color**: Main brand color used for buttons, links, and accents
- **Secondary Color**: Supporting color for backgrounds and secondary elements
- **Accent Color**: Highlight color for important elements and notifications

#### How to Update Colors
1. Navigate to **Branding** → **Colors**
2. Use the color picker or enter hex values
3. Preview changes in real-time
4. Click **Save Changes** to apply

#### Color Guidelines
- Ensure sufficient contrast for accessibility (WCAG 2.1 AA compliance)
- Test colors across different screen types and lighting conditions
- Consider your brand guidelines and existing marketing materials

### Company Information

#### Configurable Elements
- **Company Name**: Displayed in headers and titles
- **Tagline**: Subtitle or motto (optional)
- **Logo**: Company logo (recommended: SVG format, max 2MB)
- **Favicon**: Browser tab icon (recommended: ICO format, 32x32px)

#### Logo Upload Process
1. Navigate to **Branding** → **Company**
2. Click **Upload Logo**
3. Select file (supported formats: PNG, JPG, SVG)
4. Crop/resize if needed
5. Save changes

#### Logo Best Practices
- Use vector formats (SVG) for scalability
- Ensure logo works on both light and dark backgrounds
- Keep file size under 2MB for optimal performance
- Test logo visibility at different sizes

### Theme Preview

The admin panel includes a live preview feature:
- Changes are reflected immediately in the preview pane
- Test different screen sizes using the responsive preview
- Verify readability and visual hierarchy
- Check color combinations for accessibility

### Resetting to Defaults

To return to neutral branding:
1. Navigate to **Branding** → **Reset**
2. Click **Reset to Defaults**
3. Confirm the action
4. All custom branding will be removed, returning to the neutral theme

## Feature Management

### Available Features

#### Core Features
- **Dashboard**: Personal gamification dashboard
- **Ranking**: Leaderboards and competitive elements
- **History**: Historical performance data and trends
- **Personalized Ranking**: Individual ranking context

#### Dashboard Types
- **Carteira I**: Basic dashboard layout
- **Carteira II**: Enhanced dashboard with additional metrics
- **Carteira III**: Advanced dashboard with detailed analytics
- **Carteira IV**: Premium dashboard with full feature set

### Managing Feature Toggles

#### Enabling/Disabling Features
1. Navigate to **Features**
2. Use toggle switches to enable/disable features
3. Changes are applied immediately
4. Disabled features are hidden from user interfaces

#### Feature Dependencies
- **Personalized Ranking** requires **Ranking** to be enabled
- **History** requires **Dashboard** to be enabled
- Some dashboard types may have prerequisites

#### Bulk Operations
- **Enable All**: Turn on all available features
- **Disable All**: Turn off all features (except core dashboard)
- **Reset to Defaults**: Return to recommended feature set

### Feature Impact

#### User Experience
- Disabled features are completely hidden from navigation
- Users won't see menu items or access points for disabled features
- Existing data remains intact when features are disabled

#### Performance Considerations
- Disabling unused features can improve performance
- Reduces API calls and data processing
- Smaller bundle sizes for faster loading

## Funifier Integration

### Credential Management

#### Viewing Current Settings
1. Navigate to **Settings** → **Funifier**
2. View connection status and server information
3. Check last successful connection timestamp

#### Testing Credentials
1. Click **Test Connection**
2. System validates API connectivity
3. Results show success/failure with detailed messages
4. Connection issues display troubleshooting suggestions

#### Updating Credentials
1. Navigate to **Settings** → **Funifier** → **Update**
2. Enter new credentials
3. Test connection before saving
4. Confirm changes

### Data Synchronization

#### Automatic Sync
- Player data syncs every 5 minutes
- Ranking data updates every 2 minutes
- Configuration changes sync immediately

#### Manual Sync
1. Navigate to **Settings** → **Funifier** → **Sync**
2. Click **Force Sync** for immediate update
3. Monitor sync status in real-time

#### Sync Troubleshooting
- Check Funifier server status
- Verify API rate limits aren't exceeded
- Review error logs for specific issues

### White-Label Data Storage

The platform stores white-label configurations in Funifier's database:
- **Collection**: `whitelabel__c`
- **Encryption**: Sensitive data is encrypted
- **Backup**: Configurations are automatically backed up
- **Versioning**: Change history is maintained

## Deployment Management

### Automated Deployment

#### Vercel Integration
The platform includes automated deployment to Vercel:
1. Navigate to **Deploy** → **Automation**
2. Configure Vercel project settings
3. Set up environment variables
4. Trigger deployments with one click

#### Environment Variables
Manage sensitive configuration through the deployment panel:
- **FUNIFIER_API_KEY**: Encrypted API key
- **FUNIFIER_SERVER_URL**: Server endpoint
- **REDIS_URL**: Cache server connection (optional)
- **ENCRYPTION_KEY**: Data encryption key

#### Deployment Process
1. Click **Deploy Now**
2. System packages current configuration
3. Uploads to Vercel with encrypted environment variables
4. Monitors deployment status
5. Provides live URL upon completion

### Deployment History

#### Tracking Deployments
- View all previous deployments
- Check deployment status and timestamps
- Access deployment logs and error messages
- Compare configuration changes between deployments

#### Rollback Capability
1. Navigate to **Deploy** → **History**
2. Select previous deployment
3. Click **Rollback**
4. Confirm rollback action
5. System reverts to selected deployment

### Environment Management

#### Multiple Environments
- **Development**: Testing and development
- **Staging**: Pre-production testing
- **Production**: Live user environment

#### Environment-Specific Settings
- Different Funifier instances per environment
- Separate branding configurations
- Independent feature toggles

## Monitoring and Maintenance

### System Health Dashboard

#### Key Metrics
- **Active Users**: Current online users
- **API Response Times**: Performance metrics
- **Error Rates**: System reliability indicators
- **Cache Performance**: Data caching efficiency

#### Real-Time Monitoring
1. Navigate to **Monitor** → **Dashboard**
2. View live system metrics
3. Set up alerts for critical thresholds
4. Export performance reports

### Error Monitoring

#### Error Logs
- **Real-time Errors**: Live error stream
- **Error Categories**: Grouped by type and severity
- **User Impact**: Affected users and sessions
- **Resolution Status**: Tracking fix progress

#### Error Management
1. Navigate to **Monitor** → **Errors**
2. Review error details and stack traces
3. Assign priority levels
4. Track resolution progress
5. Set up notifications for critical errors

### Performance Optimization

#### Cache Management
1. Navigate to **Monitor** → **Cache**
2. View cache hit rates and performance
3. Clear cache when needed
4. Configure cache expiration policies

#### Database Performance
- Monitor Funifier API response times
- Track data synchronization delays
- Optimize query patterns
- Review connection pooling

### Maintenance Tasks

#### Regular Maintenance
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize configurations

#### Backup and Recovery
- Configurations are automatically backed up to Funifier
- Export configuration snapshots before major changes
- Test recovery procedures periodically

## Troubleshooting

### Common Issues

#### Authentication Problems

**Issue**: Cannot log in to admin panel
**Solutions**:
1. Verify Funifier credentials are correct
2. Check if user has admin role in Funifier
3. Ensure Funifier server is accessible
4. Clear browser cache and cookies

**Issue**: "Admin role not found" error
**Solutions**:
1. Contact Funifier administrator to assign admin role
2. Verify role configuration in Funifier
3. Check API permissions

#### Configuration Issues

**Issue**: Changes not appearing on frontend
**Solutions**:
1. Clear browser cache
2. Force refresh (Ctrl+F5 or Cmd+Shift+R)
3. Check if changes were saved successfully
4. Verify feature toggles are enabled

**Issue**: Branding not updating
**Solutions**:
1. Ensure image files are under size limits
2. Check file format compatibility
3. Clear CDN cache if applicable
4. Verify CSS custom properties are loading

#### Integration Problems

**Issue**: Funifier connection failing
**Solutions**:
1. Test credentials using the connection test feature
2. Verify Funifier server URL is correct
3. Check API rate limits
4. Review Funifier server status

**Issue**: Data not syncing
**Solutions**:
1. Force manual sync from admin panel
2. Check Funifier API permissions
3. Review error logs for specific issues
4. Verify network connectivity

#### Performance Issues

**Issue**: Slow loading times
**Solutions**:
1. Enable caching if not already active
2. Optimize image sizes and formats
3. Review API response times
4. Check network connectivity

**Issue**: High error rates
**Solutions**:
1. Review error logs for patterns
2. Check Funifier server performance
3. Verify API rate limits
4. Monitor resource usage

### Getting Help

#### Support Channels
1. **Documentation**: Comprehensive guides and API docs
2. **Error Logs**: Detailed error information in admin panel
3. **Health Checks**: Automated system diagnostics
4. **Community**: Developer community and forums

#### Reporting Issues
When reporting issues, include:
- Error messages and timestamps
- Steps to reproduce the problem
- Browser and device information
- Current configuration settings
- Screenshots or screen recordings

## Best Practices

### Security

#### Credential Management
- Use strong, unique passwords for Funifier accounts
- Regularly rotate API keys and tokens
- Enable two-factor authentication where available
- Limit admin access to necessary personnel only

#### Data Protection
- Regularly backup configurations
- Monitor access logs for suspicious activity
- Keep the platform updated with security patches
- Use HTTPS for all communications

### Performance

#### Optimization Strategies
- Enable caching for better performance
- Optimize images before uploading
- Regularly clean up unused configurations
- Monitor and optimize API usage

#### Monitoring
- Set up alerts for critical metrics
- Regularly review performance reports
- Monitor user feedback and usage patterns
- Track feature adoption and usage

### User Experience

#### Design Consistency
- Maintain consistent branding across all features
- Test color combinations for accessibility
- Ensure logos and images are high quality
- Verify responsive design on different devices

#### Feature Management
- Enable features gradually to monitor impact
- Gather user feedback before major changes
- Document feature changes for users
- Provide training materials for new features

### Maintenance

#### Regular Tasks
- Review and update branding materials
- Monitor system performance and errors
- Update documentation as needed
- Test backup and recovery procedures

#### Change Management
- Test changes in staging environment first
- Document all configuration changes
- Communicate changes to users
- Have rollback plans for major updates

### Scaling

#### Growth Planning
- Monitor user growth and system capacity
- Plan for increased API usage
- Consider caching strategies for scale
- Review performance under load

#### Resource Management
- Monitor API rate limits and usage
- Optimize database queries and caching
- Plan for storage and bandwidth growth
- Consider CDN implementation for global users

This guide provides comprehensive coverage of all administrative functions. For technical implementation details, refer to the Developer Documentation. For API-specific information, consult the API Documentation.