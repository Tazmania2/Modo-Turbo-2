import { test, expect } from '@playwright/test';

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state and configuration
    await page.route('/api/config/white-label', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          instanceId: 'test-instance',
          branding: {
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            companyName: 'Test Company',
            logo: '/test-logo.png'
          },
          features: {
            ranking: true,
            dashboards: {
              carteira_i: true,
              carteira_ii: true,
              carteira_iii: false,
              carteira_iv: false
            }
          },
          funifierConfig: {
            isConfigured: true,
            serverUrl: 'https://test.funifier.com'
          }
        }),
      });
    });

    // Mock dashboard data
    await page.route('/api/dashboard/player/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
            unit: 'tasks'
          },
          secondaryGoal1: {
            name: 'Weekly Challenge',
            percentage: 60,
            description: 'Weekly progress',
            emoji: '🏆',
            hasBoost: true,
            isBoostActive: true
          },
          secondaryGoal2: {
            name: 'Monthly Target',
            percentage: 40,
            description: 'Monthly objectives',
            emoji: '📈'
          }
        }),
      });
    });
  });

  test('should display dashboard with player data', async ({ page }) => {
    await page.goto('/dashboard');

    // Check player name and points
    await expect(page.getByText('Test Player')).toBeVisible();
    await expect(page.getByText('1,250')).toBeVisible();

    // Check goals
    await expect(page.getByText('Daily Tasks')).toBeVisible();
    await expect(page.getByText('75%')).toBeVisible();
    await expect(page.getByText('Weekly Challenge')).toBeVisible();
    await expect(page.getByText('60%')).toBeVisible();
    await expect(page.getByText('Monthly Target')).toBeVisible();
    await expect(page.getByText('40%')).toBeVisible();
  });

  test('should show boost indicators when active', async ({ page }) => {
    await page.goto('/dashboard');

    // Should show boost indicator for secondary goal 1
    await expect(page.locator('[data-testid="boost-indicator"]')).toBeVisible();
  });

  test('should display cycle progress', async ({ page }) => {
    await page.goto('/dashboard');

    // Check cycle progress
    await expect(page.getByText('Day 15 of 30')).toBeVisible();
  });

  test('should navigate to ranking when feature is enabled', async ({ page }) => {
    await page.goto('/dashboard');

    // Click ranking navigation
    await page.getByRole('link', { name: 'Ranking' }).click();

    // Should navigate to ranking page
    await expect(page).toHaveURL('/ranking');
  });

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/dashboard/player/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          playerName: 'Test Player',
          totalPoints: 1250,
          pointsLocked: false,
          currentCycleDay: 15,
          totalCycleDays: 30,
          primaryGoal: { name: 'Loading Test', percentage: 0, description: '', emoji: '⏳' },
          secondaryGoal1: { name: 'Loading Test', percentage: 0, description: '', emoji: '⏳' },
          secondaryGoal2: { name: 'Loading Test', percentage: 0, description: '', emoji: '⏳' }
        }),
      });
    });

    await page.goto('/dashboard');

    // Should show loading skeleton
    await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible();

    // Wait for data to load
    await expect(page.getByText('Test Player')).toBeVisible({ timeout: 10000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/dashboard/player/*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Unable to fetch dashboard data'
        }),
      });
    });

    await page.goto('/dashboard');

    // Should show error message
    await expect(page.getByText('Unable to load dashboard data')).toBeVisible();
  });
});