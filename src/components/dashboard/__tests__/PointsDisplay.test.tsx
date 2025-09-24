import { render, screen } from '@testing-library/react';
import { PointsDisplay } from '../PointsDisplay';

describe('PointsDisplay', () => {
  it('should render total points correctly', () => {
    render(<PointsDisplay totalPoints={12450} />);
    
    expect(screen.getByText('Total Points')).toBeInTheDocument();
    expect(screen.getByText('12.450')).toBeInTheDocument(); // Using dot separator based on locale
    expect(screen.getByText('Your accumulated score')).toBeInTheDocument();
  });

  it('should show points gained today when provided', () => {
    render(<PointsDisplay totalPoints={12450} pointsGainedToday={250} />);
    
    expect(screen.getByText('+250')).toBeInTheDocument();
    expect(screen.getByText('today')).toBeInTheDocument();
  });

  it('should show locked badge when points are locked', () => {
    render(<PointsDisplay totalPoints={12450} pointsLocked={true} />);
    
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('Points are currently locked and cannot be earned')).toBeInTheDocument();
  });

  it('should not show locked warning when points are not locked', () => {
    render(<PointsDisplay totalPoints={12450} pointsLocked={false} />);
    
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();
    expect(screen.queryByText('Points are currently locked and cannot be earned')).not.toBeInTheDocument();
  });

  it('should format large numbers correctly', () => {
    render(<PointsDisplay totalPoints={1234567} />);
    
    expect(screen.getByText('1.234.567')).toBeInTheDocument(); // Using dot separator based on locale
  });
});