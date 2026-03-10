/**
 * Zod schemas and TypeScript types for the changelog.entry record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a changelog entry record from the firehose.
 *
 * Matches the `pub.layers.changelog.entry` lexicon definition.
 */
const changelogEntryRecordSchema = z.object({
  subject: z.string(),
  subjectCollection: z.string().max(256),
  summary: z.string().max(500),
  sections: z.array(z.unknown()).max(20),
  createdAt: z.string(),
  version: z.unknown().optional(),
  previousVersion: z.unknown().optional(),
});

/**
 * Validated changelog entry record from the firehose.
 */
type ChangelogEntryRecord = z.infer<typeof changelogEntryRecordSchema>;

/**
 * A row from the `changelogs` PostgreSQL table.
 */
interface ChangelogEntryRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly subject_uri: string;
  readonly subject_collection: string;
  readonly summary: string;
  readonly indexed_at: Date;
  readonly record: ChangelogEntryRecord;
}

/**
 * API response shape for a changelog entry (camelCase).
 */
interface ChangelogEntryView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly subjectUri: string;
  readonly subjectCollection: string;
  readonly summary: string;
  readonly indexedAt: string;
  readonly record: ChangelogEntryRecord;
}

/**
 * Transforms a {@link ChangelogEntryRow} into a {@link ChangelogEntryView}.
 */
function toChangelogEntryView(row: ChangelogEntryRow): ChangelogEntryView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    subjectUri: row.subject_uri,
    subjectCollection: row.subject_collection,
    summary: row.summary,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getEntry.
 */
const getChangelogEntryParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listEntries.
 */
const listChangelogEntriesParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchEntries.
 */
const searchChangelogEntriesParamsSchema = z.object({
  q: z.string().min(1),
  subjectCollection: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  changelogEntryRecordSchema,
  getChangelogEntryParamsSchema,
  listChangelogEntriesParamsSchema,
  searchChangelogEntriesParamsSchema,
  toChangelogEntryView,
};
export type { ChangelogEntryRecord, ChangelogEntryRow, ChangelogEntryView };
