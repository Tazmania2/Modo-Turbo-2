'use client';

import React from 'react';
import { Season } from '../../types/dashboard';

interface HistoryNavigationProps {
  seasons: Season[];
  selectedSeasonId: string | null;
  onSeasonSelect: (seasonId: string) => void;
  onCurrentSeasonSelect: () => void;
  isLoading?: boolean;
}

/**
 * Navigation component for history functionality
 * Implements requirement 3.1: History navigation and filtering
 */
export function HistoryNavigation({
  seasons,
  selectedSeasonId,
  onSeasonSelect,
  onCurrentSeasonSelect,
  isLoading = false
}: HistoryNavigationProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Season History
      </h3>
      
      <div className="space-y-2">
        {/* Current Season Option */}
        <button
          onClick={onCurrentSeasonSelect}
          disabled={isLoading}
          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
            selectedSeasonId === null
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Current Season</div>
              <div className="text-sm text-gray-500">
                Performance trends and progress
              </div>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
        </button>

        {/* Historical Seasons */}
        {seasons.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-500 mt-4 mb-2">
              Previous Seasons
            </div>
            {seasons.map((season) => (
              <button
                key={season._id}
                onClick={() => onSeasonSelect(season._id)}
                disabled={isLoading}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedSeasonId === season._id
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{season.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatDateRange(season.startDate, season.endDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      #{season.playerStats.finalPosition}
                    </div>
                    <div className="text-xs text-gray-500">
                      {season.playerStats.totalPoints.toLocaleString()} pts
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No previous seasons available</div>
            <div className="text-xs mt-1">
              Historical data will appear here once seasons are completed
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to format date range
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}