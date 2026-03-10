/**
 * Plugin management admin endpoints.
 *
 * Lists registered plugins with health status and provides
 * enable/disable controls for individual plugins.
 *
 * @module
 */

import type { Hono } from 'hono';

import type { PluginRegistry } from '../../../../../plugins/plugin-registry.js';
import { NotFoundError } from '../../../../../types/errors.js';

/**
 * Dependencies required by plugin admin endpoints.
 */
interface PluginAdminDependencies {
  readonly pluginRegistry: PluginRegistry;
}

/**
 * Plugin summary returned by the list endpoint.
 */
interface PluginView {
  readonly name: string;
  readonly type: string;
  readonly version: string;
  readonly status: string;
  readonly errorCount: number;
  readonly lastError?: string | undefined;
}

/**
 * Registers plugin admin routes on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param deps - plugin registry for listing and managing plugins
 */
function pluginsAdminRoutes(app: Hono, deps: PluginAdminDependencies): void {
  const { pluginRegistry } = deps;

  app.get('/admin/v1/plugins', (c) => {
    const healthStatuses = pluginRegistry.getAllHealthStatuses();
    const plugins: PluginView[] = [];

    for (const health of healthStatuses) {
      const plugin = pluginRegistry.getPlugin(health.pluginName);
      plugins.push({
        name: health.pluginName,
        type: plugin?.manifest.type ?? 'unknown',
        version: plugin?.manifest.version ?? 'unknown',
        status: health.status,
        errorCount: health.errorCount,
        lastError: health.lastError,
      });
    }

    // Include legacy importers from listPlugins()
    for (const meta of pluginRegistry.listPlugins()) {
      const alreadyListed = plugins.some((p) => p.name === meta.name);
      if (!alreadyListed) {
        plugins.push({
          name: meta.name,
          type: 'importer',
          version: meta.version,
          status: 'healthy',
          errorCount: 0,
        });
      }
    }

    return c.json(plugins);
  });

  app.post('/admin/v1/plugins/:name/enable', async (c) => {
    const name = c.req.param('name');
    const plugin = pluginRegistry.getPlugin(name);

    if (!plugin) {
      const err = new NotFoundError('Plugin', name);
      return c.json({ error: err.code, message: err.message }, 404);
    }

    try {
      await plugin.start();
      pluginRegistry.updateHealthStatus(name, {
        pluginName: name,
        status: 'healthy',
        lastCheck: new Date(),
        errorCount: 0,
      });
      return c.json({ name, enabled: true });
    } catch (err) {
      return c.json(
        { error: 'PLUGIN_ERROR', message: `Failed to enable plugin: ${(err as Error).message}` },
        500,
      );
    }
  });

  app.post('/admin/v1/plugins/:name/disable', async (c) => {
    const name = c.req.param('name');
    const plugin = pluginRegistry.getPlugin(name);

    if (!plugin) {
      const err = new NotFoundError('Plugin', name);
      return c.json({ error: err.code, message: err.message }, 404);
    }

    try {
      await plugin.stop();
      pluginRegistry.updateHealthStatus(name, {
        pluginName: name,
        status: 'stopped',
        lastCheck: new Date(),
        errorCount: 0,
      });
      return c.json({ name, enabled: false });
    } catch (err) {
      return c.json(
        { error: 'PLUGIN_ERROR', message: `Failed to disable plugin: ${(err as Error).message}` },
        500,
      );
    }
  });
}

export { pluginsAdminRoutes };
export type { PluginAdminDependencies, PluginView };
