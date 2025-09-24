'use client';

import React, { useEffect, useState } from 'react';
import { LoadingPulse } from './LoadingPulse';
import { ProgressBar } from './ProgressBar';

interface DataFetchingLoaderProps {
  isLoading: boolean;
  maxDuration?: number; // in milliseconds
  onTimeout?: () => void;
  messages?: string[];
  showProgress?: boolean;
}

const defaultMessages = [
  'Connecting to Funifier...',
  'Fetching your data...',
  'Processing information...',
  'Almost ready...',
  'Finalizing...',
];

export const DataFetchingLoader: React.FC<DataFetchingLoaderProps> = ({
  isLoading,
  maxDuration = 5000,
  onTimeout,
  messages = defaultMessages,
  showProgress = true,
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setCurrentMessageIndex(0);
      setProgress(0);
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const messageInterval = maxDuration / messages.length;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      // Update progress
      const newProgress = Math.min((elapsed / maxDuration) * 100, 100);
      setProgress(newProgress);

      // Update message
      const messageIndex = Math.min(
        Math.floor(elapsed / messageInterval),
        messages.length - 1
      );
      setCurrentMessageIndex(messageIndex);

      // Check for timeout
      if (elapsed >= maxDuration) {
        clearInterval(timer);
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isLoading, maxDuration, messages, onTimeout]);

  if (!isLoading) return null;

  const currentMessage = messages[currentMessageIndex] || messages[0];
  const isNearTimeout = elapsedTime > maxDuration * 0.8;

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-6 p-8">
      <LoadingPulse 
        size="lg" 
        color={isNearTimeout ? 'secondary' : 'primary'}
        text={currentMessage}
      />
      
      {showProgress && (
        <div className="w-full max-w-xs">
          <ProgressBar
            progress={progress}
            color={isNearTimeout ? 'warning' : 'primary'}
            animated
            size="sm"
          />
        </div>
      )}

      {isNearTimeout && (
        <p className="text-sm text-yellow-600 text-center max-w-md">
          This is taking longer than expected. Please check your connection or try again.
        </p>
      )}
    </div>
  );
};