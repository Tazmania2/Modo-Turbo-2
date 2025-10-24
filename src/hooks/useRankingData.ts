import { useState, useEffect, useCallback } from 'react';
import { 
  LeaderboardsResponse, 
  PersonalRankingResponse, 
  GlobalRankingResponse
} from '@/services/ranking-leaderboard.service';
import { RankingDashboardData } from '@/services/ranking-integration.service';
import { getApiEndpoint } from '@/utils/demo';
import { getFunifierDirectService } from '@/services/funifier-direct.service';
import { GlobalRanking, PersonalizedRanking } from '@/types/funifier-api-responses';
import { demoModeService } from '@/services/demo-mode.service';
import { demoDataService } from '@/services/demo-data.service';

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
      // Check if we're in demo mode using centralized service
      const isDemoMode = demoModeService.isDemoMode();
      
      if (isDemoMode) {
        // Use demo data generator for demo mode
        console.log('[useRankingData] Using demo leaderboards');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        
        const demoLeaderboards = demoDataService.generateLeaderboards();
        const data = { leaderboards: demoLeaderboards };
        
        // Validate data source
        demoModeService.validateDataSource(data, 'demo');
        setLeaderboards(data);
      } else {
        // Production mode - use direct Funifier API
        console.log('[useRankingData] Using Funifier API for leaderboards');
        const funifierService = getFunifierDirectService();
        
        // For now, use internal API as leaderboards list endpoint may not be standard
        // This can be enhanced when Funifier provides a leaderboards list endpoint
        const endpoint = getApiEndpoint('/api/ranking/leaderboards?refresh=true');
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.leaderboards) {
          setLeaderboards({ leaderboards: data.leaderboards });
        } else {
          setLeaderboards(data);
        }
      }
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
    if (!playerId) return;
    
    setIsLoadingPersonalRanking(true);
    setPersonalRankingError(null);
    
    try {
      // Check if we're in demo mode
      const urlParams = new URLSearchParams(window.location.search);
      const isDemoMode = urlParams.get('mode') === 'demo';
      
      if (isDemoMode) {
        // Use internal API for demo mode
        const endpoint = getApiEndpoint(`/api/ranking/${leaderboardId || 'demo'}/personal/${playerId}?refresh=true`);
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle demo mode response format
        if (data.personalCard) {
          setPersonalRanking({
            raceData: data.raceVisualization || null,
            personalCard: data.personalCard,
            topThree: data.players?.slice(0, 3) || [],
            contextualRanking: data.contextualRanking || {
              above: null,
              current: data.personalCard,
              below: null
            }
          });
        } else {
          setPersonalRanking(data);
        }
      } else {
        // Use direct Funifier API
        const funifierService = getFunifierDirectService();
        const personalizedRanking = await funifierService.getPersonalizedRanking(playerId);
        
        // Convert to expected format
        const userPosition = personalizedRanking.userPosition;
        const leaders = personalizedRanking.leaders || [];
        
        setPersonalRanking({
          raceData: {
            raceTrack: { length: 100, segments: 10, theme: 'default' },
            participants: [],
            animations: { enabled: false, speed: 1, effects: [] }
          },
          personalCard: {
            playerId: userPosition.player,
            playerName: userPosition.name || 'Unknown',
            avatar: userPosition.image,
            currentPosition: userPosition.position,
            previousPosition: userPosition.position,
            totalPoints: userPosition.total,
            pointsGainedToday: 0,
            team: 'Default Team',
            level: 1,
            nextLevelPoints: 1000,
            achievements: [],
            streaks: { current: 0, longest: 0 },
            lastActivity: new Date()
          },
          topThree: leaders.slice(0, 3).map(leader => ({
            _id: leader.player,
            name: leader.name || 'Unknown',
            totalPoints: leader.total,
            position: leader.position,
            previousPosition: leader.position,
            pointsGainedToday: 0,
            avatar: leader.image,
            team: 'Default Team',
            goals: [],
            lastUpdated: new Date()
          })),
          contextualRanking: {
            above: null,
            current: {
              _id: userPosition.player,
              name: userPosition.name || 'Unknown',
              totalPoints: userPosition.total,
              position: userPosition.position,
              previousPosition: userPosition.position,
              pointsGainedToday: 0,
              avatar: userPosition.image,
              team: 'Default Team',
              goals: [],
              lastUpdated: new Date()
            },
            below: null
          }
        });
      }
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
    setIsLoadingGlobalRanking(true);
    setGlobalRankingError(null);
    
    try {
      // Check if we're in demo mode
      const urlParams = new URLSearchParams(window.location.search);
      const isDemoMode = urlParams.get('mode') === 'demo';
      
      if (isDemoMode) {
        // Use internal API for demo mode
        const endpoint = getApiEndpoint(`/api/ranking/${leaderboardId || 'demo'}/global?refresh=true`);
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle demo mode response format
        if (data.players) {
          setGlobalRanking({
            raceData: data.raceVisualization || null,
            fullRanking: data.players
          });
        } else {
          setGlobalRanking(data);
        }
      } else {
        // Use direct Funifier API
        const funifierService = getFunifierDirectService();
        const globalRankingData = await funifierService.getRankingData();
        
        // Convert to expected format
        const leaders = globalRankingData.leaders || [];
        
        setGlobalRanking({
          raceData: {
            raceTrack: { length: 100, segments: 10, theme: 'default' },
            participants: [],
            animations: { enabled: false, speed: 1, effects: [] }
          },
          fullRanking: leaders.map(leader => ({
            _id: leader.player,
            name: leader.name || 'Unknown',
            totalPoints: leader.total,
            position: leader.position,
            previousPosition: leader.position,
            pointsGainedToday: 0,
            avatar: leader.image,
            team: 'Default Team',
            goals: [],
            lastUpdated: new Date()
          }))
        });
      }
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
      const baseEndpoint = `/api/ranking/dashboard/${playerId}`;
      const url = new URL(getApiEndpoint(baseEndpoint), window.location.origin);
      if (leaderboardId) {
        url.searchParams.set('leaderboardId', leaderboardId);
      }
      url.searchParams.set('playerId', playerId);
      url.searchParams.set('refresh', 'true');
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle demo mode response format
      if (data.raceVisualization || data.contextualRanking) {
        setDashboardData({
          leaderboards: data.leaderboards || [],
          activeLeaderboard: null,
          personalRanking: data.personalCard ? {
            raceData: data.raceVisualization || null,
            personalCard: data.personalCard,
            topThree: data.players?.slice(0, 3) || [],
            contextualRanking: data.contextualRanking || {
              above: null,
              current: data.personalCard,
              below: null
            }
          } : null,
          globalRanking: data.players ? {
            raceData: data.raceVisualization || null,
            fullRanking: data.players
          } : null,
          processedData: null,
          lastUpdated: new Date(),
          isLoading: false,
          error: null
        });
      } else {
        setDashboardData(data);
      }
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