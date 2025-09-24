'use client';

import React from 'react';
import { DashboardData } from '@/types/dashboard';
import { GoalCard } from './GoalCard';
import { PointsDisplay } from './PointsDisplay';
import { CycleProgress } from './CycleProgress';
import { BoostIndicator } from './BoostIndicator';
import { Button } from '@/components/ui/Button';

interface DashboardContainerProps {
  data: DashboardData;
  isLoading?: boolean;
  onRefresh?: () => void;
  onNavigateToRanking?: () => void;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  data,
  isLoading = false,
  onRefresh,
  onNavigateToRanking
}) => {
  const hasAnyBoost = data.primaryGoal.hasBoost || data.secondaryGoal1.hasBoost || data.secondaryGoal2.hasBoost;
  const activeBoosts = [data.primaryGoal, data.secondaryGoal1, data.secondaryGoal2]
    .filter(goal => goal.hasBoost && goal.isBoostActive);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {data.playerName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s your gamification progress overview
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          )}
          
          {onNavigateToRanking && (
            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToRanking}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              View Rankings
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PointsDisplay
          totalPoints={data.totalPoints}
          pointsLocked={data.pointsLocked}
        />
        
        <CycleProgress
          currentDay={data.currentCycleDay}
          totalDays={data.totalCycleDays}
        />

        {/* Quick Stats Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Stats
              </h3>
              <p className="text-sm text-gray-600">
                Your performance summary
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Goals</span>
              <span className="font-semibold text-gray-900">3</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Boosts</span>
              <span className="font-semibold text-gray-900">{activeBoosts.length}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg. Progress</span>
              <span className="font-semibold text-gray-900">
                {Math.round((data.primaryGoal.percentage + data.secondaryGoal1.percentage + data.secondaryGoal2.percentage) / 3)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Boosts */}
      {hasAnyBoost && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Active Boosts
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[data.primaryGoal, data.secondaryGoal1, data.secondaryGoal2]
              .filter(goal => goal.hasBoost)
              .map((goal, index) => (
                <BoostIndicator
                  key={index}
                  hasBoost={goal.hasBoost || false}
                  isActive={goal.isBoostActive || false}
                  timeRemaining={goal.isBoostActive ? "2h 15m" : undefined}
                />
              ))
            }
          </div>
        </div>
      )}

      {/* Goals Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Goals
          </h2>
          <span className="text-sm text-gray-500">
            Track your progress and achievements
          </span>
        </div>

        {/* Primary Goal */}
        <GoalCard
          goal={data.primaryGoal}
          isPrimary={true}
          className="border-l-4 border-l-blue-500"
        />

        {/* Secondary Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GoalCard goal={data.secondaryGoal1} />
          <GoalCard goal={data.secondaryGoal2} />
        </div>
      </div>
    </div>
  );
};