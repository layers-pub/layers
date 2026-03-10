/**
 * Node.js vm-based sandbox for executing user-contributed plugins.
 *
 * Creates a restricted V8 context using the built-in `vm` module.
 * Dangerous globals (process, require, __dirname, __filename) are
 * blocked. API access is gated by the plugin's declared permissions.
 *
 * @module
 */

import vm from 'node:vm';

import { PluginError, SandboxViolationError } from '../../types/errors.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';
import { Err, Ok, type Result } from '../../types/result.js';

import type { PluginPermission } from '../core/plugin-interface.js';

import { createSandboxAPI, type ISandboxAPI, type ISandboxHostCallbacks } from './sandbox-api.js';

/**
 * Configuration options for creating a plugin sandbox.
 */
interface ISandboxOptions {
  /** Maximum execution time in milliseconds. */
  readonly timeout: number;
  /** Maximum memory in bytes (advisory, enforced via resource limits where available). */
  readonly memoryLimit: number;
  /** Allowed permissions from the manifest. */
  readonly permissions: readonly PluginPermission[];
}

/**
 * A sandboxed plugin instance that executes methods in isolation.
 */
interface ISandboxedPlugin {
  /** Execute a plugin method in the sandbox. */
  execute<T>(method: string, args: unknown[]): Promise<Result<T, PluginError>>;
  /** Dispose of sandbox resources. */
  dispose(): void;
}

/**
 * Default sandbox options applied when not overridden.
 */
const DEFAULT_SANDBOX_OPTIONS: ISandboxOptions = {
  timeout: 30_000,
  memoryLimit: 128 * 1024 * 1024,
  permissions: ['read:records'],
};

/**
 * Create a restricted V8 context for sandboxed plugin execution.
 *
 * The context includes only the sandbox API (gated by permissions),
 * basic language builtins (console-like logging), and a promise
 * constructor. All dangerous globals are explicitly blocked.
 *
 * @param api - the sandbox API surface to expose
 * @param pluginName - the plugin name for error attribution
 * @returns the contextualized vm.Context
 */
function createSandboxContext(api: ISandboxAPI, pluginName: string): vm.Context {
  const sandbox: Record<string, unknown> = {
    // Expose the sandbox API
    layers: api,

    // Expose safe globals
    console: {
      log: api.log.info.bind(api.log),
      info: api.log.info.bind(api.log),
      warn: api.log.warn.bind(api.log),
      error: api.log.error.bind(api.log),
    },

    // Provide timers (useful for async plugin code)
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,

    // Provide Promise for async operations
    Promise: globalThis.Promise,

    // Provide basic data structures
    JSON: globalThis.JSON,
    Array: globalThis.Array,
    Object: globalThis.Object,
    Map: globalThis.Map,
    Set: globalThis.Set,
    Date: globalThis.Date,
    Math: globalThis.Math,
    RegExp: globalThis.RegExp,
    Error: globalThis.Error,
    TypeError: globalThis.TypeError,
    RangeError: globalThis.RangeError,
    URL: globalThis.URL,
    URLSearchParams: globalThis.URLSearchParams,
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,

    // Explicitly block dangerous globals
    process: undefined,
    require: undefined,
    __dirname: undefined,
    __filename: undefined,
    global: undefined,
    globalThis: undefined,
    import: undefined,
    eval: undefined,
    Function: undefined,
  };

  const context = vm.createContext(sandbox, {
    name: `sandbox:${pluginName}`,
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  });

  return context;
}

/**
 * Create a sandboxed plugin from JavaScript source code.
 *
 * The source code is compiled and executed in an isolated V8 context.
 * The plugin must export an object with callable methods. Each method
 * invocation is subject to the configured timeout.
 *
 * @param pluginName - name of the plugin (for error attribution)
 * @param source - the JavaScript source code to execute
 * @param options - sandbox configuration options
 * @param logger - logger instance for sandbox events
 * @param hostCallbacks - host-side callbacks for sandbox API delegation
 * @returns a sandboxed plugin on success, or a PluginError
 */
