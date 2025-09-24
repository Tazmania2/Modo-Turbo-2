import { useCallback, useEffect, useRef } from 'react';
import { enhancedCacheManager } from '@/services/enhanced-cache-manager.service';

export interface CacheInvalidationOptions {
  autoInvalidate: boolean;
  invalidationDelay: number; // milliseconds
  batchInvalidation: boolean;
  maxBatchSize: number;
}

export interface InvalidationEvent {
  type: 'player_update' | 'team_change' | 'leaderboard_update' | 'config_change' | 'manual';
  scope: 'global' | 'player' | 'team' | 'leaderboard' | 'config';
  identifier?: string;
  metadata?: Record<string, any>;
}

/**
 * Hook for managing cache invalidation in React components
 */
export function useCacheInvalidation(options: Partial<CacheInvalidationOptions> = {}) {
  const defaultOptions: CacheInvalidationOptions = {
    autoInvalidate: true,
    invalidationDelay: 1000,
    batchInvalidation: true,
    maxBatchSize: 10
  };

  const config = { ...defaultOptions, ...options };
  const pendingInvalidations = useRef<InvalidationEvent[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Invalidate cache immediately
   */
  const invalidateNow = useCallback(async (event: InvalidationEvent) => {
    try {
      await enhancedCacheManager.invalidate({
        ...event,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Cache invalidation failed:', error);
    }
  }, []);

  /**
   * Queue invalidation for batch processing
   */
  const queueInvalidation = useCallback((event: InvalidationEvent) => {
    pendingInvalidations.current.push(event);

    // Process immediately if batch is full
    if (pendingInvalidations.current.length >= config.maxBatchSize) {
      processPendingInvalidations();
      return;
    }

    // Schedule batch processing
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      processPendingInvalidations();
    }, config.invalidationDelay);
  }, [config.invalidationDelay, config.maxBatchSize]);

  /**
   * Process all pending invalidations
   */
  const processPendingInvalidations = useCallback(async () => {
    if (pendingInvalidations.current.length === 0) return;

    const events = [...pendingInvalidations.current];
    pendingInvalidations.current = [];

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      // Process all events
      await Promise.all(
        events.map(event => enhancedCacheManager.invalidate({
          ...event,
          timestamp: new Date()
        }))
      );
    } catch (error) {
      console.error('Batch cache invalidation failed:', error);
    }
  }, []);

  /**
   * Main invalidation function
   */
  const invalidate = useCallback((event: InvalidationEvent) => {
    if (!config.autoInvalidate) {
      return;
    }

    if (config.batchInvalidation) {
      queueInvalidation(event);
    } else {
      invalidateNow(event);
    }
  }, [config.autoInvalidate, config.batchInvalidation, queueInvalidation, invalidateNow]);

  /**
   * Invalidate player data
   */
  const invalidatePlayer = useCallback((playerId: string, metadata?: Record<string, any>) => {
    invalidate({
      type: 'player_update',
      scope: 'player',
      identifier: playerId,
      metadata
    });
  }, [invalidate]);

  /**
   * Invalidate team data
   */
  const invalidateTeam = useCallback((teamName: string, metadata?: Record<string, any>) => {
    invalidate({
      type: 'team_change',
      scope: 'team',
      identifier: teamName,
      metadata
    });
  }, [invalidate]);

  /**
   * Invalidate leaderboard data
   */
  const invalidateLeaderboard = useCallback((leaderboardId: string, metadata?: Record<string, any>) => {
    invalidate({
      type: 'leaderboard_update',
      scope: 'leaderboard',
      identifier: leaderboardId,
      metadata
    });
  }, [invalidate]);

  /**
   * Invalidate configuration data
   */
  const invalidateConfig = useCallback((metadata?: Record<string, any>) => {
    invalidate({
      type: 'config_change',
      scope: 'config',
      metadata
    });
  }, [invalidate]);

  /**
   * Invalidate all caches
   */
  const invalidateAll = useCallback((metadata?: Record<string, any>) => {
    invalidate({
      type: 'manual',
      scope: 'global',
      metadata
    });
  }, [invalidate]);

  /**
   * Force process pending invalidations
   */
  const flush = useCallback(() => {
    processPendingInvalidations();
  }, [processPendingInvalidations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Process any remaining invalidations
      if (pendingInvalidations.current.length > 0) {
        processPendingInvalidations();
      }
    };
  }, [processPendingInvalidations]);

  return {
    invalidate,
    invalidatePlayer,
    invalidateTeam,
    invalidateLeaderboard,
    invalidateConfig,
    invalidateAll,
    invalidateNow,
    flush,
    hasPending: pendingInvalidations.current.length > 0
  };
}

/**
 * Hook for automatic cache invalidation based on data changes
 */
export function useAutoInvalidation(
  dependencies: any[],
  invalidationEvents: InvalidationEvent[]
) {
  const { invalidate } = useCacheInvalidation();
  const previousDeps = useRef(dependencies);

  useEffect(() => {
    // Check if dependencies have changed
    const hasChanged = dependencies.some((dep, index) => 
      dep !== previousDeps.current[index]
    );

    if (hasChanged && previousDeps.current.length > 0) {
      // Trigger invalidation events
      invalidationEvents.forEach(event => invalidate(event));
    }

    previousDeps.current = dependencies;
  }, dependencies);
}

/**
 * Hook for cache invalidation with WebSocket support
 */
export function useRealtimeCacheInvalidation(websocketUrl?: string) {
  const { invalidate } = useCacheInvalidation();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!websocketUrl) return;

    // Create WebSocket connection
    const ws = new WebSocket(websocketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Cache invalidation WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const invalidationEvent = JSON.parse(event.data) as InvalidationEvent;
        invalidate(invalidationEvent);
      } catch (error) {
        console.error('Failed to parse invalidation event:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Cache invalidation WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Cache invalidation WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [websocketUrl, invalidate]);

  const sendInvalidation = useCallback((event: InvalidationEvent) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return {
    sendInvalidation,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}

/**
 * Hook for cache performance monitoring
 */
export function useCachePerformance() {
  const performanceRef = useRef({
    hits: 0,
    misses: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    lastReset: Date.now()
  });

  const recordHit = useCallback((responseTime: number) => {
    const perf = performanceRef.current;
    perf.hits++;
    perf.totalRequests++;
    perf.averageResponseTime = (perf.averageResponseTime + responseTime) / 2;
  }, []);

  const recordMiss = useCallback(() => {
    const perf = performanceRef.current;
    perf.misses++;
    perf.totalRequests++;
  }, []);

  const getStats = useCallback(() => {
    const perf = performanceRef.current;
    const hitRate = perf.totalRequests > 0 ? (perf.hits / perf.totalRequests) * 100 : 0;
    const missRate = 100 - hitRate;

    return {
      hits: perf.hits,
      misses: perf.misses,
      totalRequests: perf.totalRequests,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      averageResponseTime: Math.round(perf.averageResponseTime * 100) / 100,
      uptime: Date.now() - perf.lastReset
    };
  }, []);

  const reset = useCallback(() => {
    performanceRef.current = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      lastReset: Date.now()
    };
  }, []);

  return {
    recordHit,
    recordMiss,
    getStats,
    reset
  };
}