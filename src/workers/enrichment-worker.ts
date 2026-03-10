/**
 * BullMQ worker consuming the enrichment queue.
 *
 * Processes enrichment jobs (language detection, knowledge graph linking,
 * media metadata extraction, annotation statistics) by delegating to the
 * {@link EnrichmentDispatcher}.
 *
 * @module
 */

import { Worker, type ConnectionOptions, type Job } from 'bullmq';

import { createLogger } from '../observability/logger.js';
import type { ILogger } from '../types/interfaces/logger.interface.js';
import type { EnrichmentJob } from '../types/interfaces/enrichment.interface.js';
import type { EnrichmentDispatcher } from '../services/enrichment/enrichment-dispatcher.js';

/**
 * Configuration for constructing an {@link EnrichmentWorker}.
 */
interface EnrichmentWorkerConfig {
  readonly redis: ConnectionOptions;
  readonly dispatcher: EnrichmentDispatcher;
  readonly concurrency?: number | undefined;
  readonly logger?: ILogger | undefined;
}

/**
 * BullMQ worker that processes enrichment jobs from the `layers:enrichment` queue.
 *
 * Each job is dispatched to the appropriate enrichment handler via the
 * {@link EnrichmentDispatcher}. Failed jobs are logged and re-thrown
 * so BullMQ can apply its retry/backoff strategy.
 *
 * @example
 * ```typescript
 * const worker = new EnrichmentWorker({
 *   redis,
 *   dispatcher,
 *   concurrency: 3,
 * });
 * await worker.start();
 *
 * // On shutdown:
 * await worker.stop();
 * ```
 */
class EnrichmentWorker {
  private readonly worker: Worker;
  private readonly logger: ILogger;

  constructor(config: EnrichmentWorkerConfig) {
    this.logger = config.logger ?? createLogger({ service: 'enrichment-worker' });

    this.worker = new Worker(
      'layers:enrichment',
      async (job: Job<EnrichmentJob>) => {
        const result = await config.dispatcher.dispatch(job.data);
        if (!result.ok) {
          this.logger.error('Enrichment job failed', {
            type: job.data.type,
            uri: job.data.uri,
            error: result.error.message,
          });
          throw result.error;
        }
        this.logger.debug('Enrichment job completed', {
          type: job.data.type,
          uri: job.data.uri,
        });
      },
      {
        connection: config.redis,
        concurrency: config.concurrency ?? 3,
      },
    );
  }

  /**
   * Starts the enrichment worker. The BullMQ worker begins processing
   * immediately upon construction; this method logs the start event.
   */
  start(): void {
    this.logger.info('Enrichment worker started');
  }

  /**
   * Stops the enrichment worker and waits for in-progress jobs to complete.
   */
  async stop(): Promise<void> {
    await this.worker.close();
    this.logger.info('Enrichment worker stopped');
  }
}

export { EnrichmentWorker };
export type { EnrichmentWorkerConfig };
