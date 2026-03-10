/**
 * Typed event bus for plugin-to-host and inter-plugin communication.
 *
 * Provides a type-safe event map so that emitters and listeners
 * agree on the payload shape for each standard event. Custom
 * string events are also supported for plugin-defined events.
 *
 * @module
 */

import { createLogger } from '../../observability/logger.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

import type { IPluginEventBus } from './plugin-interface.js';

/**
 * Payload shapes for standard plugin events.
 */
interface IPluginEventMap {
  readonly 'record:created': { readonly uri: string; readonly collection: string };
  readonly 'record:updated': { readonly uri: string; readonly collection: string };
  readonly 'record:deleted': { readonly uri: string; readonly collection: string };
  readonly 'annotation:created': {
    readonly uri: string;
    readonly expressionUri: string;
    readonly kind: string;
  };
  readonly 'layer:saved': {
    readonly uri: string;
    readonly expressionUri: string;
    readonly annotationCount: number;
  };
  readonly 'import:complete': {
    readonly format: string;
    readonly recordCount: number;
    readonly pluginName: string;
  };
}

/**
 * Union of all standard event names.
 */
type PluginEventName = keyof IPluginEventMap;

/**
 * Event handler function for a specific event.
 */
type PluginEventHandler<T> = (data: T) => void;

/**
 * Configuration for the plugin event bus.
 */
interface PluginEventBusConfig {
  readonly logger?: ILogger | undefined;
  readonly maxListeners?: number | undefined;
}

/**
 * In-process event bus that implements {@link IPluginEventBus}.
 *
 * Supports both typed standard events (from {@link IPluginEventMap})
 * and arbitrary string events for plugin-defined communication.
 * Handlers that throw are caught and logged without disrupting
 * other listeners.
 */
class PluginEventBus implements IPluginEventBus {
  private readonly listeners = new Map<string, Set<(...args: readonly unknown[]) => void>>();
  private readonly logger: ILogger;
  private readonly maxListeners: number;

  constructor(config?: PluginEventBusConfig) {
    this.logger = config?.logger ?? createLogger({ service: 'plugin-event-bus' });
    this.maxListeners = config?.maxListeners ?? 100;
  }

  /**
   * Subscribe to a typed standard event.
   *
   * @param event - the event name from the standard event map
   * @param handler - the handler to invoke when the event fires
   */
  onTyped<E extends PluginEventName>(
    event: E,
    handler: PluginEventHandler<IPluginEventMap[E]>,
  ): void {
    this.on(event, handler as (...args: readonly unknown[]) => void);
  }

  /**
   * Unsubscribe a typed handler from a standard event.
   *
   * @param event - the event name from the standard event map
   * @param handler - the handler to remove
   */
  offTyped<E extends PluginEventName>(
    event: E,
    handler: PluginEventHandler<IPluginEventMap[E]>,
  ): void {
    this.off(event, handler as (...args: readonly unknown[]) => void);
  }

  /**
   * Emit a typed standard event to all registered listeners.
   *
   * @param event - the event name from the standard event map
   * @param data - the event payload
   */
  emitTyped<E extends PluginEventName>(event: E, data: IPluginEventMap[E]): void {
    this.emit(event, data);
  }

  /**
   * Subscribe to an event by string name.
   *
   * @param event - the event name
   * @param handler - the handler function
   */
  on(event: string, handler: (...args: readonly unknown[]) => void): void {
    let handlers = this.listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }

    if (handlers.size >= this.maxListeners) {
      this.logger.warn('Max listeners reached for event, ignoring new subscription', {
        event,
        maxListeners: this.maxListeners,
      });
      return;
    }

    handlers.add(handler);
  }

  /**
   * Unsubscribe a handler from an event.
   *
   * @param event - the event name
   * @param handler - the handler to remove
   */
  off(event: string, handler: (...args: readonly unknown[]) => void): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all registered listeners.
   *
   * Each handler is invoked synchronously. If a handler throws,
   * the error is caught and logged, and remaining handlers still execute.
   *
   * @param event - the event name
   * @param data - the event payload
   */
  emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        this.logger.error('Plugin event handler threw', {
          event,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Remove all listeners for all events, or for a specific event.
   *
   * @param event - optional event name; if omitted, clears all events
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners registered for a specific event.
   *
   * @param event - the event name
   * @returns the number of registered handlers
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

export { PluginEventBus };
export type { IPluginEventMap, PluginEventBusConfig, PluginEventHandler, PluginEventName };
