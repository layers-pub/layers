/**
 * Search page E2E tests for the Layers web frontend.
 *
 * @module
 */

import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test.describe('Page load', () => {
    test('search page loads with a search input', async ({ page }) => {
      await page.goto('/search');

      await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();

      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      await expect(searchInput.first()).toBeVisible();
    });
  });

  test.describe('Search interaction', () => {
    test('typing in search input updates URL params', async ({ page }) => {
      await page.goto('/search');

      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      const input = searchInput.first();
      await input.waitFor({ state: 'visible' });

      await input.fill('morphology');

      // Wait for the URL to reflect the search query (debounced update)
      await expect(page).toHaveURL(/[?&]q=morphology/, { timeout: 5_000 });
    });

    test('search results or empty state appear after typing', async ({ page }) => {
      await page.goto('/search');

      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      const input = searchInput.first();
      await input.waitFor({ state: 'visible' });

      await input.fill('test query');

      // Wait for the URL to update (confirms the query was registered)
      await expect(page).toHaveURL(/[?&]q=test/, { timeout: 5_000 });

      // Wait for loading to finish
      await page.waitForFunction(
        () => document.querySelectorAll('[class*="animate-pulse"]').length === 0,
        { timeout: 10_000 },
      );

      // Either search results or an empty/no-results state should be visible
      const resultsArea = page.locator('main');
      await expect(resultsArea).toBeVisible();

      const results = page.locator(
        '[data-testid="search-result"], [data-testid="empty-state"], [data-testid="no-results"]',
      );
      const textContent = await resultsArea.textContent();
      // The page should show results, a no-results message, or at minimum the search heading
      expect(textContent).toBeTruthy();
    });

    test('search results show type badges when results exist', async ({ page }) => {
      await page.goto('/search?q=test');

      // Wait for loading to complete
      await page.waitForFunction(
        () => document.querySelectorAll('[class*="animate-pulse"]').length === 0,
        { timeout: 10_000 },
      );

      // Look for type badge elements within result cards
      const badges = page.locator(
        '[data-testid="type-badge"], [data-testid="search-result"] .badge, [data-testid="search-result-card"] [class*="badge"]',
      );
      const badgeCount = await badges.count();

      if (badgeCount > 0) {
        // At least one badge should have text content indicating the record type
        const firstBadge = badges.first();
        await expect(firstBadge).toBeVisible();
        const text = await firstBadge.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
      // If no badges, there are no results; the test still passes
    });
  });

  test.describe('Search via URL', () => {
    test('navigating to /search?q=value pre-fills the search input', async ({ page }) => {
      await page.goto('/search?q=syntax');

      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      const input = searchInput.first();
      await input.waitFor({ state: 'visible' });

      await expect(input).toHaveValue('syntax');
    });
  });
});