function createPluginSandbox(
  pluginName: string,
  source: string,
  options: ISandboxOptions,
  logger: ILogger,
  hostCallbacks: ISandboxHostCallbacks,
): Result<ISandboxedPlugin, PluginError> {
  const permissionSet = new Set<PluginPermission>(options.permissions);
  const sandboxLogger = logger.child({ plugin: pluginName, sandboxed: true });

  const api = createSandboxAPI({
    pluginName,
    permissions: permissionSet,
    logger: sandboxLogger,
    hostCallbacks,
  });

  const context = createSandboxContext(api, pluginName);

  // Compile the plugin source. The source must assign its exports to
  // a `module.exports` object that we provide in the context.
  const wrappedSource = `
    var module = { exports: {} };
    var exports = module.exports;
    (function() {
      ${source}
    })();
    module.exports;
  `;

  let pluginExports: Record<string, unknown>;
  try {
    const script = new vm.Script(wrappedSource, {
      filename: `${pluginName}/index.js`,
    });

    pluginExports = script.runInContext(context, {
      timeout: options.timeout,
    }) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Script execution timed out')) {
      return Err(
        new PluginError(
          pluginName,
          'init',
          `Plugin initialization timed out after ${options.timeout}ms`,
        ),
      );
    }
    return Err(
      new PluginError(
        pluginName,
        'init',
        `Plugin source compilation failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      ),
    );
  }

  if (!pluginExports || typeof pluginExports !== 'object') {
    return Err(
      new PluginError(pluginName, 'init', 'Plugin source must assign an object to module.exports'),
    );
  }

  let disposed = false;

  const sandboxedPlugin: ISandboxedPlugin = {
    async execute<T>(method: string, args: unknown[]): Promise<Result<T, PluginError>> {
      if (disposed) {
        return Err(new PluginError(pluginName, 'validate', 'Cannot execute on a disposed sandbox'));
      }

      const fn = pluginExports[method];
      if (typeof fn !== 'function') {
        return Err(
          new PluginError(pluginName, 'validate', `Plugin does not export method '${method}'`),
        );
      }

      try {
        // Wrap the call in a vm.Script to enforce the timeout
        // We store the function reference and args on the context
        // so the script can access them.
        context.__sandboxFn = fn;
        context.__sandboxArgs = args;

        const callScript = new vm.Script(`Promise.resolve(__sandboxFn(...__sandboxArgs))`, {
          filename: `${pluginName}/${method}`,
        });

        const resultPromise = callScript.runInContext(context, {
          timeout: options.timeout,
        }) as Promise<T>;

        // For async functions, we need to await with a timeout
        const result = await Promise.race([
          resultPromise,
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new SandboxViolationError(
                  pluginName,
                  'time_limit',
                  `Plugin method '${method}' exceeded ${options.timeout}ms timeout`,
                ),
              );
            }, options.timeout);
          }),
        ]);

        return Ok(result);
      } catch (err) {
        if (err instanceof SandboxViolationError) {
          return Err(new PluginError(pluginName, 'validate', err.message, err));
        }

        if (err instanceof Error && err.message.includes('Script execution timed out')) {
          return Err(
            new PluginError(
              pluginName,
              'validate',
              `Plugin method '${method}' exceeded ${options.timeout}ms timeout`,
            ),
          );
        }

        return Err(
          new PluginError(
            pluginName,
            'validate',
            `Plugin method '${method}' threw: ${err instanceof Error ? err.message : String(err)}`,
            err instanceof Error ? err : undefined,
          ),
        );
      } finally {
        // Clean up temporary context variables
        delete context.__sandboxFn;
        delete context.__sandboxArgs;
      }
    },

    dispose(): void {
      if (!disposed) {
        disposed = true;
        sandboxLogger.info('Sandbox disposed', { pluginName });
      }
    },
  };

  sandboxLogger.info('Sandbox created', {
    pluginName,
    permissions: [...permissionSet],
    timeout: options.timeout,
    memoryLimit: options.memoryLimit,
  });

  return Ok(sandboxedPlugin);
}

export { createPluginSandbox, createSandboxContext, DEFAULT_SANDBOX_OPTIONS };
export type { ISandboxedPlugin, ISandboxOptions };
