/**
 * Zod schemas and TypeScript types for the resource.entry record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema for a knowledge reference entry.
 */
const knowledgeRefSchema = z.object({
  source: z.string(),
  identifier: z.string(),
  label: z.string().optional(),
  uri: z.string().optional(),
});

/**
 * Zod schema validating a resource entry record from the firehose.
 *
 * Matches the `pub.layers.resource.entry` lexicon definition.
 */
const resourceEntryRecordSchema = z.object({
  form: z.string().max(4096),
  lemma: z.string().max(1024).optional(),
  language: z.string().max(32).optional(),
  ontologyTypeRef: z.string().optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(32).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  components: z.array(z.unknown()).max(32).optional(),
  mweKindUri: z.string().optional(),
  mweKind: z.string().max(128).optional(),
  sourceRef: z.string().optional(),
  metadata: z.unknown().optional(),
  createdAt: z.string(),
});

/**
 * Validated resource entry record from the firehose.
 */
type ResourceEntryRecord = z.infer<typeof resourceEntryRecordSchema>;

/**
 * A row from the `resource_entries` PostgreSQL table.
 */
interface ResourceEntryRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly form: string;
  readonly lemma: string | null;
  readonly language: string | null;
  readonly indexed_at: Date;
  readonly record: ResourceEntryRecord;
}

/**
 * API response shape for a resource entry (camelCase).
 */
interface ResourceEntryView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly form: string;
  readonly lemma: string | null;
  readonly language: string | null;
  readonly indexedAt: string;
  readonly record: ResourceEntryRecord;
}

/**
 * Transforms a {@link ResourceEntryRow} into a {@link ResourceEntryView}.
 */
function toResourceEntryView(row: ResourceEntryRow): ResourceEntryView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    form: row.form,
    lemma: row.lemma,
    language: row.language,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getEntry.
 */
const getEntryParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listEntries.
 */
const listEntriesParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchEntries.
 */
const searchEntriesParamsSchema = z.object({
  q: z.string().min(1),
  language: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  getEntryParamsSchema,
  listEntriesParamsSchema,
  resourceEntryRecordSchema,
  searchEntriesParamsSchema,
  toResourceEntryView,
};
export type { ResourceEntryRecord, ResourceEntryRow, ResourceEntryView };
