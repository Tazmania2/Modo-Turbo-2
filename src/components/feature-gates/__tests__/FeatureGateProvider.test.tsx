import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { FeatureGateProvider, useFeatureGate } from '../FeatureGateProvider';
import { featureToggleService } from '@/services/feature-toggle.service';
import { WhiteLabelFeatures } from '@/types/funifier';

// Mock the feature toggle service
vi.mock('@/services/feature-toggle.service');

const mockFeatureToggleService = featureToggleService as any;

// Test component that uses the hook
function TestComponent() {
  const { features, isLoading, isFeatureEnabled, refreshFeatures } = useFeatureGate();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="ranking-status">
        Ranking: {isFeatureEnabled('ranking') ? 'enabled' : 'disabled'}
      </div>
      <div data-testid="history-status">
        History: {isFeatureEnabled('history') ? 'enabled' : 'disabled'}
      </div>
      <div data-testid="dashboard-status">
        Dashboard I: {isFeatureEnabled('dashboards.carteira_i') ? 'enabled' : 'disabled'}
      </div>
      <button onClick={refreshFeatures}>Refresh</button>
      <div data-testid="features-json">
        {JSON.stringify(features)}
      </div>
    </div>
  );
}

describe('FeatureGateProvider', () => {
  const mockInstanceId = 'test-instance-123';

  const mockFeatures: WhiteLabelFeatures = {
    ranking: true,
    dashboards: {
      carteira_i: true,
      carteira_ii: false,
      carteira_iii: false,
      carteira_iv: false
    },
    history: false,
    personalizedRanking: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide feature configuration to children', async () => {
    mockFeatureToggleService.getFeatureConfiguration.mockResolvedValue(mockFeatures);

    render(
      <FeatureGateProvider instanceId={mockInstanceId}>
        <TestComponent />
      </FeatureGateProvider>
    );

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for features to load
    await waitFor(() => {
      expect(screen.getByTestId('ranking-status')).toHaveTextContent('Ranking: enabled');
    });

    expect(screen.getByTestId('history-status')).toHaveTextContent('History: disabled');
    expect(screen.getByTestId('dashboard-status')).toHaveTextContent('Dashboard I: enabled');
  });

  it('should handle service errors gracefully', async () => {
    mockFeatureToggleService.getFeatureConfiguration.mockRejectedValue(
      new Error('Service error')
    );

    render(
      <FeatureGateProvider instanceId={mockInstanceId}>
        <TestComponent />
      </FeatureGateProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ranking-status')).toHaveTextContent('Ranking: disabled');
    });

    expect(screen.getByTestId('features-json')).toHaveTextContent('null');
  });

  it('should refresh features when refreshFeatures is called', async () => {
    mockFeatureToggleService.getFeatureConfiguration
      .mockResolvedValueOnce(mockFeatures)
      .mockResolvedValueOnce({
        ...mockFeatures,
        ranking: false
      });

    render(
      <FeatureGateProvider instanceId={mockInstanceId}>
        <TestComponent />
      </FeatureGateProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('ranking-status')).toHaveTextContent('Ranking: enabled');
    });

    // Click refresh
    act(() => {
      screen.getByText('Refresh').click();
    });

    // Wait for refresh to complete
    await waitFor(() => {
      expect(screen.getByTestId('ranking-status')).toHaveTextContent('Ranking: disabled');
    });

    expect(mockFeatureToggleService.getFeatureConfiguration).toHaveBeenCalledTimes(2);
  });

  it('should reload features when instanceId changes', async () => {
    mockFeatureToggleService.getFeatureConfiguration.mockResolvedValue(mockFeatures);

    const { rerender } = render(
      <FeatureGateProvider instanceId="instance-1">
        <TestComponent />
      </FeatureGateProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ranking-status')).toHaveTextContent('Ranking: enabled');
    });

    expect(mockFeatureToggleService.getFeatureConfiguration).toHaveBeenCalledWith('instance-1');

    // Change instanceId
    rerender(
      <FeatureGateProvider instanceId="instance-2">
        <TestComponent />
      </FeatureGateProvider>
    );

    await waitFor(() => {
      expect(mockFeatureToggleService.getFeatureConfiguration).toHaveBeenCalledWith('instance-2');
    });
  });

  it('should handle dashboard features correctly', async () => {
    const featuresWithDashboards: WhiteLabelFeatures = {
      ranking: true,
      dashboards: {
        carteira_i: true,
        carteira_ii: false,
        carteira_iii: true,
        carteira_iv: false
      },
      history: true,
      personalizedRanking: true
    };

    mockFeatureToggleService.getFeatureConfiguration.mockResolvedValue(featuresWithDashboards);

    function DashboardTestComponent() {
      const { isFeatureEnabled } = useFeatureGate();

      return (
        <div>
          <div data-testid="dashboard-i">
            {isFeatureEnabled('dashboards.carteira_i') ? 'enabled' : 'disabled'}
          </div>
          <div data-testid="dashboard-ii">
            {isFeatureEnabled('dashboards.carteira_ii') ? 'enabled' : 'disabled'}
          </div>
          <div data-testid="dashboard-iii">
            {isFeatureEnabled('dashboards.carteira_iii') ? 'enabled' : 'disabled'}
          </div>
          <div data-testid="dashboard-iv">
            {isFeatureEnabled('dashboards.carteira_iv') ? 'enabled' : 'disabled'}
          </div>
        </div>
      );
    }

    render(
      <FeatureGateProvider instanceId={mockInstanceId}>
        <DashboardTestComponent />
      </FeatureGateProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-i')).toHaveTextContent('enabled');
    });

    expect(screen.getByTestId('dashboard-ii')).toHaveTextContent('disabled');
    expect(screen.getByTestId('dashboard-iii')).toHaveTextContent('enabled');
    expect(screen.getByTestId('dashboard-iv')).toHaveTextContent('disabled');
  });

  it('should throw error when useFeatureGate is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useFeatureGate must be used within a FeatureGateProvider');

    consoleSpy.mockRestore();
  });
});