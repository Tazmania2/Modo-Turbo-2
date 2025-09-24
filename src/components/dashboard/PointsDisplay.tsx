'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface PointsDisplayProps {
  totalPoints: number;
  pointsLocked?: boolean;
  pointsGainedToday?: number;
  className?: string;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
  totalPoints,
  pointsLocked = false,
  pointsGainedToday,
  className
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Total Points
              </h3>
              <p className="text-sm text-gray-600">
                Your accumulated score
              </p>
            </div>
          </div>
          
          {pointsLocked && (
            <Badge variant="warning" size="sm">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Locked
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {totalPoints.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              Points earned
            </div>
          </div>

          {pointsGainedToday !== undefined && (
            <div className="flex items-center justify-center space-x-2 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-sm font-medium text-green-700">
                  +{pointsGainedToday.toLocaleString()}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                today
              </span>
            </div>
          )}

          {pointsLocked && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm text-yellow-800">
                  Points are currently locked and cannot be earned
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};