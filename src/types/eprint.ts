/**
 * Zod schemas and TypeScript types for the eprint.eprint record type.
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
 * Zod schema validating an eprint record from the firehose.
 *
 * Matches the `pub.layers.eprint.eprint` lexicon definition.
 */
const eprintRecordSchema = z.object({
  eprintIdentifier: z.string().max(512),
  linkType: z.string().max(128),
  createdAt: z.string(),
  eprintIdentifierTypeUri: z.string().optional(),
  eprintIdentifierType: z.string().max(128).optional(),
  eprintUri: z.string().optional(),
  platformEprintRef: z.string().optional(),
  linkTypeUri: z.string().optional(),
  expressionRefs: z.array(z.string()).max(1000).optional(),
  annotationRefs: z.array(z.string()).max(1000).optional(),
  corpusRef: z.string().optional(),
  description: z.string().max(10_000).optional(),
  citation: z.string().max(4096).optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(32).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Validated eprint record from the firehose.
 */
type EprintRecord = z.infer<typeof eprintRecordSchema>;

/**
 * A row from the `eprints` PostgreSQL table.
 */
interface EprintRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly eprint_identifier: string;
  readonly eprint_identifier_type: string | null;
  readonly link_type: string;
  readonly corpus_ref: string | null;
  readonly indexed_at: Date;
  readonly record: EprintRecord;
}

/**
 * API response shape for an eprint (camelCase).
 */
interface EprintView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly eprintIdentifier: string;
  readonly eprintIdentifierType: string | null;
  readonly linkType: string;
  readonly corpusRef: string | null;
  readonly indexedAt: string;
  readonly record: EprintRecord;
}

/**
 * Transforms an {@link EprintRow} into an {@link EprintView}.
 */
function toEprintView(row: EprintRow): EprintView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    eprintIdentifier: row.eprint_identifier,
    eprintIdentifierType: row.eprint_identifier_type,
    linkType: row.link_type,
    corpusRef: row.corpus_ref,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getEprint.
 */
const getEprintParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listEprints.
 */
const listEprintsParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchEprints.
 */
const searchEprintsParamsSchema = z.object({
  q: z.string().min(1),
  identifierType: z.string().optional(),
  linkType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  eprintRecordSchema,
  getEprintParamsSchema,
  listEprintsParamsSchema,
  searchEprintsParamsSchema,
  toEprintView,
};
export type { EprintRecord, EprintRow, EprintView };
