/**
 * Shared types for the indexing pipeline.
 *
 * Every upstream consumer (Tap, replay, test harness) normalizes its input
 * into a {@link ParsedRecordOp} and pushes it through the same EventProcessor.
 *
 * @module
 */

/**
 * A normalized record-level operation produced by the upstream consumer.
 *
 * Shape matches @atproto/tap's `RecordEvent` record payload so Tap events
 * flow through with a trivial mapping.
 */
interface ParsedRecordOp {
  readonly action: 'create' | 'update' | 'delete';
  readonly collection: string;
  readonly rkey: string;
  readonly record?: unknown;
  readonly cid?: string;
}

export type { ParsedRecordOp };
