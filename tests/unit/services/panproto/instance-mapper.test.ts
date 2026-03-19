/**
 * Unit tests for the panproto instance mapper.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { fromLayersData, toImportResult } from '@/services/panproto/instance-mapper.js';

// ---------------------------------------------------------------------------
// toImportResult
// ---------------------------------------------------------------------------

describe('toImportResult', () => {
  it('extracts expressions from the view', () => {
    const view = {
      expressions: [
        { text: 'The cat sat.', language: 'en' },
        { text: 'Le chat est assis.', language: 'fr' },
      ],
    };

    const result = toImportResult(view, 'conllu', new Uint8Array(), 'lens');

    expect(result.expressions).toHaveLength(2);
    expect(result.expressions[0]).toEqual({
      text: 'The cat sat.',
      language: 'en',
      sourceFormat: 'conllu',
    });
    expect(result.expressions[1]).toEqual({
      text: 'Le chat est assis.',
      language: 'fr',
      sourceFormat: 'conllu',
    });
  });

  it('extracts segmentations from the view', () => {
    const view = {
      segmentations: [{ tokens: ['The', 'cat', 'sat'], strategy: 'whitespace' }],
    };

    const result = toImportResult(view, 'brat', new Uint8Array(), 'iso');

    expect(result.segmentations).toHaveLength(1);
    expect(result.segmentations[0]).toEqual({
      tokens: ['The', 'cat', 'sat'],
      strategy: 'whitespace',
      sourceFormat: 'brat',
    });
  });

  it('extracts annotation layers from the view', () => {
    const view = {
      annotationLayers: [{ kind: 'token-tag', subkind: 'pos', annotations: [{ label: 'NN' }] }],
    };

    const result = toImportResult(view, 'elan', new Uint8Array(), 'lens');

    expect(result.annotationLayers).toHaveLength(1);
    expect(result.annotationLayers[0]).toEqual({
      kind: 'token-tag',
      subkind: 'pos',
      annotations: [{ label: 'NN' }],
      sourceFormat: 'elan',
    });
  });

  it('returns empty arrays for an empty view', () => {
    const result = toImportResult({}, 'conllu', new Uint8Array(), undefined);

    expect(result.expressions).toHaveLength(0);
    expect(result.segmentations).toHaveLength(0);
    expect(result.annotationLayers).toHaveLength(0);
    expect(result.format).toBe('conllu');
  });

  it('returns empty arrays for null/undefined view', () => {
    const result = toImportResult(null, 'conllu', new Uint8Array(), undefined);

    expect(result.expressions).toHaveLength(0);
    expect(result.segmentations).toHaveLength(0);
    expect(result.annotationLayers).toHaveLength(0);
  });

  it('sets format on the result', () => {
    const result = toImportResult({}, 'tei', new Uint8Array(), undefined);
    expect(result.format).toBe('tei');
  });

  it('includes complement in metadata when non-empty', () => {
    const complement = new Uint8Array([1, 2, 3, 4]);
    const result = toImportResult({}, 'conllu', complement, undefined);

    expect(result.metadata._complement).toBe(complement);
  });

  it('omits complement from metadata when empty', () => {
    const result = toImportResult({}, 'conllu', new Uint8Array(), undefined);

    expect(result.metadata._complement).toBeUndefined();
  });

  it('includes opticKind in metadata when provided', () => {
    const result = toImportResult({}, 'conllu', new Uint8Array(), 'lens');
    expect(result.metadata.opticKind).toBe('lens');
  });

  it('normalizes opticKind to lowercase', () => {
    const result = toImportResult({}, 'conllu', new Uint8Array(), 'ISO');
    expect(result.metadata.opticKind).toBe('iso');
  });

  it('omits opticKind from metadata when undefined', () => {
    const result = toImportResult({}, 'conllu', new Uint8Array(), undefined);
    expect(result.metadata.opticKind).toBeUndefined();
  });

  it('omits opticKind from metadata for unrecognized values', () => {
    const result = toImportResult({}, 'conllu', new Uint8Array(), 'unknown_kind');
    expect(result.metadata.opticKind).toBeUndefined();
  });

  it('recognizes all valid optic kinds', () => {
    const validKinds = ['iso', 'lens', 'prism', 'affine', 'traversal'] as const;
    for (const kind of validKinds) {
      const result = toImportResult({}, 'conllu', new Uint8Array(), kind);
      expect(result.metadata.opticKind).toBe(kind);
    }
  });

  it('preserves extra fields in expressions', () => {
    const view = {
      expressions: [{ text: 'test', customField: 42 }],
    };
    const result = toImportResult(view, 'conllu', new Uint8Array(), undefined);
    expect(result.expressions[0]).toHaveProperty('customField', 42);
  });

  it('combines complement and opticKind in metadata', () => {
    const complement = new Uint8Array([5, 6]);
    const result = toImportResult({}, 'brat', complement, 'prism');

    expect(result.metadata.opticKind).toBe('prism');
    expect(result.metadata._complement).toBe(complement);
  });
});

// ---------------------------------------------------------------------------
// fromLayersData
// ---------------------------------------------------------------------------

describe('fromLayersData', () => {
  it('produces a view with expressions, segmentations, and annotationLayers', () => {
    const expressions = [{ text: 'hello', language: 'en' }];
    const segmentations = [{ tokens: ['hello'], strategy: 'whitespace' }];
    const layers = [{ kind: 'token-tag', subkind: 'pos' }];

    const view = fromLayersData(expressions, segmentations, layers) as Record<string, unknown>;

    expect(view).toHaveProperty('expressions');
    expect(view).toHaveProperty('segmentations');
    expect(view).toHaveProperty('annotationLayers');
  });

  it('strips Layers-specific metadata keys', () => {
    const expressions = [
      {
        text: 'hello',
        sourceFormat: 'conllu',
        uri: 'at://did:plc:abc/pub.layers.expression.expression/123',
        cid: 'bafyreig...',
        did: 'did:plc:abc',
        rkey: '123',
        pds_url: 'https://example.com',
        indexed_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    const view = fromLayersData(expressions, [], []) as {
      expressions: Record<string, unknown>[];
    };

    const cleaned = view.expressions[0]!;
    expect(cleaned).toHaveProperty('text', 'hello');
    expect(cleaned).not.toHaveProperty('sourceFormat');
    expect(cleaned).not.toHaveProperty('uri');
    expect(cleaned).not.toHaveProperty('cid');
    expect(cleaned).not.toHaveProperty('did');
    expect(cleaned).not.toHaveProperty('rkey');
    expect(cleaned).not.toHaveProperty('pds_url');
    expect(cleaned).not.toHaveProperty('indexed_at');
    expect(cleaned).not.toHaveProperty('created_at');
  });

  it('preserves non-metadata keys', () => {
    const expressions = [{ text: 'hello', language: 'en', customField: 'preserved' }];

    const view = fromLayersData(expressions, [], []) as {
      expressions: Record<string, unknown>[];
    };

    expect(view.expressions[0]).toHaveProperty('text', 'hello');
    expect(view.expressions[0]).toHaveProperty('language', 'en');
    expect(view.expressions[0]).toHaveProperty('customField', 'preserved');
  });

  it('handles empty arrays', () => {
    const view = fromLayersData([], [], []) as {
      expressions: unknown[];
      segmentations: unknown[];
      annotationLayers: unknown[];
    };

    expect(view.expressions).toHaveLength(0);
    expect(view.segmentations).toHaveLength(0);
    expect(view.annotationLayers).toHaveLength(0);
  });

  it('strips metadata keys from segmentations', () => {
    const segmentations = [
      { tokens: ['a'], sourceFormat: 'conllu', uri: 'at://test', strategy: 'ws' },
    ];

    const view = fromLayersData([], segmentations, []) as {
      segmentations: Record<string, unknown>[];
    };

    expect(view.segmentations[0]).toHaveProperty('tokens');
    expect(view.segmentations[0]).toHaveProperty('strategy', 'ws');
    expect(view.segmentations[0]).not.toHaveProperty('sourceFormat');
    expect(view.segmentations[0]).not.toHaveProperty('uri');
  });

  it('strips metadata keys from annotation layers', () => {
    const layers = [
      {
        kind: 'span',
        sourceFormat: 'brat',
        uri: 'at://test',
        cid: 'bafyreig...',
      },
    ];

    const view = fromLayersData([], [], layers) as {
      annotationLayers: Record<string, unknown>[];
    };

    expect(view.annotationLayers[0]).toHaveProperty('kind', 'span');
    expect(view.annotationLayers[0]).not.toHaveProperty('sourceFormat');
    expect(view.annotationLayers[0]).not.toHaveProperty('uri');
    expect(view.annotationLayers[0]).not.toHaveProperty('cid');
  });
});
