/**
 * Zod schemas and TypeScript types for the media.media record type.
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
 * Zod schema validating a media record from the firehose.
 *
 * Matches the `pub.layers.media.media` lexicon definition.
 */
const mediaRecordSchema = z.object({
  kind: z.string().max(128),
  kindUri: z.string().optional(),
  title: z.string().max(1024).optional(),
  description: z.string().max(10_000).optional(),
  blob: z.unknown().optional(),
  externalUri: z.string().max(2048).optional(),
  mimeType: z.string().max(128).optional(),
  durationMs: z.number().int().min(0).optional(),
  fileSizeBytes: z.number().int().min(0).optional(),
  parentMediaRef: z.string().optional(),
  startOffsetMs: z.number().int().min(0).optional(),
  audio: z.record(z.string(), z.unknown()).optional(),
  video: z.record(z.string(), z.unknown()).optional(),
  document: z.record(z.string(), z.unknown()).optional(),
  language: z.string().max(32).optional(),
  knowledgeRefs: z.array(knowledgeRefSchema).max(32).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

/**
 * Validated media record from the firehose.
 */
type MediaRecord = z.infer<typeof mediaRecordSchema>;

/**
 * A row from the `media_records` PostgreSQL table.
 */
interface MediaRow {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly kind: string;
  readonly mime_type: string | null;
  readonly duration_ms: number | null;
  readonly language: string | null;
  readonly indexed_at: Date;
  readonly record: MediaRecord;
}

/**
 * API response shape for a media record (camelCase).
 */
interface MediaView {
  readonly uri: string;
  readonly did: string;
  readonly rkey: string;
  readonly kind: string;
  readonly mimeType: string | null;
  readonly durationMs: number | null;
  readonly language: string | null;
  readonly indexedAt: string;
  readonly record: MediaRecord;
}

/**
 * Transforms a {@link MediaRow} into a {@link MediaView}.
 */
function toMediaView(row: MediaRow): MediaView {
  return {
    uri: row.uri,
    did: row.did,
    rkey: row.rkey,
    kind: row.kind,
    mimeType: row.mime_type,
    durationMs: row.duration_ms,
    language: row.language,
    indexedAt: row.indexed_at.toISOString(),
    record: row.record,
  };
}

/**
 * Query params schema for getMedia.
 */
const getMediaParamsSchema = z.object({
  uri: z.string().min(1),
});

/**
 * Query params schema for listMedia.
 */
const listMediaParamsSchema = z.object({
  repo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * Query params schema for searchMedia.
 */
const searchMediaParamsSchema = z.object({
  q: z.string().min(1),
  kind: z.string().optional(),
  language: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export {
  getMediaParamsSchema,
  listMediaParamsSchema,
  mediaRecordSchema,
  searchMediaParamsSchema,
  toMediaView,
};
export type { MediaRecord, MediaRow, MediaView };
