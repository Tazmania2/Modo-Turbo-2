'use client';

import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuthContext } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/loading/LoadingSpinner';

function DashboardContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();
  const { data, isLoading, error, refreshData } = useDashboardData();

  const handleNavigateToRanking = () => {
    router.push('/ranking');
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Allow access for authenticated users (both admin and regular users)
  // This removes authentication barriers for authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please log in to access your dashboard.
          </p>
          <button
            onClick={() => router.push('/admin/login?redirect=/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Error Loading Dashboard
            </h3>
            <p className="text-red-700 mb-4">
              {error}
            </p>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      playerName={data?.playerName}
      totalPoints={data?.totalPoints}
    >
      {data && (
        <DashboardContainer
          data={data}
          isLoading={isLoading}
          onRefresh={refreshData}
          onNavigateToRanking={handleNavigateToRanking}
        />
      )}
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}