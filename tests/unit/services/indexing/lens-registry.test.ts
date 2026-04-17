/**
 * Exercises the lens registry loader against the real committed lens specs.
 */

import { describe, expect, it } from 'vitest';

import { loadLensRegistry, getLensSpec } from '../../../../src/services/indexing/lens-registry.js';

describe('loadLensRegistry', () => {
  const registry = loadLensRegistry();

  it('registers exactly 26 record kinds', () => {
    expect(registry.size).toBe(26);
  });

  it('every spec declares the four envelope fields we require at runtime', () => {
    for (const [nsid, spec] of registry) {
      expect(spec.table, `${nsid} table`).toBeTruthy();
      expect(spec.esIndex, `${nsid} esIndex`).toBeTruthy();
      expect(spec.neo4jLabel, `${nsid} neo4jLabel`).toBeTruthy();
      expect(spec.resourceName, `${nsid} resourceName`).toBeTruthy();
    }
  });

  it('getLensSpec returns the same object loadLensRegistry holds', () => {
    expect(getLensSpec('pub.layers.persona.persona')).toBe(
      registry.get('pub.layers.persona.persona'),
    );
  });

  it('getLensSpec returns undefined for unknown NSIDs', () => {
    expect(getLensSpec('pub.unknown.thing')).toBeUndefined();
  });
});
