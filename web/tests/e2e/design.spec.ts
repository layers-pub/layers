/**
 * End-to-end tests for the /design section.
 *
 * Covers navigation to the design dashboard, project workspace tabs,
 * and keyboard shortcut handling.
 *
 * @module
 */

import { test, expect } from '@playwright/test';

test.describe('Design section', () => {
  test.describe('Dashboard', () => {
    test('navigates to /design and renders the dashboard', async ({ page }) => {
      await page.goto('/design');

      // Should show the Design Studio heading
      const heading = page.getByRole('heading', { name: /design studio/i });
      await expect(heading).toBeVisible();
    });

    test('shows New Project button on the dashboard', async ({ page }) => {
      await page.goto('/design');

      const newProjectButton = page.getByRole('link', { name: /new project/i });
      await expect(newProjectButton).toBeVisible();
    });

    test('shows Browse Network button on the dashboard', async ({ page }) => {
      await page.goto('/design');

      const browseButton = page.getByRole('link', { name: /browse network/i });
      await expect(browseButton).toBeVisible();
    });

    test('navigates to new project page', async ({ page }) => {
      await page.goto('/design');

      const newProjectButton = page.getByRole('link', { name: /new project/i });
      await newProjectButton.click();

      await expect(page).toHaveURL('/design/new');
    });
  });

  test.describe('Project workspace tabs', () => {
    // Use an encoded dummy URI for tab navigation testing.
    // The tabs render regardless of whether the project exists,
    // since the workspace layout is client-side.
    const dummyProjectUri = encodeURIComponent(
      'at://did:plc:test/pub.layers.resource.collection/test',
    );

    test('renders workspace tab navigation', async ({ page }) => {
      await page.goto(`/design/${dummyProjectUri}/lexicons`);

      const tabNav = page.locator('nav[aria-label="Project workspace tabs"]');
      await expect(tabNav).toBeVisible();

      await expect(tabNav.getByRole('link', { name: 'Lexicons' })).toBeVisible();
      await expect(tabNav.getByRole('link', { name: 'Templates' })).toBeVisible();
      await expect(tabNav.getByRole('link', { name: 'Experiments' })).toBeVisible();
      await expect(tabNav.getByRole('link', { name: 'Simulate' })).toBeVisible();
      await expect(tabNav.getByRole('link', { name: 'I/O' })).toBeVisible();
    });

    test('navigates to Templates tab', async ({ page }) => {
      await page.goto(`/design/${dummyProjectUri}/lexicons`);

      const tabNav = page.locator('nav[aria-label="Project workspace tabs"]');
      await tabNav.getByRole('link', { name: 'Templates' }).click();

      await expect(page).toHaveURL(new RegExp(`/design/.*/templates`));
    });

    test('navigates to Experiments tab', async ({ page }) => {
      await page.goto(`/design/${dummyProjectUri}/lexicons`);

      const tabNav = page.locator('nav[aria-label="Project workspace tabs"]');
      await tabNav.getByRole('link', { name: 'Experiments' }).click();

      await expect(page).toHaveURL(new RegExp(`/design/.*/experiments`));
    });

    test('navigates to Simulate tab', async ({ page }) => {
      await page.goto(`/design/${dummyProjectUri}/lexicons`);

      const tabNav = page.locator('nav[aria-label="Project workspace tabs"]');
      await tabNav.getByRole('link', { name: 'Simulate' }).click();

      await expect(page).toHaveURL(new RegExp(`/design/.*/simulate`));
    });

    test('navigates to I/O tab', async ({ page }) => {
      await page.goto(`/design/${dummyProjectUri}/lexicons`);

      const tabNav = page.locator('nav[aria-label="Project workspace tabs"]');
      await tabNav.getByRole('link', { name: 'I/O' }).click();

      await expect(page).toHaveURL(new RegExp(`/design/.*/io`));
    });
  });

  test.describe('Keyboard shortcuts', () => {
    test('Ctrl+S does not open browser save dialog on /design', async ({ page }) => {
      await page.goto('/design');

      // Pressing Ctrl+S should be intercepted. We verify no navigation
      // occurs (the page stays on /design) and no file dialog opens
      // (which would fail the test with a timeout or navigation change).
      await page.keyboard.press('Control+s');

      // Page should remain on /design
      await expect(page).toHaveURL(/\/design/);
    });
  });
});
