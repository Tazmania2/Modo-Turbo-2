'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const instanceId = searchParams.get('instance');

  // Redirect to Funifier login immediately
  React.useEffect(() => {
    const redirectToFunifier = async () => {
      try {
        const loginUrl = instanceId 
          ? `/api/auth/login?instance=${instanceId}`
          : '/api/auth/login';
        
        window.location.href = loginUrl;
      } catch (error) {
        console.error('Failed to redirect to Funifier:', error);
      }
    };

    redirectToFunifier();
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
              href={instanceId ? `/api/auth/login?instance=${instanceId}` : '/api/auth/login'}
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