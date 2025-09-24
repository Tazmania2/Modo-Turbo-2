import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FeatureGate } from '../FeatureGate';
import { featureToggleService } from '@/services/feature-toggle.service';

// Mock the feature toggle service
vi.mock('@/services/feature-toggle.service');

const mockFeatureToggleService = featureToggleService as any;

describe('FeatureGate', () => {
  const mockInstanceId = 'test-instance-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when feature is enabled', async () => {
    mockFeatureToggleService.isFeatureEnabled.mockResolvedValue(true);

    render(
      <FeatureGate feature="ranking" instanceId={mockInstanceId}>
        <div>Feature Content</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(screen.getByText('Feature Content')).toBeInTheDocument();
    });

    expect(mockFeatureToggleService.isFeatureEnabled).toHaveBeenCalledWith(
      mockInstanceId,
      'ranking'
    );
  });

  it('should render fallback when feature is disabled', async () => {
    mockFeatureToggleService.isFeatureEnabled.mockResolvedValue(false);

    render(
      <FeatureGate 
        feature="ranking" 
        instanceId={mockInstanceId}
        fallback={<div>Feature Disabled</div>}
      >
        <div>Feature Content</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(screen.getByText('Feature Disabled')).toBeInTheDocument();
    });

    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
  });

  it('should render nothing when feature is disabled and no fallback provided', async () => {
    mockFeatureToggleService.isFeatureEnabled.mockResolvedValue(false);

    const { container } = render(
      <FeatureGate feature="ranking" instanceId={mockInstanceId}>
        <div>Feature Content</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should render loading state while checking feature', () => {
    mockFeatureToggleService.isFeatureEnabled.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(true), 100))
    );

    render(
      <FeatureGate 
        feature="ranking" 
        instanceId={mockInstanceId}
        loading={<div>Loading...</div>}
      >
        <div>Feature Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle service errors gracefully', async () => {
    mockFeatureToggleService.isFeatureEnabled.mockRejectedValue(
      new Error('Service error')
    );

    render(
      <FeatureGate 
        feature="ranking" 
        instanceId={mockInstanceId}
        fallback={<div>Feature Disabled</div>}
      >
        <div>Feature Content</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(screen.getByText('Feature Disabled')).toBeInTheDocument();
    });

    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
  });

  it('should re-check feature when instanceId changes', async () => {
    mockFeatureToggleService.isFeatureEnabled.mockResolvedValue(true);

    const { rerender } = render(
      <FeatureGate feature="ranking" instanceId="instance-1">
        <div>Feature Content</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(screen.getByText('Feature Content')).toBeInTheDocument();
    });

    expect(mockFeatureToggleService.isFeatureEnabled).toHaveBeenCalledWith(
      'instance-1',
      'ranking'
    );

    // Change instanceId
    rerender(
      <FeatureGate feature="ranking" instanceId="instance-2">
        <div>Feature Content</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(mockFeatureToggleService.isFeatureEnabled).toHaveBeenCalledWith(
        'instance-2',
        'ranking'
      );
    });
  });

  it('should re-check feature when feature name changes', async () => {
    mockFeatureToggleService.isFeatureEnabled.mockResolvedValue(true);

    const { rerender } = render(
      <FeatureGate feature="ranking" instanceId={mockInstanceId}>
        <div>Feature Content</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(screen.getByText('Feature Content')).toBeInTheDocument();
    });

    expect(mockFeatureToggleService.isFeatureEnabled).toHaveBeenCalledWith(
      mockInstanceId,
      'ranking'
    );

    // Change feature
    rerender(
      <FeatureGate feature="history" instanceId={mockInstanceId}>
        <div>Feature Content</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(mockFeatureToggleService.isFeatureEnabled).toHaveBeenCalledWith(
        mockInstanceId,
        'history'
      );
    });
  });
});