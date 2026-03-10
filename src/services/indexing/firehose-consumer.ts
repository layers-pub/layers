/**
 * WebSocket subscription to the AT Protocol firehose relay.
 *
 * Connects to the relay, decodes CBOR frames, parses CAR-encoded commits,
 * filters for pub.layers.* records, and dispatches events through the
 * processing pipeline.
 *
 * @module
 */

import {
  ConsecutiveBreaker,
  ExponentialBackoff,
  handleAll,
  retry,
  wrap,
  circuitBreaker,
  type IPolicy,
} from 'cockatiel';
import WebSocket from 'ws';

import type { LexValue } from '@atproto/lex-data';
import { Frame, type MessageFrame } from '@atproto/xrpc-server';

import { createLogger } from '../../observability/logger.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

import type { CommitHandler } from './commit-handler.js';
import type { CursorManager } from './cursor-manager.js';
import type { EventFilter } from './event-filter.js';
import type { EventProcessor } from './event-processor.js';
import type { EventQueue } from './event-queue.js';

/** Narrow a LexValue to a string-keyed record, or return undefined. */
function asRecord(val: LexValue): Record<string, LexValue | undefined> | undefined {
  if (
    val !== null &&
    typeof val === 'object' &&
    !Array.isArray(val) &&
    !(val instanceof Uint8Array)
  ) {
    return val as Record<string, LexValue | undefined>;
  }
  return undefined;
}

/**
 * Dependencies for constructing a {@link FirehoseConsumer}.
 */
interface FirehoseConsumerDeps {
  readonly eventFilter: EventFilter;
  readonly commitHandler: CommitHandler;
  readonly eventProcessor: EventProcessor;
  readonly eventQueue: EventQueue;
  readonly logger?: ILogger;
}

/**
 * Subscribes to the AT Protocol firehose via WebSocket, filters for
 * pub.layers.* records, and dispatches events to the processing pipeline.
 *
 * Includes circuit breaker reconnection (500ms initial, 30s max, 2x backoff)
 * and backpressure control (pauses WebSocket when queue depth exceeds
 * threshold).
 */
class FirehoseConsumer {
  private readonly relayUrl: string;
  private readonly cursorManager: CursorManager;

  /** Event filter for NSID matching. */
  readonly eventFilter: EventFilter;

  /** Commit handler for CAR file parsing. */
  readonly commitHandler: CommitHandler;

  /** Event processor for routing to record-type handlers. */
  readonly eventProcessor: EventProcessor;
  private readonly eventQueue: EventQueue;
  private readonly logger: ILogger;
  private readonly reconnectPolicy: IPolicy;

  private ws: WebSocket | null = null;
  private running = false;

  constructor(relayUrl: string, cursorManager: CursorManager, deps: FirehoseConsumerDeps) {
    this.relayUrl = relayUrl;
    this.cursorManager = cursorManager;
    this.eventFilter = deps.eventFilter;
    this.commitHandler = deps.commitHandler;
    this.eventProcessor = deps.eventProcessor;
    this.eventQueue = deps.eventQueue;
    this.logger = deps.logger ?? createLogger({ service: 'firehose-consumer' });

    this.reconnectPolicy = wrap(
      retry(handleAll, {
        maxAttempts: 10,
        backoff: new ExponentialBackoff({
          initialDelay: 500,
          maxDelay: 30_000,
          exponent: 2,
        }),
      }),
      circuitBreaker(handleAll, {
        halfOpenAfter: 30_000,
        breaker: new ConsecutiveBreaker(5),
      }),
    );
  }

  /**
   * Starts the firehose subscription.
   *
   * Connects to the relay WebSocket, resumes from the last persisted cursor,
   * and begins processing events.
   */
  async start(): Promise<void> {
    this.running = true;
    const cursor = await this.cursorManager.getCursor();
    this.logger.info('Starting firehose consumer', {
      relayUrl: this.relayUrl,
      cursor: cursor ?? 'none (full replay)',
    });

    this.connect(cursor);
  }

  /**
   * Stops the firehose subscription and flushes the cursor.
   */
  stop(): void {
    this.running = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.logger.info('Firehose consumer stopped');
  }

