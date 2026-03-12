/**
 * Zod schemas and TypeScript types for the resource.templateComposition record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a template composition record from the firehose.
 *
 * Matches the `pub.layers.resource.templateComposition` lexicon definition.
 */
const templateCompositionRecordSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  compositionType: z.string().optional(),
  members: z.array(z.record(z.string(), z.unknown())),
  constraints: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated template composition record from the firehose.
 */
type TemplateCompositionRecord = z.infer<typeof templateCompositionRecordSchema>;

/**
 * A row from the `template_compositions` PostgreSQL table.
 */
interface TemplateCompositionRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly indexed_at: Date;
  readonly record: TemplateCompositionRecord;
}

/**
 * API response shape for a template composition (camelCase).
 */
interface TemplateCompositionView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly indexedAt: string;
  readonly record: TemplateCompositionRecord;
}

/**
 * Transforms a {@link TemplateCompositionRow} into a {@link TemplateCompositionView}.
 */
function toTemplateCompositionView(row: TemplateCompositionRow): TemplateCompositionView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    name: row.name,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getTemplateComposition.
 */
const getTemplateCompositionParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listTemplateCompositions.
 */
const listTemplateCompositionsParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  getTemplateCompositionParamsSchema,
  listTemplateCompositionsParamsSchema,
  templateCompositionRecordSchema,
  toTemplateCompositionView,
};
export type { TemplateCompositionRecord, TemplateCompositionRow, TemplateCompositionView };
