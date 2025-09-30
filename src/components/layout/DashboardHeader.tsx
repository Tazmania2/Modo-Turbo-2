'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { isDemoMode, exitDemoMode } from '@/utils/demo';

interface DashboardHeaderProps {
  playerName?: string;
  totalPoints?: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  playerName,
  totalPoints
}) => {
  const isDemo = isDemoMode();

  const handleSetupClick = () => {
    window.location.href = '/setup';
  };

  const handleExitDemo = () => {
    exitDemoMode();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                Gamification Platform
              </h1>
            </div>
            {/* Demo mode indicator */}
            {isDemo && (
              <Badge variant="warning" size="sm" className="hidden sm:inline-flex">
                Demo Mode
              </Badge>
            )}
          </div>

          {/* Center - Player info (desktop) */}
          {playerName && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">
                  Welcome back, {playerName}
                </p>
                {totalPoints !== undefined && (
                  <p className="text-xs text-gray-500">
                    {totalPoints.toLocaleString()} points
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Right side - Actions */}
          <div className="flex items-center space-x-4">
            {totalPoints !== undefined && (
              <Badge variant="info" size="md" className="hidden sm:inline-flex">
                {totalPoints.toLocaleString()} pts
              </Badge>
            )}
            
            {/* Setup/Exit Demo button */}
            {isDemo ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitDemo}
                className="hidden sm:inline-flex"
                title="Exit Demo Mode and Configure Funifier"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Exit Demo
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetupClick}
                className="hidden sm:inline-flex"
                title="Configure Funifier Integration"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Setup
              </Button>
            )}
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={isDemo ? handleExitDemo : handleSetupClick}
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>

            {/* Settings gear icon */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
              onClick={isDemo ? handleExitDemo : handleSetupClick}
              title={isDemo ? "Exit Demo Mode" : "Settings"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Mobile player info */}
        {playerName && (
          <div className="md:hidden pb-3 border-t border-gray-200 mt-3 pt-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-900">
                {playerName}
              </p>
              {totalPoints !== undefined && (
                <Badge variant="info" size="sm">
                  {totalPoints.toLocaleString()} pts
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};