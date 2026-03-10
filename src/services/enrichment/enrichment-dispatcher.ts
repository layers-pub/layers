/**
 * Routes enrichment jobs to the correct handler by type.
 *
 * The dispatcher maintains a registry of {@link IEnrichmentHandler}
 * implementations and delegates each job to the matching handler.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { Err, type Result } from '../../types/result.js';
import type { LayersError } from '../../types/errors.js';
import { ServiceUnavailableError } from '../../types/errors.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';
import type {
  EnrichmentJob,
  EnrichmentResult,
  EnrichmentType,
  IEnrichmentHandler,
} from '../../types/interfaces/enrichment.interface.js';

/**
 * Configuration for constructing an {@link EnrichmentDispatcher}.
 */
interface EnrichmentDispatcherConfig {
  readonly logger?: ILogger | undefined;
}

/**
 * Routes enrichment jobs to the appropriate handler based on job type.
 *
 * @example
 * ```typescript
 * const dispatcher = new EnrichmentDispatcher();
 * dispatcher.register(languageDetectionHandler);
 * dispatcher.register(knowledgeGraphHandler);
 *
 * const result = await dispatcher.dispatch({
 *   type: 'languageDetection',
 *   uri: 'at://did:plc:abc/pub.layers.expression.expression/123',
 *   collection: 'pub.layers.expression.expression',
 *   data: { text: 'The cat sat on the mat.' },
 * });
 * ```
 */
class EnrichmentDispatcher {
  private readonly handlers = new Map<EnrichmentType, IEnrichmentHandler>();
  private readonly logger: ILogger;

  constructor(config?: EnrichmentDispatcherConfig) {
    this.logger = config?.logger ?? createLogger({ service: 'enrichment-dispatcher' });
  }

  /**
   * Registers a handler for a given enrichment type.
   *
   * @param handler - the handler to register
   */
  register(handler: IEnrichmentHandler): void {
    this.handlers.set(handler.type, handler);
    this.logger.debug(`Registered enrichment handler for ${handler.type}`);
  }

  /**
   * Dispatches a job to the appropriate handler.
   *
   * @param job - the enrichment job to dispatch
   * @returns the handler result, or an error if no handler is registered
   */
  async dispatch(job: EnrichmentJob): Promise<Result<EnrichmentResult, LayersError>> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      return Err(
        new ServiceUnavailableError(
          'enrichment-dispatcher',
          `No handler registered for enrichment type: ${job.type}`,
        ),
      );
    }

    this.logger.debug(`Dispatching ${job.type} enrichment for ${job.uri}`);
    return handler.handle(job);
  }
}

export { EnrichmentDispatcher };
export type { EnrichmentDispatcherConfig };
