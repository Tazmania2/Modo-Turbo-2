/**
 * Full System Integration Test
 * 
 * This test validates the complete integration of all platform components:
 * - Initial setup flow
 * - Authentication system
 * - Dashboard functionality
 * - Ranking system
 * - Admin panel
 * - White-label customization
 * - Feature toggles
 * - Error handling and fallbacks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Import all major components
import Home from '@/app/page';
import SetupPage from '@/app/setup/page';
import DashboardPage from '@/app/dashboard/page';
import RankingPage from '@/app/ranking/page';
import AdminPage from '@/app/admin/page';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { FeatureGateProvider } from '@/components/feature-gates/FeatureGateProvider';

// Mock data
const mockWhiteLabelConfig = {
  _id: 'test-config',
  instanceId: 'test-instance',
  branding: {
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#F59E0B',
    logo: '/logo.png',
    favicon: '/favicon.ico',
    companyName: 'Test Company',
    tagline: 'Test Tagline'
  },
  features: {
    ranking: true,
    dashboards: {
      carteira_i: true,
      carteira_ii: true,
      carteira_iii: false,
      carteira_iv: false
    },
    history: true,
    personalizedRanking: true
  },
  funifierIntegration: {
    apiKey: 'test-key',
    serverUrl: 'https://test.funifier.com',
    authToken: 'test-token',
    customCollections: ['whitelabel__c']
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
};

const mockPlayerData = {
  _id: 'player-123',
  name: 'Test Player',
  image: {
    small: { url: '/avatar-small.jpg', size: 50, width: 50, height: 50, depth: 24 },
    medium: { url: '/avatar-medium.jpg', size: 100, width: 100, height: 100, depth: 24 },
    original: { url: '/avatar.jpg', size: 200, width: 200, height: 200, depth: 24 }
  },
  total_challenges: 5,
  challenges: { daily: 3, weekly: 2 },
  total_points: 1250,
  point_categories: { engagement: 500, performance: 750 },
  total_catalog_items: 10,
  catalog_items: { badges: 5, rewards: 5 },
  level_progress: {
    percent_completed: 75,
    next_points: 250,
    total_levels: 10,
    percent: 0.75
  },
  challenge_progress: [],
  teams: ['team-1'],
  positions: [],
  time: Date.now(),
  extra: {},
  pointCategories: { engagement: 500, performance: 750 }
};

const mockLeaderboardData = {
  leaderboards: [
    {
      _id: 'leaderboard-1',
      name: 'Main Leaderboard',
      leaders: [
        { playerId: 'player-123', playerName: 'Test Player', points: 1250, position: 1 },
        { playerId: 'player-456', playerName: 'Other Player', points: 1100, position: 2 }
      ]
    }
  ]
};

// MSW server setup
const server = setupServer(
  // Setup endpoints
  http.get('/api/setup', () => {
    return HttpResponse.json({ needsSetup: false, isConfigured: true });
  }),

  http.post('/api/setup', () => {
    return HttpResponse.json({ success: true, redirectTo: '/dashboard' });
  }),

  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      access_token: 'test-token',
      token_type: 'Bearer',
      expires_in: 3600,
      user: mockPlayerData
    });
  }),

  http.get('/api/auth/verify-admin', () => {
    return HttpResponse.json({
      isAdmin: true,
      roles: ['admin'],
      playerData: mockPlayerData
    });
  }),

  // Config endpoints
  http.get('/api/config/white-label', () => {
    return HttpResponse.json(mockWhiteLabelConfig);
  }),

  http.post('/api/config/white-label', () => {
    return HttpResponse.json({ success: true });
  }),

  // Dashboard endpoints
  http.get('/api/dashboard/player/:playerId', () => {
    return HttpResponse.json({
      playerName: 'Test Player',
      totalPoints: 1250,
      pointsLocked: false,
      currentCycleDay: 15,
      totalCycleDays: 30,
      primaryGoal: {
        name: 'Daily Engagement',
        percentage: 75,
        description: 'Complete daily tasks',
        emoji: '🎯',
        target: 100,
        current: 75,
        unit: 'points'
      },
      secondaryGoal1: {
        name: 'Weekly Challenge',
        percentage: 50,
        description: 'Weekly performance goal',
        emoji: '🏆',
        target: 200,
        current: 100,
        unit: 'points'
      },
      secondaryGoal2: {
        name: 'Team Collaboration',
        percentage: 90,
        description: 'Team participation',
        emoji: '🤝',
        target: 10,
        current: 9,
        unit: 'activities'
      }
    });
  }),

  // Ranking endpoints
  http.get('/api/ranking/leaderboards', () => {
    return HttpResponse.json(mockLeaderboardData);
  }),

  http.get('/api/ranking/:leaderboardId/personal/:playerId', () => {
    return HttpResponse.json({
      raceData: {
        totalDistance: 1000,
        players: [
          { playerId: 'player-123', position: 1, distance: 750 },
          { playerId: 'player-456', position: 2, distance: 650 }
        ]
      },
      personalCard: {
        playerId: 'player-123',
        playerName: 'Test Player',
        avatar: '/avatar.jpg',
        totalPoints: 1250,
        position: 1,
        pointsGainedToday: 50
      },
      topThree: [
        { playerId: 'player-123', playerName: 'Test Player', points: 1250, position: 1 }
      ],
      contextualRanking: {
        above: null,
        current: { playerId: 'player-123', playerName: 'Test Player', points: 1250, position: 1 },
        below: { playerId: 'player-456', playerName: 'Other Player', points: 1100, position: 2 }
      }
    });
  }),

  // Admin endpoints
  http.get('/api/admin/features', () => {
    return HttpResponse.json(mockWhiteLabelConfig.features);
  }),

  http.post('/api/admin/features/:feature', () => {
    return HttpResponse.json({ success: true });
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'healthy', timestamp: Date.now() });
  })
);

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ThemeProvider>
            <FeatureGateProvider>
              {children}
            </FeatureGateProvider>
          </ThemeProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Full System Integration', () => {
  beforeEach(() => {
    server.listen();
    // Mock router
    vi.mock('next/navigation', () => ({
      useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn()
      }),
      useSearchParams: () => ({
        get: vi.fn().mockReturnValue(null)
      }),
      usePathname: () => '/dashboard'
    }));
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  describe('Complete User Flow: Setup to Daily Usage', () => {
    it('should handle complete setup flow', async () => {
      const user = userEvent.setup();

      // Start with home page
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByText('Loading Platform')).toBeInTheDocument();

      // Wait for redirect logic to complete
      await waitFor(() => {
        expect(screen.getByText('Redirecting...')).toBeInTheDocument();
      });
    });

    it('should handle dashboard navigation and data display', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Test Player')).toBeInTheDocument();
      });

      // Check goals are displayed
      expect(screen.getByText('Daily Engagement')).toBeInTheDocument();
      expect(screen.getByText('Weekly Challenge')).toBeInTheDocument();
      expect(screen.getByText('Team Collaboration')).toBeInTheDocument();

      // Check points display
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });

    it('should handle ranking system integration', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RankingPage />
        </TestWrapper>
      );

      // Wait for ranking data to load
      await waitFor(() => {
        expect(screen.getByText('Test Player')).toBeInTheDocument();
      });

      // Check personal ranking card
      expect(screen.getByText('Position: 1')).toBeInTheDocument();
      expect(screen.getByText('1,250 points')).toBeInTheDocument();
    });

    it('should handle admin panel functionality', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminPage />
        </TestWrapper>
      );

      // Wait for admin panel to load
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Check feature toggles are present
      expect(screen.getByText('Feature Management')).toBeInTheDocument();
      expect(screen.getByText('Branding Configuration')).toBeInTheDocument();
    });
  });

  describe('White-Label Customization Validation', () => {
    it('should apply custom branding correctly', async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Wait for theme to be applied
      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--color-primary')).toBe('#3B82F6');
      });
    });

    it('should respect feature toggles', async () => {
      // Mock disabled ranking feature
      server.use(
        http.get('/api/admin/features', () => {
          return HttpResponse.json({
            ...mockWhiteLabelConfig.features,
            ranking: false
          });
        })
      );

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Ranking navigation should not be present
      await waitFor(() => {
        expect(screen.queryByText('Rankings')).not.toBeInTheDocument();
      });
    });

    it('should handle branding updates in real-time', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminPage />
        </TestWrapper>
      );

      // Wait for admin panel
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Find and update primary color
      const colorInput = screen.getByLabelText('Primary Color');
      await user.clear(colorInput);
      await user.type(colorInput, '#FF0000');

      // Submit changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Verify theme update
      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--color-primary')).toBe('#FF0000');
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      server.use(
        http.get('/api/dashboard/player/:playerId', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should fallback to demo mode when Funifier is unavailable', async () => {
      // Mock Funifier unavailable
      server.use(
        http.get('/api/config/white-label', () => {
          return HttpResponse.json({
            ...mockWhiteLabelConfig,
            funifierIntegration: {
              ...mockWhiteLabelConfig.funifierIntegration,
              apiKey: '',
              serverUrl: ''
            }
          });
        })
      );

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Should show demo mode indicator
      await waitFor(() => {
        expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
      });
    });

    it('should handle network connectivity issues', async () => {
      // Mock network error
      server.use(
        http.get('/api/dashboard/player/:playerId', () => {
          throw new Error('Network error');
        })
      );

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Should show network error message
      await waitFor(() => {
        expect(screen.getByText(/network/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states during data fetching', async () => {
      // Add delay to API response
      server.use(
        http.get('/api/dashboard/player/:playerId', async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return HttpResponse.json({
            playerName: 'Test Player',
            totalPoints: 1250
          });
        })
      );

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Should show loading skeleton
      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test Player')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Loading skeleton should be gone
      expect(screen.queryByTestId('dashboard-skeleton')).not.toBeInTheDocument();
    });

    it('should handle concurrent data loading efficiently', async () => {
      const startTime = Date.now();

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Wait for all data to load
      await waitFor(() => {
        expect(screen.getByText('Test Player')).toBeInTheDocument();
        expect(screen.getByText('Daily Engagement')).toBeInTheDocument();
      });

      const loadTime = Date.now() - startTime;
      
      // Should load within performance target (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });
  });

  describe('Security and Access Control', () => {
    it('should enforce authentication requirements', async () => {
      // Mock unauthenticated state
      server.use(
        http.post('/api/auth/login', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      render(
        <TestWrapper>
          <AdminPage />
        </TestWrapper>
      );

      // Should show login requirement
      await waitFor(() => {
        expect(screen.getByText(/log in/i)).toBeInTheDocument();
      });
    });

    it('should enforce admin role requirements', async () => {
      // Mock non-admin user
      server.use(
        http.get('/api/auth/verify-admin', () => {
          return HttpResponse.json({
            isAdmin: false,
            roles: ['user'],
            playerData: mockPlayerData
          });
        })
      );

      render(
        <TestWrapper>
          <AdminPage />
        </TestWrapper>
      );

      // Should show admin requirement
      await waitFor(() => {
        expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
      });
    });
  });
});