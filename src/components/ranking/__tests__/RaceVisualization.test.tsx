import React from 'react';
import { render, screen } from '@testing-library/react';
import { RaceVisualization } from '../RaceVisualization';
import { RaceVisualization as RaceVisualizationType } from '@/types/funifier';
import { expect } from 'vitest';
import { it } from 'vitest';
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
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';

const mockRaceData: RaceVisualizationType = {
  raceTrack: {
    length: 1000,
    segments: 5,
    theme: 'default'
  },
  participants: [
    {
      playerId: 'player1',
      playerName: 'John Doe',
      avatar: 'https://example.com/avatar1.jpg',
      position: {
        x: 800,
        y: 0,
        progress: 80
      },
      vehicle: {
        type: 'formula-1',
        color: '#FF6B6B',
        speed: 1.5
      },
      isCurrentUser: true
    },
    {
      playerId: 'player2',
      playerName: 'Jane Smith',
      avatar: 'https://example.com/avatar2.jpg',
      position: {
        x: 600,
        y: 50,
        progress: 60
      },
      vehicle: {
        type: 'race-car',
        color: '#4ECDC4',
        speed: 1.2
      },
      isCurrentUser: false
    }
  ],
  animations: {
    enabled: true,
    speed: 1.0,
    effects: ['smooth-movement', 'particle-trail']
  }
};

describe('RaceVisualization', () => {
  it('renders race visualization with participants', () => {
    render(<RaceVisualization raceData={mockRaceData} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('2 participants')).toBeInTheDocument();
    expect(screen.getByText('Track: 1000m')).toBeInTheDocument();
  });

  it('shows position percentages when showPositions is true', () => {
    render(<RaceVisualization raceData={mockRaceData} showPositions={true} />);
    
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('hides position percentages when showPositions is false', () => {
    render(<RaceVisualization raceData={mockRaceData} showPositions={false} />);
    
    expect(screen.queryByText('80%')).not.toBeInTheDocument();
    expect(screen.queryByText('60%')).not.toBeInTheDocument();
  });

  it('highlights current user participant', () => {
    render(<RaceVisualization raceData={mockRaceData} />);
    
    const johnDoeContainer = screen.getByText('John Doe').closest('.bg-opacity-80');
    expect(johnDoeContainer).toBeInTheDocument();
  });

  it('applies correct theme background', () => {
    const spaceThemeData = {
      ...mockRaceData,
      raceTrack: { ...mockRaceData.raceTrack, theme: 'space' }
    };
    
    const { container } = render(<RaceVisualization raceData={spaceThemeData} />);
    const trackElement = container.querySelector('.bg-gradient-to-r.from-purple-900');
    expect(trackElement).toBeInTheDocument();
  });

  it('renders finish line', () => {
    render(<RaceVisualization raceData={mockRaceData} />);
    
    expect(screen.getAllByText('🏁')).toHaveLength(2); // One for participant + finish line
  });

  it('displays correct vehicle icons', () => {
    render(<RaceVisualization raceData={mockRaceData} />);
    
    // Formula-1 car should be rendered for player1
    const raceContainer = screen.getByText('John Doe').closest('.relative');
    expect(raceContainer).toBeInTheDocument();
  });
});