'use client';

import { useEffect, useState, Suspense } from 'react';

export const dynamic = 'force-dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  const instanceId = searchParams.get('instance');

  useEffect(() => {
    checkSetupAndRedirect();
  }, [instanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkSetupAndRedirect = async () => {
    try {
      // With the new simplified approach, always redirect to admin login
      // The system will handle authentication and redirect appropriately
      const loginUrl = instanceId ? `/admin/login?instance=${instanceId}` : '/admin/login';
      router.push(loginUrl);
    } catch (error) {
      console.error('Failed to redirect:', error);
      // On error, redirect to admin login
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Platform
            </h2>
            <p className="text-gray-600">
              Checking your configuration and preparing your gamification platform...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached as we redirect in useEffect
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Redirecting...
        </h2>
        <p className="text-gray-600">
          Please wait while we redirect you to the appropriate page.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
