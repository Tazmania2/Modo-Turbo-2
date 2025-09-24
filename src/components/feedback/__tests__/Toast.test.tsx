import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toast with message', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render success toast with correct styling', () => {
    render(
      <Toast
        id="test-toast"
        message="Success message"
        type="success"
        onClose={vi.fn()}
        data-testid="toast"
      />
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('bg-green-50', 'border-green-200');
  });

  it('should render error toast with correct styling', () => {
    render(
      <Toast
        id="test-toast"
        message="Error message"
        type="error"
        onClose={vi.fn()}
        data-testid="toast"
      />
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('should render warning toast with correct styling', () => {
    render(
      <Toast
        id="test-toast"
        message="Warning message"
        type="warning"
        onClose={vi.fn()}
        data-testid="toast"
      />
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  it('should render info toast with correct styling', () => {
    render(
      <Toast
        id="test-toast"
        message="Info message"
        type="info"
        onClose={vi.fn()}
        data-testid="toast"
      />
    );

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('should render close button and handle close', async () => {
    const mockOnClose = vi.fn();

    render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toBeInTheDocument();

    act(() => {
      closeButton.click();
    });

    // Wait for the exit animation
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnClose).toHaveBeenCalledWith('test-toast');
  });

  it('should auto-close after duration', async () => {
    const mockOnClose = vi.fn();

    render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        onClose={mockOnClose}
        duration={3000}
      />
    );

    expect(mockOnClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Wait for the exit animation
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnClose).toHaveBeenCalledWith('test-toast');
  });

  it('should not auto-close when duration is 0', () => {
    const mockOnClose = vi.fn();

    render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        onClose={mockOnClose}
        duration={0}
      />
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should render with custom title', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        title="Custom Title"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    const mockAction = vi.fn();

    render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        onClose={vi.fn()}
        action={{
          label: 'Undo',
          onClick: mockAction,
        }}
      />
    );

    const actionButton = screen.getByRole('button', { name: 'Undo' });
    expect(actionButton).toBeInTheDocument();

    actionButton.click();
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should pause auto-close on hover', () => {
    const mockOnClose = vi.fn();

    render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        onClose={mockOnClose}
        duration={3000}
        data-testid="toast"
      />
    );

    const toast = screen.getByTestId('toast');

    // Hover over toast
    act(() => {
      toast.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should not close while hovered
    expect(mockOnClose).not.toHaveBeenCalled();

    // Mouse leave
    act(() => {
      toast.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should close after mouse leave
    expect(mockOnClose).toHaveBeenCalledWith('test-toast');
  });

  it('should render appropriate icon for each type', () => {
    const { rerender } = render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('success-icon')).toBeInTheDocument();

    rerender(
      <Toast
        id="test-toast"
        message="Test message"
        type="error"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('error-icon')).toBeInTheDocument();

    rerender(
      <Toast
        id="test-toast"
        message="Test message"
        type="warning"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();

    rerender(
      <Toast
        id="test-toast"
        message="Test message"
        type="info"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });
});