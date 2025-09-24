'use client';

import React, { useState } from 'react';
import { useHistoryData } from '../../hooks/useHistoryData';
import { HistoryNavigation } from './HistoryNavigation';
import { PerformanceGraph } from './PerformanceGraph';
import { SeasonDetails } from './SeasonDetails';

interface HistoryContainerProps {
  playerId: string;
}

/**
 * Main container component for user history functionality
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function HistoryContainer({ playerId }: HistoryContainerProps) {
  const {
    historyData,
    selectedSeason,
    isLoading,
    error,
    refetch,
    selectSeason,
  } = useHistoryData(playerId);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'current' | 'season'>('current');

  const handleSeasonSelect = async (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setViewMode('season');
    await selectSeason(seasonId);
  };

  const handleCurrentSeasonSelect = () => {
    setSelectedSeasonId(null);
    setViewMode('current');
  };

  // Error state
  if (error && !historyData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading History</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={refetch}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Performance History</h1>
        <p className="text-gray-600 mt-2">
          Track your progress and analyze performance trends over time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <HistoryNavigation
            seasons={historyData?.seasons || []}
            selectedSeasonId={selectedSeasonId}
            onSeasonSelect={handleSeasonSelect}
            onCurrentSeasonSelect={handleCurrentSeasonSelect}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {viewMode === 'current' ? (
            // Current Season View - Performance Graphs
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Current Season Performance
                </h2>
                <button
                  onClick={refetch}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {/* Performance Graphs */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <PerformanceGraph
                  data={historyData?.currentSeasonGraphs || []}
                  title="Points Progress"
                  type="points"
                  isLoading={isLoading}
                />
                <PerformanceGraph
                  data={historyData?.currentSeasonGraphs || []}
                  title="Position Tracking"
                  type="position"
                  isLoading={isLoading}
                />
              </div>

              {/* No Data Message */}
              {!isLoading && (!historyData?.currentSeasonGraphs || historyData.currentSeasonGraphs.length === 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-medium text-yellow-800">No Current Season Data</h3>
                      <p className="text-yellow-700 mt-1">
                        Performance data for the current season is not yet available. 
                        Data will appear here as you participate in activities.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Season Details View
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Season Details
                </h2>
                <button
                  onClick={handleCurrentSeasonSelect}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  Back to Current Season
                </button>
              </div>

              {selectedSeason ? (
                <SeasonDetails season={selectedSeason} isLoading={isLoading} />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {error && historyData && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}