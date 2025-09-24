import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContextualRanking } from '../ContextualRanking';
import { Player } from '@/types/funifier';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
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
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';

const mockTopThree: Player[] = [
  {
    _id: 'player1',
    name: 'Alice Johnson',
    totalPoints: 15000,
    position: 1,
    pointsGainedToday: 300,
    avatar: 'https://example.com/alice.jpg',
    team: 'Team Alpha',
    goals: [],
    lastUpdated: new Date()
  },
  {
    _id: 'player2',
    name: 'Bob Smith',
    totalPoints: 14500,
    position: 2,
    pointsGainedToday: 250,
    avatar: 'https://example.com/bob.jpg',
    team: 'Team Beta',
    goals: [],
    lastUpdated: new Date()
  },
  {
    _id: 'player3',
    name: 'Charlie Brown',
    totalPoints: 14000,
    position: 3,
    pointsGainedToday: 200,
    avatar: 'https://example.com/charlie.jpg',
    team: 'Team Gamma',
    goals: [],
    lastUpdated: new Date()
  }
];

const mockContextualRanking = {
  above: {
    _id: 'player4',
    name: 'David Wilson',
    totalPoints: 12000,
    position: 4,
    pointsGainedToday: 150,
    avatar: 'https://example.com/david.jpg',
    team: 'Team Delta',
    goals: [],
    lastUpdated: new Date()
  },
  current: {
    _id: 'player5',
    name: 'Eve Davis',
    totalPoints: 11500,
    position: 5,
    pointsGainedToday: 100,
    avatar: 'https://example.com/eve.jpg',
    team: 'Team Epsilon',
    goals: [],
    lastUpdated: new Date()
  },
  below: {
    _id: 'player6',
    name: 'Frank Miller',
    totalPoints: 11000,
    position: 6,
    pointsGainedToday: 75,
    avatar: 'https://example.com/frank.jpg',
    team: 'Team Zeta',
    goals: [],
    lastUpdated: new Date()
  }
};

describe('ContextualRanking', () => {
  it('renders top three performers section', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
      />
    );
    
    expect(screen.getByText('🏆 Top Performers')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
  });

  it('displays correct position icons for top three', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
      />
    );
    
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('shows contextual ranking when current user is not in top 3', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
      />
    );
    
    expect(screen.getByText('📍 Your Position')).toBeInTheDocument();
    expect(screen.getByText('David Wilson')).toBeInTheDocument(); // Above
    expect(screen.getByText('Eve Davis')).toBeInTheDocument(); // Current
    expect(screen.getByText('Frank Miller')).toBeInTheDocument(); // Below
  });

  it('highlights current user in contextual ranking', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
      />
    );
    
    const currentUserRow = screen.getByText('Eve Davis').closest('.bg-gradient-to-r');
    expect(currentUserRow).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows "You are here" divider in contextual ranking', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
      />
    );
    
    expect(screen.getByText('You are here')).toBeInTheDocument();
  });

  it('displays points gained today when showPointsGained is true', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
        showPointsGained={true}
      />
    );
    
    expect(screen.getByText('+300')).toBeInTheDocument(); // Alice's points
    expect(screen.getByText('+250')).toBeInTheDocument(); // Bob's points
    expect(screen.getAllByText('+100')).toHaveLength(2); // Current user's points (appears twice)
  });

  it('hides points gained when showPointsGained is false', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
        showPointsGained={false}
      />
    );
    
    expect(screen.queryByText('+300')).not.toBeInTheDocument();
    expect(screen.queryByText('+250')).not.toBeInTheDocument();
  });

  it('displays summary stats for current user', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
      />
    );
    
    expect(screen.getByText('#5')).toBeInTheDocument(); // Position
    expect(screen.getAllByText('11.500')).toHaveLength(2); // Total points (appears twice)
    expect(screen.getAllByText('+100')).toHaveLength(2); // Points today (appears twice)
  });

  it('does not show contextual ranking when current user is in top 3', () => {
    const topThreeWithCurrentUser = [
      ...mockTopThree.slice(0, 2),
      {
        ...mockTopThree[2],
        _id: mockContextualRanking.current._id // Make current user be in top 3
      }
    ];

    render(
      <ContextualRanking
        topThree={topThreeWithCurrentUser}
        contextualRanking={mockContextualRanking}
      />
    );
    
    expect(screen.queryByText('📍 Your Position')).not.toBeInTheDocument();
  });

  it('handles missing above or below players gracefully', () => {
    const contextualWithoutBelow = {
      ...mockContextualRanking,
      below: null
    };

    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={contextualWithoutBelow}
      />
    );
    
    expect(screen.getByText('David Wilson')).toBeInTheDocument(); // Above
    expect(screen.getByText('Eve Davis')).toBeInTheDocument(); // Current
    expect(screen.queryByText('Frank Miller')).not.toBeInTheDocument(); // Below (null)
  });

  it('displays team information for players', () => {
    render(
      <ContextualRanking
        topThree={mockTopThree}
        contextualRanking={mockContextualRanking}
      />
    );
    
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.getByText('Team Epsilon')).toBeInTheDocument();
  });
});