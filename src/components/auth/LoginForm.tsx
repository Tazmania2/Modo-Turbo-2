'use client';

import React, { useState } from 'react';

export interface LoginFormProps {
  requireAdmin?: boolean;
}

export function LoginForm({ 
  requireAdmin = false 
}: LoginFormProps) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get URL parameters for deep linking support
      const urlParams = new URLSearchParams(window.location.search);
      const instanceId = urlParams.get('instance');
      const redirectParam = urlParams.get('redirect');
      
      // Use the proper authentication API
      const loginUrl = instanceId 
        ? `/api/auth/login?instance=${instanceId}`
        : '/api/auth/login';

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      // Success - handle deep linking with authentication preservation
      let redirectTo: string;
      
      if (redirectParam) {
        // Deep linking: redirect to the intended destination
        redirectTo = redirectParam;
        // Preserve instance ID if present
        if (instanceId && !redirectTo.includes('instance=')) {
          const separator = redirectTo.includes('?') ? '&' : '?';
          redirectTo = `${redirectTo}${separator}instance=${instanceId}`;
        }
      } else if (requireAdmin) {
        // For admin login without redirect, go to admin panel
        redirectTo = instanceId ? `/admin?instance=${instanceId}` : '/admin';
      } else {
        // For regular login without redirect, go to dashboard
        redirectTo = instanceId ? `/dashboard?instance=${instanceId}` : '/dashboard';
      }
      
      window.location.href = redirectTo;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="username" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            value={credentials.username}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your username"
            disabled={isLoading}
          />
        </div>

        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={credentials.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !credentials.username || !credentials.password}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          ) : (
            'Sign In'
          )}
        </button>

        {requireAdmin && (
          <p className="text-xs text-gray-500 text-center">
            Admin credentials required to access this area
          </p>
        )}
      </form>
    </div>
  );
}