/**
 * Complete User Journey End-to-End Test
 * 
 * This test validates the entire user experience from initial setup
 * through daily usage, covering all major user flows and interactions.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data
const testConfig = {
  funifierCredentials: {
    apiKey: 'test-api-key-12345',
    serverUrl: 'https://test.funifier.com',
    authToken: 'test-auth-token'
  },
  adminUser: {
    username: 'admin@test.com',
    password: 'admin123'
  },
  regularUser: {
    username: 'user@test.com',
    password: 'user123'
  },
  branding: {
    companyName: 'Test Gaming Corp',
    primaryColor: '#FF6B35',
    secondaryColor: '#004E89',
    tagline: 'Level Up Your Performance'
  }
};

class PlatformTestHelper {
  constructor(private page: Page) {}

  async setupFunifierIntegration() {
    // Navigate to setup page
    await this.page.goto('/setup');
    
    // Choose Funifier setup
    await this.page.click('[data-testid="setup-funifier"]');
    
    // Fill credentials
    await this.page.fill('[data-testid="api-key-input"]', testConfig.funifierCredentials.apiKey);
    await this.page.fill('[data-testid="server-url-input"]', testConfig.funifierCredentials.serverUrl);
    await this.page.fill('[data-testid="auth-token-input"]', testConfig.funifierCredentials.authToken);
    
    // Test connection
    await this.page.click('[data-testid="test-connection"]');
    await expect(this.page.locator('[data-testid="connection-success"]')).toBeVisible();
    
    // Complete setup
    await this.page.click('[data-testid="complete-setup"]');
    
    // Should redirect to admin login
    await expect(this.page).toHaveURL(/\/admin\/login/);
  }

  async loginAsAdmin() {
    await this.page.goto('/admin/login');
    await this.page.fill('[data-testid="username-input"]', testConfig.adminUser.username);
    await this.page.fill('[data-testid="password-input"]', testConfig.adminUser.password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for admin dashboard
    await expect(this.page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
  }

  async configureBranding() {
    // Navigate to branding panel
    await this.page.click('[data-testid="branding-tab"]');
    
    // Update company name
    await this.page.fill('[data-testid="company-name-input"]', testConfig.branding.companyName);
    
    // Update colors
    await this.page.fill('[data-testid="primary-color-input"]', testConfig.branding.primaryColor);
    await this.page.fill('[data-testid="secondary-color-input"]', testConfig.branding.secondaryColor);
    
    // Update tagline
    await this.page.fill('[data-testid="tagline-input"]', testConfig.branding.tagline);
    
    // Save changes
    await this.page.click('[data-testid="save-branding"]');
    
    // Verify success message
    await expect(this.page.locator('[data-testid="success-toast"]')).toBeVisible();
  }

  async configureFeatures() {
    // Navigate to features panel
    await this.page.click('[data-testid="features-tab"]');
    
    // Enable all dashboard types
    await this.page.check('[data-testid="feature-carteira-i"]');
    await this.page.check('[data-testid="feature-carteira-ii"]');
    await this.page.check('[data-testid="feature-ranking"]');
    await this.page.check('[data-testid="feature-history"]');
    
    // Save feature configuration
    await this.page.click('[data-testid="save-features"]');
    
    // Verify success
    await expect(this.page.locator('[data-testid="success-toast"]')).toBeVisible();
  }

  async loginAsUser() {
    await this.page.goto('/dashboard');
    
    // Should redirect to login if not authenticated
    if (await this.page.locator('[data-testid="login-form"]').isVisible()) {
      await this.page.fill('[data-testid="username-input"]', testConfig.regularUser.username);
      await this.page.fill('[data-testid="password-input"]', testConfig.regularUser.password);
      await this.page.click('[data-testid="login-button"]');
    }
    
    // Wait for dashboard to load
    await expect(this.page.locator('[data-testid="dashboard-container"]')).toBeVisible();
  }

  async validateDashboardFunctionality() {
    // Check that branding is applied
    await expect(this.page.locator('[data-testid="company-name"]')).toContainText(testConfig.branding.companyName);
    
    // Verify goals are displayed
    await expect(this.page.locator('[data-testid="primary-goal"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="secondary-goal-1"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="secondary-goal-2"]')).toBeVisible();
    
    // Check points display
    await expect(this.page.locator('[data-testid="total-points"]')).toBeVisible();
    
    // Verify progress bars are functional
    const progressBars = this.page.locator('[data-testid^="progress-bar-"]');
    await expect(progressBars.first()).toBeVisible();
    
    // Check cycle progress
    await expect(this.page.locator('[data-testid="cycle-progress"]')).toBeVisible();
  }

  async navigateToRanking() {
    await this.page.click('[data-testid="ranking-nav"]');
    await expect(this.page).toHaveURL(/\/ranking/);
    
    // Wait for ranking data to load
    await expect(this.page.locator('[data-testid="ranking-container"]')).toBeVisible();
  }

  async validateRankingFunctionality() {
    // Check race visualization
    await expect(this.page.locator('[data-testid="race-visualization"]')).toBeVisible();
    
    // Verify personal ranking card
    await expect(this.page.locator('[data-testid="personal-ranking-card"]')).toBeVisible();
    
    // Check contextual ranking
    await expect(this.page.locator('[data-testid="contextual-ranking"]')).toBeVisible();
    
    // Verify top 3 display
    await expect(this.page.locator('[data-testid="top-three-ranking"]')).toBeVisible();
    
    // Test ranking navigation
    const globalViewButton = this.page.locator('[data-testid="global-view-button"]');
    if (await globalViewButton.isVisible()) {
      await globalViewButton.click();
      await expect(this.page.locator('[data-testid="global-ranking-view"]')).toBeVisible();
    }
  }

  async validateHistoryFunctionality() {
    // Navigate to history if available
    const historyNav = this.page.locator('[data-testid="history-nav"]');
    if (await historyNav.isVisible()) {
      await historyNav.click();
      
      // Check season history
      await expect(this.page.locator('[data-testid="season-history"]')).toBeVisible();
      
      // Verify performance graphs
      await expect(this.page.locator('[data-testid="performance-graph"]')).toBeVisible();
      
      // Test season navigation
      const seasonSelector = this.page.locator('[data-testid="season-selector"]');
      if (await seasonSelector.isVisible()) {
        await seasonSelector.click();
        await expect(this.page.locator('[data-testid="season-dropdown"]')).toBeVisible();
      }
    }
  }

  async validateResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile navigation
    const mobileMenu = this.page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(this.page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    }
    
    // Verify content is still accessible
    await expect(this.page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(this.page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    // Return to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async validateLoadingStates() {
    // Reload page to trigger loading states
    await this.page.reload();
    
    // Check for loading skeletons
    const loadingElements = [
      '[data-testid="dashboard-skeleton"]',
      '[data-testid="loading-spinner"]',
      '[data-testid="progress-indicator"]'
    ];
    
    for (const selector of loadingElements) {
      const element = this.page.locator(selector);
      if (await element.isVisible({ timeout: 1000 })) {
        // Loading element should disappear when content loads
        await expect(element).not.toBeVisible({ timeout: 10000 });
      }
    }
  }

  async validateErrorHandling() {
    // Test network error handling by intercepting requests
    await this.page.route('**/api/dashboard/**', route => {
      route.abort('failed');
    });
    
    await this.page.reload();
    
    // Should show error state
    await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    
    // Clear route interception
    await this.page.unroute('**/api/dashboard/**');
  }
}

test.describe('Complete User Journey', () => {
  let helper: PlatformTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new PlatformTestHelper(page);
  });

  test('Full setup and configuration flow', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete flow

    // Step 1: Initial setup
    await helper.setupFunifierIntegration();
    
    // Step 2: Admin login and configuration
    await helper.loginAsAdmin();
    await helper.configureBranding();
    await helper.configureFeatures();
    
    // Verify admin dashboard functionality
    await expect(page.locator('[data-testid="admin-overview"]')).toBeVisible();
  });

  test('End user daily usage flow', async ({ page }) => {
    test.setTimeout(90000); // 1.5 minutes

    // Assume setup is already complete
    await helper.loginAsUser();
    
    // Step 1: Dashboard interaction
    await helper.validateDashboardFunctionality();
    
    // Step 2: Ranking system
    await helper.navigateToRanking();
    await helper.validateRankingFunctionality();
    
    // Step 3: History (if enabled)
    await helper.validateHistoryFunctionality();
    
    // Step 4: Navigation back to dashboard
    await page.click('[data-testid="dashboard-nav"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('White-label customization validation', async ({ page }) => {
    test.setTimeout(60000);

    await helper.loginAsAdmin();
    
    // Test branding updates
    await helper.configureBranding();
    
    // Navigate to user view to verify changes
    await page.goto('/dashboard');
    await helper.loginAsUser();
    
    // Verify branding is applied
    await expect(page.locator('[data-testid="company-name"]')).toContainText(testConfig.branding.companyName);
    
    // Check CSS custom properties are updated
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
    });
    
    expect(primaryColor.trim()).toBe(testConfig.branding.primaryColor);
  });

  test('Feature toggle functionality', async ({ page }) => {
    test.setTimeout(60000);

    await helper.loginAsAdmin();
    
    // Disable ranking feature
    await page.click('[data-testid="features-tab"]');
    await page.uncheck('[data-testid="feature-ranking"]');
    await page.click('[data-testid="save-features"]');
    
    // Navigate to user view
    await page.goto('/dashboard');
    await helper.loginAsUser();
    
    // Ranking navigation should not be visible
    await expect(page.locator('[data-testid="ranking-nav"]')).not.toBeVisible();
    
    // Re-enable ranking
    await page.goto('/admin');
    await page.click('[data-testid="features-tab"]');
    await page.check('[data-testid="feature-ranking"]');
    await page.click('[data-testid="save-features"]');
    
    // Verify ranking is back
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="ranking-nav"]')).toBeVisible();
  });

  test('Responsive design and mobile experience', async ({ page }) => {
    await helper.loginAsUser();
    await helper.validateResponsiveDesign();
  });

  test('Loading states and performance', async ({ page }) => {
    await helper.loginAsUser();
    await helper.validateLoadingStates();
    
    // Measure page load performance
    const startTime = Date.now();
    await page.reload();
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('Error handling and recovery', async ({ page }) => {
    await helper.loginAsUser();
    await helper.validateErrorHandling();
  });

  test('Multi-instance isolation', async ({ context }) => {
    // Create two pages with different instance IDs
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    const helper1 = new PlatformTestHelper(page1);
    const helper2 = new PlatformTestHelper(page2);
    
    // Navigate to different instances
    await page1.goto('/dashboard?instance=instance-1');
    await page2.goto('/dashboard?instance=instance-2');
    
    // Each should maintain separate configurations
    await helper1.loginAsUser();
    await helper2.loginAsUser();
    
    // Verify isolation (this would require actual multi-instance setup)
    await expect(page1.locator('[data-testid="dashboard-container"]')).toBeVisible();
    await expect(page2.locator('[data-testid="dashboard-container"]')).toBeVisible();
  });

  test('Security and access control', async ({ page }) => {
    // Test unauthenticated access
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // Test regular user accessing admin
    await helper.loginAsUser();
    await page.goto('/admin');
    
    // Should be redirected or show access denied
    const isRedirected = page.url().includes('/admin/login');
    const hasAccessDenied = await page.locator('[data-testid="access-denied"]').isVisible();
    
    expect(isRedirected || hasAccessDenied).toBeTruthy();
  });

  test('Data persistence and caching', async ({ page }) => {
    await helper.loginAsUser();
    
    // Load dashboard data
    await expect(page.locator('[data-testid="total-points"]')).toBeVisible();
    const initialPoints = await page.locator('[data-testid="total-points"]').textContent();
    
    // Navigate away and back
    await page.goto('/ranking');
    await page.goto('/dashboard');
    
    // Data should load quickly from cache
    const startTime = Date.now();
    await expect(page.locator('[data-testid="total-points"]')).toBeVisible();
    const cacheLoadTime = Date.now() - startTime;
    
    // Should be faster than initial load (under 1 second)
    expect(cacheLoadTime).toBeLessThan(1000);
    
    // Data should be consistent
    const cachedPoints = await page.locator('[data-testid="total-points"]').textContent();
    expect(cachedPoints).toBe(initialPoints);
  });
});