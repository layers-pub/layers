/**
 * Unit tests for the plugin event bus.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILogger } from '../../../../src/types/interfaces/logger.interface.js';
import { PluginEventBus } from '../../../../src/plugins/core/event-bus.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockLogger(): ILogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PluginEventBus', () => {
  let bus: PluginEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    bus = new PluginEventBus({ logger: mockLogger });
  });

  // -----------------------------------------------------------------------
  // Subscription and emission
  // -----------------------------------------------------------------------

  describe('on and emit', () => {
    it('calls handler when event is emitted', () => {
      const handler = vi.fn();
      bus.on('test-event', handler);
      bus.emit('test-event', { key: 'value' });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ key: 'value' });
    });

    it('does not call handler for different event', () => {
      const handler = vi.fn();
      bus.on('event-a', handler);
      bus.emit('event-b', {});

      expect(handler).not.toHaveBeenCalled();
    });

    it('supports multiple subscribers for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.on('multi', handler1);
      bus.on('multi', handler2);
      bus.on('multi', handler3);

      bus.emit('multi', 'data');

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('passes correct payload data to handler', () => {
      const handler = vi.fn();
      const payload = { uri: 'at://test', collection: 'pub.layers.expression.expression' };

      bus.on('record:created', handler);
      bus.emit('record:created', payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });
  });

  // -----------------------------------------------------------------------
  // Typed events
  // -----------------------------------------------------------------------

  describe('onTyped and emitTyped', () => {
    it('subscribes and emits standard events with correct types', () => {
      const handler = vi.fn();
      bus.onTyped('record:created', handler);
      bus.emitTyped('record:created', {
        uri: 'at://test',
        collection: 'pub.layers.expression.expression',
      });

      expect(handler).toHaveBeenCalledWith({
        uri: 'at://test',
        collection: 'pub.layers.expression.expression',
      });
    });

    it('handles import:complete event', () => {
      const handler = vi.fn();
      bus.onTyped('import:complete', handler);
      bus.emitTyped('import:complete', {
        format: 'conll-u',
        recordCount: 100,
        pluginName: 'conll-importer',
      });

      expect(handler).toHaveBeenCalledWith({
        format: 'conll-u',
        recordCount: 100,
        pluginName: 'conll-importer',
      });
    });
  });

  // -----------------------------------------------------------------------
  // Unsubscription
  // -----------------------------------------------------------------------

  describe('off', () => {
    it('removes a specific handler', () => {
      const handler = vi.fn();
      bus.on('test', handler);
      bus.off('test', handler);
      bus.emit('test', 'data');

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not affect other handlers when one is removed', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('test', handler1);
      bus.on('test', handler2);
      bus.off('test', handler1);

      bus.emit('test', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('is a no-op when removing an unregistered handler', () => {
      const handler = vi.fn();
      // Should not throw
      bus.off('nonexistent', handler);
    });
  });

  describe('offTyped', () => {
    it('removes a typed handler', () => {
      const handler = vi.fn();
      bus.onTyped('record:deleted', handler);
      bus.offTyped('record:deleted', handler);
      bus.emitTyped('record:deleted', { uri: 'at://test', collection: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Error isolation
  // -----------------------------------------------------------------------

  describe('error handling in handlers', () => {
    it('catches handler errors without breaking other subscribers', () => {
      const badHandler = vi.fn().mockImplementation(() => {
        throw new Error('handler crashed');
      });
      const goodHandler = vi.fn();

      bus.on('test', badHandler);
      bus.on('test', goodHandler);

      // Should not throw
      bus.emit('test', 'data');

      expect(badHandler).toHaveBeenCalledOnce();
      expect(goodHandler).toHaveBeenCalledOnce();
    });

    it('logs handler errors', () => {
      const badHandler = vi.fn().mockImplementation(() => {
        throw new Error('boom');
      });

      bus.on('test', badHandler);
      bus.emit('test', 'data');

      expect(mockLogger.error).toHaveBeenCalledWith('Plugin event handler threw', {
        event: 'test',
        error: 'boom',
      });
    });

    it('logs non-Error throws as strings', () => {
      const badHandler = vi.fn().mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'string error';
      });

      bus.on('test', badHandler);
      bus.emit('test', 'data');

      expect(mockLogger.error).toHaveBeenCalledWith('Plugin event handler threw', {
        event: 'test',
        error: 'string error',
      });
    });
  });

  // -----------------------------------------------------------------------
  // removeAllListeners
  // -----------------------------------------------------------------------

  describe('removeAllListeners', () => {
    it('removes all listeners for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('event-a', handler1);
      bus.on('event-a', handler2);
      bus.removeAllListeners('event-a');

      bus.emit('event-a', 'data');
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('does not affect other events when clearing a specific event', () => {
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      bus.on('event-a', handlerA);
      bus.on('event-b', handlerB);
      bus.removeAllListeners('event-a');

      bus.emit('event-b', 'data');
      expect(handlerB).toHaveBeenCalledOnce();
    });

    it('removes all listeners for all events when no event is specified', () => {
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      bus.on('event-a', handlerA);
      bus.on('event-b', handlerB);
      bus.removeAllListeners();

      bus.emit('event-a', 'data');
      bus.emit('event-b', 'data');
      expect(handlerA).not.toHaveBeenCalled();
      expect(handlerB).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // listenerCount
  // -----------------------------------------------------------------------

  describe('listenerCount', () => {
    it('returns 0 for event with no listeners', () => {
      expect(bus.listenerCount('empty')).toBe(0);
    });

    it('returns correct count after adding listeners', () => {
      bus.on('test', vi.fn());
      bus.on('test', vi.fn());
      expect(bus.listenerCount('test')).toBe(2);
    });

    it('decrements count after removing a listener', () => {
      const handler = vi.fn();
      bus.on('test', handler);
      bus.on('test', vi.fn());
      bus.off('test', handler);

      expect(bus.listenerCount('test')).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // maxListeners
  // -----------------------------------------------------------------------

  describe('maxListeners', () => {
    it('warns and ignores subscriptions beyond the max', () => {
      const smallBus = new PluginEventBus({ logger: mockLogger, maxListeners: 2 });

      smallBus.on('test', vi.fn());
      smallBus.on('test', vi.fn());
      smallBus.on('test', vi.fn()); // exceeds limit

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Max listeners reached for event, ignoring new subscription',
        { event: 'test', maxListeners: 2 },
      );
      expect(smallBus.listenerCount('test')).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // No-op emit
  // -----------------------------------------------------------------------

  describe('emit with no listeners', () => {
    it('does not throw when emitting to an event with no listeners', () => {
      expect(() => bus.emit('nobody-listening', { data: true })).not.toThrow();
    });
  });
});
