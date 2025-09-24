import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PersonalRankingCard } from '../PersonalRankingCard';

describe('PersonalRankingCard', () => {
  const mockPersonalCard = {
    playerId: 'player-1',
    playerName: 'Test Player',
    totalPoints: 1250,
    position: 5,
    previousPosition: 6,
    avatar: '/avatar.png',
    pointsGainedToday: 50,
  };

  it('should render player information', () => {
    render(<PersonalRankingCard personalCard={mockPersonalCard} />);

    expect(screen.getByText('Test Player')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('Position: 5')).toBeInTheDocument();
  });

  it('should show position improvement indicator', () => {
    render(<PersonalRankingCard personalCard={mockPersonalCard} />);

    // Should show up arrow since position improved from 6 to 5
    expect(screen.getByTestId('position-improvement')).toBeInTheDocument();
    expect(screen.getByText('↑1')).toBeInTheDocument();
  });

  it('should show position decline indicator', () => {
    const declinedCard = {
      ...mockPersonalCard,
      position: 7,
      previousPosition: 5,
    };

    render(<PersonalRankingCard personalCard={declinedCard} />);

    expect(screen.getByTestId('position-decline')).toBeInTheDocument();
    expect(screen.getByText('↓2')).toBeInTheDocument();
  });

  it('should show no change when position is same', () => {
    const sameCard = {
      ...mockPersonalCard,
      position: 5,
      previousPosition: 5,
    };

    render(<PersonalRankingCard personalCard={sameCard} />);

    expect(screen.getByTestId('position-same')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should render avatar when provided', () => {
    render(<PersonalRankingCard personalCard={mockPersonalCard} />);

    const avatar = screen.getByRole('img', { name: 'Test Player avatar' });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', '/avatar.png');
  });

  it('should render default avatar when not provided', () => {
    const cardWithoutAvatar = {
      ...mockPersonalCard,
      avatar: undefined,
    };

    render(<PersonalRankingCard personalCard={cardWithoutAvatar} />);

    expect(screen.getByTestId('default-avatar')).toBeInTheDocument();
  });

  it('should show points gained today when provided', () => {
    render(<PersonalRankingCard personalCard={mockPersonalCard} />);

    expect(screen.getByText('+50 today')).toBeInTheDocument();
  });

  it('should not show points gained when not provided', () => {
    const cardWithoutTodayPoints = {
      ...mockPersonalCard,
      pointsGainedToday: undefined,
    };

    render(<PersonalRankingCard personalCard={cardWithoutTodayPoints} />);

    expect(screen.queryByText(/today/)).not.toBeInTheDocument();
  });

  it('should handle large numbers correctly', () => {
    const cardWithLargeNumbers = {
      ...mockPersonalCard,
      totalPoints: 1234567,
      position: 123,
    };

    render(<PersonalRankingCard personalCard={cardWithLargeNumbers} />);

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
    expect(screen.getByText('Position: 123')).toBeInTheDocument();
  });

  it('should apply correct styling for current player', () => {
    render(
      <PersonalRankingCard 
        personalCard={mockPersonalCard} 
        isCurrentPlayer={true}
        data-testid="personal-card"
      />
    );

    const card = screen.getByTestId('personal-card');
    expect(card).toHaveClass('ring-2', 'ring-blue-500');
  });

  it('should not apply current player styling when not current player', () => {
    render(
      <PersonalRankingCard 
        personalCard={mockPersonalCard} 
        isCurrentPlayer={false}
        data-testid="personal-card"
      />
    );

    const card = screen.getByTestId('personal-card');
    expect(card).not.toHaveClass('ring-2', 'ring-blue-500');
  });
});