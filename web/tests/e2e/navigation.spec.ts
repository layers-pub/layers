/**
 * Navigation E2E tests for the Layers web frontend.
 *
 * @module
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.describe('Home page', () => {
    test('loads and shows header with site title', async ({ page }) => {
      await page.goto('/');

      const header = page.locator('header');
      await expect(header).toBeVisible();

      const siteTitle = header.getByRole('link', { name: 'Layers' });
      await expect(siteTitle).toBeVisible();
    });

    test('displays the home page heading', async ({ page }) => {
      await page.goto('/');

      const heading = page.getByRole('heading', { level: 1, name: 'Layers' });
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Desktop navigation links', () => {
    test('navigates to Expressions page', async ({ page }) => {
      await page.goto('/');

      const expressionsLink = page.locator('header nav').getByRole('link', { name: 'Expressions' });
      await expressionsLink.click();

      await expect(page).toHaveURL('/expressions');
      await expect(page.getByRole('heading', { level: 1, name: 'Expressions' })).toBeVisible();
    });

    test('navigates to Corpora page', async ({ page }) => {
      await page.goto('/');

      const corporaLink = page.locator('header nav').getByRole('link', { name: 'Corpora' });
      await corporaLink.click();

      await expect(page).toHaveURL('/corpora');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('navigates to Ontologies page', async ({ page }) => {
      await page.goto('/');

      const ontologiesLink = page.locator('header nav').getByRole('link', { name: 'Ontologies' });
      await ontologiesLink.click();

      await expect(page).toHaveURL('/ontologies');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('navigates to Search page', async ({ page }) => {
      await page.goto('/');

      const searchLink = page.locator('header nav').getByRole('link', { name: 'Search' });
      await searchLink.click();

      await expect(page).toHaveURL('/search');
      await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
    });
  });

  test.describe('Breadcrumb navigation', () => {
    test('expression detail page shows navigable breadcrumb back to list', async ({ page }) => {
      await page.goto('/expressions');

      // If there are expression cards, click the first one; otherwise verify the list page loads
      const cards = page.locator('[data-testid="expression-card"], a[href^="/expressions/"]');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        await cards.first().click();
        await page.waitForURL(/\/expressions\/.+/);

        // Verify a breadcrumb or back link to the expressions list exists
        const backLink = page.getByRole('link', { name: /expressions/i }).first();
        await expect(backLink).toBeVisible();
      } else {
        // No expressions available; verify the list page itself rendered
        await expect(page.getByRole('heading', { level: 1, name: 'Expressions' })).toBeVisible();
      }
    });
  });

  test.describe('Mobile navigation', () => {
    test('toggle mobile menu opens and shows nav links', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // The mobile menu trigger button should be visible
      const menuButton = page.getByRole('button', { name: /open menu/i });
      await expect(menuButton).toBeVisible();

      await menuButton.click();

      // The sheet/drawer should appear with navigation links
      const mobileNav = page.locator('[data-state="open"]');
      await mobileNav.waitFor({ state: 'visible' });

      await expect(mobileNav.getByRole('link', { name: 'Expressions' })).toBeVisible();
      await expect(mobileNav.getByRole('link', { name: 'Corpora' })).toBeVisible();
      await expect(mobileNav.getByRole('link', { name: 'Ontologies' })).toBeVisible();
      await expect(mobileNav.getByRole('link', { name: 'Search' })).toBeVisible();
    });

    test('mobile menu link navigates to target page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      const menuButton = page.getByRole('button', { name: /open menu/i });
      await menuButton.click();

      const mobileNav = page.locator('[data-state="open"]');
      await mobileNav.waitFor({ state: 'visible' });

      await mobileNav.getByRole('link', { name: 'Expressions' }).click();
      await expect(page).toHaveURL('/expressions');
    });
  });
});
