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
      // Get instance ID from URL if available
      const urlParams = new URLSearchParams(window.location.search);
      const instanceId = urlParams.get('instance');
      
      // For headless mode, redirect directly to Funifier
      const defaultFunifierUrl = 'https://service2.funifier.com';
      const returnUrl = `${window.location.origin}/dashboard${instanceId ? `?instance=${instanceId}` : ''}`;
      const funifierLoginUrl = `${defaultFunifierUrl}/login?redirect_uri=${encodeURIComponent(returnUrl)}`;
      
      // Redirect directly to Funifier login
      window.location.href = funifierLoginUrl;
      
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