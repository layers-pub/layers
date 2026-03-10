/**
 * Enrichment handler that extracts metadata from media records.
 *
 * Receives an enrichment job with `type: 'mediaMetadata'` and extracts
 * structured metadata fields (MIME type, dimensions, duration, codec)
 * from the job data. Stores the result as a JSONB update on the
 * `media_records` PostgreSQL table.
 *
 * @module
 */

import type { Pool } from 'pg';

import { createLogger } from '../../../observability/logger.js';
import { DatabaseError } from '../../../types/errors.js';
import type { LayersError } from '../../../types/errors.js';
import type {
  EnrichmentJob,
  EnrichmentResult,
  IEnrichmentHandler,
} from '../../../types/interfaces/enrichment.interface.js';
import type { ILogger } from '../../../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../../../types/result.js';
import { pgPolicy } from '../../../utils/resilience.js';

/**
 * Structured metadata extracted from a media record.
 */
interface MediaMetadata {
  readonly mimeType?: string | undefined;
  readonly sizeBytes?: number | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly durationMs?: number | undefined;
  readonly codec?: string | undefined;
}

/**
 * Configuration for constructing a {@link MediaMetadataHandler}.
 */
interface MediaMetadataHandlerConfig {
  readonly pgPool: Pool;
  readonly logger?: ILogger | undefined;
}

/**
 * Extracts structured media metadata from raw job data.
 *
 * Validates each field's type before including it in the result.
 * Fields with incorrect types are silently excluded.
 *
 * @param data - the raw job data, or `undefined`
 * @returns a MediaMetadata object containing only type-safe fields
 *
 * @example
 * ```typescript
 * const meta = extractMediaMetadata({ mimeType: 'audio/wav', sizeBytes: 44100 });
 * // { mimeType: 'audio/wav', sizeBytes: 44100 }
 * ```
 */
function extractMediaMetadata(data: Record<string, unknown> | undefined): MediaMetadata {
  if (!data) return {};
  return {
    mimeType: typeof data.mimeType === 'string' ? data.mimeType : undefined,
    sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : undefined,
    width: typeof data.width === 'number' ? data.width : undefined,
    height: typeof data.height === 'number' ? data.height : undefined,
    durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
    codec: typeof data.codec === 'string' ? data.codec : undefined,
  };
}

/**
 * Enrichment handler that extracts and persists media metadata.
 *
 * Receives a job containing media information, extracts type-safe
 * metadata fields, and stores them as a JSONB object in the
 * `media_records` table under the `_extractedMetadata` key.
 *
 * @example
 * ```typescript
 * const handler = new MediaMetadataHandler({ pgPool });
 * const result = await handler.handle({
 *   type: 'mediaMetadata',
 *   uri: 'at://did:plc:abc/pub.layers.media.media/123',
 *   collection: 'pub.layers.media.media',
 *   data: { mimeType: 'audio/wav', sizeBytes: 44100, durationMs: 5000 },
 * });
 * ```
 */
class MediaMetadataHandler implements IEnrichmentHandler {
  readonly type = 'mediaMetadata' as const;
  private readonly pgPool: Pool;
  private readonly logger: ILogger;

  constructor(config: MediaMetadataHandlerConfig) {
    this.pgPool = config.pgPool;
    this.logger = config.logger ?? createLogger({ service: 'media-metadata-handler' });
  }

  /**
   * Extracts media metadata from the job data and persists it to PostgreSQL.
   *
   * @param job - the enrichment job containing the media URI and raw data
   * @returns the enrichment result with the extracted MIME type
   */
  async handle(job: EnrichmentJob): Promise<Result<EnrichmentResult, LayersError>> {
    const { uri, data } = job;
    const metadata = extractMediaMetadata(data);

    try {
      await pgPolicy.execute(async () => {
        await this.pgPool.query(
          `UPDATE media_records SET record = jsonb_set(COALESCE(record, '{}'::jsonb), '{_extractedMetadata}', $1::jsonb) WHERE uri = $2`,
          [JSON.stringify(metadata), uri],
        );
      });

      this.logger.debug('Media metadata extracted', { uri, mimeType: metadata.mimeType });
      return Ok({
        type: 'mediaMetadata',
        uri,
        success: true,
        metadata: { mimeType: metadata.mimeType ?? 'unknown' },
      });
    } catch (err: unknown) {
      const error = new DatabaseError(
        `Media metadata extraction failed for ${uri}`,
        err instanceof Error ? err : undefined,
      );
      this.logger.error('Media metadata failed', { uri, error: error.message });
      return Err(error);
    }
  }
}

export { extractMediaMetadata, MediaMetadataHandler };
export type { MediaMetadata, MediaMetadataHandlerConfig };
