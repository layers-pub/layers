/**
 * Plugin discovery and loading from the built-in plugin directory.
 *
 * Scans a directory for plugin modules, validates their manifests,
 * and returns an array of plugin instances ready for registration.
 *
 * @module
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { createLogger } from '../../observability/logger.js';
import { PluginError } from '../../types/errors.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

import type { IPlugin } from './plugin-interface.js';
import { validateManifest } from './plugin-lifecycle.js';

/**
 * Configuration for plugin discovery.
 */
interface PluginDiscoveryConfig {
  readonly builtinDir: string;
  readonly logger?: ILogger | undefined;
}

/**
 * Scan the built-in plugins directory for valid plugin modules.
 *
 * Each subdirectory is expected to export a `createPlugin` factory
 * function that returns an {@link IPlugin} instance. Directories
 * that fail manifest validation or lack a factory function are
 * skipped with a warning.
 *
 * @param config - discovery configuration with the directory to scan
 * @returns an array of valid plugin instances, or a PluginError
 */
async function discoverBuiltinPlugins(
  config: PluginDiscoveryConfig,
): Promise<Result<IPlugin[], PluginError>> {
  const logger = config.logger ?? createLogger({ service: 'plugin-discovery' });
  const plugins: IPlugin[] = [];

  let entries: string[];
  try {
    const dirEntries = await readdir(config.builtinDir, { withFileTypes: true });
    entries = dirEntries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    return Err(
      new PluginError(
        'discovery',
        'init',
        `Failed to read plugin directory: ${config.builtinDir}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }

  for (const dirName of entries) {
    const modulePath = join(config.builtinDir, dirName, 'index.js');

    let mod: Record<string, unknown>;
    try {
      mod = (await import(modulePath)) as Record<string, unknown>;
    } catch (err) {
      logger.warn('Failed to import plugin module, skipping', {
        directory: dirName,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    const factory = mod.createPlugin;
    if (typeof factory !== 'function') {
      logger.warn('Plugin module does not export createPlugin, skipping', {
        directory: dirName,
      });
      continue;
    }

    let plugin: IPlugin;
    try {
      plugin = (factory as () => IPlugin)();
    } catch (err) {
      logger.warn('Plugin factory threw, skipping', {
        directory: dirName,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    const manifestResult = validateManifest(plugin.manifest);
    if (!manifestResult.ok) {
      logger.warn('Plugin manifest invalid, skipping', {
        directory: dirName,
        error: manifestResult.error.message,
      });
      continue;
    }

    plugins.push(plugin);
    logger.info('Discovered built-in plugin', {
      name: plugin.manifest.name,
      type: plugin.manifest.type,
      version: plugin.manifest.version,
    });
  }

  return Ok(plugins);
}

export { discoverBuiltinPlugins };
export type { PluginDiscoveryConfig };
