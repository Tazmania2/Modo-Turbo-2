'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { 
  featureToggleService, 
  FeatureDefinition, 
  FeatureToggleUpdate 
} from '@/services/feature-toggle.service';
import { WhiteLabelFeatures } from '@/types/funifier';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface FeatureTogglePanelProps {
  instanceId: string;
  userId: string;
  onFeaturesUpdated?: (features: WhiteLabelFeatures) => void;
}

interface FeatureToggleState {
  [key: string]: boolean;
}

/**
 * Admin panel component for managing feature toggles
 */
export function FeatureTogglePanel({ instanceId, userId, onFeaturesUpdated }: FeatureTogglePanelProps) {
  const [features, setFeatures] = useState<WhiteLabelFeatures | null>(null);
  const [toggleStates, setToggleStates] = useState<FeatureToggleState>({});
  const [availableFeatures, setAvailableFeatures] = useState<FeatureDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadFeatures();
    loadAvailableFeatures();
  }, [instanceId]);

  const loadFeatures = async () => {
    try {
      setIsLoading(true);
      const featureConfig = await featureToggleService.getFeatureConfiguration(instanceId);
      if (featureConfig) {
        setFeatures(featureConfig);
        
        // Initialize toggle states
        const states: FeatureToggleState = {};
        const available = featureToggleService.getAvailableFeatures();
        
        for (const feature of available) {
          if (feature.key.startsWith('dashboards.')) {
            const dashboardType = feature.key.replace('dashboards.', '');
            states[feature.key] = featureConfig.dashboards[dashboardType] || false;
          } else {
            states[feature.key] = (featureConfig as any)[feature.key] || false;
          }
        }
        
        setToggleStates(states);
      }
    } catch (error) {
      console.error('Failed to load features:', error);
      setErrors(['Failed to load feature configuration']);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableFeatures = () => {
    const available = featureToggleService.getAvailableFeatures();
    setAvailableFeatures(available);
  };

  const handleToggleChange = (featureKey: string, enabled: boolean) => {
    setToggleStates(prev => ({
      ...prev,
      [featureKey]: enabled
    }));
    
    // Clear previous messages
    setErrors([]);
    setWarnings([]);
    setSuccessMessage('');
  };

  const handleSaveChanges = async () => {
    if (!features) return;

    try {
      setIsSaving(true);
      setErrors([]);
      setWarnings([]);
      setSuccessMessage('');

      // Prepare updates
      const updates: FeatureToggleUpdate[] = [];
      
      for (const [featureKey, enabled] of Object.entries(toggleStates)) {
        const currentValue = features && featureKey.startsWith('dashboards.')
          ? features.dashboards[featureKey.replace('dashboards.', '')] || false
          : (features as any)?.[featureKey] || false;
        
        if (currentValue !== enabled) {
          updates.push({
            featureName: featureKey,
            enabled
          });
        }
      }

      if (updates.length === 0) {
        setWarnings(['No changes detected']);
        return;
      }

      const result = await featureToggleService.updateMultipleFeatures(
        instanceId,
        updates,
        userId
      );

      if (result.success && result.updatedFeatures) {
        setFeatures(result.updatedFeatures);
        setSuccessMessage(`Successfully updated ${updates.length} feature(s)`);
        
        if (result.warnings && result.warnings.length > 0) {
          setWarnings(result.warnings);
        }

        if (onFeaturesUpdated) {
          onFeaturesUpdated(result.updatedFeatures);
        }
      } else {
        setErrors(result.errors || ['Failed to update features']);
      }
    } catch (error) {
      setErrors([`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setIsSaving(true);
      setErrors([]);
      setWarnings([]);
      setSuccessMessage('');

      const result = await featureToggleService.resetFeaturesToDefaults(instanceId, userId);

      if (result.success && result.updatedFeatures) {
        setFeatures(result.updatedFeatures);
        
        // Update toggle states
        const states: FeatureToggleState = {};
        for (const feature of availableFeatures) {
          if (feature.key.startsWith('dashboards.')) {
            const dashboardType = feature.key.replace('dashboards.', '');
            states[feature.key] = result.updatedFeatures.dashboards[dashboardType] || false;
          } else {
            states[feature.key] = (result.updatedFeatures as any)[feature.key] || false;
          }
        }
        setToggleStates(states);
        
        setSuccessMessage('Features reset to default configuration');
        
        if (onFeaturesUpdated) {
          onFeaturesUpdated(result.updatedFeatures);
        }
      } else {
        setErrors(result.errors || ['Failed to reset features']);
      }
    } catch (error) {
      setErrors([`Failed to reset features: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsSaving(false);
    }
  };

  const getFeaturesByCategory = () => {
    const categories: { [key: string]: FeatureDefinition[] } = {};
    
    for (const feature of availableFeatures) {
      if (!categories[feature.category]) {
        categories[feature.category] = [];
      }
      categories[feature.category].push(feature);
    }
    
    return categories;
  };

  const hasUnsavedChanges = () => {
    if (!features) return false;
    
    return Object.entries(toggleStates).some(([featureKey, enabled]) => {
      const currentValue = featureKey.startsWith('dashboards.')
        ? features.dashboards[featureKey.replace('dashboards.', '')] || false
        : (features as any)[featureKey] || false;
      
      return currentValue !== enabled;
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const categorizedFeatures = getFeaturesByCategory();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Feature Toggles</h3>
        <div className="flex space-x-3">
          <button
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isSaving || !hasUnsavedChanges()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Errors</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Warnings</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Feature Categories */}
      <div className="space-y-6">
        {Object.entries(categorizedFeatures).map(([category, categoryFeatures]) => (
          <div key={category} className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-base font-medium text-gray-900 capitalize mb-4">
                {category} Features
              </h4>
              <div className="space-y-4">
                {categoryFeatures.map((feature) => (
                  <div key={feature.key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h5 className="text-sm font-medium text-gray-900">
                          {feature.name}
                        </h5>
                        {feature.dependencies && feature.dependencies.length > 0 && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Requires: {feature.dependencies.join(', ')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {feature.description}
                      </p>
                    </div>
                    <Switch
                      checked={toggleStates[feature.key] || false}
                      onChange={(enabled) => handleToggleChange(feature.key, enabled)}
                      className={`${
                        toggleStates[feature.key] ? 'bg-blue-600' : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          toggleStates[feature.key] ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </Switch>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasUnsavedChanges() && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}