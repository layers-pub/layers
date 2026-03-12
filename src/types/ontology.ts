/**
 * Zod schemas and TypeScript types for the ontology.ontology record type.
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
 * Zod schema validating an ontology record from the firehose.
 *
 * Matches the `pub.layers.ontology.ontology` lexicon definition.
 */
const ontologyRecordSchema = z.object({
  name: z.string().max(512),
  description: z.string().max(10_000).optional(),
  version: z.string().max(32).optional(),
  domainUri: z.string().optional(),
  domain: z.string().max(128).optional(),
  parentRef: z.string().optional(),
  personaRef: z.string().optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(64).optional(),
  createdAt: z.string(),
});

/**
 * Validated ontology record from the firehose.
 */
type OntologyRecord = z.infer<typeof ontologyRecordSchema>;

/**
 * A row from the `ontologies` PostgreSQL table.
 */
interface OntologyRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly domain: string | null;
  readonly version: string | null;
  readonly indexed_at: Date;
  readonly record: OntologyRecord;
}

/**
 * API response shape for an ontology (camelCase).
 */
interface OntologyView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly domain: string | null;
  readonly version: string | null;
  readonly indexedAt: string;
  readonly record: OntologyRecord;
}

/**
 * Transforms an {@link OntologyRow} into an {@link OntologyView}.
 */
function toOntologyView(row: OntologyRow): OntologyView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    name: row.name,
    domain: row.domain,
    version: row.version,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getOntology.
 */
const getOntologyParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listOntologies.
 */
const listOntologiesParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchOntologies.
 */
const searchOntologiesParamsSchema = z.object({
  q: z.string().min(1),
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  getOntologyParamsSchema,
  listOntologiesParamsSchema,
  ontologyRecordSchema,
  searchOntologiesParamsSchema,
  toOntologyView,
};
export type { OntologyRecord, OntologyRow, OntologyView };
