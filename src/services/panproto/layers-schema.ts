/**
 * Layers ATProto annotation schema definition for panproto.
 *
 * Builds the target schema that all format conversions map into.
 * The schema mirrors the pub.layers.annotation.annotationLayer record
 * structure with vertices for expressions, segmentations, annotation
 * layers, individual annotations, and their anchor types.
 *
 * @module
 */

import type { BuiltSchema, Panproto, SchemaBuilder } from '@panproto/core';

/**
 * Vertex name constants used throughout the schema.
 *
 * These correspond to the top-level record types and sub-structures
 * in the Layers annotation data model.
 */
const VERTEX = {
  EXPRESSION: 'Expression',
  SEGMENTATION: 'Segmentation',
  ANNOTATION_LAYER: 'AnnotationLayer',
  ANNOTATION: 'Annotation',
  ANCHOR: 'Anchor',
  TEXT_SPAN: 'textSpan',
  TOKEN_REF: 'tokenRef',
  TOKEN_REF_SEQUENCE: 'tokenRefSequence',
  TEMPORAL_SPAN: 'temporalSpan',
  BOUNDING_BOX: 'boundingBox',
  PAGE_ANCHOR: 'pageAnchor',
  SPATIO_TEMPORAL_ANCHOR: 'spatioTemporalAnchor',
} as const;

/**
 * Builds the Layers ATProto annotation schema using panproto's SchemaBuilder.
 *
 * The schema represents the canonical target for all format conversions.
 * It defines vertices for:
 * - Expression: the text to annotate (text, kind, language)
 * - Segmentation: token/segment arrays for an expression (tokens, strategy)
 * - AnnotationLayer: a collection of annotations (kind, subkind, formalism)
 * - Annotation: an individual annotation (label, value, confidence, anchor)
 * - Anchor: a union vertex with subtypes for each anchor mechanism
 *
 * @param panproto - the initialized panproto WASM instance
 * @returns the compiled Layers annotation schema
 *
 * @example
 * ```typescript
 * const instance = await panprotoService.getInstance();
 * const schema = buildLayersSchema(instance);
 * ```
 */
function buildLayersSchema(panproto: Panproto): BuiltSchema {
  // Access the ATProto protocol from panproto. The protocol provides
  // the SchemaBuilder factory for constructing schemas that conform
  // to ATProto record conventions.
  const protocol = panproto.protocol('atproto');
  let builder: SchemaBuilder = protocol.schema();

  // Expression vertex: the root text data being annotated.
  builder = builder
    .vertex(VERTEX.EXPRESSION, 'record', { nsid: 'pub.layers.expression.expression' })
    .vertex(`${VERTEX.EXPRESSION}:text`, 'string')
    .vertex(`${VERTEX.EXPRESSION}:kind`, 'string')
    .vertex(`${VERTEX.EXPRESSION}:language`, 'string');

  // Segmentation vertex: tokenization of an expression.
  builder = builder
    .vertex(VERTEX.SEGMENTATION, 'record', { nsid: 'pub.layers.segmentation.segmentation' })
    .vertex(`${VERTEX.SEGMENTATION}:tokens`, 'object')
    .vertex(`${VERTEX.SEGMENTATION}:strategy`, 'string');

  // AnnotationLayer vertex: a group of annotations sharing kind/subkind.
  builder = builder
    .vertex(VERTEX.ANNOTATION_LAYER, 'record', {
      nsid: 'pub.layers.annotation.annotationLayer',
    })
    .vertex(`${VERTEX.ANNOTATION_LAYER}:kind`, 'string')
    .vertex(`${VERTEX.ANNOTATION_LAYER}:subkind`, 'string')
    .vertex(`${VERTEX.ANNOTATION_LAYER}:formalism`, 'string');

  // Annotation vertex: a single annotation with label, value, confidence.
  builder = builder
    .vertex(VERTEX.ANNOTATION, 'object')
    .vertex(`${VERTEX.ANNOTATION}:label`, 'string')
    .vertex(`${VERTEX.ANNOTATION}:value`, 'string')
    .vertex(`${VERTEX.ANNOTATION}:confidence`, 'string');

  // Anchor subtypes
  builder = builder
    .vertex(VERTEX.ANCHOR, 'object')
    .vertex(VERTEX.TEXT_SPAN, 'object')
    .vertex(`${VERTEX.TEXT_SPAN}:byteStart`, 'string')
    .vertex(`${VERTEX.TEXT_SPAN}:byteEnd`, 'string')
    .vertex(VERTEX.TOKEN_REF, 'object')
    .vertex(`${VERTEX.TOKEN_REF}:tokenizationId`, 'string')
    .vertex(`${VERTEX.TOKEN_REF}:tokenIndex`, 'string')
    .vertex(VERTEX.TOKEN_REF_SEQUENCE, 'object')
    .vertex(`${VERTEX.TOKEN_REF_SEQUENCE}:tokenizationId`, 'string')
    .vertex(`${VERTEX.TOKEN_REF_SEQUENCE}:tokenIndexes`, 'object')
    .vertex(VERTEX.TEMPORAL_SPAN, 'object')
    .vertex(`${VERTEX.TEMPORAL_SPAN}:start`, 'string')
    .vertex(`${VERTEX.TEMPORAL_SPAN}:ending`, 'string')
    .vertex(VERTEX.BOUNDING_BOX, 'object')
    .vertex(`${VERTEX.BOUNDING_BOX}:x`, 'string')
    .vertex(`${VERTEX.BOUNDING_BOX}:y`, 'string')
    .vertex(`${VERTEX.BOUNDING_BOX}:width`, 'string')
    .vertex(`${VERTEX.BOUNDING_BOX}:height`, 'string')
    .vertex(VERTEX.PAGE_ANCHOR, 'object')
    .vertex(`${VERTEX.PAGE_ANCHOR}:pageIndex`, 'string')
    .vertex(VERTEX.SPATIO_TEMPORAL_ANCHOR, 'object');

  // Edges between vertices
  builder = builder
    .edge(VERTEX.ANNOTATION_LAYER, VERTEX.EXPRESSION, 'annotates')
    .edge(VERTEX.SEGMENTATION, VERTEX.EXPRESSION, 'segments')
    .edge(VERTEX.ANNOTATION_LAYER, VERTEX.ANNOTATION, 'contains')
    .edge(VERTEX.ANNOTATION, VERTEX.ANCHOR, 'anchored_by')
    .edge(VERTEX.PAGE_ANCHOR, VERTEX.BOUNDING_BOX, 'prop', { name: 'boundingBox' })
    .edge(VERTEX.PAGE_ANCHOR, VERTEX.TEXT_SPAN, 'prop', { name: 'textSpan' })
    .edge(VERTEX.SPATIO_TEMPORAL_ANCHOR, VERTEX.TEMPORAL_SPAN, 'prop', { name: 'temporalSpan' })
    .edge(VERTEX.SPATIO_TEMPORAL_ANCHOR, VERTEX.BOUNDING_BOX, 'prop', { name: 'boundingBox' });

  return builder.build();
}

export { buildLayersSchema, VERTEX };
