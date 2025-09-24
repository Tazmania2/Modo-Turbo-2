'use client';

import { ReactNode } from 'react';
import { useFeatureGate } from './FeatureGateProvider';

interface ConditionalNavigationProps {
  requiredFeatures: string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, all features must be enabled. If false, at least one must be enabled.
}

/**
 * Component for conditionally rendering navigation items based on multiple feature requirements
 */
export function ConditionalNavigation({ 
  requiredFeatures, 
  children, 
  fallback = null,
  requireAll = false 
}: ConditionalNavigationProps) {
  const { isFeatureEnabled, isLoading } = useFeatureGate();

  if (isLoading) {
    return null; // Don't show navigation items while loading
  }

  const shouldRender = requireAll
    ? requiredFeatures.every(feature => isFeatureEnabled(feature))
    : requiredFeatures.some(feature => isFeatureEnabled(feature));

  if (shouldRender) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}