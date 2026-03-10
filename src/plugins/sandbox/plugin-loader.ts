/**
 * Load user-contributed plugins from a directory.
 *
 * Reads a plugin directory containing a manifest.json and index.js,
 * validates the manifest, and creates a sandboxed plugin instance.
 * Non-sandboxed external plugins are rejected.
 *
 * @module
 */

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { PluginError } from '../../types/errors.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

import type { IPluginManifest } from '../core/plugin-interface.js';
import { pluginManifestSchema } from '../core/plugin-lifecycle.js';

import type { ISandboxHostCallbacks } from './sandbox-api.js';
import {
  createPluginSandbox,
  DEFAULT_SANDBOX_OPTIONS,
  type ISandboxedPlugin,
  type ISandboxOptions,
} from './plugin-sandbox.js';

/**
 * Interface for loading user-contributed plugins from directories.
 */
interface IPluginLoader {
  /** Load a plugin from a directory path containing a manifest.json and index.js. */
  loadPlugin(pluginDir: string): Promise<Result<ISandboxedPlugin, PluginError>>;
  /** Validate a plugin directory structure and return its manifest. */
  validateStructure(pluginDir: string): Promise<Result<IPluginManifest, PluginError>>;
}

/**
 * Configuration for the plugin loader.
 */
interface PluginLoaderConfig {
  readonly logger: ILogger;
  readonly hostCallbacks: ISandboxHostCallbacks;
  readonly sandboxOptions?: Partial<ISandboxOptions> | undefined;
}

/**
 * Read and parse a plugin manifest from a directory.
 *
 * @param pluginDir - absolute path to the plugin directory
 * @returns the validated manifest, or a PluginError
 */
async function readManifest(pluginDir: string): Promise<Result<IPluginManifest, PluginError>> {
  const manifestPath = join(pluginDir, 'manifest.json');

  let manifestRaw: string;
  try {
    manifestRaw = await readFile(manifestPath, 'utf-8');
  } catch (err) {
    return Err(
      new PluginError(
        'unknown',
        'validate',
        `Failed to read manifest.json at ${manifestPath}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }

  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestRaw) as unknown;
  } catch (err) {
    return Err(
      new PluginError(
        'unknown',
        'validate',
        `Failed to parse manifest.json: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }

  const parsed = pluginManifestSchema.safeParse(manifestJson);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return Err(new PluginError('unknown', 'validate', `Invalid plugin manifest: ${issues}`));
  }

  return Ok(parsed.data as IPluginManifest);
}

/**
 * Check that a plugin directory contains the required index.js file.
 *
 * @param pluginDir - absolute path to the plugin directory
 * @param pluginName - plugin name for error messages
 * @returns void on success, or a PluginError
 */
async function checkEntryPoint(
  pluginDir: string,
  pluginName: string,
): Promise<Result<void, PluginError>> {
  const indexPath = join(pluginDir, 'index.js');

  try {
    const stats = await stat(indexPath);
    if (!stats.isFile()) {
      return Err(
        new PluginError(pluginName, 'validate', `index.js at ${indexPath} is not a regular file`),
      );
    }
    return Ok(undefined);
  } catch (err) {
    return Err(
      new PluginError(
        pluginName,
        'validate',
        `Missing index.js at ${indexPath}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }
}

/**
 * Create a plugin loader for user-contributed plugins.
 *
 * The loader validates plugin directory structure, reads manifests,
 * and creates sandboxed plugin instances. Non-sandboxed external
 * plugins are rejected because all user-contributed code must run
 * in isolation.
 *
 * @param config - loader configuration
 * @returns a plugin loader instance
 */
function createPluginLoader(config: PluginLoaderConfig): IPluginLoader {
  const { logger, hostCallbacks, sandboxOptions } = config;
  const loaderLogger = logger.child({ component: 'plugin-loader' });

  const effectiveOptions: ISandboxOptions = {
    timeout: sandboxOptions?.timeout ?? DEFAULT_SANDBOX_OPTIONS.timeout,
    memoryLimit: sandboxOptions?.memoryLimit ?? DEFAULT_SANDBOX_OPTIONS.memoryLimit,
    permissions: sandboxOptions?.permissions ?? DEFAULT_SANDBOX_OPTIONS.permissions,
  };

  return {
    async validateStructure(pluginDir: string): Promise<Result<IPluginManifest, PluginError>> {
      const manifestResult = await readManifest(pluginDir);
      if (!manifestResult.ok) {
        return manifestResult;
      }

      const manifest = manifestResult.value;
      const entryResult = await checkEntryPoint(pluginDir, manifest.name);
      if (!entryResult.ok) {
        return entryResult as Result<never, PluginError>;
      }

      return Ok(manifest);
    },

    async loadPlugin(pluginDir: string): Promise<Result<ISandboxedPlugin, PluginError>> {
      loaderLogger.info('Loading plugin from directory', { pluginDir });

      // Step 1: Validate structure and read manifest
      const manifestResult = await readManifest(pluginDir);
      if (!manifestResult.ok) {
        return manifestResult as Result<never, PluginError>;
      }

      const manifest = manifestResult.value;

      // Step 2: Reject non-sandboxed external plugins
      if (!manifest.sandboxed) {
        return Err(
          new PluginError(
            manifest.name,
            'validate',
            `Plugin '${manifest.name}' declares sandboxed: false, but all user-contributed plugins must be sandboxed`,
          ),
        );
      }

      // Step 3: Check for index.js
      const entryResult = await checkEntryPoint(pluginDir, manifest.name);
      if (!entryResult.ok) {
        return entryResult as Result<never, PluginError>;
      }

      // Step 4: Read the plugin source
      const indexPath = join(pluginDir, 'index.js');
      let source: string;
      try {
        source = await readFile(indexPath, 'utf-8');
      } catch (err) {
        return Err(
          new PluginError(
            manifest.name,
            'validate',
            `Failed to read plugin source at ${indexPath}: ${err instanceof Error ? err.message : String(err)}`,
            err instanceof Error ? err : undefined,
          ),
        );
      }

      // Step 5: Create the sandbox with manifest permissions
      const pluginOptions: ISandboxOptions = {
        timeout: effectiveOptions.timeout,
        memoryLimit: effectiveOptions.memoryLimit,
        permissions: manifest.permissions,
      };

      const sandboxResult = createPluginSandbox(
        manifest.name,
        source,
        pluginOptions,
        loaderLogger,
        hostCallbacks,
      );

      if (!sandboxResult.ok) {
        return sandboxResult;
      }

      loaderLogger.info('Plugin loaded and sandboxed', {
        name: manifest.name,
        type: manifest.type,
        version: manifest.version,
        permissions: [...manifest.permissions],
      });

      return Ok(sandboxResult.value);
    },
  };
}

export { createPluginLoader, readManifest };
export type { IPluginLoader, PluginLoaderConfig };
