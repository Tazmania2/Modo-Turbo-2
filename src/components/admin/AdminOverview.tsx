'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Trophy, 
  Settings, 
  Palette, 
  ToggleLeft, 
  Server, 
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Rocket
} from 'lucide-react';
import { FunifierPlayerStatus, WhiteLabelConfiguration } from '@/types/funifier';

interface AdminOverviewProps {
  user: FunifierPlayerStatus;
  instanceId: string;
  onNavigateToTab: (tab: string) => void;
}

interface SystemStatus {
  funifierConnection: 'connected' | 'disconnected' | 'testing';
  featuresConfigured: boolean;
  brandingConfigured: boolean;
  totalFeatures: number;
  enabledFeatures: number;
}

export function AdminOverview({ user, instanceId, onNavigateToTab }: AdminOverviewProps) {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    funifierConnection: 'testing',
    featuresConfigured: false,
    brandingConfigured: false,
    totalFeatures: 0,
    enabledFeatures: 0
  });
  const [configuration, setConfiguration] = useState<WhiteLabelConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSystemStatus();
  }, [instanceId]);

  const loadSystemStatus = async () => {
    setIsLoading(true);
    try {
      // Load configuration
      const configResponse = await fetch(`/api/config/white-label?instance=${instanceId}`);
      if (configResponse.ok) {
        const config = await configResponse.json();
        setConfiguration(config);
        
        // Check branding configuration
        const brandingConfigured = !!(
          config.branding?.companyName || 
          config.branding?.logo || 
          (config.branding?.primaryColor && config.branding.primaryColor !== '#3B82F6')
        );

        // Count features
        const features = config.features || {};
        const totalFeatures = Object.keys(features).length;
        const enabledFeatures = Object.values(features).filter(Boolean).length;

        setSystemStatus(prev => ({
          ...prev,
          featuresConfigured: totalFeatures > 0,
          brandingConfigured,
          totalFeatures,
          enabledFeatures
        }));
      }

      // Test Funifier connection
      const connectionResponse = await fetch(`/api/admin/funifier-credentials/test?instance=${instanceId}`);
      if (connectionResponse.ok) {
        const result = await connectionResponse.json();
        setSystemStatus(prev => ({
          ...prev,
          funifierConnection: result.isValid ? 'connected' : 'disconnected'
        }));
      } else {
        setSystemStatus(prev => ({
          ...prev,
          funifierConnection: 'disconnected'
        }));
      }

    } catch (error) {
      console.error('Failed to load system status:', error);
      setSystemStatus(prev => ({
        ...prev,
        funifierConnection: 'disconnected'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectionStatusBadge = () => {
    switch (systemStatus.funifierConnection) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'disconnected':
        return <Badge className="bg-red-100 text-red-800">Disconnected</Badge>;
      case 'testing':
        return <Badge className="bg-yellow-100 text-yellow-800">Testing...</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getConnectionStatusIcon = () => {
    switch (systemStatus.funifierConnection) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'testing':
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" />
        <span>Loading system overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name}!</h2>
            <p className="text-blue-100">
              Manage your white-label gamification platform configuration
            </p>
            {instanceId && (
              <p className="text-sm text-blue-200 mt-1">
                Instance: <span className="font-mono">{instanceId}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{user.total_points?.toLocaleString() || 0}</div>
            <div className="text-blue-200">Total Points</div>
          </div>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Funifier Connection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
                <div>
                  <p className="text-sm font-medium">Funifier</p>
                  <p className="text-xs text-gray-500">API Connection</p>
                </div>
              </div>
              {getConnectionStatusBadge()}
            </div>
          </CardContent>
        </Card>

        {/* Features Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ToggleLeft className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Features</p>
                  <p className="text-xs text-gray-500">
                    {systemStatus.enabledFeatures}/{systemStatus.totalFeatures} enabled
                  </p>
                </div>
              </div>
              <Badge className={systemStatus.featuresConfigured ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                {systemStatus.featuresConfigured ? 'Configured' : 'Default'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Branding Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Palette className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Branding</p>
                  <p className="text-xs text-gray-500">Theme & Assets</p>
                </div>
              </div>
              <Badge className={systemStatus.brandingConfigured ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                {systemStatus.brandingConfigured ? 'Customized' : 'Default'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* User Level */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Level Progress</p>
                  <p className="text-xs text-gray-500">
                    {user.level_progress?.percent_completed || 0}% complete
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{user.level_progress?.percent_completed || 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Manage your platform settings and customization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Server className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Funifier Integration</p>
                    <p className="text-sm text-gray-500">API credentials and connection</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToTab('settings')}
                >
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <ToggleLeft className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Feature Toggles</p>
                    <p className="text-sm text-gray-500">Enable/disable platform features</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToTab('features')}
                >
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Palette className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Branding & Theme</p>
                    <p className="text-sm text-gray-500">Colors, logo, and company info</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToTab('branding')}
                >
                  Customize
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Rocket className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Deployment</p>
                    <p className="text-sm text-gray-500">Manage deployments and automation</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToTab('deployment')}
                >
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">Security & Audit</p>
                    <p className="text-sm text-gray-500">Monitor security events and violations</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToTab('security')}
                >
                  Monitor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>
              Current system status and configuration details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Platform Mode:</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {configuration?.funifierIntegration?.apiKey ? 'Funifier' : 'Demo'}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Instance ID:</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {instanceId}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Admin User:</span>
                <span className="text-sm font-medium">{user.name}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Updated:</span>
                <span className="text-sm text-gray-500">
                  {configuration?.updatedAt 
                    ? new Date(configuration.updatedAt).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>

              {configuration?.funifierIntegration?.serverUrl && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Funifier Server:</span>
                  <span className="text-sm text-gray-500 truncate max-w-32">
                    {configuration.funifierIntegration.serverUrl}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t">
              <Button
                variant="outline"
                onClick={loadSystemStatus}
                className="w-full flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Alerts */}
      {systemStatus.funifierConnection === 'disconnected' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Funifier Connection Issue</p>
                <p className="text-sm text-red-600">
                  Unable to connect to Funifier API. Please check your credentials and network connection.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToTab('settings')}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Fix Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!systemStatus.featuresConfigured && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800">Default Configuration</p>
                <p className="text-sm text-yellow-600">
                  You&apos;re using default feature settings. Consider customizing features for your organization.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToTab('features')}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Customize
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}