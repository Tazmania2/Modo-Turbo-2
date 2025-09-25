'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { LoadingSpinner } from './LoadingSpinner';
import { LoadingPulse } from './LoadingPulse';
import { LoadingDots } from './LoadingDots';

interface LoadingOverlayProps {
  isLoading: boolean;
  type?: 'spinner' | 'pulse' | 'dots';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  backdrop?: boolean;
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  type = 'spinner',
  size = 'md',
  text,
  className,
  backdrop = true,
  children,
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  const LoadingComponent = {
    spinner: LoadingSpinner,
    pulse: LoadingPulse,
    dots: LoadingDots,
  }[type];

  // Map xl size to lg for components that don't support xl
  const componentSize: 'sm' | 'md' | 'lg' = size === 'xl' && type === 'dots' ? 'lg' : (size as 'sm' | 'md' | 'lg');

  return (
    <div className={cn('relative', className)}>
      {children}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center z-50',
          backdrop && 'bg-white bg-opacity-75'
        )}
        role="status"
        aria-live="polite"
        aria-label={text || 'Loading'}
      >
        <div className="flex flex-col items-center space-y-4">
          {type === 'pulse' ? (
            <LoadingPulse size={size} text={text} />
          ) : (
            <>
              <LoadingComponent size={componentSize} />
              {text && (
                <p className="text-sm text-gray-600 animate-pulse">{text}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};