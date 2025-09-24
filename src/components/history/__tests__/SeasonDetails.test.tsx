import React from 'react';
import { render, screen } from '@testing-library/react';
import { SeasonDetails } from '../SeasonDetails';
import { Season } from '../../../types/dashboard';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';

const mockSeason: Season = {
  _id: 'season_1',
  name: 'Q1 2024 Championship',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31'),
  playerStats: {
    totalPoints: 2500,
    finalPosition: 5,
    achievements: ['First Steps', 'Team Player', 'Goal Crusher'],
    goals: [
      {
        name: 'Daily Tasks',
        percentage: 100,
        description: 'Complete 20 tasks this period',
        emoji: '✅',
        target: 20,
        current: 20,
        unit: 'tasks',
        hasBoost: false,
        isBoostActive: false,
        daysRemaining: 0
      },
      {
        name: 'Team Collaboration',
        percentage: 75,
        description: 'Participate in 10 team activities',
        emoji: '🤝',
        target: 10,
        current: 7,
        unit: 'activities',
        hasBoost: true,
        isBoostActive: true,
        daysRemaining: 5
      }
    ]
  }
};

describe('SeasonDetails', () => {
  const defaultProps = {
    season: mockSeason,
    isLoading: false
  };

  it('should render season name and date range', () => {
    render(<SeasonDetails {...defaultProps} />);
    
    expect(screen.getByText('Q1 2024 Championship')).toBeInTheDocument();
    expect(screen.getByText(/December 31, 2023 - March 30, 2024/)).toBeInTheDocument();
  });

  it('should display final position prominently', () => {
    render(<SeasonDetails {...defaultProps} />);
    
    expect(screen.getByText('#5')).toBeInTheDocument();
    expect(screen.getByText('Final Position')).toBeInTheDocument();
  });

  it('should show key metrics cards', () => {
    render(<SeasonDetails {...defaultProps} />);
    
    expect(screen.getByText('Total Points')).toBeInTheDocument();
    expect(screen.getByText('2.500')).toBeInTheDocument(); // European formatting
    
    expect(screen.getAllByText('Achievements')[0]).toBeInTheDocument(); // Use getAllByText for multiple instances
    expect(screen.getByText('3')).toBeInTheDocument();
    
    expect(screen.getByText('Goals Completed')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Only one goal is 100% complete
  });

  it('should display achievements section', () => {
    render(<SeasonDetails {...defaultProps} />);
    
    expect(screen.getAllByText('Achievements')).toHaveLength(2); // One in metrics, one as section header
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Team Player')).toBeInTheDocument();
    expect(screen.getByText('Goal Crusher')).toBeInTheDocument();
  });

  it('should display goals section with progress bars', () => {
    render(<SeasonDetails {...defaultProps} />);
    
    expect(screen.getByText('Season Goals')).toBeInTheDocument();
    expect(screen.getByText('Daily Tasks')).toBeInTheDocument();
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument();
    
    // Check goal descriptions
    expect(screen.getByText('Complete 20 tasks this period')).toBeInTheDocument();
    expect(screen.getByText('Participate in 10 team activities')).toBeInTheDocument();
    
    // Check progress indicators
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    
    // Check current/target values
    expect(screen.getByText('20 / 20')).toBeInTheDocument();
    expect(screen.getByText('7 / 10')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<SeasonDetails {...defaultProps} isLoading={true} />);
    
    // Should show skeleton loading
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should show empty state when no achievements or goals', () => {
    const emptySeasonData: Season = {
      ...mockSeason,
      playerStats: {
        ...mockSeason.playerStats,
        achievements: [],
        goals: []
      }
    };

    render(<SeasonDetails season={emptySeasonData} />);
    
    expect(screen.getByText('No detailed data available for this season')).toBeInTheDocument();
    expect(screen.getByText('Achievement and goal data may not be available for older seasons')).toBeInTheDocument();
  });

  it('should not render achievements section when empty', () => {
    const noAchievementsSeason: Season = {
      ...mockSeason,
      playerStats: {
        ...mockSeason.playerStats,
        achievements: []
      }
    };

    render(<SeasonDetails season={noAchievementsSeason} />);
    
    // Should not have achievements section header
    const achievementsHeaders = screen.queryAllByText('Achievements');
    expect(achievementsHeaders.length).toBe(1); // Only in the metrics card
  });

  it('should not render goals section when empty', () => {
    const noGoalsSeason: Season = {
      ...mockSeason,
      playerStats: {
        ...mockSeason.playerStats,
        goals: []
      }
    };

    render(<SeasonDetails season={noGoalsSeason} />);
    
    expect(screen.queryByText('Season Goals')).not.toBeInTheDocument();
  });

  it('should display correct progress bar colors based on completion', () => {
    render(<SeasonDetails {...defaultProps} />);
    
    // Find progress bars - look for the inner div with the color classes
    const progressBars = document.querySelectorAll('.h-2.rounded-full.transition-all');
    
    // First goal (100%) should have green color
    expect(progressBars[0]).toHaveClass('bg-green-500');
    
    // Second goal (75%) should have blue color
    expect(progressBars[1]).toHaveClass('bg-blue-500');
  });

  it('should format large numbers correctly', () => {
    const highPointsSeason: Season = {
      ...mockSeason,
      playerStats: {
        ...mockSeason.playerStats,
        totalPoints: 12500
      }
    };

    render(<SeasonDetails season={highPointsSeason} />);
    
    // European formatting uses dots instead of commas
    expect(screen.getByText('12.500')).toBeInTheDocument();
  });
});