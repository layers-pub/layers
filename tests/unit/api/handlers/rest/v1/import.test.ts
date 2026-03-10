/**
 * Unit tests for import REST handlers.
 *
 * @module
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { importRoutes, normalizeFormat, SUPPORTED_FORMATS } from '@/api/handlers/rest/v1/import.js';
import { PluginRegistry } from '@/plugins/plugin-registry.js';
import type { IFormatImporter, ImportResult } from '@/types/interfaces/plugin.interface.js';
import { Ok, Err } from '@/types/result.js';
import { ValidationError, PluginError } from '@/types/errors.js';

/**
 * Creates a mock format importer.
 */
function createMockImporter(
  format: 'conll' | 'brat' | 'elan' | 'tei' | 'praat' = 'conll',
): IFormatImporter {
  return {
    format,
    name: `Mock ${format} importer`,
    version: '1.0.0',
    parse: vi.fn().mockResolvedValue(
      Ok({
        format,
        expressions: [{ text: 'hello' }],
        segmentations: [{ tokens: ['hello'] }],
        annotationLayers: [{ annotations: [] }, { annotations: [] }],
        metadata: { source: 'test' },
      } satisfies ImportResult),
    ),
    validate: vi.fn().mockReturnValue(Ok(undefined)),
  };
}

/**
 * Builds a FormData body for the import request.
 */
function buildFormData(fileContent: string, format: string, mappings?: string): FormData {
  const formData = new FormData();
  const file = new File([fileContent], 'test.conllu', { type: 'text/plain' });
  formData.append('file', file);
  formData.append('format', format);
  if (mappings) {
    formData.append('mappings', mappings);
  }
  return formData;
}

describe('normalizeFormat', () => {
  it('maps lowercase canonical formats directly', () => {
    expect(normalizeFormat('conll')).toBe('conll');
    expect(normalizeFormat('brat')).toBe('brat');
    expect(normalizeFormat('elan')).toBe('elan');
    expect(normalizeFormat('tei')).toBe('tei');
    expect(normalizeFormat('praat')).toBe('praat');
  });

  it('maps display-style names to canonical formats', () => {
    expect(normalizeFormat('CoNLL-U')).toBe('conll');
    expect(normalizeFormat('BRAT')).toBe('brat');
    expect(normalizeFormat('ELAN')).toBe('elan');
    expect(normalizeFormat('TEI XML')).toBe('tei');
    expect(normalizeFormat('Praat TextGrid')).toBe('praat');
  });

  it('handles extra whitespace', () => {
    expect(normalizeFormat('  conll  ')).toBe('conll');
    expect(normalizeFormat('  tei xml  ')).toBe('tei');
  });

  it('returns undefined for unsupported formats', () => {
    expect(normalizeFormat('csv')).toBeUndefined();
    expect(normalizeFormat('')).toBeUndefined();
    expect(normalizeFormat('unknown')).toBeUndefined();
  });
});

describe('SUPPORTED_FORMATS', () => {
  it('contains all five formats', () => {
    expect(SUPPORTED_FORMATS).toHaveLength(5);
    const ids = SUPPORTED_FORMATS.map((f) => f.id);
    expect(ids).toContain('conll');
    expect(ids).toContain('brat');
    expect(ids).toContain('elan');
    expect(ids).toContain('tei');
    expect(ids).toContain('praat');
  });

  it('each format has extensions and a description', () => {
    for (const format of SUPPORTED_FORMATS) {
      expect(format.extensions.length).toBeGreaterThan(0);
      expect(format.description.length).toBeGreaterThan(0);
      expect(format.name.length).toBeGreaterThan(0);
    }
  });
});

describe('GET /api/v1/import/formats', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    const registry = new PluginRegistry();
    importRoutes(app, registry);
  });

  it('returns all supported formats', async () => {
    const res = await app.request('/api/v1/import/formats');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { formats: unknown[] };
    expect(body.formats).toHaveLength(5);
  });
});