  private connect(cursor: number | null): void {
    const params = cursor !== null ? `?cursor=${cursor}` : '';
    const url = `${this.relayUrl}/xrpc/com.atproto.sync.subscribeRepos${params}`;

    this.ws = new WebSocket(url);

    this.ws.on('message', (data: Buffer) => {
      void this.handleMessage(data);
    });

    this.ws.on('error', (err: Error) => {
      this.logger.error('WebSocket error', { error: err.message });
    });

    this.ws.on('close', () => {
      if (this.running) {
        this.logger.warn('WebSocket closed, reconnecting...');
        void this.reconnect();
      }
    });

    this.ws.on('open', () => {
      this.logger.info('WebSocket connected to relay');
    });
  }

  private async reconnect(): Promise<void> {
    if (!this.running) return;

    try {
      await this.reconnectPolicy.execute(async () => {
        const cursor = await this.cursorManager.getCursor();
        this.connect(cursor);
      });
    } catch (err) {
      this.logger.error('Failed to reconnect after retries', {
        error: (err as Error).message,
      });
    }
  }

  private async handleMessage(data: Buffer): Promise<void> {
    // Check backpressure before processing
    const backpressured = await this.eventQueue.isBackpressured();
    if (backpressured) {
      this.logger.warn('Backpressure detected, pausing consumption');
      this.ws?.pause();
      setTimeout(() => {
        this.ws?.resume();
      }, 1_000);
      return;
    }

    try {
      // Decode the CBOR frame (header + body)
      const frame = Frame.fromBytes(data);

      if (frame.isError()) {
        this.logger.error('Firehose error frame', {
          error: frame.code,
          message: frame.message,
        });
        return;
      }

      if (!frame.isMessage()) {
        return;
      }

      // We only process #commit messages; #identity, #handle, #account,
      // and #tombstone are informational and do not contain record data.
      if (frame.type !== '#commit') {
        this.logger.trace('Skipping non-commit message', { type: frame.type });
        return;
      }

      await this.handleCommit(frame);
    } catch (err) {
      this.logger.error('Error handling firehose message', {
        error: (err as Error).message,
      });
    }
  }

  /**
   * Processes a #commit message: filters for relevant NSIDs, parses
   * the CAR blocks, and dispatches each operation to the event processor.
   */
  private async handleCommit(frame: MessageFrame<LexValue>): Promise<void> {
    const body = asRecord(frame.body);
    if (!body) {
      this.logger.warn('Commit body is not a record');
      return;
    }

    const did = body.repo;
    const seq = body.seq;
    const ops = body.ops;
    const blocks = body.blocks;
    const tooBig = body.tooBig;

    if (typeof did !== 'string' || typeof seq !== 'number') {
      this.logger.warn('Commit body missing required fields', {
        hasRepo: typeof did,
        hasSeq: typeof seq,
      });
      return;
    }

    // Update cursor regardless of whether we process the commit
    this.cursorManager.update(seq);

    // Skip commits flagged as too large (no blocks included)
    if (tooBig === true) {
      this.logger.debug('Skipping tooBig commit', { did, cursor: seq });
      return;
    }

    if (!Array.isArray(ops) || !(blocks instanceof Uint8Array)) {
      this.logger.warn('Commit body has invalid ops or blocks', { did });
      return;
    }

    // Quick check: does this commit contain any collection we care about?
    const typedOps = ops as Record<string, LexValue | undefined>[];
    const hasRelevant = typedOps.some((op) => {
      const path = op.path;
      if (typeof path !== 'string') return false;
      const slashIdx = path.indexOf('/');
      const collection = slashIdx !== -1 ? path.slice(0, slashIdx) : path;
      return this.eventFilter.isRelevant(collection);
    });

    if (!hasRelevant) {
      return;
    }

    // Normalize ops for the commit handler
    const commitOps = typedOps
      .filter(
        (op): op is Record<string, LexValue | undefined> & { action: string; path: string } => {
          return typeof op.action === 'string' && typeof op.path === 'string';
        },
      )
      .map((op) => ({
        action: op.action,
        path: op.path,
        cid: op.cid,
      }));

    // Parse CAR blocks and extract records
    const parsed = await this.commitHandler.parseCommit(commitOps, blocks);

    // Dispatch each parsed operation to the event processor
    for (const op of parsed) {
      if (!this.eventFilter.isRelevant(op.collection)) {
        continue;
      }

      await this.eventProcessor.process(op, did, seq);
    }
  }
}

export { FirehoseConsumer };
export type { FirehoseConsumerDeps };
