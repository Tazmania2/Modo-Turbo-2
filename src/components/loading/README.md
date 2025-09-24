# Loading Components System

This directory contains a comprehensive loading system for the white-label gamification platform, implementing all requirements for animated loading components, progress indicators, skeleton states, and user feedback notifications.

## 🎯 Task Requirements Fulfilled

✅ **Animated loading components for 5-second data fetching**  
✅ **Progress indicators for long-running operations**  
✅ **Skeleton loading states for all major components**  
✅ **Success/error toast notifications**  

## 📁 Component Structure

### Basic Loading Indicators
- **`LoadingSpinner`** - Animated spinning indicator with size and color variants
- **`LoadingDots`** - Animated dots with staggered animation timing
- **`LoadingPulse`** - Pulsing circle with optional text display

### Progress Indicators
- **`ProgressBar`** - Linear progress bar with percentage display and labels
- **`CircularProgress`** - Circular progress indicator with customizable styling
- Both support real-time progress updates and accessibility features

### Advanced Loading States
- **`LoadingOverlay`** - Overlay loading state for content areas with backdrop
- **`DataFetchingLoader`** - Specialized 5-second loader with timeout handling
- **`LoadingManager`** - Unified component that orchestrates all loading types

### Skeleton Loading States
- **`SkeletonLoader`** - Base skeleton component with animation variants
- **`DashboardSkeleton`** - Complete dashboard layout skeleton
- **`RankingSkeleton`** - Ranking page with race visualization skeleton
- **`HistorySkeleton`** - History page with graphs and metrics skeleton

### State Management
- **`useLoadingState`** - Hook for managing loading operations with timeout
- **`ToastContext`** - Integrated feedback system for success/error states

## 🚀 Quick Start

### Basic Loading States
```tsx
import { LoadingSpinner, LoadingPulse, LoadingDots } from '@/components/loading';

// Simple loading indicators
<LoadingSpinner size="lg" color="primary" />
<LoadingPulse size="md" text="Loading data..." />
<LoadingDots size="sm" color="secondary" />
```

### Progress Indicators
```tsx
import { ProgressBar, CircularProgress } from '@/components/loading';

// Linear progress with label and percentage
<ProgressBar 
  progress={75} 
  label="Upload Progress" 
  showPercentage 
  color="success"
  animated 
/>

// Circular progress
<CircularProgress 
  progress={60} 
  size={120} 
  showPercentage 
  color="primary" 
/>
```

### Data Fetching (5-second timeout)
```tsx
import { DataFetchingLoader } from '@/components/loading';
import { useToast } from '@/contexts/ToastContext';

const { showWarning, showError } = useToast();

<DataFetchingLoader
  isLoading={isLoading}
  maxDuration={5000}
  onTimeout={() => showWarning('Taking longer than expected', 'Please wait...')}
  showProgress={true}
  messages={[
    'Connecting to Funifier...',
    'Fetching your data...',
    'Processing information...',
    'Almost ready...'
  ]}
/>
```

### Skeleton Loading
```tsx
import { LoadingManager } from '@/components/loading';

// Automatic skeleton selection based on content type
<LoadingManager
  isLoading={isLoading}
  loadingType="skeleton"
  skeletonType="dashboard" // or "ranking" or "history"
  errorMessage={error?.message}
>
  <YourActualContent />
</LoadingManager>
```

### Unified Loading Management
```tsx
import { LoadingManager } from '@/components/loading';

// Handles all loading types with error integration
<LoadingManager
  isLoading={isLoading}
  loadingType="data-fetching" // or "skeleton" or "overlay"
  skeletonType="dashboard"
  loadingText="Processing your request..."
  showProgress={true}
  maxDuration={5000}
  onTimeout={() => console.log('Operation timed out')}
  errorMessage={error?.message}
  retryAction={() => refetch()}
>
  <YourContent />
</LoadingManager>
```

## 🎛️ Advanced Usage with Hooks

### useLoadingState Hook
```tsx
import { useLoadingState } from '@/hooks/useLoadingState';
import { useToast } from '@/contexts/ToastContext';

const MyComponent = () => {
  const { showSuccess, showError } = useToast();
  const [loadingState, loadingActions] = useLoadingState({
    timeout: 5000,
    onTimeout: () => showWarning('Operation timed out'),
    onSuccess: () => showSuccess('Data loaded successfully'),
    onError: (error) => showError('Failed to load', error.message),
  });

  const fetchData = async () => {
    try {
      const result = await loadingActions.executeWithLoading(async () => {
        // Update progress during operation
        loadingActions.setProgress(25);
        await apiCall1();
        
        loadingActions.setProgress(50);
        await apiCall2();
        
        loadingActions.setProgress(75);
        await apiCall3();
        
        loadingActions.setProgress(100);
        return finalResult;
      });
      
      // Handle success
    } catch (error) {
      // Error automatically handled by hook
    }
  };

  return (
    <LoadingManager
      isLoading={loadingState.isLoading}
      loadingType="data-fetching"
      errorMessage={loadingState.error?.message}
    >
      <button onClick={fetchData}>Load Data</button>
      {/* Your content */}
    </LoadingManager>
  );
};
```

