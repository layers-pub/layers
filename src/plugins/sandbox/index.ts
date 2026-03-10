/**
 * Sandbox module for isolated execution of user-contributed plugins.
 *
 * @module
 */

export {
  createPluginSandbox,
  createSandboxContext,
  DEFAULT_SANDBOX_OPTIONS,
} from './plugin-sandbox.js';
export type { ISandboxedPlugin, ISandboxOptions } from './plugin-sandbox.js';

export { createPluginLoader, readManifest } from './plugin-loader.js';
export type { IPluginLoader, PluginLoaderConfig } from './plugin-loader.js';

export { createSandboxAPI, isValidAtUri } from './sandbox-api.js';
export type {
  ISandboxAPI,
  ISandboxHostCallbacks,
  ISandboxLogAPI,
  ISandboxNetworkAPI,
  ISandboxRecordsAPI,
  ISandboxStorageAPI,
  SandboxAPIConfig,
  SandboxRecordQueryParams,
} from './sandbox-api.js';
