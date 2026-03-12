/**
 * Zod schemas and TypeScript types for the annotation.annotationLayer record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating an annotation layer record from the firehose.
 *
 * Matches the `pub.layers.annotation.annotationLayer` lexicon definition.
 */
const annotationLayerRecordSchema = z.object({
  expression: z.string(),
  kind: z.string(),
  subkind: z.string().optional(),
  formalism: z.string().optional(),
  ontologyRef: z.string().optional(),
  personaRef: z.string().optional(),
  segmentationRef: z.string().optional(),
  annotations: z.array(z.record(z.string(), z.unknown())),
  annotationCount: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated annotation layer record from the firehose.
 */
type AnnotationLayerRecord = z.infer<typeof annotationLayerRecordSchema>;

/**
 * A row from the `annotation_layers` PostgreSQL table.
 */
interface AnnotationLayerRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly expression_ref: string;
  readonly segmentation_ref: string | null;
  readonly kind: string;
  readonly subkind: string | null;
  readonly formalism: string | null;
  readonly ontology_ref: string | null;
  readonly persona_ref: string | null;
  readonly annotation_count: number;
  readonly indexed_at: Date;
  readonly record: AnnotationLayerRecord;
}

/**
 * API response shape for an annotation layer (camelCase).
 */
interface AnnotationLayerView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly expressionRef: string;
  readonly segmentationRef: string | null;
  readonly kind: string;
  readonly subkind: string | null;
  readonly formalism: string | null;
  readonly ontologyRef: string | null;
  readonly personaRef: string | null;
  readonly annotationCount: number;
  readonly indexedAt: string;
  readonly record: AnnotationLayerRecord;
}

/**
 * Transforms an {@link AnnotationLayerRow} into an {@link AnnotationLayerView}.
 */
function toAnnotationLayerView(row: AnnotationLayerRow): AnnotationLayerView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    expressionRef: row.expression_ref,
    segmentationRef: row.segmentation_ref,
    kind: row.kind,
    subkind: row.subkind,
    formalism: row.formalism,
    ontologyRef: row.ontology_ref,
    personaRef: row.persona_ref,
    annotationCount: row.annotation_count,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getAnnotationLayer.
 */
const getAnnotationLayerParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listAnnotationLayers.
 */
const listAnnotationLayersParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  annotationLayerRecordSchema,
  getAnnotationLayerParamsSchema,
  listAnnotationLayersParamsSchema,
  toAnnotationLayerView,
};
export type { AnnotationLayerRecord, AnnotationLayerRow, AnnotationLayerView };
