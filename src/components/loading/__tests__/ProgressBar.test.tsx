import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with default props', () => {
    render(<ProgressBar progress={50} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays correct progress width', () => {
    render(<ProgressBar progress={75} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('clamps progress values', () => {
    const { rerender } = render(<ProgressBar progress={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    rerender(<ProgressBar progress={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows percentage when enabled', () => {
    render(<ProgressBar progress={42} showPercentage />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    render(<ProgressBar progress={60} label="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<ProgressBar progress={50} size="sm" />);
    expect(screen.getByRole('progressbar').parentElement).toHaveClass('h-1');

    rerender(<ProgressBar progress={50} size="lg" />);
    expect(screen.getByRole('progressbar').parentElement).toHaveClass('h-3');
  });

  it('applies correct color classes', () => {
    const { rerender } = render(<ProgressBar progress={50} color="success" />);
    expect(screen.getByRole('progressbar')).toHaveClass('bg-green-600');

    rerender(<ProgressBar progress={50} color="error" />);
    expect(screen.getByRole('progressbar')).toHaveClass('bg-red-600');
  });

  it('has proper accessibility attributes with label', () => {
    render(<ProgressBar progress={30} label="Upload progress" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Upload progress');
  });
});