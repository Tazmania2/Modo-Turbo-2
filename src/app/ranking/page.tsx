'use client';

import React from 'react';

export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { PersonalizedRankingContainer } from '@/components/ranking';
import { useAuthContext } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/loading/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/Card';
import { SystemNavigationHeader } from '@/components/navigation';

export default function RankingPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isAdmin } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600">Loading ranking data...</p>
        </div>
      </div>
    );
  }

  // Allow access for authenticated users (both admin and regular users)
  // This removes authentication barriers for authenticated users
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h1>
            <p className="text-gray-600 mb-4">
              Please log in to view ranking information.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/admin/login?redirect=/ranking')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>
              <button
                onClick={() => router.push('/setup')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Setup Demo Mode
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🏆 Ranking Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Track your performance and see how you stack up
              </p>
            </div>
            
            {/* Show admin indicator if user is admin */}
            {isAdmin && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Admin View</span>
              </div>
            )}
          </div>
          
          {/* System Navigation */}
          <div className="mt-4">
            <SystemNavigationHeader />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <PersonalizedRankingContainer
          playerId={user._id}
          autoRefresh={true}
          refreshInterval={30000}
        />
      </div>
    </div>
  );
}