'use client';

import React from 'react';
import { Season } from '../../types/dashboard';

interface SeasonDetailsProps {
  season: Season;
  isLoading?: boolean;
}

/**
 * Season details component for displaying season-specific information
 * Implements requirement 3.2: Show season-specific metrics and achievements
 */
export function SeasonDetails({ season, isLoading = false }: SeasonDetailsProps) {
  if (isLoading) {
    return (
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
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{season.name}</h2>
          <p className="text-sm text-gray-600">
            {formatDateRange(season.startDate, season.endDate)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            #{season.playerStats.finalPosition}
          </div>
          <div className="text-sm text-gray-500">Final Position</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-600">Total Points</div>
              <div className="text-2xl font-bold text-gray-900">
                {season.playerStats.totalPoints.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-600">Achievements</div>
              <div className="text-2xl font-bold text-gray-900">
                {season.playerStats.achievements.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-600">Goals Completed</div>
              <div className="text-2xl font-bold text-gray-900">
                {season.playerStats.goals.filter(goal => goal.percentage >= 100).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      {season.playerStats.achievements.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {season.playerStats.achievements.map((achievement, index) => (
              <div
                key={index}
                className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">{achievement}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals Section */}
      {season.playerStats.goals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Season Goals</h3>
          <div className="space-y-3">
            {season.playerStats.goals.map((goal, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{goal.emoji}</span>
                  <div>
                    <div className="font-medium text-gray-900">{goal.name}</div>
                    <div className="text-sm text-gray-600">{goal.description}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-right mr-4">
                    <div className="text-sm font-medium text-gray-900">
                      {goal.current?.toLocaleString() || 0} / {goal.target?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-500">{goal.unit}</div>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>{Math.round(goal.percentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          goal.percentage >= 100
                            ? 'bg-green-500'
                            : goal.percentage >= 75
                            ? 'bg-blue-500'
                            : goal.percentage >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {season.playerStats.achievements.length === 0 && season.playerStats.goals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-sm">No detailed data available for this season</div>
          <div className="text-xs mt-1">
            Achievement and goal data may not be available for older seasons
          </div>
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
  
  const startFormatted = start.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const endFormatted = end.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `${startFormatted} - ${endFormatted}`;
}