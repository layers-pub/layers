/**
 * Unit tests for TapConsumer.
 *
 * Stubs the SimpleIndexer/Channel pair supplied by @atproto/tap so the tests
 * focus on the translation from `RecordEvent` → `ParsedRecordOp` and the
 * interaction with EventFilter, EventQueue, CursorManager, EventProcessor.
 */

import type { RecordEvent } from '@atproto/tap';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { BackpressureError, TapConsumer } from '../../../../src/services/indexing/tap-consumer.js';
import type { EventFilter } from '../../../../src/services/indexing/event-filter.js';
import type { EventProcessor } from '../../../../src/services/indexing/event-processor.js';
import type { EventQueue } from '../../../../src/services/indexing/event-queue.js';
import type { CursorManager } from '../../../../src/services/indexing/cursor-manager.js';

type RecordEventHandler = (evt: RecordEvent, opts: { ack: () => Promise<void> }) => Promise<void>;
type IdentityEventHandler = (evt: unknown, opts: { ack: () => Promise<void> }) => Promise<void>;

interface CapturedHandlers {
  record?: RecordEventHandler;
  identity?: IdentityEventHandler;
  error?: (err: Error) => void;
}

interface TapMock {
  readonly channelStart: ReturnType<typeof vi.fn>;
  readonly channelDestroy: ReturnType<typeof vi.fn>;
  readonly handlers: CapturedHandlers;
}

const tapInstances: TapMock[] = [];

vi.mock('@atproto/tap', () => {
  class SimpleIndexer {
    handlers: CapturedHandlers = {};
    identity(fn: IdentityEventHandler) {
      this.handlers.identity = fn;
      return this;
    }
    record(fn: RecordEventHandler) {
      this.handlers.record = fn;
      return this;
    }
    error(fn: (err: Error) => void) {
      this.handlers.error = fn;
      return this;
    }
  }

  class Tap {
    readonly url: string;
    constructor(url: string) {
      this.url = url;
    }
    channel(indexer: SimpleIndexer) {
      const channelStart = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const channelDestroy = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const instance: TapMock = {
        channelStart,
        channelDestroy,
        handlers: indexer.handlers,
      };
      tapInstances.push(instance);
      return { start: channelStart, destroy: channelDestroy };
    }
  }

  return { Tap, SimpleIndexer };
});

function makeDeps() {
  const eventFilter: EventFilter = {
    isRelevant: vi.fn((col: string) => col.startsWith('pub.layers.')),
  } as unknown as EventFilter;
  const eventQueue: EventQueue = {
    isBackpressured: vi.fn().mockResolvedValue(false),
  } as unknown as EventQueue;
  const cursorManager: CursorManager = {
    update: vi.fn(),
  } as unknown as CursorManager;
  const eventProcessor: EventProcessor = {
    process: vi.fn().mockResolvedValue(undefined),
  } as unknown as EventProcessor;
  return { eventFilter, eventQueue, cursorManager, eventProcessor };
}

function recordEvent(overrides: Record<string, unknown> = {}): RecordEvent {
  const base: Record<string, unknown> = {
    id: 42,
    type: 'record',
    action: 'create',
    did: 'did:plc:abc',
    rev: '3kabc',
    collection: 'pub.layers.persona.persona',
    rkey: 'rk1',
    record: { name: 'Syntactician', createdAt: '2026-04-17T00:00:00Z' },
    cid: 'bafyaa',
    live: true,
  };
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete base[k];
    else base[k] = v;
  }
  return base as unknown as RecordEvent;
}

beforeEach(() => {
  tapInstances.length = 0;
});

