'use client';

import { useState } from 'react';

export interface FunifierCredentialsFormProps {
  onSubmit: (credentials: {
    apiKey: string;
    serverUrl: string;
    authToken: string;
  }) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function FunifierCredentialsForm({ onSubmit, onBack, isLoading = false }: FunifierCredentialsFormProps) {
  const [formData, setFormData] = useState({
    apiKey: '',
    serverUrl: 'https://service2.funifier.com/v3',
    authToken: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
    }

    if (!formData.serverUrl.trim()) {
      newErrors.serverUrl = 'Server URL is required';
    } else if (!formData.serverUrl.startsWith('http')) {
      newErrors.serverUrl = 'Server URL must start with http:// or https://';
    }

    if (!formData.authToken.trim()) {
      newErrors.authToken = 'Auth Token is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Connect Your Funifier Account
        </h2>
        <p className="text-gray-600">
          Enter your Funifier credentials to connect your gamification data
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Key */}
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
            API Key *
          </label>
          <input
            type="password"
            id="apiKey"
            value={formData.apiKey}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.apiKey ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your Funifier API key"
            disabled={isLoading}
          />
          {errors.apiKey && (
            <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            You can find your API key in your Funifier dashboard under Settings → API Keys
          </p>
        </div>

        {/* Auth Token */}
        <div>
          <label htmlFor="authToken" className="block text-sm font-medium text-gray-700 mb-2">
            Auth Token *
          </label>
          <input
            type="password"
            id="authToken"
            value={formData.authToken}
            onChange={(e) => handleInputChange('authToken', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.authToken ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your authentication token"
            disabled={isLoading}
          />
          {errors.authToken && (
            <p className="mt-1 text-sm text-red-600">{errors.authToken}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Basic authentication token for API access
          </p>
        </div>

        {/* Advanced Settings Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
            disabled={isLoading}
          >
            <svg 
              className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Settings
          </button>
        </div>

        {/* Server URL (Advanced) */}
        {showAdvanced && (
          <div>
            <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Server URL
            </label>
            <input
              type="url"
              id="serverUrl"
              value={formData.serverUrl}
              onChange={(e) => handleInputChange('serverUrl', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.serverUrl ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://service2.funifier.com/v3"
              disabled={isLoading}
            />
            {errors.serverUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.serverUrl}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Leave as default unless you have a custom Funifier server
            </p>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Need help finding your credentials?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Log into your Funifier dashboard</li>
                <li>• Navigate to Settings → API Keys</li>
                <li>• Copy your API Key and Auth Token</li>
                <li>• Make sure your account has admin privileges</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              'Connect Funifier'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}