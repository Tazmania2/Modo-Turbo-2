'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface BoostIndicatorProps {
  hasBoost: boolean;
  isActive: boolean;
  multiplier?: number;
  timeRemaining?: string;
  onActivate?: () => void;
  className?: string;
}

export const BoostIndicator: React.FC<BoostIndicatorProps> = ({
  hasBoost,
  isActive,
  multiplier = 2,
  timeRemaining,
  onActivate,
  className
}) => {
  if (!hasBoost) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isActive 
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse' 
              : 'bg-gray-300'
          }`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-900">
                Points Boost
              </h4>
              <Badge 
                variant={isActive ? 'success' : 'default'} 
                size="sm"
              >
                {multiplier}x
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600">
              {isActive 
                ? `Boost is active${timeRemaining ? ` - ${timeRemaining} remaining` : ''}`
                : 'Boost available to activate'
              }
            </p>
          </div>
        </div>

        {!isActive && onActivate && (
          <Button
            variant="primary"
            size="sm"
            onClick={onActivate}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Activate
          </Button>
        )}
      </div>

      {isActive && (
        <div className="mt-3 pt-3 border-t border-purple-200">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-purple-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: timeRemaining ? '60%' : '100%' }}
              />
            </div>
            {timeRemaining && (
              <span className="text-xs font-medium text-purple-700">
                {timeRemaining}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};