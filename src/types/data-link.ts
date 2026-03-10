/**
 * Zod schemas and TypeScript types for the eprint.dataLink record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a data link record from the firehose.
 *
 * Matches the `pub.layers.eprint.dataLink` lexicon definition.
 */
const dataLinkRecordSchema = z.object({
  eprintUri: z.string(),
  eprintDid: z.string(),
  dataKind: z.string().optional(),
  corpusRef: z.string().optional(),
  expressionRefs: z.array(z.string()).optional(),
  annotationRefs: z.array(z.string()).optional(),
  description: z.string().optional(),
  paperSection: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated data link record from the firehose.
 */
type DataLinkRecord = z.infer<typeof dataLinkRecordSchema>;

/**
 * A row from the `data_links` PostgreSQL table.
 */
interface DataLinkRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly eprint_ref: string;
  readonly corpus_ref: string | null;
  readonly link_type: string | null;
  readonly indexed_at: Date;
  readonly record: DataLinkRecord;
}

/**
 * API response shape for a data link (camelCase).
 */
interface DataLinkView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly eprintRef: string;
  readonly corpusRef: string | null;
  readonly linkType: string | null;
  readonly indexedAt: string;
  readonly record: DataLinkRecord;
}

/**
 * Transforms a {@link DataLinkRow} into a {@link DataLinkView}.
 */
function toDataLinkView(row: DataLinkRow): DataLinkView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    eprintRef: row.eprint_ref,
    corpusRef: row.corpus_ref,
    linkType: row.link_type,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getDataLink.
 */
const getDataLinkParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listDataLinks.
 */
const listDataLinksParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export { dataLinkRecordSchema, getDataLinkParamsSchema, listDataLinksParamsSchema, toDataLinkView };
export type { DataLinkRecord, DataLinkRow, DataLinkView };
