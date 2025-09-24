import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorDisplay } from '../ErrorDisplay';
import { ErrorType } from '@/types/error';

describe('ErrorDisplay', () => {
  it('should render basic error message', () => {
    const error = new Error('Test error message');

    render(<ErrorDisplay error={error} />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render error with custom title', () => {
    const error = new Error('Test error');

    render(<ErrorDisplay error={error} title="Custom Error Title" />);

    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const error = new Error('Test error');
    const mockRetry = vi.fn();

    render(<ErrorDisplay error={error} onRetry={mockRetry} />);

    const retryButton = screen.getByRole('button', { name: 'Try Again' });
    expect(retryButton).toBeInTheDocument();

    retryButton.click();
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render retry button when onRetry is not provided', () => {
    const error = new Error('Test error');

    render(<ErrorDisplay error={error} />);

    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
  });

  it('should render different styles for different error types', () => {
    const error = new Error('Network error');

    render(
      <ErrorDisplay 
        error={error} 
        type={ErrorType.NETWORK_ERROR}
        data-testid="error-display"
      />
    );

    const errorDisplay = screen.getByTestId('error-display');
    expect(errorDisplay).toHaveClass('border-red-200'); // Network errors should have red styling
  });

  it('should render warning style for authentication errors', () => {
    const error = new Error('Authentication failed');

    render(
      <ErrorDisplay 
        error={error} 
        type={ErrorType.AUTHENTICATION_ERROR}
        data-testid="error-display"
      />
    );

    const errorDisplay = screen.getByTestId('error-display');
    expect(errorDisplay).toHaveClass('border-yellow-200'); // Auth errors should have yellow styling
  });

  it('should render error details when showDetails is true', () => {
    const error = new Error('Test error');
    error.stack = 'Error stack trace...';

    render(<ErrorDisplay error={error} showDetails={true} />);

    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText('Error stack trace...')).toBeInTheDocument();
  });

  it('should not render error details by default', () => {
    const error = new Error('Test error');
    error.stack = 'Error stack trace...';

    render(<ErrorDisplay error={error} />);

    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    expect(screen.queryByText('Error stack trace...')).not.toBeInTheDocument();
  });

  it('should render custom action button', () => {
    const error = new Error('Test error');
    const mockAction = vi.fn();

    render(
      <ErrorDisplay 
        error={error} 
        actionLabel="Custom Action"
        onAction={mockAction}
      />
    );

    const actionButton = screen.getByRole('button', { name: 'Custom Action' });
    expect(actionButton).toBeInTheDocument();

    actionButton.click();
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should render both retry and custom action buttons', () => {
    const error = new Error('Test error');
    const mockRetry = vi.fn();
    const mockAction = vi.fn();

    render(
      <ErrorDisplay 
        error={error} 
        onRetry={mockRetry}
        actionLabel="Custom Action"
        onAction={mockAction}
      />
    );

    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
  });

  it('should handle null or undefined error gracefully', () => {
    render(<ErrorDisplay error={null as any} />);

    expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
  });

  it('should render error icon', () => {
    const error = new Error('Test error');

    render(<ErrorDisplay error={error} />);

    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });
});