'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const instanceId = searchParams.get('instance');

  // Redirect to Funifier login immediately
  React.useEffect(() => {
    const redirectToFunifier = () => {
      try {
        // Direct redirect to default Funifier without any API calls
        const defaultFunifierUrl = 'https://service2.funifier.com';
        const returnUrl = `${window.location.origin}/dashboard${instanceId ? `?instance=${instanceId}` : ''}`;
        const funifierLoginUrl = `${defaultFunifierUrl}/login?redirect_uri=${encodeURIComponent(returnUrl)}`;

        console.log('Direct redirect to Funifier:', funifierLoginUrl);
        window.location.href = funifierLoginUrl;
      } catch (error) {
        console.error('Failed to redirect to Funifier:', error);
      }
    };

    // Small delay to show the loading screen
    const timer = setTimeout(redirectToFunifier, 1000);
    return () => clearTimeout(timer);
  }, [instanceId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <h1 className="text-2xl font-bold mb-2">Redirecting to Funifier</h1>
          <p className="text-blue-100">Please wait while we redirect you to Funifier login...</p>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">
            Redirecting to Funifier authentication...
          </p>

          {/* Manual redirect link */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              If you&apos;re not redirected automatically:
            </p>
            <a
              href="#"
              onClick={() => {
                const defaultFunifierUrl = 'https://service2.funifier.com';
                const returnUrl = `${window.location.origin}/dashboard${instanceId ? `?instance=${instanceId}` : ''}`;
                const funifierLoginUrl = `${defaultFunifierUrl}/login?redirect_uri=${encodeURIComponent(returnUrl)}`;
                window.location.href = funifierLoginUrl;
              }}
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Click here to login with Funifier
            </a>
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