import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardContainer } from '../DashboardContainer';
import { useDashboardData } from '@/hooks/useDashboardData';

// Mock the hook
vi.mock('@/hooks/useDashboardData');

// Mock child components
vi.mock('../GoalCard', () => ({
  GoalCard: ({ goal }: { goal: any }) => (
    <div data-testid="goal-card">{goal.name}</div>
  ),
}));

vi.mock('../PointsDisplay', () => ({
  PointsDisplay: ({ points }: { points: number }) => (
    <div data-testid="points-display">{points}</div>
  ),
}));

vi.mock('../CycleProgress', () => ({
  CycleProgress: ({ current, total }: { current: number; total: number }) => (
    <div data-testid="cycle-progress">{current}/{total}</div>
  ),
}));

describe('DashboardContainer', () => {
  const mockUseDashboardData = vi.mocked(useDashboardData);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseDashboardData.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardContainer playerId="test-player" />);

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  it('should render dashboard data when loaded', async () => {
    const mockData = {
      playerName: 'Test Player',
      totalPoints: 1250,
      pointsLocked: false,
      currentCycleDay: 15,
      totalCycleDays: 30,
      primaryGoal: {
        name: 'Daily Tasks',
        percentage: 75,
        description: 'Complete daily objectives',
        emoji: '🎯',
      },
      secondaryGoal1: {
        name: 'Weekly Challenge',
        percentage: 60,
        description: 'Weekly progress',
        emoji: '🏆',
      },
      secondaryGoal2: {
        name: 'Monthly Target',
        percentage: 40,
        description: 'Monthly objectives',
        emoji: '📈',
      },
    };

    mockUseDashboardData.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardContainer playerId="test-player" />);

    await waitFor(() => {
      expect(screen.getByText('Test Player')).toBeInTheDocument();
    });

    expect(screen.getByTestId('points-display')).toHaveTextContent('1250');
    expect(screen.getByTestId('cycle-progress')).toHaveTextContent('15/30');
    
    // Check goals are rendered
    const goalCards = screen.getAllByTestId('goal-card');
    expect(goalCards).toHaveLength(3);
    expect(goalCards[0]).toHaveTextContent('Daily Tasks');
    expect(goalCards[1]).toHaveTextContent('Weekly Challenge');
    expect(goalCards[2]).toHaveTextContent('Monthly Target');
  });

  it('should render error state', () => {
    const mockError = new Error('Failed to load dashboard data');
    
    mockUseDashboardData.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    });

    render(<DashboardContainer playerId="test-player" />);

    expect(screen.getByText('Unable to load dashboard data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('should handle retry on error', async () => {
    const mockRefetch = vi.fn();
    const mockError = new Error('Failed to load dashboard data');
    
    mockUseDashboardData.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    render(<DashboardContainer playerId="test-player" />);

    const retryButton = screen.getByRole('button', { name: 'Try Again' });
    retryButton.click();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should display locked points indicator when points are locked', () => {
    const mockData = {
      playerName: 'Test Player',
      totalPoints: 1250,
      pointsLocked: true,
      currentCycleDay: 15,
      totalCycleDays: 30,
      primaryGoal: { name: 'Goal', percentage: 50, description: '', emoji: '🎯' },
      secondaryGoal1: { name: 'Goal', percentage: 50, description: '', emoji: '🏆' },
      secondaryGoal2: { name: 'Goal', percentage: 50, description: '', emoji: '📈' },
    };

    mockUseDashboardData.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardContainer playerId="test-player" />);

    expect(screen.getByTestId('points-locked-indicator')).toBeInTheDocument();
  });
});