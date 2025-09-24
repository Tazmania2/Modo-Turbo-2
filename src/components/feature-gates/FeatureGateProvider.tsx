'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { WhiteLabelFeatures } from '@/types/funifier';
import { featureToggleService } from '@/services/feature-toggle.service';

interface FeatureGateContextType {
  features: WhiteLabelFeatures | null;
  isLoading: boolean;
  isFeatureEnabled: (featureName: string) => boolean;
  refreshFeatures: () => Promise<void>;
}

const FeatureGateContext = createContext<FeatureGateContextType | undefined>(undefined);

interface FeatureGateProviderProps {
  instanceId: string;
  children: ReactNode;
}

/**
 * Provider component that manages feature toggle state for the entire application
 */
export function FeatureGateProvider({ instanceId, children }: FeatureGateProviderProps) {
  const [features, setFeatures] = useState<WhiteLabelFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFeatures = async () => {
    try {
      setIsLoading(true);
      const featureConfig = await featureToggleService.getFeatureConfiguration(instanceId);
      setFeatures(featureConfig);
    } catch (error) {
      console.error('Failed to load feature configuration:', error);
      setFeatures(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, [instanceId]);

  const isFeatureEnabled = (featureName: string): boolean => {
    if (!features) return false;

    if (featureName.startsWith('dashboards.')) {
      const dashboardType = featureName.replace('dashboards.', '');
      return features.dashboards[dashboardType] || false;
    }

    return (features as any)[featureName] || false;
  };

  const refreshFeatures = async () => {
    await loadFeatures();
  };

  const contextValue: FeatureGateContextType = {
    features,
    isLoading,
    isFeatureEnabled,
    refreshFeatures
  };

  return (
    <FeatureGateContext.Provider value={contextValue}>
      {children}
    </FeatureGateContext.Provider>
  );
}

/**
 * Hook to access feature gate context
 */
export function useFeatureGate() {
  const context = useContext(FeatureGateContext);
  if (context === undefined) {
    throw new Error('useFeatureGate must be used within a FeatureGateProvider');
  }
  return context;
}