'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/Card';
import { RaceVisualization } from './RaceVisualization';
import { PersonalRankingCard } from './PersonalRankingCard';
import { ContextualRanking } from './ContextualRanking';
import { RankingNavigation, RankingView } from './RankingNavigation';
import { useRankingData } from '@/hooks/useRankingData';
import { cn } from '@/lib/utils';

interface PersonalizedRankingContainerProps {
  playerId: string;
  initialLeaderboardId?: string;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const PersonalizedRankingContainer: React.FC<PersonalizedRankingContainerProps> = ({
  playerId,
  initialLeaderboardId,
  className,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [currentView, setCurrentView] = useState<RankingView>('personal');
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string | undefined>(initialLeaderboardId);

  const {
    leaderboards,
    personalRanking,
    globalRanking,
    dashboardData,
    isLoadingLeaderboards,
    isLoadingPersonalRanking,
    isLoadingGlobalRanking,
    isLoadingDashboard,
    leaderboardsError,
    personalRankingError,
    globalRankingError,
    dashboardError,
    refreshAll
  } = useRankingData({
    playerId,
    leaderboardId: selectedLeaderboard,
    autoRefresh,
    refreshInterval
  });

  // Auto-select first active leaderboard if none selected
  useEffect(() => {
    if (!selectedLeaderboard && leaderboards?.leaderboards?.length > 0) {
      const firstActive = leaderboards.leaderboards.find(lb => lb.active);
      if (firstActive) {
        setSelectedLeaderboard(firstActive._id);
      }
    }
  }, [leaderboards, selectedLeaderboard]);

  const isLoading = isLoadingLeaderboards || isLoadingPersonalRanking || isLoadingGlobalRanking || isLoadingDashboard;
  const hasError = leaderboardsError || personalRankingError || globalRankingError || dashboardError;

  const renderCurrentView = () => {
    if (hasError) {
      return (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-2">⚠️ Error Loading Data</div>
            <p className="text-sm text-red-700 mb-4">
              {leaderboardsError || personalRankingError || globalRankingError || dashboardError}
            </p>
            <button
              onClick={refreshAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      );
    }

    if (!selectedLeaderboard) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-gray-500 mb-2">📊</div>
            <p className="text-gray-600">Please select a leaderboard to view rankings</p>
          </CardContent>
        </Card>
      );
    }

    switch (currentView) {
      case 'personal':
        if (isLoadingPersonalRanking) {
          return <LoadingSpinner size="lg" text="Loading your personal ranking..." />;
        }
        
        if (!personalRanking) {
          return (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">No personal ranking data available</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PersonalRankingCard 
              personalCard={personalRanking.personalCard}
              showDetailedStats={true}
            />
            <ContextualRanking
              topThree={personalRanking.topThree}
              contextualRanking={personalRanking.contextualRanking}
              showPointsGained={true}
            />
          </div>
        );

      case 'race':
        if (isLoadingPersonalRanking) {
          return <LoadingSpinner size="lg" text="Loading race visualization..." />;
        }
        
        if (!personalRanking?.raceData) {
          return (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">No race data available</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-6">
            <RaceVisualization
              raceData={personalRanking.raceData}
              autoAnimate={true}
              showPositions={true}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PersonalRankingCard 
                personalCard={personalRanking.personalCard}
                showDetailedStats={false}
              />
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Top 3 Leaders</h4>
                  <div className="space-y-2">
                    {personalRanking.topThree.slice(0, 3).map((player, index) => (
                      <div key={player._id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                          <span className="font-medium">{player.name}</span>
                        </div>
                        <span className="text-sm font-semibold">
                          {player.totalPoints.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'global':
        if (isLoadingGlobalRanking) {
          return <LoadingSpinner size="lg" text="Loading global rankings..." />;
        }
        
        if (!globalRanking) {
          return (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">No global ranking data available</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-6">
            <RaceVisualization
              raceData={globalRanking.raceData}
              autoAnimate={true}
              showPositions={true}
            />
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Full Leaderboard</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {globalRanking.fullRanking.map((player) => (
                    <div
                      key={player._id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded',
                        player._id === playerId ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-8 text-center font-semibold">
                          #{player.position}
                        </span>
                        <span className={cn(
                          'font-medium',
                          player._id === playerId && 'text-blue-900'
                        )}>
                          {player.name}
                        </span>
                        {player._id === playerId && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <span className="font-semibold">
                        {player.totalPoints.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'history':
        return (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-gray-500 mb-2">📊</div>
              <p className="text-gray-600 mb-2">History View</p>
              <p className="text-sm text-gray-500">
                Historical performance data will be implemented in a future task
              </p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Navigation */}
      <RankingNavigation
        currentView={currentView}
        onViewChange={setCurrentView}
        leaderboards={leaderboards?.leaderboards}
        selectedLeaderboard={selectedLeaderboard}
        onLeaderboardChange={setSelectedLeaderboard}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="min-h-96">
        {renderCurrentView()}
      </div>
    </div>
  );
};