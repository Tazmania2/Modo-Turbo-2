'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const instanceId = searchParams.get('instance');

  // Don't auto-redirect - show the login form instead
  // The LoginForm component will handle the authentication via Funifier API

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
          <p className="text-blue-100">Sign in with your Funifier credentials</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <LoginForm
            requireAdmin={true}
          />

          {/* Info Section */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Admin Access Required</h4>
                <p className="text-sm text-blue-800">
                  You need admin privileges in your Funifier account to access the white-label configuration panel.
                </p>
              </div>
            </div>
          </div>

          {/* Instance Info */}
          {instanceId && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Instance: {instanceId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}