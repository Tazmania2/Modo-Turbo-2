import { test, expect } from '@playwright/test';

test.describe('Ranking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock configuration with ranking enabled
    await page.route('/api/config/white-label', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          instanceId: 'test-instance',
          features: {
            ranking: true,
            personalizedRanking: true
          }
        }),
      });
    });

    // Mock ranking data
    await page.route('/api/ranking/leaderboards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leaderboards: [
            {
              _id: 'leaderboard-1',
              name: 'Overall Ranking',
              description: 'Global player ranking'
            }
          ]
        }),
      });
    });

    // Mock personal ranking data
    await page.route('/api/ranking/*/personal/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          raceData: {
            totalDistance: 1000,
            players: [
              { playerId: 'player-1', position: 1, distance: 900, name: 'Leader', avatar: '/avatar1.png' },
              { playerId: 'player-2', position: 2, distance: 800, name: 'Second', avatar: '/avatar2.png' },
              { playerId: 'current-player', position: 5, distance: 600, name: 'Current Player', avatar: '/avatar3.png' }
            ]
          },
          personalCard: {
            playerId: 'current-player',
            playerName: 'Current Player',
            totalPoints: 1200,
            position: 5,
            previousPosition: 6,
            avatar: '/avatar3.png'
          },
          topThree: [
            { playerId: 'player-1', name: 'Leader', points: 1800, avatar: '/avatar1.png' },
            { playerId: 'player-2', name: 'Second', points: 1600, avatar: '/avatar2.png' },
            { playerId: 'player-3', name: 'Third', points: 1400, avatar: '/avatar3.png' }
          ],
          contextualRanking: {
            above: { playerId: 'player-4', name: 'Above Player', points: 1300, position: 4 },
            current: { playerId: 'current-player', name: 'Current Player', points: 1200, position: 5 },
            below: { playerId: 'player-6', name: 'Below Player', points: 1100, position: 6 }
          }
        }),
      });
    });

    // Mock global ranking data
    await page.route('/api/ranking/*/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          raceData: {
            totalDistance: 1000,
            players: [
              { playerId: 'player-1', position: 1, distance: 900, name: 'Leader', avatar: '/avatar1.png' },
              { playerId: 'player-2', position: 2, distance: 800, name: 'Second', avatar: '/avatar2.png' },
              { playerId: 'player-3', position: 3, distance: 700, name: 'Third', avatar: '/avatar3.png' }
            ]
          },
          fullRanking: [
            { playerId: 'player-1', name: 'Leader', points: 1800, position: 1, avatar: '/avatar1.png' },
            { playerId: 'player-2', name: 'Second', points: 1600, position: 2, avatar: '/avatar2.png' },
            { playerId: 'player-3', name: 'Third', points: 1400, position: 3, avatar: '/avatar3.png' }
          ]
        }),
      });
    });
  });

  test('should display race visualization', async ({ page }) => {
    await page.goto('/ranking');

    // Should show race track
    await expect(page.locator('[data-testid="race-visualization"]')).toBeVisible();

    // Should show player positions on track
    await expect(page.getByText('Leader')).toBeVisible();
    await expect(page.getByText('Second')).toBeVisible();
  });

  test('should display personal ranking card', async ({ page }) => {
    await page.goto('/ranking');

    // Should show personal card
    await expect(page.getByText('Current Player')).toBeVisible();
    await expect(page.getByText('Position: 5')).toBeVisible();
    await expect(page.getByText('1,200 points')).toBeVisible();
  });

  test('should display top three players', async ({ page }) => {
    await page.goto('/ranking');

    // Should show podium
    await expect(page.locator('[data-testid="top-three"]')).toBeVisible();
    await expect(page.getByText('1,800')).toBeVisible(); // Leader points
    await expect(page.getByText('1,600')).toBeVisible(); // Second points
    await expect(page.getByText('1,400')).toBeVisible(); // Third points
  });

  test('should display contextual ranking', async ({ page }) => {
    await page.goto('/ranking');

    // Should show contextual ranking
    await expect(page.getByText('Above Player')).toBeVisible();
    await expect(page.getByText('Below Player')).toBeVisible();
    
    // Current player should be highlighted
    await expect(page.locator('[data-testid="current-player-highlight"]')).toBeVisible();
  });

  test('should switch between personal and global views', async ({ page }) => {
    await page.goto('/ranking');

    // Should start in personal view
    await expect(page.getByText('Personal Ranking')).toBeVisible();

    // Switch to global view
    await page.getByRole('button', { name: 'Global View' }).click();

    // Should show global ranking
    await expect(page.getByText('Global Ranking')).toBeVisible();
    
    // Should show full ranking list
    await expect(page.locator('[data-testid="full-ranking-list"]')).toBeVisible();
  });

  test('should handle ranking navigation', async ({ page }) => {
    await page.goto('/ranking');

    // Should have navigation back to dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Navigate back to ranking
    await page.getByRole('link', { name: 'Ranking' }).click();
    await expect(page).toHaveURL('/ranking');
  });

  test('should show loading states for ranking data', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/ranking/*/personal/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          raceData: { totalDistance: 1000, players: [] },
          personalCard: { playerId: 'test', playerName: 'Test', totalPoints: 0, position: 1 },
          topThree: [],
          contextualRanking: { current: { playerId: 'test', name: 'Test', points: 0, position: 1 } }
        }),
      });
    });

    await page.goto('/ranking');

    // Should show loading skeleton
    await expect(page.locator('[data-testid="ranking-skeleton"]')).toBeVisible();
  });

  test('should handle ranking errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/ranking/*/personal/*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Unable to fetch ranking data'
        }),
      });
    });

    await page.goto('/ranking');

    // Should show error message
    await expect(page.getByText('Unable to load ranking data')).toBeVisible();
  });
});