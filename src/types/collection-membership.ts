/**
 * Zod schemas and TypeScript types for the resource.collectionMembership record type.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Zod schema validating a collection membership record from the firehose.
 *
 * Matches the `pub.layers.resource.collectionMembership` lexicon definition.
 */
const collectionMembershipRecordSchema = z.object({
  collectionRef: z.string(),
  entryRef: z.string(),
  ordinal: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated collection membership record from the firehose.
 */
type CollectionMembershipRecord = z.infer<typeof collectionMembershipRecordSchema>;

/**
 * A row from the `collection_memberships` PostgreSQL table.
 */
interface CollectionMembershipRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly collection_ref: string;
  readonly entry_ref: string;
  readonly ordinal: number | null;
  readonly indexed_at: Date;
  readonly record: CollectionMembershipRecord;
}

/**
 * API response shape for a collection membership (camelCase).
 */
interface CollectionMembershipView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly collectionRef: string;
  readonly entryRef: string;
  readonly ordinal: number | null;
  readonly indexedAt: string;
  readonly record: CollectionMembershipRecord;
}

/**
 * Transforms a {@link CollectionMembershipRow} into a {@link CollectionMembershipView}.
 */
function toCollectionMembershipView(row: CollectionMembershipRow): CollectionMembershipView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    collectionRef: row.collection_ref,
    entryRef: row.entry_ref,
    ordinal: row.ordinal,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getCollectionMembership.
 */
const getCollectionMembershipParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listCollectionMemberships.
 */
const listCollectionMembershipsParamsSchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export {
  collectionMembershipRecordSchema,
  getCollectionMembershipParamsSchema,
  listCollectionMembershipsParamsSchema,
  toCollectionMembershipView,
};
export type { CollectionMembershipRecord, CollectionMembershipRow, CollectionMembershipView };
