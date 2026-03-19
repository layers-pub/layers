/**
 * Unit tests for the Layers annotation schema builder.
 *
 * All tests mock the Panproto instance. These tests verify that buildLayersSchema
 * calls the correct SchemaBuilder methods and returns the built schema.
 *
 * @module
 */

import type { BuiltSchema, Panproto, Protocol, SchemaBuilder } from '@panproto/core';
import { describe, expect, it, vi } from 'vitest';

import { buildLayersSchema, VERTEX } from '@/services/panproto/layers-schema.js';

/**
 * Creates a mock SchemaBuilder that returns itself from vertex() and edge(),
 * and returns a mock BuiltSchema from build().
 */
function createMockSchemaBuilder(builtSchema: BuiltSchema): SchemaBuilder {
  const builder: SchemaBuilder = {
    vertex: vi.fn().mockReturnThis(),
    edge: vi.fn().mockReturnThis(),
    hyperEdge: vi.fn().mockReturnThis(),
    constraint: vi.fn().mockReturnThis(),
    required: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue(builtSchema),
  } as unknown as SchemaBuilder;

  return builder;
}

/**
 * Creates a mock Panproto instance with a mock protocol and schema builder.
 */
function createMockPanproto(): {
  panproto: Panproto;
  builder: SchemaBuilder;
  builtSchema: BuiltSchema;
} {
  const builtSchema = {} as BuiltSchema;
  const builder = createMockSchemaBuilder(builtSchema);

  const protocol: Protocol = {
    schema: vi.fn().mockReturnValue(builder),
    name: 'atproto',
  } as unknown as Protocol;

  const panproto: Panproto = {
    protocol: vi.fn().mockReturnValue(protocol),
    io: vi.fn(),
    protolensChain: vi.fn(),
    lens: vi.fn(),
    _wasm: {},
    [Symbol.dispose]: vi.fn(),
  } as unknown as Panproto;

  return { panproto, builder, builtSchema };
}

describe('buildLayersSchema', () => {
  it('returns a BuiltSchema', () => {
    const { panproto, builtSchema } = createMockPanproto();
    const result = buildLayersSchema(panproto);
    expect(result).toBe(builtSchema);
  });

  it('accesses the atproto protocol', () => {
    const { panproto } = createMockPanproto();
    buildLayersSchema(panproto);
    expect(panproto.protocol).toHaveBeenCalledWith('atproto');
  });

  it('creates a schema builder via protocol.schema()', () => {
    const { panproto } = createMockPanproto();
    buildLayersSchema(panproto);

    const protocol = panproto.protocol('atproto');
    expect(protocol.schema).toHaveBeenCalled();
  });

  it('adds vertices for core types', () => {
    const { panproto, builder } = createMockPanproto();
    buildLayersSchema(panproto);

    const vertexCalls = vi.mocked(builder.vertex).mock.calls;
    const vertexIds = vertexCalls.map(([id]) => id);

    // Core vertices
    expect(vertexIds).toContain(VERTEX.EXPRESSION);
    expect(vertexIds).toContain(VERTEX.SEGMENTATION);
    expect(vertexIds).toContain(VERTEX.ANNOTATION_LAYER);
    expect(vertexIds).toContain(VERTEX.ANNOTATION);
    expect(vertexIds).toContain(VERTEX.ANCHOR);

    // Anchor subtypes
    expect(vertexIds).toContain(VERTEX.TEXT_SPAN);
    expect(vertexIds).toContain(VERTEX.TOKEN_REF);
    expect(vertexIds).toContain(VERTEX.TOKEN_REF_SEQUENCE);
    expect(vertexIds).toContain(VERTEX.TEMPORAL_SPAN);
    expect(vertexIds).toContain(VERTEX.BOUNDING_BOX);
    expect(vertexIds).toContain(VERTEX.PAGE_ANCHOR);
    expect(vertexIds).toContain(VERTEX.SPATIO_TEMPORAL_ANCHOR);
  });

  it('adds edges between vertices', () => {
    const { panproto, builder } = createMockPanproto();
    buildLayersSchema(panproto);

    const edgeCalls = vi.mocked(builder.edge).mock.calls;

    // Check core edges exist
    expect(edgeCalls).toContainEqual(
      expect.arrayContaining([VERTEX.ANNOTATION_LAYER, VERTEX.EXPRESSION, 'annotates']),
    );
    expect(edgeCalls).toContainEqual(
      expect.arrayContaining([VERTEX.SEGMENTATION, VERTEX.EXPRESSION, 'segments']),
    );
    expect(edgeCalls).toContainEqual(
      expect.arrayContaining([VERTEX.ANNOTATION_LAYER, VERTEX.ANNOTATION, 'contains']),
    );
    expect(edgeCalls).toContainEqual(
      expect.arrayContaining([VERTEX.ANNOTATION, VERTEX.ANCHOR, 'anchored_by']),
    );
  });

  it('calls build() on the schema builder', () => {
    const { panproto, builder } = createMockPanproto();
    buildLayersSchema(panproto);
    expect(builder.build).toHaveBeenCalledTimes(1);
  });

  it('defines Expression vertex as a record with nsid', () => {
    const { panproto, builder } = createMockPanproto();
    buildLayersSchema(panproto);

    const vertexCalls = vi.mocked(builder.vertex).mock.calls;
    const expressionCall = vertexCalls.find(([id]) => id === VERTEX.EXPRESSION);
    expect(expressionCall).toBeDefined();
    expect(expressionCall![1]).toBe('record');
    expect(expressionCall![2]).toEqual({ nsid: 'pub.layers.expression.expression' });
  });

  it('defines AnnotationLayer vertex as a record with nsid', () => {
    const { panproto, builder } = createMockPanproto();
    buildLayersSchema(panproto);

    const vertexCalls = vi.mocked(builder.vertex).mock.calls;
    const layerCall = vertexCalls.find(([id]) => id === VERTEX.ANNOTATION_LAYER);
    expect(layerCall).toBeDefined();
    expect(layerCall![1]).toBe('record');
    expect(layerCall![2]).toEqual({ nsid: 'pub.layers.annotation.annotationLayer' });
  });
});
