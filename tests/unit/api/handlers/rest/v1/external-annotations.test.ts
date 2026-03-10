/**
 * Unit tests for external-annotations REST handlers.
 *
 * @module
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  externalAnnotationsRoutes,
  isValidUrl,
  parseLimit,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from '@/api/handlers/rest/v1/external-annotations.js';
import type { IMarginIndexer } from '@/services/interop/margin-indexer.js';
import type { ExternalAnnotationView } from '@/services/interop/margin-adapter.js';
import { Ok, Err } from '@/types/result.js';
import { InteropError } from '@/services/interop/interop-error.js';

/**
 * Creates a mock MarginIndexer for testing.
 */
function createMockMarginIndexer(): IMarginIndexer {
  return {
    handleMarginRecord: vi.fn().mockResolvedValue(Ok(undefined)),
    handleMarginDelete: vi.fn().mockResolvedValue(Ok(undefined)),
    getAnnotationsForUrl: vi.fn().mockResolvedValue(Ok([])),
    isMarginCollection: vi.fn().mockReturnValue(false),
  };
}

/**
 * Creates a test ExternalAnnotationView.
 */
function createTestAnnotation(overrides?: Partial<ExternalAnnotationView>): ExternalAnnotationView {
  return {
    id: 'margin.at:did:plc:test123:abc',
    source: 'margin.at',
    uri: 'at://did:plc:test123/at.margin.annotation/abc',
    creatorDid: 'did:plc:test123',
    targetUrl: 'https://example.com/article',
    text: 'This is a test annotation',
    kind: 'Comment',
    motivation: 'commenting',
    createdAt: '2026-01-15T12:00:00Z',
    ...overrides,
  };
}

describe('isValidUrl', () => {
  it('accepts HTTP URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('accepts HTTPS URLs', () => {
    expect(isValidUrl('https://example.com/article?id=1')).toBe(true);
  });

  it('rejects non-HTTP schemes', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

describe('parseLimit', () => {
  it('returns DEFAULT_LIMIT when no value provided', () => {
    expect(parseLimit(undefined)).toBe(DEFAULT_LIMIT);
  });

  it('parses valid numbers', () => {
    expect(parseLimit('25')).toBe(25);
    expect(parseLimit('100')).toBe(100);
  });

  it('clamps to MAX_LIMIT', () => {
    expect(parseLimit('500')).toBe(MAX_LIMIT);
  });

  it('returns DEFAULT_LIMIT for invalid values', () => {
    expect(parseLimit('abc')).toBe(DEFAULT_LIMIT);
    expect(parseLimit('-5')).toBe(DEFAULT_LIMIT);
    expect(parseLimit('0')).toBe(DEFAULT_LIMIT);
  });

  it('floors fractional values', () => {
    expect(parseLimit('25.9')).toBe(25);
  });
});

describe('GET /api/v1/external-annotations', () => {
  let app: Hono;
  let mockIndexer: IMarginIndexer;

  beforeEach(() => {
    app = new Hono();
    mockIndexer = createMockMarginIndexer();
    externalAnnotationsRoutes(app, { marginIndexer: mockIndexer });
  });

  it('returns 400 when url param is missing', async () => {
    const res = await app.request('/api/v1/external-annotations');
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('url');
  });

  it('returns 400 for invalid URL', async () => {
    const res = await app.request('/api/v1/external-annotations?url=not-a-url');
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns annotations array for valid URL', async () => {
    const annotations = [
      createTestAnnotation(),
      createTestAnnotation({ id: 'margin.at:did:plc:test123:def' }),
    ];
    vi.mocked(mockIndexer.getAnnotationsForUrl).mockResolvedValueOnce(Ok(annotations));

    const res = await app.request('/api/v1/external-annotations?url=https://example.com/article');
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      annotations: ExternalAnnotationView[];
      cursor: string | null;
    };
    expect(body.annotations).toHaveLength(2);
    expect(body.annotations[0]?.source).toBe('margin.at');
    expect(body.cursor).toBeNull();
  });

  it('returns empty array when no annotations found', async () => {
    vi.mocked(mockIndexer.getAnnotationsForUrl).mockResolvedValueOnce(Ok([]));

    const res = await app.request('/api/v1/external-annotations?url=https://example.com/nothing');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { annotations: ExternalAnnotationView[] };
    expect(body.annotations).toHaveLength(0);
  });

  it('passes limit parameter to the indexer', async () => {
    vi.mocked(mockIndexer.getAnnotationsForUrl).mockResolvedValueOnce(Ok([]));

    await app.request('/api/v1/external-annotations?url=https://example.com&limit=25');

    expect(mockIndexer.getAnnotationsForUrl).toHaveBeenCalledWith('https://example.com', 25);
  });

  it('clamps limit to MAX_LIMIT', async () => {
    vi.mocked(mockIndexer.getAnnotationsForUrl).mockResolvedValueOnce(Ok([]));

    await app.request('/api/v1/external-annotations?url=https://example.com&limit=999');

    expect(mockIndexer.getAnnotationsForUrl).toHaveBeenCalledWith('https://example.com', MAX_LIMIT);
  });

  it('returns 502 when indexer returns an error', async () => {
    vi.mocked(mockIndexer.getAnnotationsForUrl).mockResolvedValueOnce(
      Err(new InteropError('Database connection failed', 'margin.at', 'at.margin.annotation')),
    );

    const res = await app.request('/api/v1/external-annotations?url=https://example.com');
    expect(res.status).toBe(502);

    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('INTEROP_ERROR');
    expect(body.message).toContain('Database connection failed');
  });
});

describe('GET /api/v1/external-annotations/stats', () => {
  let app: Hono;
  let mockIndexer: IMarginIndexer;

  beforeEach(() => {
    app = new Hono();
    mockIndexer = createMockMarginIndexer();
    externalAnnotationsRoutes(app, { marginIndexer: mockIndexer });
  });

  it('returns 400 when url param is missing', async () => {
    const res = await app.request('/api/v1/external-annotations/stats');
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid URL', async () => {
    const res = await app.request('/api/v1/external-annotations/stats?url=bad');
    expect(res.status).toBe(400);
  });

  it('returns count and sources for valid URL', async () => {
    const annotations = [
      createTestAnnotation(),
      createTestAnnotation({ id: 'margin.at:did:plc:test123:def' }),
    ];
    vi.mocked(mockIndexer.getAnnotationsForUrl).mockResolvedValueOnce(Ok(annotations));

    const res = await app.request('/api/v1/external-annotations/stats?url=https://example.com');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { count: number; sources: string[] };
    expect(body.count).toBe(2);
    expect(body.sources).toEqual(['margin.at']);
  });

  it('returns zero count when no annotations exist', async () => {
    vi.mocked(mockIndexer.getAnnotationsForUrl).mockResolvedValueOnce(Ok([]));

    const res = await app.request('/api/v1/external-annotations/stats?url=https://example.com');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { count: number; sources: string[] };
    expect(body.count).toBe(0);
    expect(body.sources).toEqual([]);
  });

  it('returns 502 when indexer returns an error', async () => {
    vi.mocked(mockIndexer.getAnnotationsForUrl).mockResolvedValueOnce(
      Err(new InteropError('Query failed', 'margin.at', 'at.margin.annotation')),
    );

    const res = await app.request('/api/v1/external-annotations/stats?url=https://example.com');
    expect(res.status).toBe(502);
  });
});
