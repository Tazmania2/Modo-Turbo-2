import { test, expect } from '@playwright/test';

test.describe('Initial Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the setup state to be uninitialized
    await page.route('/api/config/white-label', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Configuration not found' }),
      });
    });
  });

  test('should display setup mode selection on first visit', async ({ page }) => {
    await page.goto('/');

    // Should redirect to setup page
    await expect(page).toHaveURL('/setup');

    // Should show setup mode selection
    await expect(page.getByText('Welcome to White-Label Gamification')).toBeVisible();
    await expect(page.getByText('Demo Mode')).toBeVisible();
    await expect(page.getByText('Set up Funifier')).toBeVisible();
  });

  test('should allow demo mode setup', async ({ page }) => {
    // Mock demo mode setup API
    await page.route('/api/setup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          mode: 'demo',
          redirectTo: '/dashboard'
        }),
      });
    });

    await page.goto('/setup');

    // Click demo mode
    await page.getByText('Demo Mode').click();
    await page.getByRole('button', { name: 'Continue with Demo' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should allow Funifier credentials setup', async ({ page }) => {
    // Mock Funifier setup API
    await page.route('/api/setup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          mode: 'funifier',
          redirectTo: '/admin/login'
        }),
      });
    });

    await page.goto('/setup');

    // Click Funifier setup
    await page.getByText('Set up Funifier').click();

    // Fill credentials form
    await page.fill('[name="apiKey"]', 'test-api-key');
    await page.fill('[name="serverUrl"]', 'https://test.funifier.com');
    await page.fill('[name="authToken"]', 'test-auth-token');

    await page.getByRole('button', { name: 'Save Configuration' }).click();

    // Should redirect to admin login
    await expect(page).toHaveURL('/admin/login');
  });

  test('should validate Funifier credentials', async ({ page }) => {
    // Mock validation failure
    await page.route('/api/setup', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Invalid credentials',
          details: 'Unable to connect to Funifier API'
        }),
      });
    });

    await page.goto('/setup');

    await page.getByText('Set up Funifier').click();
    await page.fill('[name="apiKey"]', 'invalid-key');
    await page.fill('[name="serverUrl"]', 'https://invalid.com');
    await page.fill('[name="authToken"]', 'invalid-token');

    await page.getByRole('button', { name: 'Save Configuration' }).click();

    // Should show error message
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});