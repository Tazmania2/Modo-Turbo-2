'use client';

import { ReactNode, useEffect, useState } from 'react';
import { featureToggleService } from '@/services/feature-toggle.service';

interface FeatureGateProps {
  feature: string;
  instanceId: string;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

/**
 * Component that conditionally renders children based on feature toggle status
 */
export function FeatureGate({ 
  feature, 
  instanceId, 
  children, 
  fallback = null,
  loading = null 
}: FeatureGateProps) {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFeature = async () => {
      try {
        setIsLoading(true);
        const enabled = await featureToggleService.isFeatureEnabled(instanceId, feature);
        setIsEnabled(enabled);
      } catch (error) {
        console.error(`Failed to check feature ${feature}:`, error);
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFeature();
  }, [feature, instanceId]);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (isEnabled) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}