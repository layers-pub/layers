import { describe, expect, it } from 'vitest';

import {
  getRecordKindByNsid,
  getRecordKindBySlug,
  recordKindList,
  recordKinds,
  resolveKindFromUri,
} from '@/lib/generated/record-registry';

describe('record-registry (generated)', () => {
  it('registers exactly 26 record kinds', () => {
    expect(recordKindList).toHaveLength(26);
  });

  it('every kind has a discovered list + get endpoint', () => {
    for (const kind of recordKindList) {
      expect(kind.listEndpoint, kind.nsid).toMatch(/^pub\.layers\./);
      expect(kind.getEndpoint, kind.nsid).toMatch(/^pub\.layers\./);
    }
  });

  it('exposes listParams for every kind', () => {
    for (const kind of recordKindList) {
      expect(Array.isArray(kind.listParams), kind.nsid).toBe(true);
      // All 26 Layers list endpoints define at least a limit/cursor pair.
      expect(kind.listParams.length, kind.nsid).toBeGreaterThanOrEqual(2);
    }
  });

  it('getRecordKindBySlug and getRecordKindByNsid agree', () => {
    for (const kind of recordKindList) {
      expect(getRecordKindBySlug(kind.slug)).toBe(kind);
      expect(getRecordKindByNsid(kind.nsid)).toBe(kind);
    }
  });

  it('resolves kinds from AT-URIs', () => {
    expect(resolveKindFromUri('at://did:plc:abc/pub.layers.persona.persona/rk1')?.slug).toBe(
      'persona',
    );
    expect(resolveKindFromUri('at://did:plc:abc/pub.layers.corpus.corpus/rk1')?.slug).toBe(
      'corpus',
    );
    expect(resolveKindFromUri('not-a-uri')).toBeUndefined();
    expect(
      resolveKindFromUri('at://did:plc:abc/org.unknown.record/rk1'),
    ).toBeUndefined();
  });

  it('exposes recordKinds as a frozen lookup keyed by slug', () => {
    expect(Object.isFrozen(recordKinds)).toBe(true);
    expect(recordKinds.persona.nsid).toBe('pub.layers.persona.persona');
  });
});
