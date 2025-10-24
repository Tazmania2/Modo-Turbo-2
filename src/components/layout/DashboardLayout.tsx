'use client';

import React from 'react';
import { SystemNavigation } from '@/components/navigation';
import { DashboardHeader } from './DashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
  playerName?: string;
  totalPoints?: number;
  showNavigation?: boolean;
}

/**
 * DashboardLayout Component
 * 
 * Main layout for dashboard pages with integrated SystemNavigation
 * Provides seamless navigation across admin and user interfaces
 */
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
            {/* Use SystemNavigation for seamless navigation across all interfaces */}
            <SystemNavigation variant="sidebar" />
          </aside>
        )}
        
        <main className={`flex-1 ${showNavigation ? 'md:ml-0' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Navigation */}
      {showNavigation && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <SystemNavigation variant="mobile" showLabels={false} />
        </div>
      )}
    </div>
  );
};