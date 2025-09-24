import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { LoadingShowcase } from '../LoadingShowcase';
import { ToastProvider } from '../../../contexts/ToastContext';

// Mock the useLoadingState hook
vi.mock('../../../hooks/useLoadingState', () => ({
  useLoadingState: () => [
    {
      isLoading: false,
      error: null,
      progress: 0,
      elapsedTime: 0,
      hasTimedOut: false,
    },
    {
      startLoading: vi.fn(),
      stopLoading: vi.fn(),
      setError: vi.fn(),
      setProgress: vi.fn(),
      reset: vi.fn(),
      executeWithLoading: vi.fn().mockResolvedValue({}),
    },
  ],
}));

const renderWithToastProvider = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('LoadingShowcase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the main title and description', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    expect(screen.getByText('Loading States & User Feedback')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive showcase of all loading components and toast notifications')).toBeInTheDocument();
  });

  it('renders all toast notification buttons', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    expect(screen.getByText('Show Success')).toBeInTheDocument();
    expect(screen.getByText('Show Error')).toBeInTheDocument();
    expect(screen.getByText('Show Warning')).toBeInTheDocument();
    expect(screen.getByText('Show Info')).toBeInTheDocument();
  });

  it('renders progress indicators section', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    expect(screen.getByText('Progress Indicators')).toBeInTheDocument();
    expect(screen.getByText('Linear Progress Bar')).toBeInTheDocument();
    expect(screen.getByText('Circular Progress')).toBeInTheDocument();
    expect(screen.getByText('Loading Spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading Pulse')).toBeInTheDocument();
    expect(screen.getByText('Loading Dots')).toBeInTheDocument();
  });

  it('renders data fetching loader section', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    expect(screen.getByText('Data Fetching Loader (5-second max)')).toBeInTheDocument();
    expect(screen.getByText('Simulate Data Fetch')).toBeInTheDocument();
    expect(screen.getByText('Simulate Error')).toBeInTheDocument();
  });

  it('renders skeleton loading states section', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    expect(screen.getByText('Skeleton Loading States')).toBeInTheDocument();
    expect(screen.getByText('Show Skeletons')).toBeInTheDocument();
  });

  it('shows skeleton selector when skeletons are enabled', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    const showSkeletonsButton = screen.getByText('Show Skeletons');
    fireEvent.click(showSkeletonsButton);
    
    expect(screen.getByDisplayValue('Dashboard Skeleton')).toBeInTheDocument();
    expect(screen.getByText('Hide Skeletons')).toBeInTheDocument();
  });

  it('renders loading manager integration section', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    expect(screen.getByText('Loading Manager Integration')).toBeInTheDocument();
    expect(screen.getByText('Content Area')).toBeInTheDocument();
  });

  it('renders performance metrics section', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    expect(screen.getByText('Loading State Metrics')).toBeInTheDocument();
    expect(screen.getByText('Elapsed Time')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Timed Out')).toBeInTheDocument();
  });

  it('simulates progress when button is clicked', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    const simulateButton = screen.getByText('Simulate Progress');
    fireEvent.click(simulateButton);
    
    // Progress should start updating
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    // The progress bars should be visible and updating
    expect(screen.getAllByRole('progressbar')).toHaveLength(2); // Linear and circular
  });

  it('toggles skeleton display correctly', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    const toggleButton = screen.getByText('Show Skeletons');
    
    // Initially no skeleton selector
    expect(screen.queryByDisplayValue('Dashboard Skeleton')).not.toBeInTheDocument();
    
    // Click to show skeletons
    fireEvent.click(toggleButton);
    expect(screen.getByDisplayValue('Dashboard Skeleton')).toBeInTheDocument();
    expect(screen.getByText('Hide Skeletons')).toBeInTheDocument();
    
    // Click to hide skeletons
    fireEvent.click(screen.getByText('Hide Skeletons'));
    expect(screen.queryByDisplayValue('Dashboard Skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Show Skeletons')).toBeInTheDocument();
  });

  it('changes skeleton type when selector is used', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    // Show skeletons first
    fireEvent.click(screen.getByText('Show Skeletons'));
    
    const selector = screen.getByDisplayValue('Dashboard Skeleton');
    
    // Change to ranking skeleton
    fireEvent.change(selector, { target: { value: 'ranking' } });
    expect(screen.getByDisplayValue('Ranking Skeleton')).toBeInTheDocument();
    
    // Change to history skeleton
    fireEvent.change(selector, { target: { value: 'history' } });
    expect(screen.getByDisplayValue('History Skeleton')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6); // 6 main sections
    
    // Check for proper button labels
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveTextContent(/.+/); // Should have some text content
    });
    
    // Check progress bar accessibility
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2); // Linear and circular
    progressBars.forEach(progressBar => {
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuemin');
      expect(progressBar).toHaveAttribute('aria-valuemax');
    });
  });

  it('displays loading state metrics correctly', () => {
    renderWithToastProvider(<LoadingShowcase />);
    
    // Check that metrics are displayed in the metrics section
    expect(screen.getByText('0ms')).toBeInTheDocument(); // Elapsed time
    expect(screen.getByText('Idle')).toBeInTheDocument(); // Status
    expect(screen.getByText('No')).toBeInTheDocument(); // Timed out
    
    // Check that there are multiple 0% displays (progress indicators)
    expect(screen.getAllByText(/0%/)).toHaveLength(3); // Progress bar percentage, circular progress, and metrics
  });
});