/**
 * Zod schemas and TypeScript types for the resource.template record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a template record from the firehose.
 *
 * Matches the `pub.layers.resource.template` lexicon definition.
 */
const templateRecordSchema = z.object({
  name: z.string(),
  text: z.string(),
  language: z.string().optional(),
  slots: z.array(z.record(z.string(), z.unknown())).optional(),
  constraints: z.array(z.record(z.string(), z.unknown())).optional(),
  ontologyRef: z.string().optional(),
  experimentRef: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated template record from the firehose.
 */
type TemplateRecord = z.infer<typeof templateRecordSchema>;

/**
 * A row from the `templates` PostgreSQL table.
 */
interface TemplateRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly slot_count: number | null;
  readonly experiment_ref: string | null;
  readonly language: string | null;
  readonly indexed_at: Date;
  readonly record: TemplateRecord;
}

/**
 * API response shape for a template (camelCase).
 */
interface TemplateView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly slotCount: number | null;
  readonly experimentRef: string | null;
  readonly language: string | null;
  readonly indexedAt: string;
  readonly record: TemplateRecord;
}

/**
 * Transforms a {@link TemplateRow} into a {@link TemplateView}.
 */
function toTemplateView(row: TemplateRow): TemplateView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    name: row.name,
    slotCount: row.slot_count,
    experimentRef: row.experiment_ref,
    language: row.language,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getTemplate.
 */
const getTemplateParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listTemplates.
 */
const listTemplatesParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export { getTemplateParamsSchema, listTemplatesParamsSchema, templateRecordSchema, toTemplateView };
export type { TemplateRecord, TemplateRow, TemplateView };
