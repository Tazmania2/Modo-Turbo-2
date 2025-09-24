'use client';

import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
}

const sizeClasses = {
  sm: 'w-1 h-1',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

const colorClasses = {
  primary: 'bg-primary-600',
  secondary: 'bg-secondary-600',
  white: 'bg-white',
};

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  className,
  color = 'primary',
}) => {
  return (
    <div className={cn('flex space-x-1', className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'rounded-full animate-pulse',
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1.4s',
          }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};