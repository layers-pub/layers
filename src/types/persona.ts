/**
 * Zod schemas and TypeScript types for the persona.persona record type.
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
 * Zod schema validating a persona record from the firehose.
 *
 * Matches the `pub.layers.persona.persona` lexicon definition.
 */
const personaRecordSchema = z.object({
  name: z.string().max(256),
  description: z.string().max(10_000).optional(),
  domainUri: z.string().optional(),
  domain: z.string().max(256).optional(),
  kindUri: z.string().optional(),
  kind: z.string().max(128).optional(),
  parentRef: z.string().optional(),
  ontologyRefs: z.array(z.string()).max(32).optional(),
  guidelines: z.string().max(100_000).optional(),
  guidelinesBlob: z.unknown().optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(32).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated persona record from the firehose.
 */
type PersonaRecord = z.infer<typeof personaRecordSchema>;

/**
 * A row from the `personas` PostgreSQL table.
 */
interface PersonaRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly domain: string | null;
  readonly kind: string | null;
  readonly indexed_at: Date;
  readonly record: PersonaRecord;
}

/**
 * API response shape for a persona (camelCase).
 */
interface PersonaView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly name: string;
  readonly domain: string | null;
  readonly kind: string | null;
  readonly indexedAt: string;
  readonly record: PersonaRecord;
}

/**
 * Transforms a {@link PersonaRow} into a {@link PersonaView}.
 */
function toPersonaView(row: PersonaRow): PersonaView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    name: row.name,
    domain: row.domain,
    kind: row.kind,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getPersona.
 */
const getPersonaParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listPersonas.
 */
const listPersonasParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchPersonas.
 */
const searchPersonasParamsSchema = z.object({
  q: z.string().min(1),
  domain: z.string().optional(),
  kind: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  getPersonaParamsSchema,
  listPersonasParamsSchema,
  personaRecordSchema,
  searchPersonasParamsSchema,
  toPersonaView,
};
export type { PersonaRecord, PersonaRow, PersonaView };
