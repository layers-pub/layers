/**
 * Tests for the annotation mapping functions.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';

import { mapAnnotation, mapAnnotations, mapAnchor } from '@/components/annotations/map-annotation';
import type { ApiAnnotation } from '@/components/annotations/map-annotation';

function makeApiAnnotation(overrides: Partial<ApiAnnotation>): ApiAnnotation {
  return {
    uuid: { value: 'test-uuid-1' },
    ...overrides,
  } as ApiAnnotation;
}

describe('mapAnnotation', () => {
  it('maps uuid.value to id', () => {
    const raw = makeApiAnnotation({ uuid: { value: 'abc-123' } });
    const result = mapAnnotation(raw);
    expect(result.id).toBe('abc-123');
  });

  it('maps label and value fields', () => {
    const raw = makeApiAnnotation({ label: 'NN', value: 'noun' });
    const result = mapAnnotation(raw);
    expect(result.label).toBe('NN');
    expect(result.value).toBe('noun');
  });

  it('falls back to text when value is absent', () => {
    const raw = makeApiAnnotation({ label: 'POS', text: 'running' });
    const result = mapAnnotation(raw);
    expect(result.value).toBe('running');
  });

  it('maps confidence and headIndex', () => {
    const raw = makeApiAnnotation({ confidence: 950, headIndex: 3 });
    const result = mapAnnotation(raw);
    expect(result.confidence).toBe(950);
    expect(result.headIndex).toBe(3);
  });

  it('maps parentId from uuid object', () => {
    const raw = makeApiAnnotation({ parentId: { value: 'parent-uuid' } });
    const result = mapAnnotation(raw);
    expect(result.parentId).toBe('parent-uuid');
  });

  it('handles missing optional fields', () => {
    const raw = makeApiAnnotation({});
    const result = mapAnnotation(raw);
    expect(result.id).toBe('test-uuid-1');
    expect(result.label).toBe('');
    expect(result.value).toBeUndefined();
    expect(result.anchor).toBeUndefined();
    expect(result.confidence).toBeUndefined();
    expect(result.arguments).toBeUndefined();
    expect(result.headIndex).toBeUndefined();
    expect(result.parentId).toBeUndefined();
  });
});

describe('mapAnchor', () => {
  it('returns undefined for undefined input', () => {
    expect(mapAnchor(undefined)).toBeUndefined();
  });

  it('maps textSpan anchor (start, ending to start, end)', () => {
    const result = mapAnchor({ textSpan: { start: 5, ending: 10 } } as Parameters<typeof mapAnchor>[0]);
    expect(result).toEqual({
      type: 'textSpan',
      start: 5,
      end: 10,
    });
  });

  it('maps tokenRef anchor', () => {
    const result = mapAnchor({ tokenRef: { tokenIndex: 3 } } as Parameters<typeof mapAnchor>[0]);
    expect(result).toEqual({
      type: 'tokenRef',
      tokenIndex: 3,
    });
  });

  it('maps temporalSpan anchor (ms to seconds)', () => {
    const result = mapAnchor({
      temporalSpan: { start: 1500, ending: 3000 },
    } as Parameters<typeof mapAnchor>[0]);
    expect(result).toEqual({
      type: 'temporalSpan',
      startTime: 1.5,
      endTime: 3.0,
    });
  });

  it('maps tokenRefSequence anchor', () => {
    const result = mapAnchor({
      tokenRefSequence: { tokenIndexes: [0, 1, 2] },
    } as Parameters<typeof mapAnchor>[0]);
    expect(result).toEqual({
      type: 'tokenRefSequence',
      tokenIndices: [0, 1, 2],
    });
  });

  it('returns undefined for empty anchor object', () => {
    const result = mapAnchor({} as Parameters<typeof mapAnchor>[0]);
    expect(result).toBeUndefined();
  });
});

describe('mapAnnotations (array)', () => {
  it('maps empty array to empty array', () => {
    expect(mapAnnotations([])).toEqual([]);
  });

  it('maps multiple annotations', () => {
    const raw: ApiAnnotation[] = [
      makeApiAnnotation({ uuid: { value: 'a' }, label: 'DT' }),
      makeApiAnnotation({ uuid: { value: 'b' }, label: 'NN' }),
    ];
    const result = mapAnnotations(raw);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a');
    expect(result[0]!.label).toBe('DT');
    expect(result[1]!.id).toBe('b');
    expect(result[1]!.label).toBe('NN');
  });
});

describe('mapAnnotation arguments', () => {
  it('maps arguments with localId', () => {
    const raw = makeApiAnnotation({
      arguments: [
        {
          role: 'Agent',
          target: { localId: { value: 'local-1' } },
        },
      ],
    } as Partial<ApiAnnotation>);
    const result = mapAnnotation(raw);
    expect(result.arguments).toEqual([
      { role: 'Agent', targetId: 'local-1' },
    ]);
  });

  it('maps arguments with objectId', () => {
    const raw = makeApiAnnotation({
      arguments: [
        {
          role: 'Theme',
          target: { objectId: { value: 'at://did:plc:test/pub.layers.annotation/abc' } },
        },
      ],
    } as Partial<ApiAnnotation>);
    const result = mapAnnotation(raw);
    expect(result.arguments).toEqual([
      { role: 'Theme', targetId: 'at://did:plc:test/pub.layers.annotation/abc' },
    ]);
  });

  it('falls back to empty string when neither localId nor objectId is present', () => {
    const raw = makeApiAnnotation({
      arguments: [
        {
          role: 'Arg0',
          target: {},
        },
      ],
    } as Partial<ApiAnnotation>);
    const result = mapAnnotation(raw);
    expect(result.arguments).toEqual([
      { role: 'Arg0', targetId: '' },
    ]);
  });

  it('returns undefined for empty arguments array', () => {
    const raw = makeApiAnnotation({ arguments: [] });
    const result = mapAnnotation(raw);
    expect(result.arguments).toBeUndefined();
  });

  it('returns undefined when arguments field is absent', () => {
    const raw = makeApiAnnotation({});
    const result = mapAnnotation(raw);
    expect(result.arguments).toBeUndefined();
  });
});