describe('TapConsumer', () => {
  it('starts the channel and wires up SimpleIndexer handlers', async () => {
    const deps = makeDeps();
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    const started = consumer.start();
    // start() resolves when the channel's start promise resolves.
    await started;

    expect(tapInstances).toHaveLength(1);
    expect(tapInstances[0]!.channelStart).toHaveBeenCalledOnce();
    expect(typeof tapInstances[0]!.handlers.record).toBe('function');
    expect(typeof tapInstances[0]!.handlers.identity).toBe('function');
  });

  it('dispatches a record event through EventProcessor and acks on success', async () => {
    const deps = makeDeps();
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    await consumer.start();

    const ack = vi.fn().mockResolvedValue(undefined);
    const evt = recordEvent();
    await tapInstances[0]!.handlers.record!(evt, { ack });

    expect(deps.cursorManager.update).toHaveBeenCalledWith(42);
    expect(deps.eventProcessor.process).toHaveBeenCalledWith(
      {
        action: 'create',
        collection: 'pub.layers.persona.persona',
        rkey: 'rk1',
        record: evt.record,
        cid: 'bafyaa',
      },
      'did:plc:abc',
      42,
    );
    expect(ack).toHaveBeenCalledOnce();
  });

  it('drops events for non-Layers collections without calling the processor', async () => {
    const deps = makeDeps();
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    await consumer.start();

    const ack = vi.fn().mockResolvedValue(undefined);
    const evt = recordEvent({ collection: 'app.bsky.feed.post' as never });
    await tapInstances[0]!.handlers.record!(evt, { ack });

    expect(deps.eventProcessor.process).not.toHaveBeenCalled();
    expect(deps.cursorManager.update).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledOnce();
  });

  it('drops create/update events that arrive without a record body', async () => {
    const deps = makeDeps();
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    await consumer.start();

    const ack = vi.fn().mockResolvedValue(undefined);
    await tapInstances[0]!.handlers.record!(recordEvent({ record: undefined }), { ack });

    expect(deps.eventProcessor.process).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledOnce();
  });

  it('forwards delete events even without a record body', async () => {
    const deps = makeDeps();
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    await consumer.start();

    const ack = vi.fn().mockResolvedValue(undefined);
    const evt = recordEvent({ action: 'delete', record: undefined, cid: undefined });
    await tapInstances[0]!.handlers.record!(evt, { ack });

    expect(deps.eventProcessor.process).toHaveBeenCalledTimes(1);
    const [op, did, cursor] = (deps.eventProcessor.process as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(op).toMatchObject({
      action: 'delete',
      collection: 'pub.layers.persona.persona',
      rkey: 'rk1',
    });
    expect((op as Record<string, unknown>).record).toBeUndefined();
    expect((op as Record<string, unknown>).cid).toBeUndefined();
    expect(did).toBe('did:plc:abc');
    expect(cursor).toBe(42);
    expect(ack).toHaveBeenCalledOnce();
  });

  it('throws BackpressureError instead of acking when the queue is saturated', async () => {
    const deps = makeDeps();
    (deps.eventQueue.isBackpressured as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    await consumer.start();

    const ack = vi.fn();
    await expect(
      tapInstances[0]!.handlers.record!(recordEvent(), { ack }),
    ).rejects.toBeInstanceOf(BackpressureError);

    expect(deps.eventProcessor.process).not.toHaveBeenCalled();
    expect(ack).not.toHaveBeenCalled();
  });

  it('acks identity events and logs the payload', async () => {
    const deps = makeDeps();
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    await consumer.start();

    const ack = vi.fn().mockResolvedValue(undefined);
    await tapInstances[0]!.handlers.identity!(
      {
        id: 99,
        type: 'identity',
        did: 'did:plc:xyz' as never,
        handle: 'alice.example.com' as never,
        isActive: true,
        status: 'active',
      },
      { ack },
    );
    expect(ack).toHaveBeenCalledOnce();
  });

  it('destroys the channel on stop()', async () => {
    const deps = makeDeps();
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    await consumer.start();
    await consumer.stop();
    expect(tapInstances[0]!.channelDestroy).toHaveBeenCalledOnce();
  });

  it('is idempotent across repeat start/stop cycles', async () => {
    const deps = makeDeps();
    const consumer = new TapConsumer({ url: 'http://tap:2480' }, deps);
    await consumer.start();
    await consumer.start();
    await consumer.stop();
    await consumer.stop();
    expect(tapInstances).toHaveLength(1);
    expect(tapInstances[0]!.channelDestroy).toHaveBeenCalledOnce();
  });
});
