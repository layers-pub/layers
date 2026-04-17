/**
 * Sync consumer for the AT Protocol network via {@link https://github.com/bluesky-social/indigo/tree/main/cmd/tap | Tap}.
 *
 * Replaces the raw `com.atproto.sync.subscribeRepos` WebSocket + CAR parsing
 * pipeline. Tap runs as a separate process (configured with
 * `TAP_SIGNAL_COLLECTION=pub.layers.*` and `TAP_COLLECTION_FILTERS=pub.layers.*`)
 * and handles:
 *
 * - relay connection + firehose decoding
 * - DID and commit cryptographic verification
 * - backfill for newly-discovered repos
 * - per-repo ordering and at-least-once delivery with explicit acks
 *
 * This consumer opens a Tap channel, translates each record event into our
 * existing {@link ParsedRecordOp} shape, dispatches through the shared
 * {@link EventProcessor}, and acks the event on success. Failures bubble to
 * Tap, which will redeliver.
 *
 * @module
 */

import { SimpleIndexer, Tap, type RecordEvent, type IdentityEvent } from '@atproto/tap';

import { createLogger } from '../../observability/logger.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

import type { CursorManager } from './cursor-manager.js';
import type { EventFilter } from './event-filter.js';
import type { EventProcessor } from './event-processor.js';
import type { EventQueue } from './event-queue.js';

/**
 * Options for a {@link TapConsumer}.
 */
interface TapConsumerConfig {
  /** Base URL of the Tap server (e.g. `http://tap:2480`). */
  readonly url: string;
  /** Admin basic-auth password, when the Tap server has auth enabled. */
  readonly adminPassword?: string;
  /** Max WebSocket reconnect delay in seconds. Defaults to Tap's default. */
  readonly maxReconnectSeconds?: number;
  /** WebSocket keepalive interval. Defaults to Tap's default. */
  readonly heartbeatIntervalMs?: number;
}

/**
 * Collaborators the consumer wires into its event loop.
 */
interface TapConsumerDeps {
  readonly eventFilter: EventFilter;
  readonly eventProcessor: EventProcessor;
  readonly eventQueue: EventQueue;
  readonly cursorManager: CursorManager;
  readonly logger?: ILogger;
}

/**
 * Reason a Tap event was not dispatched. Emitted to logs + metrics for
 * observability but never causes the channel to stop.
 */
type DropReason = 'filtered' | 'backpressure' | 'missing-record';

/**
 * Consumes record + identity events from a Tap instance and drives the
 * existing indexing pipeline.
 */
class TapConsumer {
  private readonly tap: Tap;
  private readonly eventFilter: EventFilter;
  private readonly eventProcessor: EventProcessor;
  private readonly eventQueue: EventQueue;
  private readonly cursorManager: CursorManager;
  private readonly logger: ILogger;
  private readonly channelOpts: {
    adminPassword?: string;
    maxReconnectSeconds?: number;
    heartbeatIntervalMs?: number;
  };
  private channel: ReturnType<Tap['channel']> | null = null;
  private running = false;

  constructor(config: TapConsumerConfig, deps: TapConsumerDeps) {
    this.tap =
      config.adminPassword !== undefined
        ? new Tap(config.url, { adminPassword: config.adminPassword })
        : new Tap(config.url);
    this.eventFilter = deps.eventFilter;
    this.eventProcessor = deps.eventProcessor;
    this.eventQueue = deps.eventQueue;
    this.cursorManager = deps.cursorManager;
    this.logger = deps.logger ?? createLogger({ service: 'tap-consumer' });
    const channelOpts: {
      adminPassword?: string;
      maxReconnectSeconds?: number;
      heartbeatIntervalMs?: number;
    } = {};
    if (config.adminPassword !== undefined) channelOpts.adminPassword = config.adminPassword;
    if (config.maxReconnectSeconds !== undefined)
      channelOpts.maxReconnectSeconds = config.maxReconnectSeconds;
    if (config.heartbeatIntervalMs !== undefined)
      channelOpts.heartbeatIntervalMs = config.heartbeatIntervalMs;
    this.channelOpts = channelOpts;
  }

  /**
   * Opens a WebSocket channel to the Tap server and begins processing events.
   *
   * The returned promise resolves when the channel is destroyed or fails
   * irrecoverably.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const indexer = new SimpleIndexer();

    indexer.record(async (evt, opts) => {
      await this.handleRecordEvent(evt);
      await opts?.ack();
    });

    indexer.identity(async (evt, opts) => {
      this.handleIdentityEvent(evt);
      await opts?.ack();
    });

    indexer.error((err) => {
      this.logger.error('Tap channel error', { error: err.message });
    });

    this.channel = this.tap.channel(indexer, this.channelOpts);
    this.logger.info('Tap channel starting', {
      tapUrl: (this.tap as unknown as { url?: string }).url ?? 'configured',
    });
    await this.channel.start();
  }

  /**
   * Closes the Tap channel and releases the underlying WebSocket.
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.channel) {
      await this.channel.destroy();
      this.channel = null;
    }
    this.logger.info('Tap consumer stopped');
  }

  /**
   * Dispatches a single record event through the pipeline.
   *
   * Acks are controlled by the caller (SimpleIndexer) so a failure inside
   * `eventProcessor.process` will cause Tap to redeliver the event.
   */
  private async handleRecordEvent(evt: RecordEvent): Promise<void> {
    if (!this.eventFilter.isRelevant(evt.collection)) {
      this.drop(evt, 'filtered');
      return;
    }

    if (await this.eventQueue.isBackpressured()) {
      // At-least-once delivery lets us refuse to ack; Tap will redeliver.
      this.logger.warn('Backpressure engaged, deferring event for redelivery', {
        id: evt.id,
        collection: evt.collection,
      });
      throw new BackpressureError();
    }

    if ((evt.action === 'create' || evt.action === 'update') && !evt.record) {
      this.drop(evt, 'missing-record');
      return;
    }

    this.cursorManager.update(evt.id);
    const op: {
      action: 'create' | 'update' | 'delete';
      collection: string;
      rkey: string;
      record?: unknown;
      cid?: string;
    } = {
      action: evt.action,
      collection: evt.collection,
      rkey: evt.rkey,
    };
    if (evt.record !== undefined) op.record = evt.record;
    if (evt.cid !== undefined) op.cid = evt.cid;
    await this.eventProcessor.process(op, evt.did, evt.id);
  }

  private handleIdentityEvent(evt: IdentityEvent): void {
    this.logger.info('Identity event', {
      did: evt.did,
      handle: evt.handle,
      status: evt.status,
      isActive: evt.isActive,
    });
  }

  private drop(evt: RecordEvent, reason: DropReason): void {
    this.logger.trace('Dropping Tap event', {
      id: evt.id,
      reason,
      collection: evt.collection,
    });
  }
}

/**
 * Signals that the consumer is refusing to ack because the queue is saturated.
 */
class BackpressureError extends Error {
  constructor() {
    super('event queue is backpressured');
    this.name = 'BackpressureError';
  }
}

export { TapConsumer, BackpressureError };
export type { TapConsumerConfig, TapConsumerDeps };
