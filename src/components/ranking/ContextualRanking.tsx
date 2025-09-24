'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Player } from '@/types/funifier';

interface ContextualRankingProps {
  topThree: Player[];
  contextualRanking: {
    above: Player | null;
    current: Player;
    below: Player | null;
  };
  className?: string;
  showPointsGained?: boolean;
}

interface PlayerRowProps {
  player: Player;
  isCurrentUser?: boolean;
  showPointsGained?: boolean;
  className?: string;
}

const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  isCurrentUser = false,
  showPointsGained = true,
  className
}) => {
  const getPositionIcon = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return position.toString();
  };

  const getPositionChange = () => {
    if (!player.previousPosition) return null;
    
    const change = player.previousPosition - player.position;
    if (change > 0) return { type: 'up', value: change };
    if (change < 0) return { type: 'down', value: Math.abs(change) };
    return { type: 'same', value: 0 };
  };

  const positionChange = getPositionChange();

  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg transition-all duration-200',
      isCurrentUser 
        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md' 
        : 'bg-gray-50 hover:bg-gray-100',
      className
    )}>
      <div className="flex items-center space-x-3">
        {/* Position */}
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm',
          player.position <= 3 
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
            : isCurrentUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700'
        )}>
          {getPositionIcon(player.position)}
        </div>

        {/* Avatar */}
        <div className="relative">
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-semibold text-sm">
              {player.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          {isCurrentUser && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full" />
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={cn(
              'font-semibold',
              isCurrentUser ? 'text-blue-900' : 'text-gray-900'
            )}>
              {player.name}
            </span>
            {isCurrentUser && (
              <Badge variant="info" size="sm">You</Badge>
            )}
          </div>
          
          {player.team && (
            <div className="text-sm text-gray-600">{player.team}</div>
          )}
        </div>
      </div>

      <div className="text-right">
        {/* Points */}
        <div className={cn(
          'font-bold',
          isCurrentUser ? 'text-blue-900' : 'text-gray-900'
        )}>
          {player.totalPoints.toLocaleString()}
        </div>
        
        {/* Points gained today */}
        {showPointsGained && player.pointsGainedToday > 0 && (
          <div className="text-sm text-green-600 font-medium">
            +{player.pointsGainedToday}
          </div>
        )}
        
        {/* Position change */}
        {positionChange && positionChange.value > 0 && (
          <div className={cn(
            'text-xs font-medium flex items-center justify-end mt-1',
            positionChange.type === 'up' && 'text-green-600',
            positionChange.type === 'down' && 'text-red-600'
          )}>
            {positionChange.type === 'up' && '↗️'}
            {positionChange.type === 'down' && '↘️'}
            <span className="ml-1">{positionChange.value}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const ContextualRanking: React.FC<ContextualRankingProps> = ({
  topThree,
  contextualRanking,
  className,
  showPointsGained = true
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Top 3 Podium */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🏆 Top Performers
          </h3>
        </CardHeader>
        <CardContent className="space-y-2">
          {topThree.map((player) => (
            <PlayerRow
              key={player._id}
              player={player}
              isCurrentUser={player._id === contextualRanking.current._id}
              showPointsGained={showPointsGained}
            />
          ))}
        </CardContent>
      </Card>

      {/* Contextual Ranking - Only show if current user is not in top 3 */}
      {!topThree.some(player => player._id === contextualRanking.current._id) && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              📍 Your Position
            </h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Player above */}
            {contextualRanking.above && (
              <PlayerRow
                player={contextualRanking.above}
                showPointsGained={showPointsGained}
              />
            )}

            {/* Divider */}
            {contextualRanking.above && (
              <div className="flex items-center justify-center py-2">
                <div className="flex-1 border-t border-gray-300" />
                <span className="px-3 text-sm text-gray-500 bg-white">You are here</span>
                <div className="flex-1 border-t border-gray-300" />
              </div>
            )}

            {/* Current user */}
            <PlayerRow
              player={contextualRanking.current}
              isCurrentUser={true}
              showPointsGained={showPointsGained}
            />

            {/* Player below */}
            {contextualRanking.below && (
              <PlayerRow
                player={contextualRanking.below}
                showPointsGained={showPointsGained}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                #{contextualRanking.current.position}
              </div>
              <div className="text-sm text-gray-600">Your Rank</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {contextualRanking.current.totalPoints.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-600">
                +{contextualRanking.current.pointsGainedToday}
              </div>
              <div className="text-sm text-gray-600">Today</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};