'use client';

import { useState, useEffect } from 'react';
import { DashboardData } from '@/types/dashboard';

// Demo data for testing the dashboard components
const mockDashboardData: DashboardData = {
  playerName: "Alex Johnson",
  totalPoints: 12450,
  pointsLocked: false,
  currentCycleDay: 18,
  totalCycleDays: 30,
  primaryGoal: {
    name: "Complete Daily Tasks",
    percentage: 75,
    description: "Finish all assigned daily activities",
    emoji: "🎯",
    target: 20,
    current: 15,
    unit: "tasks",
    hasBoost: true,
    isBoostActive: true,
    daysRemaining: 12
  },
  secondaryGoal1: {
    name: "Team Collaboration",
    percentage: 60,
    description: "Participate in team activities and discussions",
    emoji: "🤝",
    target: 10,
    current: 6,
    unit: "activities",
    hasBoost: true,
    isBoostActive: false,
    daysRemaining: 12
  },
  secondaryGoal2: {
    name: "Learning Progress",
    percentage: 90,
    description: "Complete training modules and assessments",
    emoji: "📚",
    target: 8,
    current: 7,
    unit: "modules",
    hasBoost: false,
    isBoostActive: false,
    daysRemaining: 12
  }
};

export const useDashboardData = (playerId?: string) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we're in demo mode from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const isDemoMode = urlParams.get('mode') === 'demo';
      
      if (isDemoMode) {
        // Use mock data for demo mode
        await new Promise(resolve => setTimeout(resolve, 1000));
        setData(mockDashboardData);
        return;
      }
      
      // For real mode, we need authentication and a player ID
      if (!playerId) {
        // Redirect to login if no player ID
        window.location.href = '/admin/login';
        return;
      }
      
      // Make real API call to Funifier
      const response = await fetch(`/api/dashboard/player/${playerId}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login on authentication error
          window.location.href = '/admin/login';
          return;
        }
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, [playerId]);

  return {
    data,
    isLoading,
    error,
    refreshData
  };
};