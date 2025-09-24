'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { RaceVisualization as RaceVisualizationType } from '@/types/funifier';

interface RaceVisualizationProps {
  raceData: RaceVisualizationType;
  className?: string;
  autoAnimate?: boolean;
  showPositions?: boolean;
}

export const RaceVisualization: React.FC<RaceVisualizationProps> = ({
  raceData,
  className,
  autoAnimate = true,
  showPositions = true
}) => {
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    if (!autoAnimate || !raceData.animations.enabled) return;

    const interval = setInterval(() => {
      setAnimationFrame(prev => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [autoAnimate, raceData.animations.enabled]);

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'formula-1':
        return '🏎️';
      case 'race-car':
        return '🏁';
      case 'sports-car':
        return '🚗';
      case 'motorcycle':
        return '🏍️';
      case 'bicycle':
        return '🚴';
      default:
        return '🚗';
    }
  };

  const getThemeBackground = (theme: string) => {
    switch (theme) {
      case 'space':
        return 'bg-gradient-to-r from-purple-900 via-blue-900 to-black';
      case 'underwater':
        return 'bg-gradient-to-r from-blue-400 via-teal-500 to-blue-600';
      case 'forest':
        return 'bg-gradient-to-r from-green-400 via-green-600 to-green-800';
      default:
        return 'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-300';
    }
  };

  const getTrackDecorations = (theme: string) => {
    switch (theme) {
      case 'space':
        return (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        );
      case 'underwater':
        return (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white bg-opacity-30 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        );
      case 'forest':
        return (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute text-green-300 opacity-50 animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  fontSize: '8px',
                  animationDelay: `${Math.random() * 2}s`
                }}
              >
                🍃
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn('relative w-full bg-white rounded-lg shadow-lg overflow-hidden', className)}>
      {/* Race Track */}
      <div 
        className={cn(
          'relative h-64 p-4',
          getThemeBackground(raceData.raceTrack.theme)
        )}
      >
        {getTrackDecorations(raceData.raceTrack.theme)}
        
        {/* Track Lines */}
        <div className="absolute inset-4">
          {raceData.participants.map((_, index) => (
            <div
              key={index}
              className="absolute w-full border-b border-white border-opacity-30"
              style={{
                top: `${(index / Math.max(1, raceData.participants.length - 1)) * 100}%`
              }}
            />
          ))}
        </div>

        {/* Participants */}
        {raceData.participants.map((participant, index) => {
          const animatedProgress = autoAnimate 
            ? Math.min(participant.position.progress + (animationFrame * 0.1) % 5, 100)
            : participant.position.progress;

          return (
            <div
              key={participant.playerId}
              className="absolute flex items-center transition-all duration-300 ease-out"
              style={{
                left: `${Math.max(2, Math.min(animatedProgress, 95))}%`,
                top: `${(index / Math.max(1, raceData.participants.length - 1)) * 90 + 5}%`,
                transform: 'translateY(-50%)'
              }}
            >
              {/* Vehicle */}
              <div 
                className={cn(
                  'relative text-2xl transition-transform duration-200',
                  participant.isCurrentUser && 'scale-110 drop-shadow-lg',
                  autoAnimate && 'animate-pulse'
                )}
                style={{
                  filter: participant.isCurrentUser ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))' : 'none'
                }}
              >
                {getVehicleIcon(participant.vehicle.type)}
                
                {/* Particle Trail */}
                {raceData.animations.effects.includes('particle-trail') && (
                  <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
                        style={{
                          left: `${i * -4}px`,
                          animationDelay: `${i * 0.1}s`,
                          opacity: 1 - (i * 0.3)
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className={cn(
                'ml-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs whitespace-nowrap',
                participant.isCurrentUser && 'bg-blue-600 bg-opacity-80'
              )}>
                <div className="font-semibold">{participant.playerName}</div>
                {showPositions && (
                  <div className="text-xs opacity-75">
                    {Math.round(participant.position.progress)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Finish Line */}
        <div className="absolute right-4 top-4 bottom-4 w-1 bg-white bg-opacity-50">
          <div className="absolute -top-2 -right-2 text-white text-xs font-bold">
            🏁
          </div>
        </div>
      </div>

      {/* Race Stats */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>{raceData.participants.length} participants</span>
          <span>Track: {raceData.raceTrack.length}m</span>
          <span className="capitalize">{raceData.raceTrack.theme} theme</span>
        </div>
      </div>
    </div>
  );
};