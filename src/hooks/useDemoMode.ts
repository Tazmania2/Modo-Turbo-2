/**
 * Hook for accessing demo mode functionality in components
 */

import { useState, useEffect } from 'react';
import { demoModeService } from '@/services/demo-mode.service';

export interface UseDemoModeResult {
  isDemoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  getDataSourceInfo: () => {
    source: 'funifier' | 'demo';
    isDemoMode: boolean;
    timestamp: number;
  };
  config: {
    enabled: boolean;
    source: 'environment' | 'localStorage' | 'default';
    reason?: string;
  };
}

/**
 * Hook to access demo mode state and controls
 */
export function useDemoMode(): UseDemoModeResult {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [config, setConfig] = useState(demoModeService.getDemoModeConfig());

  useEffect(() => {
    // Initialize demo mode state
    const demoMode = demoModeService.isDemoMode();
    setIsDemoMode(demoMode);
    setConfig(demoModeService.getDemoModeConfig());

    // Log demo mode status on mount
    if (process.env.NODE_ENV === 'development') {
      demoModeService.logStatus();
    }
  }, []);

  const enableDemoMode = () => {
    demoModeService.enableDemoMode();
    setIsDemoMode(true);
    setConfig(demoModeService.getDemoModeConfig());
  };

  const disableDemoMode = () => {
    demoModeService.disableDemoMode();
    setIsDemoMode(false);
    setConfig(demoModeService.getDemoModeConfig());
  };

  const getDataSourceInfo = () => {
    return demoModeService.getDataSourceInfo();
  };

  return {
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
    getDataSourceInfo,
    config,
  };
}
