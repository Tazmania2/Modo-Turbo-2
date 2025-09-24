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
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would fetch from the API
      // const response = await fetch(`/api/dashboard/player/${playerId}`);
      // const dashboardData = await response.json();
      
      setData(mockDashboardData);
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