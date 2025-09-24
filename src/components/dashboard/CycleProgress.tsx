'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface CycleProgressProps {
  currentDay: number;
  totalDays: number;
  className?: string;
}

export const CycleProgress: React.FC<CycleProgressProps> = ({
  currentDay,
  totalDays,
  className
}) => {
  const percentage = (currentDay / totalDays) * 100;
  const daysRemaining = totalDays - currentDay;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Cycle Progress
            </h3>
            <p className="text-sm text-gray-600">
              Current gamification cycle
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <ProgressBar
            value={percentage}
            color="green"
            size="lg"
            showLabel
            label={`Day ${currentDay} of ${totalDays}`}
          />

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">
                {currentDay}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Current Day
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">
                {daysRemaining}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Days Left
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            {Math.round(percentage)}% of cycle completed
          </div>
        </div>
      </CardContent>
    </Card>
  );
};