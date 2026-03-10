/**
 * Zod schemas and TypeScript types for the resource.collection record type.
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
 * Zod schema validating a resource collection record from the firehose.
 *
 * Matches the `pub.layers.resource.collection` lexicon definition.
 */
const resourceCollectionRecordSchema = z.object({
  name: z.string().max(512),
  description: z.string().max(10_000).optional(),
  kindUri: z.string().optional(),
  kind: z.string().max(128).optional(),
  language: z.string().max(32).optional(),
  version: z.string().max(64).optional(),
  ontologyRef: z.string().optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(32).optional(),
  metadata: z.unknown().optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated resource collection record from the firehose.
 */
type ResourceCollectionRecord = z.infer<typeof resourceCollectionRecordSchema>;

/**
 * A row from the `resource_collections` PostgreSQL table.
 */
interface ResourceCollectionRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly kind: string | null;
  readonly language: string | null;
  readonly indexed_at: Date;
  readonly record: ResourceCollectionRecord;
}

/**
 * API response shape for a resource collection (camelCase).
 */
interface ResourceCollectionView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly kind: string | null;
  readonly language: string | null;
  readonly indexedAt: string;
  readonly record: ResourceCollectionRecord;
}

/**
 * Transforms a {@link ResourceCollectionRow} into a {@link ResourceCollectionView}.
 */
function toResourceCollectionView(row: ResourceCollectionRow): ResourceCollectionView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    name: row.name,
    kind: row.kind,
    language: row.language,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getCollection.
 */
const getCollectionParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listCollections.
 */
const listCollectionsParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchCollections.
 */
const searchCollectionsParamsSchema = z.object({
  q: z.string().min(1),
  kind: z.string().optional(),
  language: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  getCollectionParamsSchema,
  listCollectionsParamsSchema,
  resourceCollectionRecordSchema,
  searchCollectionsParamsSchema,
  toResourceCollectionView,
};
export type { ResourceCollectionRecord, ResourceCollectionRow, ResourceCollectionView };
