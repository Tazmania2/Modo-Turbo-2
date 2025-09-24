'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { SetupRequest } from '@/types/funifier';

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(true);

  const instanceId = searchParams.get('instance');

  useEffect(() => {
    checkSetupStatus();
  }, [instanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkSetupStatus = async () => {
    try {
      const params = new URLSearchParams();
      if (instanceId) {
        params.set('instanceId', instanceId);
      }

      const response = await fetch(`/api/setup?${params}`);
      const data = await response.json();

      setNeedsSetup(data.needsSetup);
      
      // If setup is not needed, redirect to appropriate page
      if (!data.needsSetup && instanceId) {
        // Check if it's a demo or Funifier instance and redirect accordingly
        router.push(`/dashboard?instance=${instanceId}`);
        return;
      }
    } catch (error) {
      console.error('Failed to check setup status:', error);
      // Assume setup is needed on error
      setNeedsSetup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupRequest = async (request: SetupRequest) => {
    try {
      const params = new URLSearchParams();
      if (instanceId) {
        params.set('instanceId', instanceId);
      }

      const response = await fetch(`/api/setup?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Setup request failed:', error);
      return {
        success: false,
        errors: ['Failed to communicate with server']
      };
    }
  };

  const handleSetupComplete = (result: {
    success: boolean;
    instanceId?: string;
    redirectUrl?: string;
    errors?: string[];
  }) => {
    if (result.success && result.redirectUrl) {
      router.push(result.redirectUrl);
    } else if (result.errors) {
      console.error('Setup completed with errors:', result.errors);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Checking Setup Status
            </h2>
            <p className="text-gray-600">
              Please wait while we check your platform configuration...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!needsSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Already Set Up
          </h2>
          <p className="text-gray-600 mb-6">
            Your platform is already configured. Redirecting to dashboard...
          </p>
          <div className="animate-pulse">
            <div className="h-2 bg-green-200 rounded-full">
              <div className="h-2 bg-green-600 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SetupWizard
      onSetupRequest={handleSetupRequest}
      onComplete={handleSetupComplete}
    />
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetupContent />
    </Suspense>
  );
}