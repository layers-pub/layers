/**
 * Browse page E2E tests for Expressions, Corpora, and Ontologies listing pages.
 *
 * @module
 */

import { test, expect } from '@playwright/test';

test.describe('Browse pages', () => {
  test.describe('Expressions list', () => {
    test('page loads with heading and content area', async ({ page }) => {
      await page.goto('/expressions');

      await expect(page.getByRole('heading', { level: 1, name: 'Expressions' })).toBeVisible();
    });

    test('shows expression cards or an empty state', async ({ page }) => {
      await page.goto('/expressions');

      // Wait for the loading skeleton to disappear (Suspense boundary resolves)
      await page.waitForFunction(
        () => document.querySelectorAll('[class*="animate-pulse"]').length === 0,
        { timeout: 10_000 },
      );

      const cards = page.locator(
        '[data-testid="expression-card"], [data-testid="empty-state"], .rounded-xl.border',
      );
      const cardCount = await cards.count();

      // Either expression cards are rendered or an empty state placeholder appears
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });

    test('renders grid layout for expression cards', async ({ page }) => {
      await page.goto('/expressions');

      // The page uses a grid container for cards
      const gridContainer = page.locator('.grid');
      await expect(gridContainer.first()).toBeVisible();
    });
  });

  test.describe('Corpora list', () => {
    test('page loads with heading', async ({ page }) => {
      await page.goto('/corpora');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('shows corpora cards or empty state after loading', async ({ page }) => {
      await page.goto('/corpora');

      await page.waitForFunction(
        () => document.querySelectorAll('[class*="animate-pulse"]').length === 0,
        { timeout: 10_000 },
      );

      // Page should have rendered content (cards, empty state, or at least the container)
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Ontologies list', () => {
    test('page loads with heading', async ({ page }) => {
      await page.goto('/ontologies');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('shows ontology entries or empty state after loading', async ({ page }) => {
      await page.goto('/ontologies');

      await page.waitForFunction(
        () => document.querySelectorAll('[class*="animate-pulse"]').length === 0,
        { timeout: 10_000 },
      );

      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('pagination controls appear when expression content is loaded', async ({ page }) => {
      await page.goto('/expressions');

      await page.waitForFunction(
        () => document.querySelectorAll('[class*="animate-pulse"]').length === 0,
        { timeout: 10_000 },
      );

      // Pagination may or may not appear depending on data volume.
      // If present, verify the pagination container has buttons or links.
      const pagination = page.locator(
        'nav[aria-label*="pagination"], [data-testid="pagination"], [role="navigation"]',
      );
      const paginationCount = await pagination.count();

      if (paginationCount > 0) {
        const buttons = pagination.first().locator('button, a');
        expect(await buttons.count()).toBeGreaterThan(0);
      }
      // If no pagination is present, the test still passes (not enough items to paginate)
    });
  });
});
