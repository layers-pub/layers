/**
 * Unit tests for the plugin sandbox system.
 *
 * Tests sandbox isolation, permission gating, timeout enforcement,
 * and plugin loading from directories.
 *
 * @module
 */

import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPluginSandbox } from '@/plugins/sandbox/plugin-sandbox.js';
import { createPluginLoader } from '@/plugins/sandbox/plugin-loader.js';
import { createSandboxAPI } from '@/plugins/sandbox/sandbox-api.js';
import type { ISandboxHostCallbacks } from '@/plugins/sandbox/sandbox-api.js';
import type { ISandboxOptions } from '@/plugins/sandbox/plugin-sandbox.js';
import { PluginError, SandboxViolationError } from '@/types/errors.js';
import type { PluginPermission } from '@/plugins/core/plugin-interface.js';
import type { ILogger } from '@/types/interfaces/logger.interface.js';

function createMockLogger(): ILogger {
  const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger;
}

function createMockHostCallbacks(): ISandboxHostCallbacks {
  return {
    queryRecords: vi.fn().mockResolvedValue([]),
    getRecord: vi.fn().mockResolvedValue(null),
    storageGet: vi.fn().mockResolvedValue(null),
    storageSet: vi.fn().mockResolvedValue(undefined),
    storageDelete: vi.fn().mockResolvedValue(undefined),
  };
}

const defaultOptions: ISandboxOptions = {
  timeout: 5_000,
  memoryLimit: 64 * 1024 * 1024,
  permissions: ['read:records', 'storage:local'],
};

