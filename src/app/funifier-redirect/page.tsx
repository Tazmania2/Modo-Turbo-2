'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function FunifierRedirectContent() {
  const searchParams = useSearchParams();
  const instanceId = searchParams.get('instance');

  React.useEffect(() => {
    const redirectToFunifier = () => {
      try {
        // Try the most common Funifier login URLs
        const possibleUrls = [
          'https://app.funifier.com/login',
          'https://service2.funifier.com/auth/login',
          'https://service2.funifier.com/login'
        ];
        
        // Use the first one for now - we can test others
        const funifierUrl = possibleUrls[0];
        const returnUrl = `${window.location.origin}/dashboard${instanceId ? `?instance=${instanceId}` : ''}`;
        const loginUrl = `${funifierUrl}?redirect_uri=${encodeURIComponent(returnUrl)}`;
        
        console.log('Redirecting to Funifier:', loginUrl);
        window.location.href = loginUrl;
      } catch (error) {
        console.error('Failed to redirect to Funifier:', error);
        // Fallback - redirect to setup
        window.location.href = '/setup?error=redirect_failed';
      }
    };

    // Immediate redirect
    redirectToFunifier();
  }, [instanceId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <h1 className="text-2xl font-bold mb-2">Connecting to Funifier</h1>
          <p className="text-blue-100">Redirecting you to Funifier login...</p>
        </div>

        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">
            Please wait while we connect you to Funifier...
          </p>

          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              If you&apos;re not redirected automatically:
            </p>
            <button 
              onClick={() => {
                const returnUrl = `${window.location.origin}/dashboard${instanceId ? `?instance=${instanceId}` : ''}`;
                const loginUrl = `https://app.funifier.com/login?redirect_uri=${encodeURIComponent(returnUrl)}`;
                window.location.href = loginUrl;
              }}
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Click here to login with Funifier
            </button>
          </div>

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

export default function FunifierRedirectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FunifierRedirectContent />
    </Suspense>
  );
}