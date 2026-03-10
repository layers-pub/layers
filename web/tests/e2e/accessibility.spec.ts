/**
 * Accessibility E2E tests for the Layers web frontend.
 *
 * Uses @axe-core/playwright for automated accessibility auditing.
 * Install with: pnpm add -D @axe-core/playwright
 *
 * @module
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { path: '/', name: 'Home' },
  { path: '/expressions', name: 'Expressions' },
  { path: '/corpora', name: 'Corpora' },
  { path: '/ontologies', name: 'Ontologies' },
  { path: '/search', name: 'Search' },
];

test.describe('Accessibility', () => {
  test.describe('Axe automated checks', () => {
    for (const { path, name } of PAGES) {
      test(`${name} page has no accessibility violations`, async ({ page }) => {
        await page.goto(path);

        // Wait for loading states to resolve before auditing
        await page.waitForFunction(
          () => document.querySelectorAll('[class*="animate-pulse"]').length === 0,
          { timeout: 10_000 },
        );

        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  });

  test.describe('Heading hierarchy', () => {
    for (const { path, name } of PAGES) {
      test(`${name} page has an h1 heading`, async ({ page }) => {
        await page.goto(path);

        const h1 = page.getByRole('heading', { level: 1 });
        await expect(h1.first()).toBeVisible();
      });
    }

    test('heading levels do not skip (no h1 then h3 without h2)', async ({ page }) => {
      await page.goto('/');

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      let maxLevel = 0;

      for (const heading of headings) {
        const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
        const level = parseInt(tagName.replace('h', ''), 10);

        // Each heading level should be at most one level deeper than the previous max
        if (level > maxLevel + 1 && maxLevel > 0) {
          const text = await heading.textContent();
          expect.soft(level).toBeLessThanOrEqual(
            maxLevel + 1,
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          );
          // Log for debugging without failing hard on soft assertion
          console.warn(`Heading skip detected: h${maxLevel} -> h${level} ("${text?.trim()}")`);
        }

        if (level > maxLevel) {
          maxLevel = level;
        }
      }
    });
  });

  test.describe('Keyboard navigation', () => {
    test('interactive elements in the header are keyboard focusable', async ({ page }) => {
      await page.goto('/');

      // Tab through the page and verify focus lands on interactive elements
      await page.keyboard.press('Tab');

      // After tabbing, the focused element should be an interactive element
      const focusedTag = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName.toLowerCase() ?? '';
      });

      expect(['a', 'button', 'input', 'select', 'textarea']).toContain(focusedTag);
    });

    test('navigation links are reachable via keyboard', async ({ page }) => {
      await page.goto('/');

      const focusedHrefs: string[] = [];

      // Tab through enough times to reach all header links
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');

        const href = await page.evaluate(() => {
          const el = document.activeElement;
          if (el?.tagName.toLowerCase() === 'a') {
            return (el as HTMLAnchorElement).getAttribute('href');
          }
          return null;
        });

        if (href) {
          focusedHrefs.push(href);
        }
      }

      // At least some navigation links should have been focused
      expect(focusedHrefs.length).toBeGreaterThan(0);

      // Verify that at least one of the main nav links was reachable
      const mainNavPaths = ['/expressions', '/corpora', '/ontologies', '/search'];
      const reachableNavLinks = focusedHrefs.filter((href) => mainNavPaths.includes(href));
      expect(reachableNavLinks.length).toBeGreaterThan(0);
    });
  });

  test.describe('Images', () => {
    test('all images have alt text', async ({ page }) => {
      await page.goto('/');

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const src = await img.getAttribute('src');

        // Every image should have a non-empty alt attribute (or role="presentation" for decorative)
        const role = await img.getAttribute('role');
        const isDecorative = role === 'presentation' || role === 'none';

        if (!isDecorative) {
          expect(alt, `Image with src="${src}" is missing alt text`).toBeTruthy();
        }
      }
    });
  });
});