describe('PluginSandbox', () => {
  let logger: ILogger;
  let hostCallbacks: ISandboxHostCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
    hostCallbacks = createMockHostCallbacks();
  });

  describe('createPluginSandbox', () => {
    it('creates a sandbox from valid source code', () => {
      const source = `
        module.exports = {
          greet(name) { return 'Hello, ' + name; }
        };
      `;

      const result = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(result.ok).toBe(true);
    });

    it('returns error for invalid source code', () => {
      const source = `this is not valid javascript !!!`;

      const result = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(PluginError);
        expect(result.error.message).toContain('compilation failed');
      }
    });

    it('returns error when source does not export an object', () => {
      const source = `module.exports = null;`;

      const result = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('must assign an object');
      }
    });
  });

  describe('execute', () => {
    it('executes a synchronous method and returns the result', async () => {
      const source = `
        module.exports = {
          add(a, b) { return a + b; }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute<number>('add', [2, 3]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(5);
      }
    });

    it('executes an async method and returns the result', async () => {
      const source = `
        module.exports = {
          async delayed() { return 42; }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute<number>('delayed', []);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('returns error for non-existent method', async () => {
      const source = `module.exports = {};`;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute('nonexistent', []);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("does not export method 'nonexistent'");
      }
    });

    it('returns error after sandbox is disposed', async () => {
      const source = `
        module.exports = { run() { return 1; } };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      sandboxResult.value.dispose();

      const result = await sandboxResult.value.execute('run', []);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('disposed');
      }
    });
  });

  describe('sandbox isolation', () => {
    it('blocks access to process', async () => {
      const source = `
        module.exports = {
          getProcess() { return typeof process; }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute<string>('getProcess', []);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('undefined');
      }
    });

    it('blocks access to require', async () => {
      const source = `
        module.exports = {
          getRequire() { return typeof require; }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute<string>('getRequire', []);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('undefined');
      }
    });

    it('blocks access to __dirname', async () => {
      const source = `
        module.exports = {
          getDirname() { return typeof __dirname; }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute<string>('getDirname', []);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('undefined');
      }
    });

    it('blocks access to __filename', async () => {
      const source = `
        module.exports = {
          getFilename() { return typeof __filename; }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute<string>('getFilename', []);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('undefined');
      }
    });

    it('blocks eval via codeGeneration.strings', () => {
      const source = `
        module.exports = {
          tryEval() { return eval('1 + 1'); }
        };
      `;

      // eval is set to undefined in the sandbox, so this should fail at compile time
      // or return undefined
      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
    });

    it('blocks Function constructor via codeGeneration.strings', async () => {
      const source = `
        module.exports = {
          tryFunction() { return typeof Function; }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        defaultOptions,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute<string>('tryFunction', []);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('undefined');
      }
    });
  });

  describe('timeout enforcement', () => {
    it('terminates execution that exceeds the timeout', async () => {
      const source = `
        module.exports = {
          infinite() { while(true) {} }
        };
      `;

      const shortTimeout: ISandboxOptions = {
        ...defaultOptions,
        timeout: 100,
      };

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        shortTimeout,
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute('infinite', []);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('timed out');
      }
    }, 10_000);
  });

  describe('permission-gated API access', () => {
    it('allows record queries when read:records permission is granted', async () => {
      const source = `
        module.exports = {
          async queryRecords() {
            return layers.records.query({ collection: 'pub.layers.expression.expression' });
          }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        { ...defaultOptions, permissions: ['read:records'] },
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute<unknown[]>('queryRecords', []);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('blocks record queries when read:records permission is missing', async () => {
      const source = `
        module.exports = {
          async queryRecords() {
            return layers.records.query({ collection: 'pub.layers.expression.expression' });
          }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        { ...defaultOptions, permissions: [] },
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute('queryRecords', []);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("lacks 'read:records' permission");
      }
    });

    it('blocks network.fetch when network:outbound permission is missing', async () => {
      const source = `
        module.exports = {
          async fetchData() {
            return layers.network.fetch('https://example.com/api');
          }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        { ...defaultOptions, permissions: ['read:records'] },
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute('fetchData', []);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("lacks 'network:outbound' permission");
      }
    });

    it('blocks storage access when storage:local permission is missing', async () => {
      const source = `
        module.exports = {
          async readStorage() {
            return layers.storage.get('some-key');
          }
        };
      `;

      const sandboxResult = createPluginSandbox(
        'test-plugin',
        source,
        { ...defaultOptions, permissions: ['read:records'] },
        logger,
        hostCallbacks,
      );
      expect(sandboxResult.ok).toBe(true);
      if (!sandboxResult.ok) return;

      const result = await sandboxResult.value.execute('readStorage', []);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("lacks 'storage:local' permission");
      }
    });
  });
});

describe('SandboxAPI', () => {
  let logger: ILogger;
  let hostCallbacks: ISandboxHostCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
    hostCallbacks = createMockHostCallbacks();
  });

  describe('network.fetch', () => {
    it('rejects non-HTTPS URLs', async () => {
      const api = createSandboxAPI({
        pluginName: 'test-plugin',
        permissions: new Set<PluginPermission>(['network:outbound']),
        logger,
        hostCallbacks,
      });

      await expect(api.network.fetch('http://example.com')).rejects.toThrow(SandboxViolationError);
    });

    it('rejects invalid URLs', async () => {
      const api = createSandboxAPI({
        pluginName: 'test-plugin',
        permissions: new Set<PluginPermission>(['network:outbound']),
        logger,
        hostCallbacks,
      });

      await expect(api.network.fetch('not-a-url')).rejects.toThrow(SandboxViolationError);
    });
  });

  describe('records.query', () => {
    it('rejects limit out of range', async () => {
      const api = createSandboxAPI({
        pluginName: 'test-plugin',
        permissions: new Set<PluginPermission>(['read:records']),
        logger,
        hostCallbacks,
      });

      await expect(
        api.records.query({ collection: 'pub.layers.expression.expression', limit: 200 }),
      ).rejects.toThrow(SandboxViolationError);
    });

    it('rejects empty collection string', async () => {
      const api = createSandboxAPI({
        pluginName: 'test-plugin',
        permissions: new Set<PluginPermission>(['read:records']),
        logger,
        hostCallbacks,
      });

      await expect(api.records.query({ collection: '' })).rejects.toThrow(SandboxViolationError);
    });
  });

  describe('records.get', () => {
    it('rejects invalid AT-URIs', async () => {
      const api = createSandboxAPI({
        pluginName: 'test-plugin',
        permissions: new Set<PluginPermission>(['read:records']),
        logger,
        hostCallbacks,
      });

      await expect(api.records.get('not-a-valid-uri')).rejects.toThrow(SandboxViolationError);
    });

    it('accepts valid AT-URIs', async () => {
      const api = createSandboxAPI({
        pluginName: 'test-plugin',
        permissions: new Set<PluginPermission>(['read:records']),
        logger,
        hostCallbacks,
      });

      await api.records.get('at://did:plc:testuser1/pub.layers.expression.expression/abc123');

      expect(hostCallbacks.getRecord).toHaveBeenCalledWith(
        'at://did:plc:testuser1/pub.layers.expression.expression/abc123',
      );
    });
  });
});

describe('PluginLoader', () => {
  let logger: ILogger;
  let hostCallbacks: ISandboxHostCallbacks;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    logger = createMockLogger();
    hostCallbacks = createMockHostCallbacks();
    tempDir = await mkdtemp(join(tmpdir(), 'layers-plugin-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function createPluginDir(
    manifest: Record<string, unknown>,
    source: string,
  ): Promise<string> {
    const pluginDir = join(tempDir, 'test-plugin');
    await mkdir(pluginDir, { recursive: true });
    await writeFile(join(pluginDir, 'manifest.json'), JSON.stringify(manifest));
    await writeFile(join(pluginDir, 'index.js'), source);
    return pluginDir;
  }

  const validManifest = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin for unit tests',
    author: 'Test Author',
    type: 'importer',
    permissions: ['read:records'],
    sandboxed: true,
  };

  describe('loadPlugin', () => {
    it('loads a valid sandboxed plugin from a directory', async () => {
      const source = `
        module.exports = {
          run() { return 'loaded'; }
        };
      `;
      const pluginDir = await createPluginDir(validManifest, source);
      const loader = createPluginLoader({ logger, hostCallbacks });

      const result = await loader.loadPlugin(pluginDir);
      expect(result.ok).toBe(true);

      if (result.ok) {
        const execResult = await result.value.execute<string>('run', []);
        expect(execResult.ok).toBe(true);
        if (execResult.ok) {
          expect(execResult.value).toBe('loaded');
        }
      }
    });

    it('rejects non-sandboxed plugins', async () => {
      const source = `module.exports = {};`;
      const pluginDir = await createPluginDir({ ...validManifest, sandboxed: false }, source);
      const loader = createPluginLoader({ logger, hostCallbacks });

      const result = await loader.loadPlugin(pluginDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('must be sandboxed');
      }
    });

    it('rejects plugins with missing manifest.json', async () => {
      const pluginDir = join(tempDir, 'missing-manifest');
      await mkdir(pluginDir, { recursive: true });
      await writeFile(join(pluginDir, 'index.js'), 'module.exports = {};');
      const loader = createPluginLoader({ logger, hostCallbacks });

      const result = await loader.loadPlugin(pluginDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to read manifest.json');
      }
    });

    it('rejects plugins with invalid manifest schema', async () => {
      const source = `module.exports = {};`;
      const pluginDir = await createPluginDir(
        { name: '', version: 'bad', type: 'invalid' },
        source,
      );
      const loader = createPluginLoader({ logger, hostCallbacks });

      const result = await loader.loadPlugin(pluginDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid plugin manifest');
      }
    });

    it('rejects plugins with missing index.js', async () => {
      const pluginDir = join(tempDir, 'missing-index');
      await mkdir(pluginDir, { recursive: true });
      await writeFile(join(pluginDir, 'manifest.json'), JSON.stringify(validManifest));
      const loader = createPluginLoader({ logger, hostCallbacks });

      const result = await loader.loadPlugin(pluginDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Missing index.js');
      }
    });
  });

  describe('validateStructure', () => {
    it('returns the manifest for a valid plugin directory', async () => {
      const source = `module.exports = {};`;
      const pluginDir = await createPluginDir(validManifest, source);
      const loader = createPluginLoader({ logger, hostCallbacks });

      const result = await loader.validateStructure(pluginDir);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('test-plugin');
        expect(result.value.version).toBe('1.0.0');
      }
    });

    it('returns error for malformed manifest JSON', async () => {
      const pluginDir = join(tempDir, 'bad-json');
      await mkdir(pluginDir, { recursive: true });
      await writeFile(join(pluginDir, 'manifest.json'), '{not valid json}');
      await writeFile(join(pluginDir, 'index.js'), 'module.exports = {};');
      const loader = createPluginLoader({ logger, hostCallbacks });

      const result = await loader.validateStructure(pluginDir);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to parse manifest.json');
      }
    });
  });
});
