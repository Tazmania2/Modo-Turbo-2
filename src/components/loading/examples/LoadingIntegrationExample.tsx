'use client';

import React, { useState } from 'react';
import { LoadingManager } from '../LoadingManager';
import { useLoadingState } from '../../../hooks/useLoadingState';
import { useToast } from '../../../contexts/ToastContext';

/**
 * LoadingIntegrationExample - Shows how to integrate loading states in real scenarios
 * This demonstrates the patterns used throughout the white-label gamification platform
 */
export const LoadingIntegrationExample: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [rankingData, setRankingData] = useState<any>(null);
  const { showSuccess, showError, showWarning } = useToast();
  
  // Separate loading states for different operations
  const [dashboardLoading, dashboardActions] = useLoadingState({
    timeout: 5000,
    onTimeout: () => showWarning('Dashboard loading timeout', 'This is taking longer than expected'),
  });
  
  const [rankingLoading, rankingActions] = useLoadingState({
    timeout: 5000,
    onTimeout: () => showWarning('Ranking loading timeout', 'This is taking longer than expected'),
  });

  // Simulate dashboard data fetching
  const fetchDashboardData = async () => {
    try {
      const data = await dashboardActions.executeWithLoading(async () => {
        // Simulate API call with progress updates
        dashboardActions.setProgress(20);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        dashboardActions.setProgress(50);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        dashboardActions.setProgress(80);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        dashboardActions.setProgress(100);
        
        // Simulate potential error (20% chance)
        if (Math.random() < 0.2) {
          throw new Error('Failed to fetch dashboard data from Funifier API');
        }
        
        return {
          playerName: 'John Doe',
          totalPoints: 1250,
          goals: [
            { name: 'Daily Tasks', percentage: 75, emoji: '📋' },
            { name: 'Team Collaboration', percentage: 60, emoji: '🤝' },
            { name: 'Learning Goals', percentage: 90, emoji: '📚' },
          ],
        };
      });
      
      setDashboardData(data);
      showSuccess('Dashboard loaded', 'Your personal dashboard has been updated');
    } catch (error) {
      showError('Dashboard error', 'Failed to load dashboard data. Please try again.');
    }
  };

  // Simulate ranking data fetching
  const fetchRankingData = async () => {
    try {
      const data = await rankingActions.executeWithLoading(async () => {
        // Simulate longer loading for ranking data
        rankingActions.setProgress(10);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        rankingActions.setProgress(30);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        rankingActions.setProgress(60);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        rankingActions.setProgress(90);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        rankingActions.setProgress(100);
        
        // Simulate potential error (15% chance)
        if (Math.random() < 0.15) {
          throw new Error('Ranking service temporarily unavailable');
        }
        
        return {
          currentPosition: 5,
          totalPlayers: 42,
          topThree: [
            { name: 'Alice Smith', points: 2100 },
            { name: 'Bob Johnson', points: 1950 },
            { name: 'Carol Davis', points: 1800 },
          ],
          userContext: {
            above: { name: 'David Wilson', points: 1300 },
            current: { name: 'John Doe', points: 1250 },
            below: { name: 'Emma Brown', points: 1200 },
          },
        };
      });
      
      setRankingData(data);
      showSuccess('Ranking updated', 'Latest ranking data has been loaded');
    } catch (error) {
      showError('Ranking error', 'Failed to load ranking data. Please try again.');
    }
  };

  // Simulate batch data refresh
  const refreshAllData = async () => {
    try {
      showInfo('Refreshing data', 'Loading latest information from all sources...');
      
      // Run both operations in parallel
      await Promise.all([
        fetchDashboardData(),
        fetchRankingData(),
      ]);
      
      showSuccess('Refresh complete', 'All data has been updated successfully');
    } catch (error) {
      showError('Refresh failed', 'Some data could not be updated. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Integration Example</h1>
        <p className="text-gray-600">Real-world patterns for loading states in the gamification platform</p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Data Operations</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={fetchDashboardData}
            disabled={dashboardLoading.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {dashboardLoading.isLoading ? 'Loading Dashboard...' : 'Load Dashboard'}
          </button>
          
          <button
            onClick={fetchRankingData}
            disabled={rankingLoading.isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rankingLoading.isLoading ? 'Loading Ranking...' : 'Load Ranking'}
          </button>
          
          <button
            onClick={refreshAllData}
            disabled={dashboardLoading.isLoading || rankingLoading.isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Refresh All Data
          </button>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Personal Dashboard</h2>
        </div>
        
        <LoadingManager
          isLoading={dashboardLoading.isLoading}
          loadingType="skeleton"
          skeletonType="dashboard"
          errorMessage={dashboardLoading.error?.message}
        >
          {dashboardData ? (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">{dashboardData.playerName}</h3>
                <p className="text-2xl font-bold text-primary-600">{dashboardData.totalPoints} points</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboardData.goals.map((goal: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{goal.name}</span>
                      <span className="text-2xl">{goal.emoji}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.percentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{goal.percentage}% complete</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>No dashboard data loaded. Click &quot;Load Dashboard&quot; to fetch data.</p>
            </div>
          )}
        </LoadingManager>
      </div>

      {/* Ranking Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Ranking</h2>
        </div>
        
        <LoadingManager
          isLoading={rankingLoading.isLoading}
          loadingType="skeleton"
          skeletonType="ranking"
          errorMessage={rankingLoading.error?.message}
        >
          {rankingData ? (
            <div className="p-6">
              <div className="mb-6 text-center">
                <p className="text-lg">
                  You are ranked <span className="font-bold text-primary-600">#{rankingData.currentPosition}</span> out of {rankingData.totalPlayers} players
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Top 3 Players</h3>
                  <div className="space-y-2">
                    {rankingData.topThree.map((player: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-primary-600">#{index + 1}</span>
                          <span>{player.name}</span>
                        </div>
                        <span className="font-semibold">{player.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Around Your Position</h3>
                  <div className="space-y-2">
                    {[rankingData.userContext.above, rankingData.userContext.current, rankingData.userContext.below].map((player: any, index: number) => (
                      <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 1 ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <span className={`font-bold ${index === 1 ? 'text-primary-600' : 'text-gray-600'}`}>
                            #{rankingData.currentPosition + index - 1}
                          </span>
                          <span className={index === 1 ? 'font-semibold' : ''}>{player.name}</span>
                        </div>
                        <span className={`font-semibold ${index === 1 ? 'text-primary-600' : ''}`}>
                          {player.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>No ranking data loaded. Click &quot;Load Ranking&quot; to fetch data.</p>
            </div>
          )}
        </LoadingManager>
      </div>

      {/* Loading State Information */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Loading State Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Dashboard Loading</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={dashboardLoading.isLoading ? 'text-yellow-600' : 'text-green-600'}>
                  {dashboardLoading.isLoading ? 'Loading' : 'Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Progress:</span>
                <span>{Math.round(dashboardLoading.progress)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Elapsed:</span>
                <span>{dashboardLoading.elapsedTime}ms</span>
              </div>
              {dashboardLoading.error && (
                <div className="text-red-600">
                  Error: {dashboardLoading.error.message}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Ranking Loading</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={rankingLoading.isLoading ? 'text-yellow-600' : 'text-green-600'}>
                  {rankingLoading.isLoading ? 'Loading' : 'Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Progress:</span>
                <span>{Math.round(rankingLoading.progress)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Elapsed:</span>
                <span>{rankingLoading.elapsedTime}ms</span>
              </div>
              {rankingLoading.error && (
                <div className="text-red-600">
                  Error: {rankingLoading.error.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};