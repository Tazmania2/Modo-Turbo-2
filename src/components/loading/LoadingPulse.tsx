'use client';

import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingPulseProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const colorClasses = {
  primary: 'bg-primary-600',
  secondary: 'bg-secondary-600',
  white: 'bg-white',
};

export const LoadingPulse: React.FC<LoadingPulseProps> = ({
  size = 'md',
  className,
  color = 'primary',
  text,
}) => {
  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      <div className="relative">
        <div
          className={cn(
            'rounded-full animate-ping absolute inset-0 opacity-75',
            sizeClasses[size],
            colorClasses[color]
          )}
        />
        <div
          className={cn(
            'rounded-full animate-pulse',
            sizeClasses[size],
            colorClasses[color]
          )}
        />
      </div>
      {text && (
        <p className="text-sm text-gray-600 animate-pulse" role="status">
          {text}
        </p>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
};