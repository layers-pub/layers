/**
 * Zod schemas and TypeScript types for the corpus.corpus record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a corpus record from the firehose.
 *
 * Matches the `pub.layers.corpus.corpus` lexicon definition.
 */
const corpusRecordSchema = z.object({
  name: z.string().max(512),
  description: z.string().max(50_000).optional(),
  version: z.string().max(64).optional(),
  language: z.string().max(32).optional(),
  languages: z.array(z.string().max(32)).max(128).optional(),
  domainUri: z.string().optional(),
  domain: z.string().max(256).optional(),
  license: z.string().max(256).optional(),
  ontologyRefs: z.array(z.string()).max(32).optional(),
  eprintRefs: z.array(z.string()).max(64).optional(),
  expressionCount: z.number().int().min(0).optional(),
  annotationDesign: z.record(z.string(), z.unknown()).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated corpus record from the firehose.
 */
type CorpusRecord = z.infer<typeof corpusRecordSchema>;

/**
 * A row from the `corpora` PostgreSQL table.
 */
interface CorpusRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly language: string | null;
  readonly license: string | null;
  readonly domain: string | null;
  readonly indexed_at: Date;
  readonly record: CorpusRecord;
}

/**
 * API response shape for a corpus (camelCase).
 */
interface CorpusView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly language: string | null;
  readonly license: string | null;
  readonly domain: string | null;
  readonly indexedAt: string;
  readonly record: CorpusRecord;
}

/**
 * Transforms a {@link CorpusRow} into a {@link CorpusView}.
 */
function toCorpusView(row: CorpusRow): CorpusView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    name: row.name,
    language: row.language,
    license: row.license,
    domain: row.domain,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getCorpus.
 */
const getCorpusParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listCorpora.
 */
const listCorporaParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchCorpora.
 */
const searchCorporaParamsSchema = z.object({
  q: z.string().min(1),
  language: z.string().optional(),
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  corpusRecordSchema,
  getCorpusParamsSchema,
  listCorporaParamsSchema,
  searchCorporaParamsSchema,
  toCorpusView,
};
export type { CorpusRecord, CorpusRow, CorpusView };
