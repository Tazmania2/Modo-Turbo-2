import { useState, useEffect, useCallback } from 'react';
import { HistoryData, Season } from '../types/dashboard';
import { getApiEndpoint } from '@/utils/demo';

interface UseHistoryDataReturn {
  historyData: HistoryData | null;
  selectedSeason: Season | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectSeason: (seasonId: string) => Promise<void>;
}

/**
 * Custom hook for managing history data
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function useHistoryData(playerId: string): UseHistoryDataReturn {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches history data from API
   * Implements requirement 3.1: Display historical data and current season performance graphs
   */
  const fetchHistoryData = useCallback(async () => {
    if (!playerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = getApiEndpoint(`/api/dashboard/history/${playerId}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch history data');
      }

      const data = await response.json();
      
      // Handle demo mode response format
      let historyData: HistoryData;
      if (data.seasonHistory && data.performanceGraphs) {
        historyData = {
          seasons: data.seasonHistory || [],
          currentSeasonGraphs: data.performanceGraphs || []
        };
      } else {
        historyData = data as HistoryData;
      }
      
      // Handle case when no data is available (requirement 3.4)
      if (historyData.seasons?.length === 0 && historyData.currentSeasonGraphs?.length === 0) {
        setError('No historical data available for this player');
      }

      setHistoryData(historyData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching history data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  /**
   * Selects a specific season and fetches detailed data
   * Implements requirement 3.2: Show season-specific metrics and achievements
   */
  const selectSeason = useCallback(async (seasonId: string) => {
    if (!playerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = getApiEndpoint(`/api/dashboard/season/${seasonId}/${playerId}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch season details');
      }

      const seasonData: Season = await response.json();
      setSelectedSeason(seasonData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching season details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  /**
   * Refetches history data
   */
  const refetch = useCallback(async () => {
    await fetchHistoryData();
  }, [fetchHistoryData]);

  // Initial data fetch
  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

  return {
    historyData,
    selectedSeason,
    isLoading,
    error,
    refetch,
    selectSeason,
  };
}