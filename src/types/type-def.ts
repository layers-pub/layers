/**
 * Zod schemas and TypeScript types for the ontology.typeDef record type.
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
 * Zod schema validating a typeDef record from the firehose.
 *
 * Matches the `pub.layers.ontology.typeDef` lexicon definition.
 */
const typeDefRecordSchema = z.object({
  ontologyRef: z.string(),
  name: z.string().max(512),
  typeKind: z.string().max(128),
  createdAt: z.string(),
  typeKindUri: z.string().optional(),
  gloss: z.string().max(10_000).optional(),
  parentTypeRef: z.string().optional(),
  allowedRoles: z.array(z.unknown()).max(64).optional(),
  allowedValues: z.array(z.string().max(512)).max(256).optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(32).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Validated typeDef record from the firehose.
 */
type TypeDefRecord = z.infer<typeof typeDefRecordSchema>;

/**
 * A row from the `type_defs` PostgreSQL table.
 */
interface TypeDefRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly ontology_ref: string;
  readonly name: string;
  readonly type_kind: string;
  readonly indexed_at: Date;
  readonly record: TypeDefRecord;
}

/**
 * API response shape for a typeDef (camelCase).
 */
interface TypeDefView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly ontologyRef: string;
  readonly name: string;
  readonly typeKind: string;
  readonly indexedAt: string;
  readonly record: TypeDefRecord;
}

/**
 * Transforms a {@link TypeDefRow} into a {@link TypeDefView}.
 */
function toTypeDefView(row: TypeDefRow): TypeDefView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    ontologyRef: row.ontology_ref,
    name: row.name,
    typeKind: row.type_kind,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getTypeDef.
 */
const getTypeDefParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listTypeDefs.
 */
const listTypeDefsParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchTypeDefs.
 */
const searchTypeDefsParamsSchema = z.object({
  q: z.string().min(1),
  typeKind: z.string().optional(),
  ontologyRef: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  getTypeDefParamsSchema,
  listTypeDefsParamsSchema,
  searchTypeDefsParamsSchema,
  toTypeDefView,
  typeDefRecordSchema,
};
export type { TypeDefRecord, TypeDefRow, TypeDefView };
