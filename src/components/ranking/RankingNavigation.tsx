'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export type RankingView = 'personal' | 'global' | 'race' | 'history';

interface RankingNavigationProps {
  currentView: RankingView;
  onViewChange: (view: RankingView) => void;
  leaderboards?: Array<{
    _id: string;
    name: string;
    description?: string;
    active: boolean;
    participants?: number;
  }>;
  selectedLeaderboard?: string;
  onLeaderboardChange?: (leaderboardId: string) => void;
  className?: string;
  isLoading?: boolean;
}

export const RankingNavigation: React.FC<RankingNavigationProps> = ({
  currentView,
  onViewChange,
  leaderboards = [],
  selectedLeaderboard,
  onLeaderboardChange,
  className,
  isLoading = false
}) => {
  const viewOptions = [
    {
      id: 'personal' as RankingView,
      label: 'Personal',
      icon: '👤',
      description: 'Your ranking and stats'
    },
    {
      id: 'race' as RankingView,
      label: 'Race View',
      icon: '🏁',
      description: 'Animated race visualization'
    },
    {
      id: 'global' as RankingView,
      label: 'Global',
      icon: '🌍',
      description: 'Full leaderboard'
    },
    {
      id: 'history' as RankingView,
      label: 'History',
      icon: '📊',
      description: 'Performance over time'
    }
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Leaderboard Selection */}
      {leaderboards.length > 0 && onLeaderboardChange && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Leaderboard</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {leaderboards.map((leaderboard) => (
              <button
                key={leaderboard._id}
                onClick={() => onLeaderboardChange(leaderboard._id)}
                disabled={isLoading || !leaderboard.active}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all duration-200',
                  'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                  selectedLeaderboard === leaderboard._id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                  !leaderboard.active && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'font-medium text-sm',
                    selectedLeaderboard === leaderboard._id ? 'text-blue-900' : 'text-gray-900'
                  )}>
                    {leaderboard.name}
                  </span>
                  {selectedLeaderboard === leaderboard._id && (
                    <Badge variant="info" size="sm">Active</Badge>
                  )}
                </div>
                
                {leaderboard.description && (
                  <p className="text-xs text-gray-600 mb-2">
                    {leaderboard.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-xs',
                    leaderboard.active ? 'text-green-600' : 'text-gray-500'
                  )}>
                    {leaderboard.active ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                  
                  {leaderboard.participants !== undefined && (
                    <span className="text-xs text-gray-500">
                      {leaderboard.participants} participants
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">View Options</h3>
        
        {/* Mobile View - Dropdown */}
        <div className="sm:hidden">
          <select
            value={currentView}
            onChange={(e) => onViewChange(e.target.value as RankingView)}
            disabled={isLoading}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {viewOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop View - Buttons */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {viewOptions.map((option) => (
            <Button
              key={option.id}
              variant={currentView === option.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onViewChange(option.id)}
              disabled={isLoading}
              className={cn(
                'flex flex-col items-center p-4 h-auto space-y-2',
                currentView === option.id && 'shadow-md'
              )}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-xs font-medium">{option.label}</span>
            </Button>
          ))}
        </div>

        {/* View Description */}
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
          {viewOptions.find(option => option.id === currentView)?.description}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="text-xs"
          >
            🔄 Refresh Data
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="text-xs"
          >
            📤 Share Ranking
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="text-xs"
          >
            ⚙️ Settings
          </Button>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-700">Loading ranking data...</span>
          </div>
        </div>
      )}
    </div>
  );
};