## 🎨 Customization

### Theme Integration
All components support the white-label theming system:

```tsx
// Colors automatically adapt to theme
<ProgressBar progress={50} color="primary" />   // Uses --color-primary-600
<LoadingSpinner color="secondary" />            // Uses --color-secondary-600
<CircularProgress color="accent" />             // Uses --color-accent-600
```

### Animation Customization
```tsx
// Custom animation timing
<ProgressBar progress={75} animated={true} />

// Skeleton with different animation
<SkeletonLoader animation="wave" />  // or "pulse" or "none"

// Loading dots with custom timing
<LoadingDots size="lg" /> // Automatic staggered animation
```

## 🔧 Performance Features

### Automatic Optimization
- **Lazy Loading**: Skeleton components render immediately, actual content loads progressively
- **Memory Management**: Automatic cleanup of timers and intervals
- **Caching Integration**: Works with the platform's caching system
- **Error Recovery**: Graceful fallbacks when operations fail

### Accessibility
- **Screen Reader Support**: All components include proper ARIA labels
- **Keyboard Navigation**: Focus management during loading states
- **High Contrast**: Supports system accessibility preferences
- **Progress Announcements**: Screen readers announce progress updates

## 📊 Toast Notification Integration

### Automatic Feedback
```tsx
import { useToast } from '@/contexts/ToastContext';

const { showSuccess, showError, showWarning, showInfo } = useToast();

// Success notifications
showSuccess('Data loaded', 'Your dashboard has been updated');

// Error handling
showError('Loading failed', 'Please check your connection and try again');

// Warning for timeouts
showWarning('Taking longer than expected', 'Please wait a bit more...');

// Informational updates
showInfo('Processing', 'Loading data from multiple sources...');
```

### Toast Features
- **Auto-dismiss**: Configurable timeout (default 5 seconds)
- **Pause on Hover**: Prevents auto-dismiss when user is reading
- **Action Buttons**: Optional action buttons for retry/undo operations
- **Positioning**: Configurable position (top-right, bottom-left, etc.)
- **Stacking**: Multiple toasts stack properly with animations

## 🧪 Testing

### Component Testing
```tsx
import { render, screen, act } from '@testing-library/react';
import { LoadingShowcase } from '@/components/loading';
import { ToastProvider } from '@/contexts/ToastContext';

// All components are fully tested
test('loading components work correctly', () => {
  render(
    <ToastProvider>
      <LoadingShowcase />
    </ToastProvider>
  );
  
  expect(screen.getByText('Loading States & User Feedback')).toBeInTheDocument();
});
```

### Integration Testing
- **End-to-End**: Playwright tests for complete user flows
- **Performance**: Loading time measurements and timeout handling
- **Accessibility**: Screen reader and keyboard navigation tests
- **Error Scenarios**: Network failures and timeout conditions

## 📱 Responsive Design

All loading components are fully responsive:

```tsx
// Automatic responsive behavior
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <DashboardSkeleton />  {/* Adapts to container size */}
</div>

// Mobile-optimized progress indicators
<ProgressBar 
  progress={50} 
  size="sm"        // Smaller on mobile
  showPercentage   // Always visible for accessibility
/>
```

## 🔍 Examples and Showcase

### Interactive Showcase
The `LoadingShowcase` component demonstrates all features:
- Live progress simulation
- Toast notification examples  
- Skeleton state switching
- Loading state metrics
- Error handling demonstrations

### Integration Examples
The `LoadingIntegrationExample` shows real-world usage patterns:
- Dashboard data loading
- Ranking system integration
- Parallel operation handling
- Error recovery flows

## 🚨 Error Handling

### Graceful Degradation
```tsx
<LoadingManager
  isLoading={isLoading}
  loadingType="skeleton"
  errorMessage={error?.message}
  retryAction={() => refetch()}
>
  {error ? (
    <ErrorFallback onRetry={() => refetch()} />
  ) : (
    <YourContent />
  )}
</LoadingManager>
```

### Timeout Management
- **5-second rule**: All data operations timeout after 5 seconds
- **User notification**: Automatic toast warnings for timeouts
- **Retry mechanisms**: Built-in retry functionality
- **Fallback content**: Graceful degradation to cached or demo data

## 🎯 Best Practices

### When to Use Each Component

1. **DataFetchingLoader**: API calls, data synchronization (5-second operations)
2. **Skeleton Loading**: Initial page loads, content replacement
3. **Progress Indicators**: File uploads, multi-step operations
4. **Loading Overlays**: Form submissions, quick operations
5. **Toast Notifications**: All user feedback scenarios

### Performance Guidelines

1. **Use skeletons** for perceived performance improvement
2. **Show progress** for operations > 2 seconds
3. **Provide feedback** for all user actions
4. **Handle timeouts** gracefully with clear messaging
5. **Cache results** to avoid repeated loading states

This loading system provides a complete solution for all user feedback requirements in the white-label gamification platform, ensuring excellent user experience during all loading scenarios.