import { test, expect } from '@playwright/test';

test.describe('Teacher Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard header with moo branding', async ({ page }) => {
    // Check for the main dashboard header
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();

    // Verify the application title
    await expect(page.locator('h1')).toContainText('moo');
  });

  test('should show classroom list in sidebar', async ({ page }) => {
    // Check for classroom sidebar
    await expect(page.locator('[data-testid="classroom-sidebar"]')).toBeVisible();

    // Look for classroom list or empty state
    const classroomList = page.locator('[data-testid="classroom-list"]');
    const emptyState = page.locator('[data-testid="empty-classrooms"]');

    // Either should be visible
    await expect(classroomList.or(emptyState)).toBeVisible();
  });

  test('should display dashboard stats', async ({ page }) => {
    // Check for stats section
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();

    // Verify stat cards are present
    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(3); // Classrooms, Assignments, Submissions
  });

  test('should show assignment panel when classroom is selected', async ({ page }) => {
    // Look for any existing classrooms
    const classroomCards = page.locator('[data-testid="classroom-card"]');
    const classroomCount = await classroomCards.count();

    if (classroomCount > 0) {
      // Click on the first classroom
      await classroomCards.first().click();

      // Verify assignment panel is shown
      await expect(page.locator('[data-testid="assignment-panel"]')).toBeVisible();
    } else {
      // If no classrooms, verify empty state is shown
      await expect(page.locator('[data-testid="no-classroom-selected"]')).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that the layout adapts for mobile
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();

      // Verify mobile-specific elements are working
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
      }
    }
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Intercept network requests to simulate slow loading
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.reload();

    // Check for loading states
    const loadingElements = page.locator('[data-testid="loading"]');
    if (await loadingElements.count() > 0) {
      await expect(loadingElements.first()).toBeVisible();
    }

    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
  });
});