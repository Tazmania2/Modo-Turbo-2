import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureTogglePanel } from '../FeatureTogglePanel';
import { useFeatureToggleAdmin } from '@/hooks/useFeatureToggleAdmin';
import { WhiteLabelFeatures } from '@/types/funifier';
import { FeatureDefinition } from '@/services/feature-toggle.service';

// Mock the hook
vi.mock('@/hooks/useFeatureToggleAdmin');

const mockUseFeatureToggleAdmin = useFeatureToggleAdmin as any;

describe('FeatureTogglePanel', () => {
  const mockInstanceId = 'test-instance-123';
  const mockUserId = 'test-user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the hook to return loading state by default
    mockUseFeatureToggleAdmin.mockReturnValue({
      features: null,
      availableFeatures: [],
      isLoading: true,
      isSaving: false,
      errors: [],
      warnings: [],
      successMessage: '',
      updateFeature: vi.fn(),
      updateMultipleFeatures: vi.fn(),
      resetToDefaults: vi.fn(),
      refreshFeatures: vi.fn()
    });
  });

  it('should render without crashing', () => {
    expect(() => {
      render(
        <FeatureTogglePanel 
          instanceId={mockInstanceId} 
          userId={mockUserId} 
        />
      );
    }).not.toThrow();
  });

  it('should show loading skeleton when loading', () => {
    render(
      <FeatureTogglePanel 
        instanceId={mockInstanceId} 
        userId={mockUserId} 
      />
    );

    // Check for loading skeleton (animate-pulse class)
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('should accept all required props', () => {
    const mockOnFeaturesUpdated = vi.fn();

    expect(() => {
      render(
        <FeatureTogglePanel 
          instanceId={mockInstanceId} 
          userId={mockUserId}
          onFeaturesUpdated={mockOnFeaturesUpdated}
        />
      );
    }).not.toThrow();
  });

  it('should use the provided instanceId and userId props', () => {
    // This test just verifies the component accepts the props without error
    const { rerender } = render(
      <FeatureTogglePanel 
        instanceId={mockInstanceId} 
        userId={mockUserId} 
      />
    );

    // Should be able to re-render with different props
    expect(() => {
      rerender(
        <FeatureTogglePanel 
          instanceId="different-instance" 
          userId="different-user" 
        />
      );
    }).not.toThrow();
  });
});