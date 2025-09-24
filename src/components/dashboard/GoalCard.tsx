'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Goal } from '@/types/dashboard';

interface GoalCardProps {
  goal: Goal;
  isPrimary?: boolean;
  className?: string;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  isPrimary = false,
  className
}) => {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'green';
    if (percentage >= 70) return 'blue';
    if (percentage >= 40) return 'yellow';
    return 'red';
  };

  const formatTarget = () => {
    if (goal.target && goal.current !== undefined) {
      return `${goal.current}/${goal.target}${goal.unit ? ` ${goal.unit}` : ''}`;
    }
    return `${Math.round(goal.percentage)}%`;
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{goal.emoji}</div>
            <div>
              <h3 className={`font-semibold ${isPrimary ? 'text-lg' : 'text-base'} text-gray-900`}>
                {goal.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {goal.description}
              </p>
            </div>
          </div>
          
          {isPrimary && (
            <Badge variant="info" size="sm">
              Primary
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <ProgressBar
            value={goal.percentage}
            color={getProgressColor(goal.percentage)}
            size={isPrimary ? 'lg' : 'md'}
            showLabel
            label={formatTarget()}
          />

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Progress: {Math.round(goal.percentage)}%
            </span>
            
            {goal.daysRemaining !== undefined && (
              <span className="text-gray-500">
                {goal.daysRemaining} days left
              </span>
            )}
          </div>

          {goal.hasBoost && (
            <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
              <div className={`w-2 h-2 rounded-full ${goal.isBoostActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-xs font-medium ${goal.isBoostActive ? 'text-green-700' : 'text-gray-500'}`}>
                {goal.isBoostActive ? 'Boost Active' : 'Boost Available'}
              </span>
              {goal.isBoostActive && (
                <Badge variant="success" size="sm">
                  2x Points
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};