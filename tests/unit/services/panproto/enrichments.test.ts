/**
 * Unit tests for panproto per-protocol schema enrichments.
 *
 * @module
 */

import type { BuiltSchema } from '@panproto/core';
import { describe, expect, it, vi } from 'vitest';

import {
  computeEnrichments,
  enrichLayersSchema,
  MAX_CONFIDENCE,
  PROTOCOL_FORMALISMS,
  PROTOCOL_SUBKINDS,
} from '@/services/panproto/enrichments.js';
import { ANNOTATION_PROTOCOLS } from '@/services/panproto/protocol-registry.js';

/**
 * Mock SchemaEnrichment to track calls without needing real WASM.
 */
const { mockAddDefault, mockBuild, mockBuildResult, MockSchemaEnrichment } = vi.hoisted(() => {
  const mockBuildResult = {} as BuiltSchema;
  const mockAddDefault = vi.fn().mockReturnThis();
  const mockBuild = vi.fn().mockReturnValue(mockBuildResult);

  class MockSchemaEnrichment {
    addDefault = mockAddDefault;
    build = mockBuild;
  }

  return { mockAddDefault, mockBuild, mockBuildResult, MockSchemaEnrichment };
});

vi.mock('@panproto/core', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@panproto/core')>();
  return {
    ...orig,
    SchemaEnrichment: MockSchemaEnrichment,
    ExprBuilder: {
      lit: vi.fn().mockImplementation((value: unknown) => ({ type: 'lit', value })),
      var_: vi.fn(),
      lam: vi.fn(),
      app: vi.fn(),
    },
  };
});

// ---------------------------------------------------------------------------
// computeEnrichments
// ---------------------------------------------------------------------------

describe('computeEnrichments', () => {
  it('always includes confidence enrichment', () => {
    const enrichments = computeEnrichments('conllu');
    const confidenceEnrichment = enrichments.find((e) => e.path === 'annotation:confidence');
    expect(confidenceEnrichment).toBeDefined();
    expect(confidenceEnrichment!.defaultValue).toBe(MAX_CONFIDENCE);
  });

  it('includes formalism enrichment for known protocols', () => {
    for (const [protocol, formalism] of Object.entries(PROTOCOL_FORMALISMS)) {
      const enrichments = computeEnrichments(protocol);
      const formalismEnrichment = enrichments.find((e) => e.path === 'annotationLayer:formalism');
      expect(formalismEnrichment).toBeDefined();
      expect(formalismEnrichment!.defaultValue).toBe(formalism);
    }
  });

  it('includes subkind enrichment for protocols with default subkinds', () => {
    for (const [protocol, subkind] of Object.entries(PROTOCOL_SUBKINDS)) {
      const enrichments = computeEnrichments(protocol);
      const subkindEnrichment = enrichments.find((e) => e.path === 'annotationLayer:subkind');
      expect(subkindEnrichment).toBeDefined();
      expect(subkindEnrichment!.defaultValue).toBe(subkind);
    }
  });

  it('omits formalism enrichment for unknown protocols', () => {
    const enrichments = computeEnrichments('unknown_protocol');
    const formalismEnrichment = enrichments.find((e) => e.path === 'annotationLayer:formalism');
    expect(formalismEnrichment).toBeUndefined();
  });

  it('omits subkind enrichment for protocols without defaults', () => {
    // 'brat' does not have a default subkind
    const enrichments = computeEnrichments('brat');
    const subkindEnrichment = enrichments.find((e) => e.path === 'annotationLayer:subkind');
    expect(subkindEnrichment).toBeUndefined();
  });

  it('returns at least one enrichment for any protocol', () => {
    // Confidence is always present
    const enrichments = computeEnrichments('nonexistent');
    expect(enrichments.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// enrichLayersSchema with SchemaEnrichment
// ---------------------------------------------------------------------------

describe('enrichLayersSchema', () => {
  it('creates a SchemaEnrichment and calls addDefault for each enrichment', () => {
    const schema = {} as BuiltSchema;
    mockAddDefault.mockClear();
    mockBuild.mockClear();

    enrichLayersSchema(schema, 'conllu');

    const enrichments = computeEnrichments('conllu');
    expect(mockAddDefault).toHaveBeenCalledTimes(enrichments.length);
  });

  it('calls build() and returns the built schema', () => {
    const schema = {} as BuiltSchema;
    mockBuild.mockClear();

    const result = enrichLayersSchema(schema, 'brat');
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockBuildResult);
  });

  it('applies protocol-specific formalism for conllu', () => {
    const schema = {} as BuiltSchema;
    mockAddDefault.mockClear();

    enrichLayersSchema(schema, 'conllu');

    // Check that addDefault was called with the formalism path
    const calls = mockAddDefault.mock.calls as [string, unknown][];
    const formalismCall = calls.find(([path]) => path === 'annotationLayer:formalism');
    expect(formalismCall).toBeDefined();
  });

  it('applies protocol-specific subkind for elan', () => {
    const schema = {} as BuiltSchema;
    mockAddDefault.mockClear();

    enrichLayersSchema(schema, 'elan');

    const calls = mockAddDefault.mock.calls as [string, unknown][];
    const subkindCall = calls.find(([path]) => path === 'annotationLayer:subkind');
    expect(subkindCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// enrichLayersSchema for each known protocol
// ---------------------------------------------------------------------------

describe('enrichLayersSchema for each annotation protocol', () => {
  it.each(ANNOTATION_PROTOCOLS.map((p) => [p.protocol, p.format] as const))(
    'returns a BuiltSchema for protocol %s (format: %s)',
    (protocol: string) => {
      const schema = {} as BuiltSchema;
      const result = enrichLayersSchema(schema, protocol);

      expect(result).toBeDefined();
    },
  );
});

// ---------------------------------------------------------------------------
// Constants validation
// ---------------------------------------------------------------------------

describe('MAX_CONFIDENCE', () => {
  it('is 1000', () => {
    expect(MAX_CONFIDENCE).toBe(1000);
  });
});

describe('PROTOCOL_FORMALISMS', () => {
  it('has entries for all 20 annotation protocols', () => {
    expect(Object.keys(PROTOCOL_FORMALISMS)).toHaveLength(20);
  });

  it('maps each protocol to a non-empty formalism string', () => {
    for (const [protocol, formalism] of Object.entries(PROTOCOL_FORMALISMS)) {
      expect(typeof formalism).toBe('string');
      expect(formalism.length).toBeGreaterThan(0);
      expect(protocol.length).toBeGreaterThan(0);
    }
  });
});

describe('PROTOCOL_SUBKINDS', () => {
  it('has entries only for protocols with clear default subkinds', () => {
    const expectedProtocols = ['conllu', 'amr', 'praat', 'elan', 'timeml', 'iso_space'];
    expect(Object.keys(PROTOCOL_SUBKINDS).sort()).toEqual(expectedProtocols.sort());
  });
});
