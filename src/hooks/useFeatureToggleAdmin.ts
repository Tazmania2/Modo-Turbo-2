'use client';

import { useState, useEffect } from 'react';
import { WhiteLabelFeatures } from '@/types/funifier';
import { FeatureDefinition, FeatureToggleUpdate } from '@/services/feature-toggle.service';

interface UseFeatureToggleAdminResult {
  features: WhiteLabelFeatures | null;
  availableFeatures: FeatureDefinition[];
  isLoading: boolean;
  isSaving: boolean;
  errors: string[];
  warnings: string[];
  successMessage: string;
  updateFeature: (featureName: string, enabled: boolean) => Promise<void>;
  updateMultipleFeatures: (updates: FeatureToggleUpdate[]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  refreshFeatures: () => Promise<void>;
}

/**
 * Hook for managing feature toggles in admin interface
 */
export function useFeatureToggleAdmin(instanceId: string): UseFeatureToggleAdminResult {
  const [features, setFeatures] = useState<WhiteLabelFeatures | null>(null);
  const [availableFeatures, setAvailableFeatures] = useState<FeatureDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const clearMessages = () => {
    setErrors([]);
    setWarnings([]);
    setSuccessMessage('');
  };

  const loadFeatures = async () => {
    try {
      setIsLoading(true);
      clearMessages();

      const response = await fetch(`/api/admin/features?instanceId=${instanceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load features');
      }

      const data = await response.json();
      setFeatures(data.features);
      setAvailableFeatures(data.availableFeatures || []);
    } catch (error) {
      console.error('Failed to load features:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to load features']);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFeature = async (featureName: string, enabled: boolean) => {
    try {
      setIsSaving(true);
      clearMessages();

      const response = await fetch(`/api/admin/features/${encodeURIComponent(featureName)}?instanceId=${instanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update feature');
      }

      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.features);
        setSuccessMessage(`Feature "${featureName}" updated successfully`);
        
        if (data.warnings && data.warnings.length > 0) {
          setWarnings(data.warnings);
        }
      } else {
        setErrors(data.details || ['Failed to update feature']);
      }
    } catch (error) {
      console.error('Failed to update feature:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to update feature']);
    } finally {
      setIsSaving(false);
    }
  };

  const updateMultipleFeatures = async (updates: FeatureToggleUpdate[]) => {
    try {
      setIsSaving(true);
      clearMessages();

      const response = await fetch(`/api/admin/features?instanceId=${instanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update features');
      }

      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.features);
        setSuccessMessage(`Successfully updated ${updates.length} feature(s)`);
        
        if (data.warnings && data.warnings.length > 0) {
          setWarnings(data.warnings);
        }
      } else {
        setErrors(data.details || ['Failed to update features']);
      }
    } catch (error) {
      console.error('Failed to update features:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to update features']);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setIsSaving(true);
      clearMessages();

      const response = await fetch(`/api/admin/features/reset?instanceId=${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset features');
      }

      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.features);
        setSuccessMessage(data.message || 'Features reset to defaults');
      } else {
        setErrors(data.details || ['Failed to reset features']);
      }
    } catch (error) {
      console.error('Failed to reset features:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to reset features']);
    } finally {
      setIsSaving(false);
    }
  };

  const refreshFeatures = async () => {
    await loadFeatures();
  };

  useEffect(() => {
    if (instanceId) {
      loadFeatures();
    }
  }, [instanceId]);

  return {
    features,
    availableFeatures,
    isLoading,
    isSaving,
    errors,
    warnings,
    successMessage,
    updateFeature,
    updateMultipleFeatures,
    resetToDefaults,
    refreshFeatures,
  };
}