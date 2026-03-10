/**
 * Registry for managing all plugin types in the Layers plugin system.
 *
 * Tracks registered plugins by name, supports typed retrieval by
 * plugin category, and monitors plugin health status. Handles both
 * built-in and user-contributed plugins.
 *
 * @module
 */

import { createLogger } from '../observability/logger.js';
import { PluginError } from '../types/errors.js';
import type { ILogger } from '../types/interfaces/logger.interface.js';
import type {
  IFormatImporter,
  ImportFormat,
  PluginMetadata,
} from '../types/interfaces/plugin.interface.js';

import type { IPlugin, PluginType } from './core/plugin-interface.js';
import type { IPluginHealthStatus } from './core/plugin-lifecycle.js';
import type { IAnnotationToolPlugin } from './types/annotation-tool-plugin.js';
import type { IEnrichmentPlugin } from './types/enrichment-plugin.js';
import type { IExportPlugin } from './types/export-plugin.js';

/**
 * Configuration for the plugin registry.
 */
interface PluginRegistryConfig {
  readonly logger?: ILogger | undefined;
}

/**
 * Stores and retrieves plugins of all types by name.
 *
 * Each plugin name must be unique across all types. Attempting to
 * register a duplicate name throws a {@link PluginError}. The registry
 * also maintains backward-compatible access to format importers via
 * the legacy `getImporter` and `hasImporter` methods.
 */
class PluginRegistry {
  private readonly plugins = new Map<string, IPlugin>();
  private readonly importers = new Map<ImportFormat, IFormatImporter>();
  private readonly metadata: PluginMetadata[] = [];
  private readonly healthStatuses = new Map<string, IPluginHealthStatus>();
  private readonly logger: ILogger;

  constructor(config?: PluginRegistryConfig) {
    this.logger = config?.logger ?? createLogger({ service: 'plugin-registry' });
  }

  /**
   * Register a format importer plugin (legacy method).
   *
   * @param importer - the importer to register
   * @throws {PluginError} if an importer for the same format is already registered
   */
  register(importer: IFormatImporter): void {
    if (this.importers.has(importer.format)) {
      throw new PluginError(
        importer.name,
        'import',
        `Importer for format '${importer.format}' is already registered`,
      );
    }

    this.importers.set(importer.format, importer);
    this.metadata.push({
      id: `${importer.format}-importer`,
      name: importer.name,
      version: importer.version,
      format: importer.format,
      description: `${importer.name} v${importer.version}`,
    });

    this.logger.info('Importer plugin registered', {
      format: importer.format,
      name: importer.name,
    });
  }

  /**
   * Register a user-contributed or built-in plugin of any type.
   *
   * @param plugin - the plugin to register
   * @throws {PluginError} if a plugin with the same name is already registered
   */
  registerPlugin(plugin: IPlugin): void {
    const name = plugin.manifest.name;

    if (this.plugins.has(name)) {
      throw new PluginError(name, 'init', `Plugin '${name}' is already registered`);
    }

    this.plugins.set(name, plugin);
    this.healthStatuses.set(name, {
      pluginName: name,
      status: 'stopped',
      lastCheck: new Date(),
      errorCount: 0,
    });

    this.logger.info('Plugin registered', {
      name,
      type: plugin.manifest.type,
      version: plugin.manifest.version,
    });
  }

  /**
   * Remove a plugin from the registry by name.
   *
   * @param name - the plugin name to unregister
   * @returns true if the plugin was found and removed, false otherwise
   */
  unregister(name: string): boolean {
    const removed = this.plugins.delete(name);
    if (removed) {
      this.healthStatuses.delete(name);
      this.logger.info('Plugin unregistered', { name });
    }
    return removed;
  }

  /**
   * Get a registered importer by format (legacy method).
   *
   * @param format - the import format to look up
   * @returns the registered importer, or undefined if none exists
   */
  getImporter(format: ImportFormat): IFormatImporter | undefined {
    return this.importers.get(format);
  }

  /**
   * Check if a format has a registered importer (legacy method).
   *
   * @param format - the import format to check
   * @returns true if an importer is registered for the given format
   */
  hasImporter(format: ImportFormat): boolean {
    return this.importers.has(format);
  }

  /**
   * List all registered legacy plugin metadata.
   *
   * @returns a readonly array of plugin metadata entries
   */
  listPlugins(): readonly PluginMetadata[] {
    return this.metadata;
  }

  /**
   * Get a plugin by name.
   *
   * @param name - the plugin name
   * @returns the plugin, or undefined if not registered
   */
  getPlugin(name: string): IPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all plugins of a specific type.
   *
   * @param type - the plugin type to filter by
   * @returns an array of plugins matching the type
   */
  getPluginsByType(type: PluginType): IPlugin[] {
    return [...this.plugins.values()].filter((p) => p.manifest.type === type);
  }

  /**
   * Get all registered annotation tool plugins.
   *
   * @returns annotation tool plugins cast to their specific interface
   */
  getAnnotationTools(): IAnnotationToolPlugin[] {
    return this.getPluginsByType('annotation-tool') as IAnnotationToolPlugin[];
  }

  /**
   * Get all registered export plugins.
   *
   * @returns export plugins cast to their specific interface
   */
  getExporters(): IExportPlugin[] {
    return this.getPluginsByType('export') as IExportPlugin[];
  }

  /**
   * Get all registered enrichment plugins.
   *
   * @returns enrichment plugins cast to their specific interface
   */
  getEnrichments(): IEnrichmentPlugin[] {
    return this.getPluginsByType('enrichment') as IEnrichmentPlugin[];
  }

  /**
   * Get all registered visualization plugins.
   *
   * @returns visualization plugins
   */
  getVisualizations(): IPlugin[] {
    return this.getPluginsByType('visualization');
  }

  /**
   * Get all registered importer plugins (new-style IPlugin-based).
   *
   * @returns importer plugins
   */
  getImporters(): IPlugin[] {
    return this.getPluginsByType('importer');
  }

  /**
   * Get all registered backlink plugins.
   *
   * @returns backlink plugins
   */
  getBacklinks(): IPlugin[] {
    return this.getPluginsByType('backlink');
  }

  /**
   * Get the health status of a specific plugin.
   *
   * @param name - the plugin name
   * @returns the health status, or undefined if the plugin is not registered
   */
  getHealthStatus(name: string): IPluginHealthStatus | undefined {
    return this.healthStatuses.get(name);
  }

  /**
   * Update the health status of a plugin.
   *
   * @param name - the plugin name
   * @param status - the new health status
   */
  updateHealthStatus(name: string, status: IPluginHealthStatus): void {
    if (this.plugins.has(name)) {
      this.healthStatuses.set(name, status);
    }
  }

  /**
   * Get health statuses for all registered plugins.
   *
   * @returns a readonly array of all plugin health statuses
   */
  getAllHealthStatuses(): readonly IPluginHealthStatus[] {
    return [...this.healthStatuses.values()];
  }

  /**
   * Get the total number of registered plugins (both legacy and new-style).
   *
   * @returns the count of all registered plugins
   */
  get size(): number {
    return this.plugins.size + this.importers.size;
  }
}

export { PluginRegistry };
export type { PluginRegistryConfig };
