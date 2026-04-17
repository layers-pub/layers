/**
 * Routes parsed firehose events to record-type-specific handlers.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import { LayersMetrics } from '../../observability/metrics-exporter.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

import type { ParsedRecordOp } from './types.js';
import type { DLQHandler } from './dlq-handler.js';
import type { ErrorClassifier } from './error-classifier.js';
import type { IRecordHandler } from './record-handler.js';

/**
 * Dependencies for constructing an {@link EventProcessor}.
 */
interface EventProcessorDeps {
  readonly dlqHandler: DLQHandler;
  readonly errorClassifier: ErrorClassifier;
  readonly logger?: ILogger;
}

/**
 * Routes parsed firehose events to record-type-specific handlers.
 *
 * Handlers are registered per collection NSID via {@link registerHandler}.
 * Events for collections without a registered handler are silently dropped.
 */
class EventProcessor {
  private readonly logger: ILogger;
  private readonly handlers = new Map<string, IRecordHandler>();

  /**
   * DLQ handler for routing permanently failed events.
   */
  readonly dlqHandler: DLQHandler;

  /**
   * Error classifier for determining retry vs permanent failure.
   */
  readonly errorClassifier: ErrorClassifier;

  constructor(deps: EventProcessorDeps) {
    this.dlqHandler = deps.dlqHandler;
    this.errorClassifier = deps.errorClassifier;
    this.logger = deps.logger ?? createLogger({ service: 'event-processor' });
  }

  /**
   * Registers a record-type handler for a given collection NSID.
   *
   * @param collection - the full NSID (e.g., `pub.layers.expression.expression`)
   * @param handler - the handler that processes events for this collection
   */
  registerHandler(collection: string, handler: IRecordHandler): void {
    this.handlers.set(collection, handler);
    this.logger.info('Registered record handler', { collection });
  }

  /**
   * Processes a single parsed commit operation.
   *
   * Looks up a registered handler by collection NSID. If found, dispatches
   * to the appropriate method based on the operation action. If no handler
   * is registered, the event is logged and dropped.
   */
  async process(op: ParsedRecordOp, did: string, cursor: number): Promise<void> {
    this.logger.debug('Processing event', {
      action: op.action,
      collection: op.collection,
      rkey: op.rkey,
      did,
      cursor,
    });

    LayersMetrics.firehoseEventsProcessed.labels(op.collection).inc();

    const handler = this.handlers.get(op.collection);
    if (!handler) {
      // No handler registered for this collection; drop the event
      return;
    }

    let result;
    switch (op.action) {
      case 'create':
        result = await handler.handleCreate(did, op.rkey, op.record);
        break;
      case 'update':
        result = await handler.handleUpdate(did, op.rkey, op.record);
        break;
      case 'delete':
        result = await handler.handleDelete(did, op.rkey);
        break;
    }

    if (result && !result.ok) {
      const category = this.errorClassifier.classify(result.error);
      if (category === 'permanent') {
        this.logger.error('Permanent error processing event, sending to DLQ', {
          collection: op.collection,
          rkey: op.rkey,
          did,
          error: result.error.message,
        });
        await this.dlqHandler.addEntry({
          id: `${did}:${op.collection}:${op.rkey}`,
          collection: op.collection,
          rkey: op.rkey,
          did,
          error: {
            stage: 'zod',
            message: result.error.message,
          },
          rawRecord: op.record,
          firehoseCursor: cursor,
          timestamp: new Date(),
        });
      } else {
        this.logger.warn('Retryable error processing event', {
          collection: op.collection,
          rkey: op.rkey,
          did,
          category,
          error: result.error.message,
        });
      }
    }
  }
}

export { EventProcessor };
export type { EventProcessorDeps };
