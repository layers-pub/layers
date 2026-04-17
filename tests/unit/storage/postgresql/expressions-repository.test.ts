/**
 * Unit tests for cursor encoding/decoding and expression data transformation.
 *
 * Tests pure functions from the base repository and expression types,
 * which do not require database connections.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from '@/storage/base-repository.js';
import { expressionRecordSchema, toExpressionView } from '@/types/expression.js';
import type { ExpressionRow } from '@/types/expression.js';

describe('encodeCursor', () => {
  it('creates a valid base64url string', () => {
    const date = new Date('2026-01-15T12:00:00Z');
    const uri = 'at://did:plc:testuser1/pub.layers.expression.expression/abc123';

    const cursor = encodeCursor(date, uri);

    expect(typeof cursor).toBe('string');
    expect(cursor.length).toBeGreaterThan(0);
    // base64url characters only (no +, /, or =)
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('decodeCursor', () => {
  it('round-trips correctly', () => {
    const date = new Date('2026-01-15T12:00:00Z');
    const uri = 'at://did:plc:testuser1/pub.layers.expression.expression/abc123';

    const cursor = encodeCursor(date, uri);
    const decoded = decodeCursor(cursor);

    expect(decoded).not.toBeNull();
    expect(decoded?.indexedAt).toBe(date.toISOString());
    expect(decoded?.uri).toBe(uri);
  });

  it('returns null for invalid cursors', () => {
    expect(decodeCursor('not-a-valid-cursor')).toBeNull();
    expect(decodeCursor('')).toBeNull();

    // A base64url string that decodes to something without "::"
    const noPipe = Buffer.from('no-separator-here').toString('base64url');
    expect(decodeCursor(noPipe)).toBeNull();
  });
});

describe('expressionRecordSchema', () => {
  it('validates a complete valid record', () => {
    const record = {
      id: 'expr-001',
      text: 'The cat sat on the mat.',
      kind: 'sentence',
      language: 'en',
      languages: ['en'],
      parentRef: 'at://did:plc:abc/pub.layers.expression.expression/parent1',
      sourceUrl: 'https://example.com/source',
      sourceRef: 'at://did:plc:abc/pub.layers.expression.expression/src1',
      eprintRef: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
      mediaBlob: { $type: 'blob', ref: { $link: 'bafyabc123' }, mimeType: 'image/png', size: 1024 },
      knowledgeRefs: [{ source: 'wikidata', identifier: 'Q123', label: 'Cat' }],
      metadata: { domain: 'linguistics' },
      features: { tokenCount: 6 },
      createdAt: '2026-01-15T12:00:00Z',
    };

    const result = expressionRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });

  it('validates a minimal valid record (id + kind + createdAt)', () => {
    const record = {
      id: 'expr-minimal',
      kind: 'sentence',
      createdAt: '2026-01-15T12:00:00Z',
    };

    const result = expressionRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });

  it('rejects records missing required id', () => {
    const record = {
      createdAt: '2026-01-15T12:00:00Z',
      text: 'Missing id field',
    };

    const result = expressionRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
  });

  it('rejects records missing required createdAt', () => {
    const record = {
      id: 'expr-no-date',
      text: 'Missing createdAt field',
    };

    const result = expressionRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
  });
});

describe('toExpressionView', () => {
  it('transforms snake_case row to camelCase view', () => {
    const row: ExpressionRow = {
      uri: 'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
      did: 'did:plc:testuser1',
      rkey: 'abc123',
      text: 'The cat sat on the mat.',
      kind: 'sentence',
      language: 'en',
      source_url: 'https://example.com/source',
      source_ref: 'at://did:plc:abc/pub.layers.expression.expression/src1',
      eprint_ref: 'at://did:plc:abc/pub.layers.eprint.eprint/ep1',
      parent_ref: 'at://did:plc:abc/pub.layers.expression.expression/parent1',
      indexed_at: new Date('2026-01-15T12:00:00Z'),
      record: {
        id: 'expr-001',
        kind: 'text',
        text: 'The cat sat on the mat.',
        createdAt: '2026-01-15T12:00:00Z',
      },
    };

    const view = toExpressionView(row);

    expect(view.uri).toBe(row.uri);
    expect(view.did).toBe(row.did);
    expect(view.rkey).toBe(row.rkey);
    expect(view.text).toBe(row.text);
    expect(view.kind).toBe(row.kind);
    expect(view.language).toBe(row.language);
    expect(view.sourceUrl).toBe(row.source_url);
    expect(view.sourceRef).toBe(row.source_ref);
    expect(view.eprintRef).toBe(row.eprint_ref);
    expect(view.parentRef).toBe(row.parent_ref);
    expect(view.indexedAt).toBe('2026-01-15T12:00:00.000Z');
    expect(view.record).toBe(row.record);

    // Verify the view has no snake_case keys
    expect('source_url' in view).toBe(false);
    expect('source_ref' in view).toBe(false);
    expect('eprint_ref' in view).toBe(false);
    expect('parent_ref' in view).toBe(false);
    expect('indexed_at' in view).toBe(false);
  });
});
