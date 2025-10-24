'use client';

import { useState, useEffect } from 'react';
import { DashboardData } from '@/types/dashboard';
import { getFunifierDirectService } from '@/services/funifier-direct.service';
import { DashboardData as FunifierDashboardData } from '@/types/funifier-api-responses';
import { demoModeService } from '@/services/demo-mode.service';
import { demoDataService } from '@/services/demo-data.service';

// Demo data generator for testing the dashboard components (only used in demo mode)
function generateDemoDashboardData(): DashboardData {
  const playerStatus = demoDataService.generatePlayerStatus('demo_player_1');
  const goals = demoDataService.generatePlayers(1)[0]?.goals || [];
  
  return {
    playerName: playerStatus.name,
    totalPoints: playerStatus.total_points,
    pointsLocked: false,
    currentCycleDay: 18,
    totalCycleDays: 30,
    primaryGoal: goals[0] || {
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
    secondaryGoal1: goals[1] || {
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
    secondaryGoal2: goals[2] || {
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
}

// Legacy mock data (deprecated - use generateDemoDashboardData instead)
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

/**
 * Convert Funifier dashboard data to application dashboard format
 */
function convertFunifierDashboard(funifierData: FunifierDashboardData): DashboardData {
  // Extract player data
  const player = funifierData.player;
  
  // Create default goals based on player data
  const primaryGoal = {
    name: 'Total Points',
    percentage: player.level_progress?.percent_completed || 0,
    description: 'Accumulate points through activities',
    emoji: '🎯',
    target: 100,
    current: player.level_progress?.percent_completed || 0,
    unit: 'percent',
    hasBoost: false,
    isBoostActive: false,
    daysRemaining: 30
  };

  const secondaryGoal1 = {
    name: 'Challenges',
    percentage: player.total_challenges ? Math.min((player.total_challenges / 20) * 100, 100) : 0,
    description: 'Complete challenges and tasks',
    emoji: '🤝',
    target: 20,
    current: player.total_challenges || 0,
    unit: 'challenges',
    hasBoost: false,
    isBoostActive: false,
    daysRemaining: 30
  };

  const secondaryGoal2 = {
    name: 'Catalog Items',
    percentage: player.total_catalog_items ? Math.min((player.total_catalog_items / 10) * 100, 100) : 0,
    description: 'Collect catalog items and rewards',
    emoji: '📚',
    target: 10,
    current: player.total_catalog_items || 0,
    unit: 'items',
    hasBoost: false,
    isBoostActive: false,
    daysRemaining: 30
  };

  return {
    playerName: player.name,
    totalPoints: player.total_points || 0,
    pointsLocked: false,
    currentCycleDay: 15,
    totalCycleDays: 30,
    primaryGoal,
    secondaryGoal1,
    secondaryGoal2
  };
}

export const useDashboardData = (playerId?: string) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we're in demo mode using the centralized service
      const isDemoMode = demoModeService.isDemoMode();
      
      if (isDemoMode) {
        // Use demo data generator for demo mode
        console.log('[useDashboardData] Using demo data');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        const demoData = generateDemoDashboardData();
        
        // Validate data source
        demoModeService.validateDataSource(demoData, 'demo');
        setData(demoData);
        return;
      }
      
      // Production mode - use Funifier API
      console.log('[useDashboardData] Using Funifier API');
      
      // Get Funifier Direct Service instance
      const funifierService = getFunifierDirectService();
      
      // Check if user is authenticated
      if (!funifierService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      // Get player ID from service if not provided
      let effectivePlayerId: string | null = playerId || null;
      if (!effectivePlayerId) {
        effectivePlayerId = funifierService.getUserId();
        if (!effectivePlayerId) {
          throw new Error('Player ID not available');
        }
      }
      
      // Fetch dashboard data directly from Funifier
      const funifierDashboard = await funifierService.getUserDashboard(effectivePlayerId);
      
      // Convert to application format
      const dashboardData = convertFunifierDashboard(funifierDashboard);
      setData(dashboardData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      
      // Fallback to demo data on error
      setData(mockDashboardData);
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