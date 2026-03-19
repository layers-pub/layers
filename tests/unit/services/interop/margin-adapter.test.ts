/**
 * Unit tests for the margin.at adapter.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { MarginAdapter, MOTIVATION_LABELS } from '@/services/interop/margin-adapter.js';
import type { MarginAnnotationRecord } from '@/services/interop/margin-adapter.js';

function createRecord(overrides?: Partial<MarginAnnotationRecord>): MarginAnnotationRecord {
  return {
    $type: 'at.margin.annotation',
    target: {
      source: 'https://example.com/article',
    },
    body: {
      type: 'TextualBody',
      value: 'This is a comment',
      format: 'text/plain',
    },
    motivation: 'commenting',
    creator: 'did:plc:testuser1',
    created: '2026-01-15T12:00:00Z',
    ...overrides,
  };
}

describe('MarginAdapter', () => {
  const adapter = new MarginAdapter();

  describe('toAnnotationView', () => {
    it('converts a valid record to ExternalAnnotationView', () => {
      const record = createRecord();
      const result = adapter.toAnnotationView(record, 'did:plc:testuser1', 'abc123');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.id).toBe('margin.at:did:plc:testuser1:abc123');
      expect(result.value.source).toBe('margin.at');
      expect(result.value.uri).toBe('at://did:plc:testuser1/at.margin.annotation/abc123');
      expect(result.value.creatorDid).toBe('did:plc:testuser1');
      expect(result.value.targetUrl).toBe('https://example.com/article');
      expect(result.value.text).toBe('This is a comment');
      expect(result.value.kind).toBe('Comment');
      expect(result.value.motivation).toBe('commenting');
      expect(result.value.createdAt).toBe('2026-01-15T12:00:00Z');
      expect(result.value.format).toBe('text/plain');
    });

    it('returns error when target.source is missing', () => {
      const record = createRecord({
        target: { source: '' },
      });

      // Empty source should still be treated as missing by the adapter's check
      // The adapter checks for !marginRecord.target?.source
      const result = adapter.toAnnotationView(record, 'did:plc:test', 'rkey');
      expect(result.ok).toBe(false);
    });

    it('returns error when body.value is missing', () => {
      const record = createRecord({
        body: { type: 'TextualBody', value: undefined as unknown as string },
      });
      const result = adapter.toAnnotationView(record, 'did:plc:test', 'rkey');
      expect(result.ok).toBe(false);
    });

    it('maps all motivation values to display labels', () => {
      const motivations = Object.keys(MOTIVATION_LABELS) as (keyof typeof MOTIVATION_LABELS)[];
      for (const motivation of motivations) {
        const record = createRecord({ motivation });
        const result = adapter.toAnnotationView(record, 'did:plc:test', 'rkey');
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.kind).toBe(MOTIVATION_LABELS[motivation]);
        }
      }
    });

    it('uses record creator when available, falls back to DID', () => {
      const withCreator = createRecord({ creator: 'did:plc:creator1' });
      const result1 = adapter.toAnnotationView(withCreator, 'did:plc:owner', 'rkey');
      expect(result1.ok && result1.value.creatorDid).toBe('did:plc:creator1');

      const noCreator = createRecord({ creator: '' });
      const result2 = adapter.toAnnotationView(noCreator, 'did:plc:owner', 'rkey');
      expect(result2.ok && result2.value.creatorDid).toBe('did:plc:owner');
    });

    it('handles missing body.format gracefully', () => {
      const record = createRecord({
        body: { type: 'TextualBody', value: 'text' },
      });
      const result = adapter.toAnnotationView(record, 'did:plc:test', 'rkey');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.format).toBeUndefined();
      }
    });

    it('accepts empty string body value', () => {
      const record = createRecord({
        body: { type: 'TextualBody', value: '' },
      });
      const result = adapter.toAnnotationView(record, 'did:plc:test', 'rkey');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.text).toBe('');
      }
    });
  });

  describe('matchesExpression', () => {
    it('returns true when URLs match exactly', () => {
      const record = createRecord({ target: { source: 'https://example.com/article' } });
      expect(adapter.matchesExpression(record, 'https://example.com/article')).toBe(true);
    });

    it('normalizes trailing slashes', () => {
      const record = createRecord({ target: { source: 'https://example.com/article/' } });
      expect(adapter.matchesExpression(record, 'https://example.com/article')).toBe(true);
    });

    it('ignores fragment identifiers', () => {
      const record = createRecord({ target: { source: 'https://example.com/article#section1' } });
      expect(adapter.matchesExpression(record, 'https://example.com/article')).toBe(true);
    });

    it('returns false for different URLs', () => {
      const record = createRecord({ target: { source: 'https://example.com/other' } });
      expect(adapter.matchesExpression(record, 'https://example.com/article')).toBe(false);
    });

    it('returns false when target source is missing', () => {
      const record = createRecord({ target: { source: '' } });
      expect(adapter.matchesExpression(record, 'https://example.com/article')).toBe(false);
    });
  });

  describe('extractSelectors', () => {
    it('returns empty array when no selector present', () => {
      const record = createRecord();
      expect(adapter.extractSelectors(record)).toEqual([]);
    });

    it('returns the selector when present', () => {
      const record = createRecord({
        target: {
          source: 'https://example.com',
          selector: { type: 'TextPositionSelector', start: 0, end: 10 },
        },
      });
      const selectors = adapter.extractSelectors(record);
      expect(selectors).toHaveLength(1);
      expect(selectors[0]?.type).toBe('TextPositionSelector');
    });
  });

  describe('resolveAnchor', () => {
    it('resolves TextPositionSelector to textSpan anchor', () => {
      const record = createRecord({
        target: {
          source: 'https://example.com',
          selector: { type: 'TextPositionSelector', start: 4, end: 7 },
        },
      });
      const anchor = adapter.resolveAnchor(record, 'The cat sat on the mat.');
      expect(anchor).toEqual({ type: 'textSpan', byteStart: 4, byteEnd: 7 });
    });

    it('resolves TextQuoteSelector to textSpan anchor', () => {
      const record = createRecord({
        target: {
          source: 'https://example.com',
          selector: { type: 'TextQuoteSelector', exact: 'cat', prefix: 'The ', suffix: ' sat' },
        },
      });
      const anchor = adapter.resolveAnchor(record, 'The cat sat on the mat.');
      expect(anchor).toEqual({ type: 'textSpan', byteStart: 4, byteEnd: 7 });
    });

    it('returns undefined for FragmentSelector', () => {
      const record = createRecord({
        target: {
          source: 'https://example.com',
          selector: { type: 'FragmentSelector', value: 'xywh=100,100,300,200' },
        },
      });
      const anchor = adapter.resolveAnchor(record, 'The cat sat on the mat.');
      expect(anchor).toBeUndefined();
    });

    it('returns undefined when no selector present', () => {
      const record = createRecord();
      const anchor = adapter.resolveAnchor(record, 'The cat sat on the mat.');
      expect(anchor).toBeUndefined();
    });

    it('returns undefined when TextQuoteSelector exact text is not found', () => {
      const record = createRecord({
        target: {
          source: 'https://example.com',
          selector: { type: 'TextQuoteSelector', exact: 'nonexistent' },
        },
      });
      const anchor = adapter.resolveAnchor(record, 'The cat sat on the mat.');
      expect(anchor).toBeUndefined();
    });
  });
});
