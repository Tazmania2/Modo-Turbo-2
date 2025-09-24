import { render, screen } from '@testing-library/react';
import { GoalCard } from '../GoalCard';
import { Goal } from '@/types/dashboard';

const mockGoal: Goal = {
  name: 'Complete Daily Tasks',
  percentage: 75,
  description: 'Finish all assigned daily activities',
  emoji: '🎯',
  target: 20,
  current: 15,
  unit: 'tasks',
  hasBoost: true,
  isBoostActive: true,
  daysRemaining: 12
};

describe('GoalCard', () => {
  it('should render goal information correctly', () => {
    render(<GoalCard goal={mockGoal} />);
    
    expect(screen.getByText('Complete Daily Tasks')).toBeInTheDocument();
    expect(screen.getByText('Finish all assigned daily activities')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('15/20 tasks')).toBeInTheDocument();
    expect(screen.getByText('Progress: 75%')).toBeInTheDocument();
    expect(screen.getByText('12 days left')).toBeInTheDocument();
  });

  it('should show primary badge when isPrimary is true', () => {
    render(<GoalCard goal={mockGoal} isPrimary={true} />);
    
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('should show boost indicator when goal has boost', () => {
    render(<GoalCard goal={mockGoal} />);
    
    expect(screen.getByText('Boost Active')).toBeInTheDocument();
    expect(screen.getByText('2x Points')).toBeInTheDocument();
  });

  it('should show boost available when boost is not active', () => {
    const goalWithInactiveBoost = { ...mockGoal, isBoostActive: false };
    render(<GoalCard goal={goalWithInactiveBoost} />);
    
    expect(screen.getByText('Boost Available')).toBeInTheDocument();
  });

  it('should not show boost indicator when goal has no boost', () => {
    const goalWithoutBoost = { ...mockGoal, hasBoost: false };
    render(<GoalCard goal={goalWithoutBoost} />);
    
    expect(screen.queryByText('Boost Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Boost Available')).not.toBeInTheDocument();
  });

  it('should show percentage when no target/current values', () => {
    const goalWithPercentage = {
      ...mockGoal,
      target: undefined,
      current: undefined,
      unit: undefined
    };
    render(<GoalCard goal={goalWithPercentage} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});