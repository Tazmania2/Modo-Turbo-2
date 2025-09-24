import { vi } from 'vitest';
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock data generators
export const createMockPlayer = (overrides = {}) => ({
  _id: 'player-1',
  name: 'Test Player',
  image: {
    small: { url: '/avatar-small.png', size: 32, width: 32, height: 32, depth: 24 },
    medium: { url: '/avatar-medium.png', size: 64, width: 64, height: 64, depth: 24 },
    original: { url: '/avatar.png', size: 128, width: 128, height: 128, depth: 24 },
  },
  total_challenges: 10,
  challenges: { daily: 5, weekly: 3, monthly: 2 },
  total_points: 1250,
  point_categories: { engagement: 500, achievement: 750 },
  total_catalog_items: 5,
  catalog_items: { badges: 3, rewards: 2 },
  level_progress: {
    percent_completed: 75,
    next_points: 250,
    total_levels: 10,
    percent: 75,
  },
  challenge_progress: [],
  teams: ['team-1'],
  positions: [],
  time: Date.now(),
  extra: {},
  pointCategories: { engagement: 500, achievement: 750 },
  ...overrides,
});

export const createMockDashboardData = (overrides = {}) => ({
  playerName: 'Test Player',
  totalPoints: 1250,
  pointsLocked: false,
  currentCycleDay: 15,
  totalCycleDays: 30,
  primaryGoal: {
    name: 'Daily Tasks',
    percentage: 75,
    description: 'Complete daily objectives',
    emoji: '🎯',
    target: 10,
    current: 7,
    unit: 'tasks',
  },
  secondaryGoal1: {
    name: 'Weekly Challenge',
    percentage: 60,
    description: 'Weekly progress',
    emoji: '🏆',
    hasBoost: true,
    isBoostActive: true,
  },
  secondaryGoal2: {
    name: 'Monthly Target',
    percentage: 40,
    description: 'Monthly objectives',
    emoji: '📈',
  },
  ...overrides,
});

export const createMockRankingData = (overrides = {}) => ({
  raceData: {
    totalDistance: 1000,
    players: [
      { playerId: 'player-1', position: 1, distance: 900, name: 'Leader', avatar: '/avatar1.png' },
      { playerId: 'player-2', position: 2, distance: 800, name: 'Second', avatar: '/avatar2.png' },
      { playerId: 'player-3', position: 3, distance: 700, name: 'Third', avatar: '/avatar3.png' },
    ],
  },
  personalCard: {
    playerId: 'current-player',
    playerName: 'Current Player',
    totalPoints: 1200,
    position: 5,
    previousPosition: 6,
    avatar: '/avatar.png',
  },
  topThree: [
    { playerId: 'player-1', name: 'Leader', points: 1800, avatar: '/avatar1.png' },
    { playerId: 'player-2', name: 'Second', points: 1600, avatar: '/avatar2.png' },
    { playerId: 'player-3', name: 'Third', points: 1400, avatar: '/avatar3.png' },
  ],
  contextualRanking: {
    above: { playerId: 'player-4', name: 'Above Player', points: 1300, position: 4 },
    current: { playerId: 'current-player', name: 'Current Player', points: 1200, position: 5 },
    below: { playerId: 'player-6', name: 'Below Player', points: 1100, position: 6 },
  },
  ...overrides,
});

export const createMockWhiteLabelConfig = (overrides = {}) => ({
  instanceId: 'test-instance',
  branding: {
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#60A5FA',
    logo: '/test-logo.png',
    favicon: '/test-favicon.ico',
    companyName: 'Test Company',
    tagline: 'Test Tagline',
  },
  features: {
    ranking: true,
    dashboards: {
      carteira_i: true,
      carteira_ii: true,
      carteira_iii: false,
      carteira_iv: false,
    },
    history: true,
    personalizedRanking: true,
  },
  funifierIntegration: {
    apiKey: 'test-api-key',
    serverUrl: 'https://test.funifier.com',
    authToken: 'test-auth-token',
    customCollections: ['whitelabel__c'],
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

// Test providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock implementations
export const createMockFetch = (responses: Record<string, any> = {}) => {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const response = responses[url] || { status: 404, data: { error: 'Not found' } };
    
    return Promise.resolve({
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: () => Promise.resolve(response.data),
      text: () => Promise.resolve(JSON.stringify(response.data)),
    });
  });
};

export const createMockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

export const createMockRouter = (overrides = {}) => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  ...overrides,
});

// Test utilities
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved } = await import('@testing-library/react');
  
  try {
    await waitForElementToBeRemoved(
      () => document.querySelector('[data-testid*="loading"], [data-testid*="skeleton"]'),
      { timeout: 5000 }
    );
  } catch {
    // Loading element might not exist, which is fine
  }
};

export const mockConsoleError = () => {
  const originalError = console.error;
  const mockError = vi.fn();
  
  beforeEach(() => {
    console.error = mockError;
  });
  
  afterEach(() => {
    console.error = originalError;
    mockError.mockClear();
  });
  
  return mockError;
};

// Async test helpers
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

export const advanceTimersAndFlush = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await flushPromises();
};

// Error simulation
export const createNetworkError = () => new Error('Network request failed');
export const createTimeoutError = () => new Error('Request timeout');
export const createAuthError = () => new Error('Authentication failed');

// Mock service responses
export const mockSuccessResponse = <T>(data: T) => ({
  success: true,
  data,
  error: null,
});

export const mockErrorResponse = (message: string, code?: string) => ({
  success: false,
  data: null,
  error: {
    message,
    code,
    timestamp: new Date().toISOString(),
  },
});

// Component test helpers
export const getByTestId = (testId: string) => 
  document.querySelector(`[data-testid="${testId}"]`);

export const getAllByTestId = (testId: string) => 
  Array.from(document.querySelectorAll(`[data-testid="${testId}"]`));

// Form test helpers
export const fillForm = async (fields: Record<string, string>) => {
  const { screen } = await import('@testing-library/react');
  const userEvent = (await import('@testing-library/user-event')).default;
  
  for (const [name, value] of Object.entries(fields)) {
    const field = screen.getByRole('textbox', { name: new RegExp(name, 'i') });
    await userEvent.clear(field);
    await userEvent.type(field, value);
  }
};

export const submitForm = async (buttonText = 'Submit') => {
  const { screen } = await import('@testing-library/react');
  const userEvent = (await import('@testing-library/user-event')).default;
  
  const submitButton = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await userEvent.click(submitButton);
};

// API test helpers
export const mockApiCall = (endpoint: string, response: any, status = 200) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  });
};

export const mockApiError = (endpoint: string, status = 500, message = 'Internal Server Error') => {
  global.fetch = vi.fn().mockRejectedValue(new Error(message));
};