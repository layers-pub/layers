/**
 * Plugin lifecycle management for initialization, startup, shutdown, and disposal.
 *
 * Validates plugin manifests with Zod, checks permissions against an
 * allowed set, and orchestrates the init/start/stop/dispose sequence
 * with structured error handling.
 *
 * @module
 */

import { z } from 'zod';

import { PluginError } from '../../types/errors.js';
import { Err, Ok, type Result } from '../../types/result.js';

import type { IPlugin, IPluginContext, PluginPermission, PluginType } from './plugin-interface.js';

/**
 * Health status of a registered plugin.
 */
interface IPluginHealthStatus {
  readonly pluginName: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy' | 'stopped';
  readonly lastCheck: Date;
  readonly errorCount: number;
  readonly lastError?: string | undefined;
}

/**
 * Zod schema for validating UI component declarations.
 */
const uiComponentDeclarationSchema = z.object({
  componentId: z.string().min(1),
  slot: z.enum(['toolbar', 'sidebar', 'overlay', 'panel']),
  propsSchema: z.record(z.string(), z.unknown()),
});

/**
 * Zod schema for validating annotation tool declarations.
 */
const annotationToolDeclarationSchema = z.object({
  toolId: z.string().min(1),
  supportedKinds: z.array(z.string().min(1)).readonly(),
  supportedAnchors: z.array(z.string().min(1)).readonly(),
  label: z.string().min(1),
  icon: z.string().min(1),
});

/**
 * Zod schema for validating plugin manifests at registration time.
 */
const pluginManifestSchema = z.object({
  name: z.string().min(1).max(128),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(1024),
  author: z.string().min(1).max(256),
  type: z.enum([
    'importer',
    'harvester',
    'backlink',
    'search',
    'annotation-tool',
    'enrichment',
    'export',
    'visualization',
  ] satisfies readonly PluginType[]),
  permissions: z
    .array(
      z.enum([
        'read:records',
        'write:records',
        'network:outbound',
        'storage:local',
        'ui:render',
      ] satisfies readonly PluginPermission[]),
    )
    .readonly(),
  sandboxed: z.boolean(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  uiComponents: z.array(uiComponentDeclarationSchema).readonly().optional(),
  annotationTools: z.array(annotationToolDeclarationSchema).readonly().optional(),
});

/**
 * Validate a plugin manifest against the Zod schema.
 *
 * @param manifest - the manifest to validate
 * @returns void on success, or a PluginError describing the validation failure
 */
function validateManifest(manifest: unknown): Result<void, PluginError> {
  const parsed = pluginManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return Err(new PluginError('unknown', 'validate', `Invalid plugin manifest: ${issues}`));
  }
  return Ok(undefined);
}

/**
 * Check that all requested permissions are in the allowed set.
 *
 * @param requested - permissions the plugin requests
 * @param allowed - permissions the host grants
 * @param pluginName - plugin name for error messages
 * @returns void on success, or a PluginError listing denied permissions
 */
function checkPermissions(
  requested: readonly PluginPermission[],
  allowed: ReadonlySet<PluginPermission>,
  pluginName: string,
): Result<void, PluginError> {
  const denied = requested.filter((p) => !allowed.has(p));
  if (denied.length > 0) {
    return Err(
      new PluginError(
        pluginName,
        'init',
        `Plugin requests denied permissions: ${denied.join(', ')}`,
      ),
    );
  }
  return Ok(undefined);
}

/**
 * Initialize a plugin by validating its manifest, checking permissions,
 * and calling the plugin's init method.
 *
 * @param plugin - the plugin to initialize
 * @param context - the context to provide to the plugin
 * @param allowedPermissions - the set of permissions the host grants
 * @returns void on success, or a PluginError
 */
async function initPlugin(
  plugin: IPlugin,
  context: IPluginContext,
  allowedPermissions?: ReadonlySet<PluginPermission>,
): Promise<Result<void, PluginError>> {
  const manifestResult = validateManifest(plugin.manifest);
  if (!manifestResult.ok) {
    return manifestResult;
  }

  const effectivePermissions =
    allowedPermissions ??
    new Set<PluginPermission>([
      'read:records',
      'write:records',
      'network:outbound',
      'storage:local',
      'ui:render',
    ]);

  const permResult = checkPermissions(
    plugin.manifest.permissions,
    effectivePermissions,
    plugin.manifest.name,
  );
  if (!permResult.ok) {
    return permResult;
  }

  try {
    return await plugin.init(context);
  } catch (err) {
    return Err(
      new PluginError(
        plugin.manifest.name,
        'init',
        `Plugin init threw: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }
}

/**
 * Start a plugin for active operation.
 *
 * @param plugin - the plugin to start
 * @returns void on success, or a PluginError
 */
async function startPlugin(plugin: IPlugin): Promise<Result<void, PluginError>> {
  try {
    return await plugin.start();
  } catch (err) {
    return Err(
      new PluginError(
        plugin.manifest.name,
        'start',
        `Plugin start threw: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }
}

/**
 * Stop a plugin gracefully.
 *
 * @param plugin - the plugin to stop
 * @returns void on success, or a PluginError
 */
async function stopPlugin(plugin: IPlugin): Promise<Result<void, PluginError>> {
  try {
    return await plugin.stop();
  } catch (err) {
    return Err(
      new PluginError(
        plugin.manifest.name,
        'stop',
        `Plugin stop threw: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }
}

/**
 * Dispose a plugin and release all resources.
 *
 * @param plugin - the plugin to dispose
 * @returns void on success, or a PluginError
 */
async function disposePlugin(plugin: IPlugin): Promise<Result<void, PluginError>> {
  try {
    return await plugin.dispose();
  } catch (err) {
    return Err(
      new PluginError(
        plugin.manifest.name,
        'dispose',
        `Plugin dispose threw: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }
}

export {
  checkPermissions,
  disposePlugin,
  initPlugin,
  pluginManifestSchema,
  startPlugin,
  stopPlugin,
  validateManifest,
};
export type { IPluginHealthStatus };
