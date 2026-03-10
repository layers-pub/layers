/**
 * REST endpoints for querying external annotations (margin.at and others).
 *
 * Provides public read access to external annotations correlated with
 * Layers expressions by shared source URL. Used by the frontend workspace
 * to display margin.at annotations alongside native Layers annotations.
 *
 * @module
 */

import type { Context, Hono } from 'hono';

import type { IMarginIndexer } from '../../../../services/interop/margin-indexer.js';

/**
 * Maximum number of results allowed per query.
 */
const MAX_LIMIT = 200;

/**
 * Default number of results per query.
 */
const DEFAULT_LIMIT = 50;

/**
 * Validates that a string is a plausible URL.
 *
 * @param value - the string to validate
 * @returns true if the string can be parsed as a URL with http or https scheme
 */
function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parses and clamps a limit query parameter.
 *
 * @param raw - the raw string value from the query string
 * @returns a number between 1 and MAX_LIMIT, or DEFAULT_LIMIT if invalid
 */
function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

/**
 * Dependencies for the external-annotations route handlers.
 */
interface ExternalAnnotationsDeps {
  readonly marginIndexer: IMarginIndexer;
}

/**
 * Registers external-annotations REST routes on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param deps - services required by the handlers
 */
function externalAnnotationsRoutes(app: Hono, deps: ExternalAnnotationsDeps): void {
  /**
   * GET /api/v1/external-annotations
   *
   * Returns external annotations targeting the specified URL.
   * No authentication required (public read).
   *
   * Query params:
   *   url (required) - the source URL to find co-located annotations for
   *   limit (optional) - max results, default 50, max 200
   *   cursor (optional) - pagination cursor (reserved for future use)
   */
  app.get('/api/v1/external-annotations', async (c: Context) => {
    const url = c.req.query('url');

    if (!url) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: 'The "url" query parameter is required' },
        400,
      );
    }

    if (!isValidUrl(url)) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'The "url" query parameter must be a valid HTTP or HTTPS URL',
        },
        400,
      );
    }

    const limit = parseLimit(c.req.query('limit'));
    const cursor = c.req.query('cursor');

    // Cursor support is reserved for future pagination implementation.
    // For now, we ignore it and return all results up to the limit.
    void cursor;

    const result = await deps.marginIndexer.getAnnotationsForUrl(url, limit);

    if (!result.ok) {
      return c.json({ error: 'INTEROP_ERROR', message: result.error.message }, 502);
    }

    return c.json({ annotations: result.value, cursor: null });
  });

  /**
   * GET /api/v1/external-annotations/stats
   *
   * Returns aggregate statistics for external annotations targeting a URL.
   * No authentication required (public read).
   *
   * Query params:
   *   url (required) - the source URL to aggregate statistics for
   */
  app.get('/api/v1/external-annotations/stats', async (c: Context) => {
    const url = c.req.query('url');

    if (!url) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: 'The "url" query parameter is required' },
        400,
      );
    }

    if (!isValidUrl(url)) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'The "url" query parameter must be a valid HTTP or HTTPS URL',
        },
        400,
      );
    }

    // Fetch all annotations for the URL to compute stats.
    // Uses a generous limit since we only need count and source list.
    const result = await deps.marginIndexer.getAnnotationsForUrl(url, MAX_LIMIT);

    if (!result.ok) {
      return c.json({ error: 'INTEROP_ERROR', message: result.error.message }, 502);
    }

    const annotations = result.value;
    const sources = [...new Set(annotations.map((a) => a.source))];

    return c.json({ count: annotations.length, sources });
  });
}

export { externalAnnotationsRoutes, isValidUrl, parseLimit, MAX_LIMIT, DEFAULT_LIMIT };
export type { ExternalAnnotationsDeps };
