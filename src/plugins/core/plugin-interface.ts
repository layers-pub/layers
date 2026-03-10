/**
 * Core plugin type hierarchy for the Layers plugin system.
 *
 * Defines the base plugin interface, manifest structure, context,
 * and type-safe declarations for UI components and annotation tools.
 *
 * @module
 */

import type { PluginError } from '../../types/errors.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';
import type { Result } from '../../types/result.js';

/**
 * All recognized plugin types in the Layers plugin system.
 */
type PluginType =
  | 'importer'
  | 'harvester'
  | 'backlink'
  | 'search'
  | 'annotation-tool'
  | 'enrichment'
  | 'export'
  | 'visualization';

/**
 * Permissions that a plugin can request during registration.
 */
type PluginPermission =
  | 'read:records'
  | 'write:records'
  | 'network:outbound'
  | 'storage:local'
  | 'ui:render';

/**
 * Slots in the frontend UI where a plugin component can be rendered.
 */
type UISlot = 'toolbar' | 'sidebar' | 'overlay' | 'panel';

/**
 * Declaration of a UI component that a plugin contributes.
 *
 * The component is identified by `componentId` and rendered
 * in the specified `slot`. The `propsSchema` field holds a
 * JSON Schema (as a plain object) describing the component's
 * expected props.
 */
interface IUIComponentDeclaration {
  readonly componentId: string;
  readonly slot: UISlot;
  readonly propsSchema: Record<string, unknown>;
}

/**
 * Declaration of an annotation tool that a plugin contributes.
 *
 * Each tool specifies which annotation kinds and anchor types
 * it supports, along with display metadata.
 */
interface IAnnotationToolDeclaration {
  readonly toolId: string;
  readonly supportedKinds: readonly string[];
  readonly supportedAnchors: readonly string[];
  readonly label: string;
  readonly icon: string;
}

/**
 * Plugin manifest describing identity, capabilities, and requirements.
 *
 * Validated with Zod at registration time. The `sandboxed` flag
 * determines whether the plugin runs in a V8 isolate with
 * resource limits.
 */
interface IPluginManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly type: PluginType;
  readonly permissions: readonly PluginPermission[];
  readonly sandboxed: boolean;
  readonly homepage?: string | undefined;
  readonly repository?: string | undefined;
  readonly license?: string | undefined;
  readonly dependencies?: Readonly<Record<string, string>> | undefined;
  readonly uiComponents?: readonly IUIComponentDeclaration[] | undefined;
  readonly annotationTools?: readonly IAnnotationToolDeclaration[] | undefined;
}

/**
 * Event bus interface for inter-plugin and plugin-to-host communication.
 */
interface IPluginEventBus {
  on(event: string, handler: (...args: readonly unknown[]) => void): void;
  off(event: string, handler: (...args: readonly unknown[]) => void): void;
  emit(event: string, data: unknown): void;
}

/**
 * Plugin-scoped storage for persisting small amounts of local data.
 */
interface IPluginStorage {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Read-only API client provided to plugins for querying Layers data.
 */
interface IPluginApiClient {
  getExpression(uri: string): Promise<Record<string, unknown> | undefined>;
  getAnnotationLayer(uri: string): Promise<Record<string, unknown> | undefined>;
  searchExpressions(query: string): Promise<readonly Record<string, unknown>[]>;
}

/**
 * Context provided to plugins during initialization.
 *
 * Contains scoped access to logging, configuration, events,
 * local storage, and a read-only API client.
 */
interface IPluginContext {
  readonly logger: ILogger;
  readonly config: Readonly<Record<string, unknown>>;
  readonly eventBus: IPluginEventBus;
  readonly storage: IPluginStorage;
  readonly apiClient: IPluginApiClient;
}

/**
 * Base interface for all Layers plugins.
 *
 * Every plugin type (importer, exporter, annotation tool, etc.)
 * extends this interface. Lifecycle methods return Result to
 * allow callers to handle failures without exceptions.
 */
interface IPlugin {
  readonly manifest: IPluginManifest;

  /**
   * Initialize the plugin with its context.
   *
   * Called once after registration. The plugin should set up
   * any internal state, validate its configuration, and
   * subscribe to relevant events.
   *
   * @param context - scoped context with logger, config, events, storage, API
   * @returns void on success, or a PluginError
   */
  init(context: IPluginContext): Promise<Result<void, PluginError>>;

  /**
   * Start the plugin for active operation.
   *
   * Called after init completes. For background plugins (harvesters,
   * enrichments), this begins their processing loop.
   *
   * @returns void on success, or a PluginError
   */
  start(): Promise<Result<void, PluginError>>;

  /**
   * Stop the plugin gracefully.
   *
   * Called during shutdown. The plugin should finish any in-progress
   * work and release external resources.
   *
   * @returns void on success, or a PluginError
   */
  stop(): Promise<Result<void, PluginError>>;

  /**
   * Dispose the plugin and release all resources.
   *
   * Called after stop. The plugin must not be used after dispose.
   *
   * @returns void on success, or a PluginError
   */
  dispose(): Promise<Result<void, PluginError>>;
}

export type {
  IAnnotationToolDeclaration,
  IPlugin,
  IPluginApiClient,
  IPluginContext,
  IPluginEventBus,
  IPluginManifest,
  IPluginStorage,
  IUIComponentDeclaration,
  PluginPermission,
  PluginType,
  UISlot,
};
