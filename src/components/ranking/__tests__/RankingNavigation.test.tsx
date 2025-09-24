import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankingNavigation } from '../RankingNavigation';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ranking',
}));

describe('RankingNavigation', () => {
  const mockLeaderboards = [
    {
      _id: 'leaderboard-1',
      name: 'Overall Ranking',
      description: 'Global player ranking',
    },
    {
      _id: 'leaderboard-2',
      name: 'Weekly Challenge',
      description: 'Weekly competition',
    },
  ];

  it('should render leaderboard options', () => {
    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={vi.fn()}
      />
    );

    expect(screen.getByText('Overall Ranking')).toBeInTheDocument();
    expect(screen.getByText('Weekly Challenge')).toBeInTheDocument();
  });

  it('should highlight current leaderboard', () => {
    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={vi.fn()}
      />
    );

    const currentTab = screen.getByRole('button', { name: 'Overall Ranking' });
    expect(currentTab).toHaveClass('bg-blue-50', 'text-blue-700');
  });

  it('should call onLeaderboardChange when different leaderboard is selected', () => {
    const mockOnChange = vi.fn();

    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={mockOnChange}
      />
    );

    const weeklyTab = screen.getByRole('button', { name: 'Weekly Challenge' });
    weeklyTab.click();

    expect(mockOnChange).toHaveBeenCalledWith('leaderboard-2');
  });

  it('should render view toggle buttons', () => {
    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={vi.fn()}
        currentView="personal"
        onViewChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Personal View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Global View' })).toBeInTheDocument();
  });

  it('should highlight current view', () => {
    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={vi.fn()}
        currentView="personal"
        onViewChange={vi.fn()}
      />
    );

    const personalView = screen.getByRole('button', { name: 'Personal View' });
    expect(personalView).toHaveClass('bg-blue-600', 'text-white');

    const globalView = screen.getByRole('button', { name: 'Global View' });
    expect(globalView).not.toHaveClass('bg-blue-600', 'text-white');
  });

  it('should call onViewChange when different view is selected', () => {
    const mockOnViewChange = vi.fn();

    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={vi.fn()}
        currentView="personal"
        onViewChange={mockOnViewChange}
      />
    );

    const globalView = screen.getByRole('button', { name: 'Global View' });
    globalView.click();

    expect(mockOnViewChange).toHaveBeenCalledWith('global');
  });

  it('should not render view toggle when onViewChange is not provided', () => {
    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Personal View' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Global View' })).not.toBeInTheDocument();
  });

  it('should render back to dashboard link', () => {
    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toBeInTheDocument();
  });

  it('should handle empty leaderboards array', () => {
    render(
      <RankingNavigation
        leaderboards={[]}
        currentLeaderboard=""
        onLeaderboardChange={vi.fn()}
      />
    );

    expect(screen.getByText('No leaderboards available')).toBeInTheDocument();
  });

  it('should show loading state when leaderboards are loading', () => {
    render(
      <RankingNavigation
        leaderboards={[]}
        currentLeaderboard=""
        onLeaderboardChange={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('navigation-skeleton')).toBeInTheDocument();
  });

  it('should render leaderboard descriptions as tooltips', () => {
    render(
      <RankingNavigation
        leaderboards={mockLeaderboards}
        currentLeaderboard="leaderboard-1"
        onLeaderboardChange={vi.fn()}
      />
    );

    const overallRanking = screen.getByRole('button', { name: 'Overall Ranking' });
    expect(overallRanking).toHaveAttribute('title', 'Global player ranking');
  });
});