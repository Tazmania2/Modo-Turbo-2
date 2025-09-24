'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import { PersonalCard } from '@/types/funifier';

interface PersonalRankingCardProps {
  personalCard: PersonalCard;
  className?: string;
  showDetailedStats?: boolean;
}

export const PersonalRankingCard: React.FC<PersonalRankingCardProps> = ({
  personalCard,
  className,
  showDetailedStats = true
}) => {
  const getPositionChange = () => {
    if (!personalCard.previousPosition) return null;
    
    const change = personalCard.previousPosition - personalCard.currentPosition;
    if (change > 0) {
      return { type: 'up', value: change, color: 'success' };
    } else if (change < 0) {
      return { type: 'down', value: Math.abs(change), color: 'error' };
    }
    return { type: 'same', value: 0, color: 'default' };
  };

  const getPositionIcon = () => {
    const position = personalCard.currentPosition;
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const getLevelProgress = () => {
    if (personalCard.nextLevelPoints <= 0) return 100;
    const currentLevelPoints = personalCard.totalPoints % 1000; // Assuming 1000 points per level
    return (currentLevelPoints / personalCard.nextLevelPoints) * 100;
  };

  const formatLastActivity = () => {
    const now = new Date();
    const lastActivity = new Date(personalCard.lastActivity);
    const diffInHours = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const positionChange = getPositionChange();

  return (
    <Card className={cn('bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Ranking</h3>
          <Badge variant="info" size="sm">
            Personal Stats
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Player Info Section */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            {personalCard.avatar ? (
              <img
                src={personalCard.avatar}
                alt={personalCard.playerName}
                className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xl">
                {personalCard.playerName.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Online Status Indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
          </div>

          <div className="flex-1">
            <h4 className="text-xl font-bold text-gray-900">{personalCard.playerName}</h4>
            <p className="text-sm text-gray-600">{personalCard.team}</p>
            <p className="text-xs text-gray-500">{formatLastActivity()}</p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {getPositionIcon()}
            </div>
            {positionChange && (
              <div className="flex items-center justify-end mt-1">
                <span className={cn(
                  'text-xs font-medium',
                  positionChange.color === 'success' && 'text-green-600',
                  positionChange.color === 'error' && 'text-red-600',
                  positionChange.color === 'default' && 'text-gray-600'
                )}>
                  {positionChange.type === 'up' && '↗️ '}
                  {positionChange.type === 'down' && '↘️ '}
                  {positionChange.type === 'same' && '→ '}
                  {positionChange.value > 0 ? positionChange.value : 'Same'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Points and Level Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {personalCard.totalPoints.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Points</div>
            {personalCard.pointsGainedToday > 0 && (
              <div className="text-xs text-green-600 font-medium mt-1">
                +{personalCard.pointsGainedToday} today
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {personalCard.level}
            </div>
            <div className="text-sm text-gray-600">Level</div>
            <div className="mt-2">
              <ProgressBar
                value={getLevelProgress()}
                color="purple"
                size="sm"
                showLabel={false}
              />
              <div className="text-xs text-gray-500 mt-1">
                {personalCard.nextLevelPoints} to next level
              </div>
            </div>
          </div>
        </div>

        {showDetailedStats && (
          <>
            {/* Streaks Section */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h5 className="font-semibold text-gray-900 mb-3">Activity Streaks</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">
                    {personalCard.streaks.current}
                  </div>
                  <div className="text-sm text-gray-600">Current Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-600">
                    {personalCard.streaks.longest}
                  </div>
                  <div className="text-sm text-gray-600">Best Streak</div>
                </div>
              </div>
            </div>

            {/* Achievements Section */}
            {personalCard.achievements.length > 0 && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h5 className="font-semibold text-gray-900 mb-3">Recent Achievements</h5>
                <div className="flex flex-wrap gap-2">
                  {personalCard.achievements.slice(0, 3).map((achievement, index) => (
                    <Badge key={index} variant="success" size="sm">
                      🏆 {achievement}
                    </Badge>
                  ))}
                  {personalCard.achievements.length > 3 && (
                    <Badge variant="default" size="sm">
                      +{personalCard.achievements.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};