/**
 * Shared types for the enrichment worker infrastructure.
 *
 * Defines the enrichment job types, payloads, results, and handler
 * interface used by the enrichment dispatcher and BullMQ worker.
 *
 * @module
 */

import type { Result } from '../result.js';
import type { LayersError } from '../errors.js';

/**
 * Enrichment job types.
 */
type EnrichmentType =
  | 'languageDetection'
  | 'knowledgeGraphLinking'
  | 'mediaMetadata'
  | 'annotationStatistics';

/**
 * Data passed to an enrichment handler.
 */
interface EnrichmentJob {
  readonly type: EnrichmentType;
  readonly uri: string;
  readonly collection: string;
  readonly data: Record<string, unknown>;
}

/**
 * Result of processing an enrichment job.
 */
interface EnrichmentResult {
  readonly type: EnrichmentType;
  readonly uri: string;
  readonly success: boolean;
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Interface for enrichment handlers.
 *
 * Each handler processes a single enrichment type and returns a
 * {@link Result} indicating success or failure.
 */
interface IEnrichmentHandler {
  readonly type: EnrichmentType;
  handle(job: EnrichmentJob): Promise<Result<EnrichmentResult, LayersError>>;
}

export type { EnrichmentJob, EnrichmentResult, EnrichmentType, IEnrichmentHandler };