describe('POST /api/v1/import', () => {
  let app: Hono;
  let registry: PluginRegistry;
  let mockImporter: IFormatImporter;

  beforeEach(() => {
    app = new Hono();
    registry = new PluginRegistry();
    mockImporter = createMockImporter('conll');
    registry.register(mockImporter);

    // Simulate auth middleware by setting user context
    app.use('*', async (c, next) => {
      c.set('auth' as never, { did: 'did:plc:testuser1', authenticated: true });
      await next();
    });

    importRoutes(app, registry);
  });

  it('returns 400 when no file is provided', async () => {
    const formData = new FormData();
    formData.append('format', 'conll');

    const res = await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when format is missing', async () => {
    const formData = new FormData();
    const file = new File(['content'], 'test.txt');
    formData.append('file', file);

    const res = await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for unsupported format', async () => {
    const formData = buildFormData('some data', 'csv');

    const res = await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Unsupported format');
  });

  it('returns 400 when validation fails', async () => {
    vi.mocked(mockImporter.validate).mockReturnValueOnce(
      Err(new ValidationError('Invalid CoNLL-U', 'format', 'malformed')),
    );

    const formData = buildFormData('bad data', 'conll');

    const res = await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('validation failed');
  });

  it('returns 500 when parse fails', async () => {
    vi.mocked(mockImporter.parse).mockResolvedValueOnce(
      Err(new PluginError('conll-importer', 'import', 'Parse error')),
    );

    const formData = buildFormData('some data', 'conll');

    const res = await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_ERROR');
  });

  it('returns success with counts on valid import', async () => {
    const formData = buildFormData('valid conll data', 'conll');

    const res = await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      counts: { expressions: number; segmentations: number; layers: number };
      format: string;
      metadata: Record<string, unknown>;
    };

    expect(body.success).toBe(true);
    expect(body.counts.expressions).toBe(1);
    expect(body.counts.segmentations).toBe(1);
    expect(body.counts.layers).toBe(2);
    expect(body.format).toBe('conll');
    expect(body.metadata).toEqual({ source: 'test' });
  });

  it('passes mappings to the parser', async () => {
    const mappings = JSON.stringify([
      { sourceField: 'POS', targetField: 'upos', transform: 'lowercase' },
    ]);
    const formData = buildFormData('valid conll data', 'conll', mappings);

    await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(mockImporter.parse).toHaveBeenCalledWith('valid conll data', {
      mappings: [{ sourceField: 'POS', targetField: 'upos', transform: 'lowercase' }],
    });
  });

  it('accepts display-style format names', async () => {
    const formData = buildFormData('valid data', 'CoNLL-U');

    const res = await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/import (unauthenticated)', () => {
  let app: Hono;
  let registry: PluginRegistry;

  beforeEach(() => {
    app = new Hono();
    registry = new PluginRegistry();
    registry.register(createMockImporter('conll'));

    // Simulate anonymous auth context
    app.use('*', async (c, next) => {
      c.set('auth' as never, { did: null, authenticated: false });
      await next();
    });

    importRoutes(app, registry);
  });

  it('returns 401 when not authenticated', async () => {
    const formData = buildFormData('some data', 'conll');

    const res = await app.request('/api/v1/import', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AUTHENTICATION_ERROR');
  });
});

describe('POST /api/v1/import/validate', () => {
  let app: Hono;
  let registry: PluginRegistry;
  let mockImporter: IFormatImporter;

  beforeEach(() => {
    app = new Hono();
    registry = new PluginRegistry();
    mockImporter = createMockImporter('conll');
    registry.register(mockImporter);
    importRoutes(app, registry);
  });

  it('returns valid with preview counts on success', async () => {
    const formData = buildFormData('valid data', 'conll');

    const res = await app.request('/api/v1/import/validate', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      valid: boolean;
      preview: { expressions: number; segmentations: number; layers: number };
    };

    expect(body.valid).toBe(true);
    expect(body.preview.expressions).toBe(1);
    expect(body.preview.segmentations).toBe(1);
    expect(body.preview.layers).toBe(2);
  });

  it('returns invalid with errors on validation failure', async () => {
    vi.mocked(mockImporter.validate).mockReturnValueOnce(
      Err(new ValidationError('Bad format', 'structure', 'malformed')),
    );

    const formData = buildFormData('bad data', 'conll');

    const res = await app.request('/api/v1/import/validate', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean; errors: string[] };
    expect(body.valid).toBe(false);
    expect(body.errors).toContain('Bad format');
  });

  it('returns 400 when no file is provided', async () => {
    const formData = new FormData();
    formData.append('format', 'conll');

    const res = await app.request('/api/v1/import/validate', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported format', async () => {
    const formData = buildFormData('data', 'unknown-format');

    const res = await app.request('/api/v1/import/validate', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
  });
});
