import { useState, useEffect, useCallback } from 'react';
import { 
  LeaderboardsResponse, 
  PersonalRankingResponse, 
  GlobalRankingResponse
} from '@/services/ranking-leaderboard.service';
import { RankingDashboardData } from '@/services/ranking-integration.service';

interface UseRankingDataOptions {
  playerId?: string;
  leaderboardId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseRankingDataReturn {
  // Data
  leaderboards: LeaderboardsResponse | null;
  personalRanking: PersonalRankingResponse | null;
  globalRanking: GlobalRankingResponse | null;
  dashboardData: RankingDashboardData | null;
  
  // Loading states
  isLoadingLeaderboards: boolean;
  isLoadingPersonalRanking: boolean;
  isLoadingGlobalRanking: boolean;
  isLoadingDashboard: boolean;
  
  // Error states
  leaderboardsError: string | null;
  personalRankingError: string | null;
  globalRankingError: string | null;
  dashboardError: string | null;
  
  // Actions
  refreshLeaderboards: () => Promise<void>;
  refreshPersonalRanking: () => Promise<void>;
  refreshGlobalRanking: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function useRankingData(options: UseRankingDataOptions = {}): UseRankingDataReturn {
  const { 
    playerId, 
    leaderboardId, 
    autoRefresh = false, 
    refreshInterval = 30000 // 30 seconds
  } = options;

  // Data states
  const [leaderboards, setLeaderboards] = useState<LeaderboardsResponse | null>(null);
  const [personalRanking, setPersonalRanking] = useState<PersonalRankingResponse | null>(null);
  const [globalRanking, setGlobalRanking] = useState<GlobalRankingResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<RankingDashboardData | null>(null);

  // Loading states
  const [isLoadingLeaderboards, setIsLoadingLeaderboards] = useState(false);
  const [isLoadingPersonalRanking, setIsLoadingPersonalRanking] = useState(false);
  const [isLoadingGlobalRanking, setIsLoadingGlobalRanking] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  // Error states
  const [leaderboardsError, setLeaderboardsError] = useState<string | null>(null);
  const [personalRankingError, setPersonalRankingError] = useState<string | null>(null);
  const [globalRankingError, setGlobalRankingError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Fetch leaderboards
  const refreshLeaderboards = useCallback(async () => {
    setIsLoadingLeaderboards(true);
    setLeaderboardsError(null);
    
    try {
      const response = await fetch('/api/ranking/leaderboards?refresh=true');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setLeaderboards(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leaderboards';
      setLeaderboardsError(errorMessage);
      console.error('Failed to fetch leaderboards:', error);
    } finally {
      setIsLoadingLeaderboards(false);
    }
  }, []);

  // Fetch personal ranking
  const refreshPersonalRanking = useCallback(async () => {
    if (!playerId || !leaderboardId) return;
    
    setIsLoadingPersonalRanking(true);
    setPersonalRankingError(null);
    
    try {
      const response = await fetch(
        `/api/ranking/${leaderboardId}/personal/${playerId}?refresh=true`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPersonalRanking(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch personal ranking';
      setPersonalRankingError(errorMessage);
      console.error('Failed to fetch personal ranking:', error);
    } finally {
      setIsLoadingPersonalRanking(false);
    }
  }, [playerId, leaderboardId]);

  // Fetch global ranking
  const refreshGlobalRanking = useCallback(async () => {
    if (!leaderboardId) return;
    
    setIsLoadingGlobalRanking(true);
    setGlobalRankingError(null);
    
    try {
      const response = await fetch(`/api/ranking/${leaderboardId}/global?refresh=true`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setGlobalRanking(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch global ranking';
      setGlobalRankingError(errorMessage);
      console.error('Failed to fetch global ranking:', error);
    } finally {
      setIsLoadingGlobalRanking(false);
    }
  }, [leaderboardId]);

  // Fetch dashboard data
  const refreshDashboard = useCallback(async () => {
    if (!playerId) return;
    
    setIsLoadingDashboard(true);
    setDashboardError(null);
    
    try {
      const url = new URL(`/api/ranking/dashboard/${playerId}`, window.location.origin);
      if (leaderboardId) {
        url.searchParams.set('leaderboardId', leaderboardId);
      }
      url.searchParams.set('refresh', 'true');
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
      setDashboardError(errorMessage);
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [playerId, leaderboardId]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshLeaderboards(),
      refreshPersonalRanking(),
      refreshGlobalRanking(),
      refreshDashboard()
    ]);
  }, [refreshLeaderboards, refreshPersonalRanking, refreshGlobalRanking, refreshDashboard]);

  // Initial data fetch
  useEffect(() => {
    refreshLeaderboards();
  }, [refreshLeaderboards]);

  useEffect(() => {
    if (playerId && leaderboardId) {
      refreshPersonalRanking();
    }
  }, [refreshPersonalRanking]);

  useEffect(() => {
    if (leaderboardId) {
      refreshGlobalRanking();
    }
  }, [refreshGlobalRanking]);

  useEffect(() => {
    if (playerId) {
      refreshDashboard();
    }
  }, [refreshDashboard]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshAll();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAll]);

  return {
    // Data
    leaderboards,
    personalRanking,
    globalRanking,
    dashboardData,
    
    // Loading states
    isLoadingLeaderboards,
    isLoadingPersonalRanking,
    isLoadingGlobalRanking,
    isLoadingDashboard,
    
    // Error states
    leaderboardsError,
    personalRankingError,
    globalRankingError,
    dashboardError,
    
    // Actions
    refreshLeaderboards,
    refreshPersonalRanking,
    refreshGlobalRanking,
    refreshDashboard,
    refreshAll
  };
}