/**
 * E2E tests for the generic record browse/detail surface under /[kind].
 *
 * Stubs the XRPC backend with realistic payloads via page.route so the
 * frontend exercises its full rendering path without requiring a live
 * indexer + PDS stack.
 */

import { test, expect, type Page } from '@playwright/test';

const DID = 'did:plc:testacct';
const NOW = '2026-04-17T12:00:00Z';

function corpusUri(rkey: string) {
  return `at://${DID}/pub.layers.corpus.corpus/${rkey}`;
}

function personaUri(rkey: string) {
  return `at://${DID}/pub.layers.persona.persona/${rkey}`;
}

function expressionUri(rkey: string) {
  return `at://${DID}/pub.layers.expression.expression/${rkey}`;
}

function stubXrpc(page: Page, nsid: string, handler: (url: URL) => unknown) {
  return page.route(new RegExp(`/xrpc/${nsid.replace(/\./g, '\\.')}(\\?|$)`), async (route) => {
    const url = new URL(route.request().url());
    const payload = handler(url);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

test.describe('Generic record browser', () => {
  test('kinds index lists every registered record type', async ({ page }) => {
    await page.goto('/kinds');
    await expect(page.getByRole('heading', { level: 1, name: 'Record kinds' })).toBeVisible();

    for (const title of ['Persona', 'Corpus', 'Expression', 'Ontology', 'Annotation Layer']) {
      await expect(page.getByRole('link', { name: title })).toBeVisible();
    }
  });

  test('persona browse requires the repo filter and calls the canonical list endpoint', async ({ page }) => {
    let capturedUrl: URL | null = null;
    await stubXrpc(page, 'pub.layers.persona.listPersonas', (url) => {
      capturedUrl = url;
      return {
        records: [
          {
            uri: personaUri('rk1'),
            cid: 'bafyaa',
            did: DID,
            rkey: 'rk1',
            indexedAt: NOW,
            name: 'Syntactician',
            domain: 'linguistics',
            kind: 'human-annotator',
          },
          {
            uri: personaUri('rk2'),
            cid: 'bafybb',
            did: DID,
            rkey: 'rk2',
            indexedAt: NOW,
            name: 'Biomedical NER',
            domain: 'biomedical',
            kind: 'ml-model',
          },
        ],
      };
    });

    await page.goto('/persona');
    await expect(page.getByText('Filter required')).toBeVisible();

    await page.getByLabel(/^repo/).first().fill(DID);
    await expect(page.getByText('Syntactician')).toBeVisible();
    await expect(page.getByText('Biomedical NER')).toBeVisible();

    expect(capturedUrl).not.toBeNull();
    expect(capturedUrl!.pathname).toBe('/xrpc/pub.layers.persona.listPersonas');
    expect(capturedUrl!.searchParams.get('repo')).toBe(DID);
    expect(capturedUrl!.searchParams.get('limit')).toBe('25');
  });

  test('corpus browse handles irregular plural and renders list', async ({ page }) => {
    await stubXrpc(page, 'pub.layers.corpus.listCorpora', () => ({
      records: [
        {
          uri: corpusUri('ud-ewt'),
          cid: 'bafyc',
          did: DID,
          rkey: 'ud-ewt',
          indexedAt: NOW,
          name: 'UD English Web Treebank',
          language: 'en',
          domain: 'syntax',
          license: 'CC-BY-SA-4.0',
        },
      ],
    }));

    await page.goto('/corpus');
    await page.getByLabel(/^repo/).first().fill(DID);
    await expect(page.getByText('UD English Web Treebank')).toBeVisible();
  });

  test('record detail fetches via the canonical get endpoint', async ({ page }) => {
    await stubXrpc(page, 'pub.layers.persona.getPersona', (url) => {
      return {
        uri: url.searchParams.get('uri'),
        cid: 'bafyaa',
        did: DID,
        rkey: 'rk1',
        indexedAt: NOW,
        name: 'Syntactician',
        domain: 'linguistics',
        kind: 'human-annotator',
        description: 'Annotator focused on clause structure.',
      };
    });

    await page.goto(`/persona/${encodeURIComponent(personaUri('rk1'))}`);

    // Header and field labels from the generated registry.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Persona' }),
    ).toBeVisible();
    await expect(page.getByText('Name', { exact: true })).toBeVisible();
    await expect(page.getByText('Domain', { exact: true })).toBeVisible();
    await expect(page.getByText('Kind', { exact: true })).toBeVisible();
    await expect(page.getByText('Syntactician')).toBeVisible();
    // Field description from the lexicon is rendered.
    await expect(page.getByText(/annotation frameworks|expertise|name/i).first()).toBeVisible();
  });

  test('record-link resolves at-URIs inside a record detail to the right route', async ({ page }) => {
    await stubXrpc(page, 'pub.layers.annotation.getAnnotationLayer', (url) => ({
      uri: url.searchParams.get('uri'),
      cid: 'bafyaa',
      did: DID,
      rkey: 'layer-1',
      indexedAt: NOW,
      expression: expressionUri('expr-1'),
      kind: 'token-tag',
      annotations: [],
    }));

    await page.goto(
      `/annotation-layer/${encodeURIComponent(
        `at://${DID}/pub.layers.annotation.annotationLayer/layer-1`,
      )}`,
    );

    const refLink = page.getByRole('link', {
      name: expressionUri('expr-1'),
    });
    await expect(refLink).toHaveAttribute(
      'href',
      `/expression/${encodeURIComponent(expressionUri('expr-1'))}`,
    );
  });

  test('command palette opens on Cmd+K and offers every record kind', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('ControlOrMeta+K');

    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await expect(page.getByText('Browse Persona')).toBeVisible();
    await expect(page.getByText('Browse Corpus')).toBeVisible();
    await expect(page.getByText('Browse Expression')).toBeVisible();
    await expect(page.getByText('New Persona')).toBeVisible();
  });

  test('404 for unknown kind slug', async ({ page }) => {
    const response = await page.goto('/not-a-kind');
    expect(response?.status()).toBe(404);
  });
});

test.describe('Mobile responsive workspace', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('/persona renders cards (not a table) on mobile', async ({ page }) => {
    await stubXrpc(page, 'pub.layers.persona.listPersonas', () => ({
      records: [
        {
          uri: personaUri('rk1'),
          cid: 'bafyaa',
          did: DID,
          rkey: 'rk1',
          indexedAt: NOW,
          name: 'Mobile Persona',
          domain: 'linguistics',
          kind: 'human-annotator',
        },
      ],
    }));

    await page.goto('/persona');
    await page.getByLabel(/^repo/).first().fill(DID);

    // On mobile, the table (`.hidden md:block` wrapper) is hidden and the
    // card list is shown via `<ul class="grid gap-3 md:hidden">`.
    const mobileList = page.locator('ul.grid.gap-3.md\\:hidden');
    await expect(mobileList).toBeVisible();
    await expect(mobileList.getByText('Mobile Persona')).toBeVisible();
  });

  test('mobile bottom nav is visible below md breakpoint', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse' })).toBeVisible();
  });
});
