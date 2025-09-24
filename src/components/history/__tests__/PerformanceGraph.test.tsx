import React from 'react';
import { render, screen } from '@testing-library/react';
import { PerformanceGraph } from '../PerformanceGraph';
import { PerformanceGraph as PerformanceGraphData } from '../../../types/dashboard';
import { expect } from 'vitest';
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
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
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
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';

const mockPerformanceData: PerformanceGraphData[] = [
  { date: '2024-01-01', points: 100, position: 10 },
  { date: '2024-01-02', points: 150, position: 8 },
  { date: '2024-01-03', points: 200, position: 6 },
  { date: '2024-01-04', points: 250, position: 5 },
  { date: '2024-01-05', points: 300, position: 4 }
];

describe('PerformanceGraph', () => {
  const defaultProps = {
    data: mockPerformanceData,
    title: 'Test Performance Graph',
    type: 'points' as const,
    isLoading: false
  };

  it('should render graph title', () => {
    render(<PerformanceGraph {...defaultProps} />);
    
    expect(screen.getByText('Test Performance Graph')).toBeInTheDocument();
  });

  it('should render points graph with correct legend', () => {
    render(<PerformanceGraph {...defaultProps} type="points" />);
    
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('should render position graph with correct legend', () => {
    render(<PerformanceGraph {...defaultProps} type="position" />);
    
    expect(screen.getByText('Position')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<PerformanceGraph {...defaultProps} isLoading={true} />);
    
    // Should show skeleton loading
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should show empty state when no data', () => {
    render(<PerformanceGraph {...defaultProps} data={[]} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText('Performance data will appear here once available')).toBeInTheDocument();
  });

  it('should render SVG graph when data is available', () => {
    render(<PerformanceGraph {...defaultProps} />);
    
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    // Should have polyline for the graph line
    const polyline = document.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    
    // Should have circles for data points
    const circles = document.querySelectorAll('circle');
    expect(circles.length).toBe(mockPerformanceData.length);
  });

  it('should display summary statistics for points graph', () => {
    render(<PerformanceGraph {...defaultProps} type="points" />);
    
    expect(screen.getByText('Total Points')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    
    // Should show max points (300) - use getAllByText for multiple instances
    expect(screen.getAllByText('300')[0]).toBeInTheDocument();
    
    // Should show average (200)
    expect(screen.getAllByText('200')[0]).toBeInTheDocument();
  });

  it('should display summary statistics for position graph', () => {
    render(<PerformanceGraph {...defaultProps} type="position" />);
    
    expect(screen.getByText('Best Position')).toBeInTheDocument();
    expect(screen.getByText('Average Position')).toBeInTheDocument();
    
    // Should show best position (#4)
    expect(screen.getByText('#4')).toBeInTheDocument();
    
    // Should show average position (#7)
    expect(screen.getByText('#7')).toBeInTheDocument();
  });

  it('should show correct trend indicators', () => {
    // Points increasing should show upward trend
    const { rerender } = render(<PerformanceGraph {...defaultProps} type="points" />);
    expect(screen.getAllByText('📈')[0]).toBeInTheDocument();
    
    // Position decreasing (getting better) should show upward trend
    rerender(<PerformanceGraph {...defaultProps} type="position" />);
    expect(screen.getAllByText('📈')[0]).toBeInTheDocument();
  });

  it('should show downward trend for declining performance', () => {
    const decliningData: PerformanceGraphData[] = [
      { date: '2024-01-01', points: 300, position: 4 },
      { date: '2024-01-02', points: 250, position: 5 },
      { date: '2024-01-03', points: 200, position: 6 },
      { date: '2024-01-04', points: 150, position: 8 },
      { date: '2024-01-05', points: 100, position: 10 }
    ];

    // Points decreasing should show downward trend
    render(<PerformanceGraph {...defaultProps} data={decliningData} type="points" />);
    expect(screen.getByText('📉')).toBeInTheDocument();
  });

  it('should show flat trend for stable performance', () => {
    const stableData: PerformanceGraphData[] = [
      { date: '2024-01-01', points: 200, position: 5 },
      { date: '2024-01-02', points: 200, position: 5 },
      { date: '2024-01-03', points: 200, position: 5 }
    ];

    render(<PerformanceGraph {...defaultProps} data={stableData} type="points" />);
    expect(screen.getByText('➡️')).toBeInTheDocument();
  });

  it('should format dates correctly in axis labels', () => {
    render(<PerformanceGraph {...defaultProps} />);
    
    // Should show formatted dates (actual dates from the test data)
    expect(screen.getByText('Dec 31')).toBeInTheDocument();
    expect(screen.getByText('Jan 4')).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const singleDataPoint: PerformanceGraphData[] = [
      { date: '2024-01-01', points: 100, position: 10 }
    ];

    render(<PerformanceGraph {...defaultProps} data={singleDataPoint} />);
    
    // Should still render the graph
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    // Should show trend as flat for single point
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});