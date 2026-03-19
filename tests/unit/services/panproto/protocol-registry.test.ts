/**
 * Unit tests for the panproto protocol registry.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import {
  ALL_FORMATS,
  ANNOTATION_PROTOCOLS,
  getProtocolByPanprotoId,
  getProtocolMeta,
} from '@/services/panproto/protocol-registry.js';
import type { ProtocolMeta } from '@/services/panproto/protocol-registry.js';

// ---------------------------------------------------------------------------
// ANNOTATION_PROTOCOLS size
// ---------------------------------------------------------------------------

describe('ANNOTATION_PROTOCOLS', () => {
  it('contains exactly 20 entries (19 panproto + praat)', () => {
    expect(ANNOTATION_PROTOCOLS).toHaveLength(20);
  });

  it('includes all expected protocol IDs', () => {
    const ids = ANNOTATION_PROTOCOLS.map((p) => p.protocol);
    const expected = [
      'brat',
      'conllu',
      'naf',
      'uima',
      'folia',
      'tei',
      'timeml',
      'elan',
      'iso_space',
      'paula',
      'laf_graf',
      'decomp',
      'ucca',
      'fovea',
      'bead',
      'web_annotation',
      'amr',
      'concrete',
      'nif',
      'praat',
    ];
    for (const expectedId of expected) {
      expect(ids).toContain(expectedId);
    }
  });

  it('includes all expected format keys', () => {
    const formats = ANNOTATION_PROTOCOLS.map((p) => p.format);
    const expected = [
      'brat',
      'conllu',
      'naf',
      'uima',
      'folia',
      'tei',
      'timeml',
      'elan',
      'iso-space',
      'paula',
      'laf-graf',
      'decomp',
      'ucca',
      'fovea',
      'bead',
      'web-annotation',
      'amr',
      'concrete',
      'nif',
      'praat',
    ];
    for (const expectedFmt of expected) {
      expect(formats).toContain(expectedFmt);
    }
  });
});

// ---------------------------------------------------------------------------
// ALL_FORMATS size
// ---------------------------------------------------------------------------

describe('ALL_FORMATS', () => {
  it('contains exactly 21 entries (20 protocols + bead-jsonlines)', () => {
    expect(ALL_FORMATS).toHaveLength(21);
  });

  it('includes the bead-jsonlines entry', () => {
    const formats = ALL_FORMATS.map((p) => p.format);
    expect(formats).toContain('bead-jsonlines');
  });

  it('includes all ANNOTATION_PROTOCOLS entries', () => {
    const allFormats = new Set(ALL_FORMATS.map((p) => p.format));
    for (const proto of ANNOTATION_PROTOCOLS) {
      expect(allFormats.has(proto.format)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// ProtocolMeta validation
// ---------------------------------------------------------------------------

describe('ProtocolMeta fields', () => {
  it.each(ALL_FORMATS.map((p) => [p.format, p] as const))(
    '%s has a non-empty name',
    (_format: string, meta: ProtocolMeta) => {
      expect(meta.name.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_FORMATS.map((p) => [p.format, p] as const))(
    '%s has at least one extension',
    (_format: string, meta: ProtocolMeta) => {
      expect(meta.extensions.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_FORMATS.map((p) => [p.format, p] as const))(
    '%s has a non-empty mimeType',
    (_format: string, meta: ProtocolMeta) => {
      expect(meta.mimeType.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_FORMATS.map((p) => [p.format, p] as const))(
    '%s has a non-empty primaryExtension',
    (_format: string, meta: ProtocolMeta) => {
      expect(meta.primaryExtension.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_FORMATS.map((p) => [p.format, p] as const))(
    '%s has a non-empty protocol identifier',
    (_format: string, meta: ProtocolMeta) => {
      expect(meta.protocol.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_FORMATS.map((p) => [p.format, p] as const))(
    '%s has a non-empty format key',
    (_format: string, meta: ProtocolMeta) => {
      expect(meta.format.length).toBeGreaterThan(0);
    },
  );

  it('all format keys are unique', () => {
    const formats = ALL_FORMATS.map((p) => p.format);
    expect(new Set(formats).size).toBe(formats.length);
  });

  it('all protocol IDs are unique', () => {
    const protocols = ALL_FORMATS.map((p) => p.protocol);
    expect(new Set(protocols).size).toBe(protocols.length);
  });
});

// ---------------------------------------------------------------------------
// getProtocolMeta
// ---------------------------------------------------------------------------

describe('getProtocolMeta', () => {
  it('returns the correct entry for each known format', () => {
    for (const proto of ALL_FORMATS) {
      const meta = getProtocolMeta(proto.format);
      expect(meta).toBeDefined();
      expect(meta!.protocol).toBe(proto.protocol);
      expect(meta!.name).toBe(proto.name);
    }
  });

  it('returns undefined for unknown formats', () => {
    const result = getProtocolMeta('nonexistent-format' as never);
    expect(result).toBeUndefined();
  });

  it('returns the bead-jsonlines entry', () => {
    const meta = getProtocolMeta('bead-jsonlines');
    expect(meta).toBeDefined();
    expect(meta!.protocol).toBe('bead_jsonlines');
    expect(meta!.name).toBe('BEAD JSON Lines');
  });
});

// ---------------------------------------------------------------------------
// getProtocolByPanprotoId
// ---------------------------------------------------------------------------

describe('getProtocolByPanprotoId', () => {
  it('maps snake_case IDs to the correct protocol metadata', () => {
    const snakeCaseIds: readonly [string, string][] = [
      ['conllu', 'conllu'],
      ['brat', 'brat'],
      ['iso_space', 'iso-space'],
      ['laf_graf', 'laf-graf'],
      ['web_annotation', 'web-annotation'],
      ['bead_jsonlines', 'bead-jsonlines'],
    ];

    for (const [panprotoId, expectedFormat] of snakeCaseIds) {
      const meta = getProtocolByPanprotoId(panprotoId);
      expect(meta).toBeDefined();
      expect(meta!.format).toBe(expectedFormat);
    }
  });

  it('returns undefined for unknown panproto IDs', () => {
    expect(getProtocolByPanprotoId('nonexistent_protocol')).toBeUndefined();
  });

  it('returns correct metadata for all annotation protocols', () => {
    for (const proto of ANNOTATION_PROTOCOLS) {
      const meta = getProtocolByPanprotoId(proto.protocol);
      expect(meta).toBeDefined();
      expect(meta!.format).toBe(proto.format);
    }
  });
});
