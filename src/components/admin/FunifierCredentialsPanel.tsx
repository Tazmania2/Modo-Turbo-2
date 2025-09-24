'use client';

import React, { useState, useEffect } from 'react';
import { FunifierCredentials } from '@/types/funifier';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Eye, EyeOff, Key, Server, Shield, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface FunifierCredentialsPanelProps {
  instanceId: string;
  userId: string;
}

interface CredentialsFormData {
  apiKey: string;
  serverUrl: string;
  authToken: string;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: string;
}

export function FunifierCredentialsPanel({ instanceId, userId }: FunifierCredentialsPanelProps) {
  const [formData, setFormData] = useState<CredentialsFormData>({
    apiKey: '',
    serverUrl: 'https://service2.funifier.com',
    authToken: ''
  });
  
  const [showCredentials, setShowCredentials] = useState({
    apiKey: false,
    authToken: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false);

  useEffect(() => {
    loadExistingCredentials();
  }, [instanceId]);

  const loadExistingCredentials = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/funifier-credentials?instance=${instanceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.hasCredentials) {
          setHasExistingCredentials(true);
          setFormData({
            apiKey: '••••••••••••••••', // Masked for security
            serverUrl: data.serverUrl || 'https://service2.funifier.com',
            authToken: '••••••••••••••••' // Masked for security
          });
        }
      }
    } catch (err) {
      console.error('Failed to load existing credentials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CredentialsFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
    setValidationResult(null);
  };

  const toggleShowCredential = (field: 'apiKey' | 'authToken') => {
    setShowCredentials(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateCredentials = async () => {
    if (!formData.apiKey || !formData.authToken || !formData.serverUrl) {
      setError('All fields are required');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const response = await fetch('/api/setup/validate-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: formData.apiKey,
          serverUrl: formData.serverUrl,
          authToken: formData.authToken,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setValidationResult({
          isValid: result.isValid,
          message: result.isValid ? 'Credentials are valid!' : 'Credentials validation failed',
          details: result.message
        });
      } else {
        setError(result.message || 'Validation failed');
      }
    } catch (err) {
      setError('Failed to validate credentials. Please check your network connection.');
    } finally {
      setIsValidating(false);
    }
  };

  const saveCredentials = async () => {
    if (!validationResult?.isValid) {
      setError('Please validate credentials before saving');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/funifier-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId,
          userId,
          credentials: {
            apiKey: formData.apiKey,
            serverUrl: formData.serverUrl,
            authToken: formData.authToken,
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Funifier credentials saved successfully!');
        setHasExistingCredentials(true);
        // Mask the credentials after saving
        setFormData(prev => ({
          ...prev,
          apiKey: '••••••••••••••••',
          authToken: '••••••••••••••••'
        }));
      } else {
        setError(result.message || 'Failed to save credentials');
      }
    } catch (err) {
      setError('Failed to save credentials. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetCredentials = () => {
    setFormData({
      apiKey: '',
      serverUrl: 'https://service2.funifier.com',
      authToken: ''
    });
    setShowCredentials({ apiKey: false, authToken: false });
    setError(null);
    setSuccess(null);
    setValidationResult(null);
    setHasExistingCredentials(false);
  };

  const testConnection = async () => {
    if (!hasExistingCredentials) {
      setError('Please save credentials first');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/funifier-credentials/test?instance=${instanceId}`);
      const result = await response.json();

      if (response.ok) {
        setValidationResult({
          isValid: result.isValid,
          message: result.isValid ? 'Connection test successful!' : 'Connection test failed',
          details: result.message
        });
      } else {
        setError(result.message || 'Connection test failed');
      }
    } catch (err) {
      setError('Failed to test connection. Please check your network.');
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" />
        <span>Loading Funifier credentials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Funifier Credentials</h2>
          <p className="text-gray-600">
            Manage your Funifier API credentials for data integration
          </p>
        </div>
        {hasExistingCredentials && (
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Test Connection
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {validationResult && (
        <Alert variant={validationResult.isValid ? "success" : "destructive"}>
          {validationResult.isValid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div>
              <p className="font-medium">{validationResult.message}</p>
              {validationResult.details && (
                <p className="text-sm mt-1">{validationResult.details}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Credentials
          </CardTitle>
          <CardDescription>
            Enter your Funifier API credentials to enable data synchronization.
            {hasExistingCredentials && (
              <span className="block mt-1 text-green-600 font-medium">
                ✓ Credentials are currently configured
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" required>API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showCredentials.apiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('apiKey', e.target.value)
                  }
                  placeholder="Enter your Funifier API key"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleShowCredential('apiKey')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showCredentials.apiKey ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Found in your Funifier dashboard under Settings → API Keys
              </p>
            </div>

            {/* Auth Token */}
            <div className="space-y-2">
              <Label htmlFor="authToken" required>Authentication Token</Label>
              <div className="relative">
                <Input
                  id="authToken"
                  type={showCredentials.authToken ? "text" : "password"}
                  value={formData.authToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('authToken', e.target.value)
                  }
                  placeholder="Enter your authentication token"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleShowCredential('authToken')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showCredentials.authToken ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Basic authentication token for API access
              </p>
            </div>

            {/* Server URL */}
            <div className="space-y-2">
              <Label htmlFor="serverUrl">Server URL</Label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="serverUrl"
                  type="url"
                  value={formData.serverUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('serverUrl', e.target.value)
                  }
                  placeholder="https://service2.funifier.com"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                Leave as default unless you have a custom Funifier server
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={validateCredentials}
              disabled={isValidating || !formData.apiKey || !formData.authToken}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isValidating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Validate Credentials
            </Button>

            <Button
              onClick={saveCredentials}
              disabled={isSaving || !validationResult?.isValid}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              Save Credentials
            </Button>

            {hasExistingCredentials && (
              <Button
                onClick={resetCredentials}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Update Credentials
              </Button>
            )}
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Security Information
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Credentials are encrypted before storage</li>
                  <li>• Only admin users can view and modify credentials</li>
                  <li>• Credentials are validated before saving</li>
                  <li>• Connection is tested periodically for health monitoring</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}