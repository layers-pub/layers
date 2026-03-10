/**
 * Registry for managing format importer plugins.
 *
 * Tracks registered importers by format and provides lookup,
 * listing, and existence-check operations.
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

/**
 * Configuration for the plugin registry.
 */
interface PluginRegistryConfig {
  readonly logger?: ILogger | undefined;
}

/**
 * Stores and retrieves format importer plugins by their format type.
 *
 * Each format can have at most one registered importer. Attempting to
 * register a duplicate format throws a {@link PluginError}.
 */
class PluginRegistry {
  private readonly importers = new Map<ImportFormat, IFormatImporter>();
  private readonly metadata: PluginMetadata[] = [];
  private readonly logger: ILogger;

  constructor(config?: PluginRegistryConfig) {
    this.logger = config?.logger ?? createLogger({ service: 'plugin-registry' });
  }

  /**
   * Register a format importer plugin.
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

    this.logger.info('Plugin registered', {
      format: importer.format,
      name: importer.name,
    });
  }

  /**
   * Get a registered importer by format.
   *
   * @param format - the import format to look up
   * @returns the registered importer, or undefined if none exists
   */
  getImporter(format: ImportFormat): IFormatImporter | undefined {
    return this.importers.get(format);
  }

  /**
   * List all registered plugin metadata.
   *
   * @returns a readonly array of plugin metadata entries
   */
  listPlugins(): readonly PluginMetadata[] {
    return this.metadata;
  }

  /**
   * Check if a format has a registered importer.
   *
   * @param format - the import format to check
   * @returns true if an importer is registered for the given format
   */
  hasImporter(format: ImportFormat): boolean {
    return this.importers.has(format);
  }
}

export { PluginRegistry };
export type { PluginRegistryConfig };
