'use client';

import React from 'react';

export const dynamic = 'force-dynamic';
import { useAuth } from '../../hooks/useAuth';
import { HistoryContainer } from '../../components/history/HistoryContainer';

/**
 * History page component
 * Implements requirement 3.1: User history functionality access
 */
export default function HistoryPage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to view your performance history, or try the demo mode.</p>
          <div className="space-y-3">
            <a
              href="/admin/login"
              className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </a>
            <a
              href="/setup"
              className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
            >
              Setup Demo Mode
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HistoryContainer playerId={user._id} />
    </div>
  );
}