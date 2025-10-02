'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Key,
  Shield,
  Globe
} from 'lucide-react';

interface FunifierStatus {
  hasApiKey: boolean;
  hasAppSecret: boolean;
  hasAuthToken: boolean;
  serverUrl: string;
  isConfigured: boolean;
  connectionTest?: {
    success: boolean;
    message: string;
  };
  isDemoMode: boolean;
  apiUrl: string;
  timestamp: string;
}

interface FunifierStatusPanelProps {
  instanceId: string;
  userId: string;
}

export const FunifierStatusPanel: React.FC<FunifierStatusPanelProps> = ({ instanceId, userId }) => {
  const [status, setStatus] = useState<FunifierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/funifier/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to load Funifier status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      await loadStatus(); // Reload status which includes connection test
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = () => {
    if (!status) return <Badge className="bg-gray-100 text-gray-800">Loading...</Badge>;
    
    if (status.isDemoMode) {
      return <Badge className="bg-blue-100 text-blue-800">Demo Mode</Badge>;
    }
    
    if (status.isConfigured && status.connectionTest?.success) {
      return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
    }
    
    if (status.isConfigured && status.connectionTest?.success === false) {
      return <Badge className="bg-red-100 text-red-800">Connection Failed</Badge>;
    }
    
    if (!status.isConfigured) {
      return <Badge className="bg-yellow-100 text-yellow-800">Not Configured</Badge>;
    }
    
    return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
  };

  const getStatusIcon = () => {
    if (isLoading || isTesting) {
      return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    
    if (!status) return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    
    if (status.isDemoMode) {
      return <Globe className="h-5 w-5 text-blue-500" />;
    }
    
    if (status.isConfigured && status.connectionTest?.success) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    if (status.isConfigured && status.connectionTest?.success === false) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading Funifier status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Funifier Integration Status
          </CardTitle>
          <CardDescription>
            Environment-based Funifier API configuration and connectivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Status:</span>
            {getStatusBadge()}
          </div>

          {status?.isDemoMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Demo Mode Active
                  </h4>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>The platform is running in demo mode with mock data. No real Funifier API calls are made.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status?.connectionTest && !status.connectionTest.success && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">
                    Connection Failed
                  </h4>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{status.connectionTest.message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={testConnection}
              disabled={isTesting}
              variant="outline"
              size="sm"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuration Details
          </CardTitle>
          <CardDescription>
            Environment variables configuration (credentials are managed via Vercel)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Key className="h-4 w-4 text-blue-500" />
                <span className="text-sm">API Key</span>
              </div>
              <Badge className={status?.hasApiKey ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {status?.hasApiKey ? 'Configured' : 'Missing'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="h-4 w-4 text-purple-500" />
                <span className="text-sm">App Secret</span>
              </div>
              <Badge className={status?.hasAppSecret ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {status?.hasAppSecret ? 'Configured' : 'Missing'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Key className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Basic Token</span>
              </div>
              <Badge className={status?.hasAuthToken ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {status?.hasAuthToken ? 'Configured' : 'Missing'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Globe className="h-4 w-4 text-green-500" />
                <span className="text-sm">Server URL</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                Configured
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Server URL:</span>
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {status?.serverUrl}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Endpoint:</span>
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {status?.apiUrl}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last Checked:</span>
              <span className="text-sm text-gray-500">
                {status?.timestamp ? new Date(status.timestamp).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Configuration Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Environment Variables Setup
              </h4>
              <div className="text-sm text-blue-700 space-y-2">
                <p>To configure Funifier integration, set these environment variables in your Vercel deployment:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><code className="bg-blue-100 px-1 rounded">FUNIFIER_API_KEY</code> - Your Funifier API key</li>
                  <li><code className="bg-blue-100 px-1 rounded">FUNIFIER_APP_SECRET</code> - Your Funifier app secret</li>
                  <li><code className="bg-blue-100 px-1 rounded">FUNIFIER_BASIC_TOKEN</code> - Your Funifier basic auth token</li>
                  <li><code className="bg-blue-100 px-1 rounded">DEFAULT_FUNIFIER_URL</code> - Funifier server URL (default: https://service2.funifier.com)</li>
                </ul>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Benefits of Environment-Based Configuration
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>✅ No complex setup flows required</p>
                <p>✅ Secure credential management via Vercel</p>
                <p>✅ Easy deployment with different configurations</p>
                <p>✅ Automatic API URL handling (service2.funifier.com/v3)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};