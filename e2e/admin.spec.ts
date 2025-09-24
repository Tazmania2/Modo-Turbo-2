import { test, expect } from '@playwright/test';

test.describe('Admin Panel Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.route('/api/auth/verify-admin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isAdmin: true,
          roles: ['admin'],
          playerData: {
            _id: 'admin-user',
            name: 'Admin User'
          }
        }),
      });
    });

    // Mock white-label configuration
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
  });

  test('should require admin authentication', async ({ page }) => {
    // Mock non-admin user
    await page.route('/api/auth/verify-admin', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Insufficient permissions',
          isAdmin: false
        }),
      });
    });

    await page.goto('/admin');

    // Should redirect to login
    await expect(page).toHaveURL('/admin/login');
  });

  test('should display admin dashboard overview', async ({ page }) => {
    await page.goto('/admin');

    // Should show admin overview
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByText('White-Label Configuration')).toBeVisible();
    await expect(page.getByText('Feature Management')).toBeVisible();
    await expect(page.getByText('Branding Settings')).toBeVisible();
  });

  test('should manage feature toggles', async ({ page }) => {
    // Mock feature update API
    await page.route('/api/admin/features/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          feature: 'ranking',
          enabled: false
        }),
      });
    });

    await page.goto('/admin');

    // Navigate to feature management
    await page.getByText('Feature Management').click();

    // Should show feature toggles
    await expect(page.getByText('Ranking System')).toBeVisible();
    await expect(page.getByText('Dashboard Types')).toBeVisible();

    // Toggle ranking feature
    const rankingToggle = page.locator('[data-testid="feature-toggle-ranking"]');
    await rankingToggle.click();

    // Should show success message
    await expect(page.getByText('Feature updated successfully')).toBeVisible();
  });

  test('should manage branding settings', async ({ page }) => {
    // Mock branding update API
    await page.route('/api/admin/branding', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          branding: {
            primaryColor: '#FF0000',
            secondaryColor: '#AA0000',
            companyName: 'Updated Company'
          }
        }),
      });
    });

    await page.goto('/admin');

    // Navigate to branding settings
    await page.getByText('Branding Settings').click();

    // Should show branding form
    await expect(page.getByText('Company Name')).toBeVisible();
    await expect(page.getByText('Primary Color')).toBeVisible();
    await expect(page.getByText('Secondary Color')).toBeVisible();

    // Update company name
    await page.fill('[name="companyName"]', 'Updated Company');
    await page.fill('[name="primaryColor"]', '#FF0000');

    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Should show success message
    await expect(page.getByText('Branding updated successfully')).toBeVisible();
  });

  test('should manage Funifier credentials', async ({ page }) => {
    // Mock credentials test API
    await page.route('/api/admin/funifier-credentials/test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Connection successful'
        }),
      });
    });

    await page.goto('/admin');

    // Navigate to Funifier settings
    await page.getByText('Funifier Configuration').click();

    // Should show credentials form
    await expect(page.getByText('API Key')).toBeVisible();
    await expect(page.getByText('Server URL')).toBeVisible();

    // Test connection
    await page.getByRole('button', { name: 'Test Connection' }).click();

    // Should show success message
    await expect(page.getByText('Connection successful')).toBeVisible();
  });

  test('should reset to defaults', async ({ page }) => {
    // Mock reset API
    await page.route('/api/admin/branding/reset', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Reset to defaults successful'
        }),
      });
    });

    await page.goto('/admin');
    await page.getByText('Branding Settings').click();

    // Click reset button
    await page.getByRole('button', { name: 'Reset to Defaults' }).click();

    // Confirm reset
    await page.getByRole('button', { name: 'Confirm Reset' }).click();

    // Should show success message
    await expect(page.getByText('Reset to defaults successful')).toBeVisible();
  });

  test('should handle admin panel errors', async ({ page }) => {
    // Mock API error
    await page.route('/api/admin/features/*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Unable to update feature'
        }),
      });
    });

    await page.goto('/admin');
    await page.getByText('Feature Management').click();

    // Try to toggle feature
    const rankingToggle = page.locator('[data-testid="feature-toggle-ranking"]');
    await rankingToggle.click();

    // Should show error message
    await expect(page.getByText('Unable to update feature')).toBeVisible();
  });

  test('should navigate between admin sections', async ({ page }) => {
    await page.goto('/admin');

    // Navigate through different sections
    await page.getByText('Feature Management').click();
    await expect(page.getByText('Feature Toggles')).toBeVisible();

    await page.getByText('Branding Settings').click();
    await expect(page.getByText('Company Branding')).toBeVisible();

    await page.getByText('Funifier Configuration').click();
    await expect(page.getByText('API Configuration')).toBeVisible();

    // Return to overview
    await page.getByText('Overview').click();
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
  });
});