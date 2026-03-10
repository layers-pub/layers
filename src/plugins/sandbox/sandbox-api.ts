/**
 * Restricted API surface available to sandboxed plugins.
 *
 * Each method validates inputs and checks permissions before
 * delegating to the host. Plugins without the required permission
 * receive a SandboxViolationError when calling gated methods.
 *
 * @module
 */

import { SandboxViolationError } from '../../types/errors.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

import type { PluginPermission } from '../core/plugin-interface.js';

/**
 * Record query parameters for sandboxed plugins.
 */
interface SandboxRecordQueryParams {
  readonly collection: string;
  readonly limit?: number | undefined;
  readonly cursor?: string | undefined;
}

/**
 * Read-only record access provided to sandboxed plugins.
 */
interface ISandboxRecordsAPI {
  query(params: SandboxRecordQueryParams): Promise<Record<string, unknown>[]>;
  get(uri: string): Promise<Record<string, unknown> | null>;
}

/**
 * Scoped key-value storage for sandboxed plugins.
 */
interface ISandboxStorageAPI {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Structured logging for sandboxed plugins.
 */
interface ISandboxLogAPI {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Restricted fetch for sandboxed plugins.
 * Only allows HTTPS requests when the plugin has network:outbound permission.
 */
interface ISandboxNetworkAPI {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

/**
 * Complete API surface exposed to sandboxed plugins.
 */
interface ISandboxAPI {
  readonly records: ISandboxRecordsAPI;
  readonly storage: ISandboxStorageAPI;
  readonly log: ISandboxLogAPI;
  readonly network: ISandboxNetworkAPI;
}

/**
 * Host-side callbacks that the sandbox delegates to.
 *
 * The plugin host (Layers appview) implements these to provide
 * real storage, record access, and network functionality.
 */
interface ISandboxHostCallbacks {
  queryRecords(params: SandboxRecordQueryParams): Promise<Record<string, unknown>[]>;
  getRecord(uri: string): Promise<Record<string, unknown> | null>;
  storageGet(pluginName: string, key: string): Promise<string | null>;
  storageSet(pluginName: string, key: string, value: string): Promise<void>;
  storageDelete(pluginName: string, key: string): Promise<void>;
}

/**
 * Configuration for creating a sandbox API instance.
 */
interface SandboxAPIConfig {
  readonly pluginName: string;
  readonly permissions: ReadonlySet<PluginPermission>;
  readonly logger: ILogger;
  readonly hostCallbacks: ISandboxHostCallbacks;
}

/**
 * Validate that a string is a valid AT-URI format.
 *
 * @param uri - the string to validate
 * @returns true if the string looks like an AT-URI
 */
function isValidAtUri(uri: string): boolean {
  return uri.startsWith('at://') && uri.length > 5;
}

/**
 * Create the restricted API surface for a sandboxed plugin.
 *
 * Each method checks the plugin's granted permissions before
 * delegating to the host. Calling a method without the required
 * permission throws a {@link SandboxViolationError}.
 *
 * @param config - sandbox API configuration
 * @returns the complete sandbox API object
 */
function createSandboxAPI(config: SandboxAPIConfig): ISandboxAPI {
  const { pluginName, permissions, logger, hostCallbacks } = config;

  const pluginLogger = logger.child({ plugin: pluginName, sandboxed: true });

  function requirePermission(permission: PluginPermission, operation: string): void {
    if (!permissions.has(permission)) {
      throw new SandboxViolationError(
        pluginName,
        'api_violation',
        `Plugin '${pluginName}' lacks '${permission}' permission for operation: ${operation}`,
      );
    }
  }

  const records: ISandboxRecordsAPI = {
    async query(params: SandboxRecordQueryParams): Promise<Record<string, unknown>[]> {
      requirePermission('read:records', 'records.query');

      if (!params.collection || typeof params.collection !== 'string') {
        throw new SandboxViolationError(
          pluginName,
          'api_violation',
          'records.query requires a non-empty collection string',
        );
      }

      const limit = params.limit ?? 50;
      if (limit < 1 || limit > 100) {
        throw new SandboxViolationError(
          pluginName,
          'api_violation',
          'records.query limit must be between 1 and 100',
        );
      }

      return hostCallbacks.queryRecords({
        collection: params.collection,
        limit,
        cursor: params.cursor,
      });
    },

    async get(uri: string): Promise<Record<string, unknown> | null> {
      requirePermission('read:records', 'records.get');

      if (!isValidAtUri(uri)) {
        throw new SandboxViolationError(
          pluginName,
          'api_violation',
          `records.get requires a valid AT-URI, received: ${String(uri).slice(0, 100)}`,
        );
      }

      return hostCallbacks.getRecord(uri);
    },
  };

  const storage: ISandboxStorageAPI = {
    async get(key: string): Promise<string | null> {
      requirePermission('storage:local', 'storage.get');

      if (!key || typeof key !== 'string') {
        throw new SandboxViolationError(
          pluginName,
          'api_violation',
          'storage.get requires a non-empty string key',
        );
      }

      return hostCallbacks.storageGet(pluginName, key);
    },

    async set(key: string, value: string): Promise<void> {
      requirePermission('storage:local', 'storage.set');

      if (!key || typeof key !== 'string') {
        throw new SandboxViolationError(
          pluginName,
          'api_violation',
          'storage.set requires a non-empty string key',
        );
      }
      if (typeof value !== 'string') {
        throw new SandboxViolationError(
          pluginName,
          'api_violation',
          'storage.set requires a string value',
        );
      }

      return hostCallbacks.storageSet(pluginName, key, value);
    },

    async delete(key: string): Promise<void> {
      requirePermission('storage:local', 'storage.delete');

      if (!key || typeof key !== 'string') {
        throw new SandboxViolationError(
          pluginName,
          'api_violation',
          'storage.delete requires a non-empty string key',
        );
      }

      return hostCallbacks.storageDelete(pluginName, key);
    },
  };

  const log: ISandboxLogAPI = {
    info(message: string, data?: Record<string, unknown>): void {
      pluginLogger.info(message, data);
    },
    warn(message: string, data?: Record<string, unknown>): void {
      pluginLogger.warn(message, data);
    },
    error(message: string, data?: Record<string, unknown>): void {
      pluginLogger.error(message, data);
    },
  };

  const network: ISandboxNetworkAPI = {
    async fetch(url: string, init?: RequestInit): Promise<Response> {
      requirePermission('network:outbound', 'network.fetch');

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new SandboxViolationError(
          pluginName,
          'network_violation',
          `Invalid URL provided to network.fetch: ${String(url).slice(0, 200)}`,
        );
      }

      if (parsed.protocol !== 'https:') {
        throw new SandboxViolationError(
          pluginName,
          'network_violation',
          `network.fetch only allows HTTPS, received: ${parsed.protocol}`,
        );
      }

      pluginLogger.debug('Sandboxed fetch request', {
        url: parsed.origin + parsed.pathname,
      });

      return globalThis.fetch(url, init);
    },
  };

  return { records, storage, log, network };
}

export { createSandboxAPI, isValidAtUri };
export type {
  ISandboxAPI,
  ISandboxHostCallbacks,
  ISandboxLogAPI,
  ISandboxNetworkAPI,
  ISandboxRecordsAPI,
  ISandboxStorageAPI,
  SandboxAPIConfig,
  SandboxRecordQueryParams,
};
