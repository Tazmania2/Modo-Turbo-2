'use client';

import React from 'react';
import { DashboardNavigation } from './DashboardNavigation';
import { DashboardHeader } from './DashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
  playerName?: string;
  totalPoints?: number;
  showNavigation?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  playerName,
  totalPoints,
  showNavigation = true
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        playerName={playerName}
        totalPoints={totalPoints}
      />
      
      <div className="flex">
        {showNavigation && (
          <aside className="hidden md:block w-64 bg-white shadow-sm border-r border-gray-200 min-h-[calc(100vh-4rem)]">
            <DashboardNavigation />
          </aside>
        )}
        
        <main className={`flex-1 ${showNavigation ? 'md:ml-0' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};