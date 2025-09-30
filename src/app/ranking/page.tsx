'use client';

import React from 'react';
import { PersonalizedRankingContainer } from '@/components/ranking';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/loading/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/Card';

export default function RankingPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h1>
            <p className="text-gray-600 mb-4">
              Please log in to view your ranking information, or try the demo mode.
            </p>
            <div className="space-y-2">
              <a
                href="/admin/login"
                className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </a>
              <a
                href="/setup"
                className="inline-block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Setup Demo Mode
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏆 Ranking Dashboard
          </h1>
          <p className="text-gray-600">
            Track your performance and see how you stack up against others
          </p>
        </div>

        <PersonalizedRankingContainer
          playerId={user._id}
          autoRefresh={true}
          refreshInterval={30000}
        />
      </div>
    </div>
  );
}