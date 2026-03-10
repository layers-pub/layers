/**
 * Enrichment handler that computes annotation statistics for annotation layers.
 *
 * Receives an enrichment job with `type: 'annotationStatistics'` and computes
 * a label frequency distribution from the provided labels array. Stores the
 * result as a JSONB update on the `annotation_layers` PostgreSQL table.
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
 * Computed annotation statistics for an annotation layer.
 */
interface AnnotationStats {
  readonly totalAnnotations: number;
  readonly uniqueLabels: number;
  readonly labelDistribution: Readonly<Record<string, number>>;
}

/**
 * Configuration for constructing an {@link AnnotationStatisticsHandler}.
 */
interface AnnotationStatisticsHandlerConfig {
  readonly pgPool: Pool;
  readonly logger?: ILogger | undefined;
}

/**
 * Computes label frequency distribution from an array of label strings.
 *
 * Counts the occurrences of each unique label and returns the result
 * as a string-to-number mapping.
 *
 * @param labels - the array of label strings to count
 * @returns a record mapping each label to its occurrence count
 *
 * @example
 * ```typescript
 * computeLabelDistribution(['NP', 'VP', 'NP', 'PP']);
 * // { NP: 2, VP: 1, PP: 1 }
 * ```
 */
function computeLabelDistribution(labels: readonly string[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const label of labels) {
    dist[label] = (dist[label] ?? 0) + 1;
  }
  return dist;
}

/**
 * Enrichment handler that computes and persists annotation statistics.
 *
 * Receives a job containing an annotation layer URI, an optional annotation
 * count, and an array of label strings. Computes the label frequency
 * distribution and stores the result in the `annotation_layers` table
 * under the `_annotationStats` JSONB key.
 *
 * @example
 * ```typescript
 * const handler = new AnnotationStatisticsHandler({ pgPool });
 * const result = await handler.handle({
 *   type: 'annotationStatistics',
 *   uri: 'at://did:plc:abc/pub.layers.annotation.annotationLayer/123',
 *   collection: 'pub.layers.annotation.annotationLayer',
 *   data: { annotationCount: 5, labels: ['NP', 'VP', 'NP'] },
 * });
 * ```
 */
class AnnotationStatisticsHandler implements IEnrichmentHandler {
  readonly type = 'annotationStatistics' as const;
  private readonly pgPool: Pool;
  private readonly logger: ILogger;

  constructor(config: AnnotationStatisticsHandlerConfig) {
    this.pgPool = config.pgPool;
    this.logger = config.logger ?? createLogger({ service: 'annotation-statistics-handler' });
  }

  /**
   * Computes annotation statistics and persists them to PostgreSQL.
   *
   * @param job - the enrichment job containing the layer URI, labels, and optional count
   * @returns the enrichment result with total and unique label counts
   */
  async handle(job: EnrichmentJob): Promise<Result<EnrichmentResult, LayersError>> {
    const { uri, data } = job;
    const labels = Array.isArray(data.labels)
      ? (data.labels as unknown[]).filter((l): l is string => typeof l === 'string')
      : [];
    const annotationCount =
      typeof data.annotationCount === 'number' ? data.annotationCount : labels.length;

    const distribution = computeLabelDistribution(labels);
    const stats: AnnotationStats = {
      totalAnnotations: annotationCount,
      uniqueLabels: Object.keys(distribution).length,
      labelDistribution: distribution,
    };

    try {
      await pgPolicy.execute(async () => {
        await this.pgPool.query(
          `UPDATE annotation_layers SET record = jsonb_set(COALESCE(record, '{}'::jsonb), '{_annotationStats}', $1::jsonb) WHERE uri = $2`,
          [JSON.stringify(stats), uri],
        );
      });

      this.logger.debug('Annotation statistics computed', {
        uri,
        totalAnnotations: stats.totalAnnotations,
        uniqueLabels: stats.uniqueLabels,
      });

      return Ok({
        type: 'annotationStatistics',
        uri,
        success: true,
        metadata: {
          totalAnnotations: stats.totalAnnotations,
          uniqueLabels: stats.uniqueLabels,
        },
      });
    } catch (err: unknown) {
      const error = new DatabaseError(
        `Annotation statistics computation failed for ${uri}`,
        err instanceof Error ? err : undefined,
      );
      this.logger.error('Annotation statistics failed', { uri, error: error.message });
      return Err(error);
    }
  }
}

export { AnnotationStatisticsHandler, computeLabelDistribution };
export type { AnnotationStats, AnnotationStatisticsHandlerConfig };
