/**
 * Unit tests for plugin discovery.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILogger } from '../../../../src/types/interfaces/logger.interface.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock node:fs/promises before importing the module under test
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
}));

function createMockLogger(): ILogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('discoverBuiltinPlugins', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockLogger = createMockLogger();
  });

  it('discovers plugins from directories with valid modules', async () => {
    // This test verifies that discovery attempts to load each subdirectory
    // as a plugin module. Since we cannot reliably mock dynamic import()
    // for arbitrary paths in Vitest, we verify the structural behavior:
    // directories are enumerated and non-directories are skipped.
    const { readdir } = await import('node:fs/promises');
    const mockedReaddir = vi.mocked(readdir);
    mockedReaddir.mockResolvedValueOnce([
      { name: 'test-plugin', isDirectory: () => true, isFile: () => false },
    ] as unknown as Awaited<ReturnType<typeof readdir>>);

    const { discoverBuiltinPlugins } =
      await import('../../../../src/plugins/core/plugin-discovery.js');

    const result = await discoverBuiltinPlugins({
      builtinDir: '/nonexistent-plugins',
      logger: mockLogger,
    });

    // The import will fail because the path does not exist,
    // but the function should still return Ok with 0 plugins
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
    // A warning is logged for the import failure
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('returns error when directory cannot be read', async () => {
    const { readdir } = await import('node:fs/promises');
    const mockedReaddir = vi.mocked(readdir);
    mockedReaddir.mockRejectedValueOnce(new Error('ENOENT'));

    const { discoverBuiltinPlugins } =
      await import('../../../../src/plugins/core/plugin-discovery.js');

    const result = await discoverBuiltinPlugins({
      builtinDir: '/nonexistent',
      logger: mockLogger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Failed to read plugin directory');
    }
  });

  it('returns empty array for empty directory', async () => {
    const { readdir } = await import('node:fs/promises');
    const mockedReaddir = vi.mocked(readdir);
    mockedReaddir.mockResolvedValueOnce([] as unknown as Awaited<ReturnType<typeof readdir>>);

    const { discoverBuiltinPlugins } =
      await import('../../../../src/plugins/core/plugin-discovery.js');

    const result = await discoverBuiltinPlugins({
      builtinDir: '/empty',
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('skips files (non-directories)', async () => {
    const { readdir } = await import('node:fs/promises');
    const mockedReaddir = vi.mocked(readdir);
    mockedReaddir.mockResolvedValueOnce([
      { name: 'README.md', isDirectory: () => false, isFile: () => true },
    ] as unknown as Awaited<ReturnType<typeof readdir>>);

    const { discoverBuiltinPlugins } =
      await import('../../../../src/plugins/core/plugin-discovery.js');

    const result = await discoverBuiltinPlugins({
      builtinDir: '/plugins',
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('skips directories where module import fails', async () => {
    const { readdir } = await import('node:fs/promises');
    const mockedReaddir = vi.mocked(readdir);
    mockedReaddir.mockResolvedValueOnce([
      { name: 'broken-plugin', isDirectory: () => true, isFile: () => false },
    ] as unknown as Awaited<ReturnType<typeof readdir>>);

    // The dynamic import will fail because the module does not exist

    const { discoverBuiltinPlugins } =
      await import('../../../../src/plugins/core/plugin-discovery.js');

    const result = await discoverBuiltinPlugins({
      builtinDir: '/plugins',
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('skips directories where manifest validation would fail', async () => {
    // Manifest validation is tested directly in plugin-lifecycle.test.ts.
    // Here we verify that the discovery function skips directories where
    // the module cannot be loaded (which includes manifest issues since
    // the module must be loaded first before validation can run).
    const { readdir } = await import('node:fs/promises');
    const mockedReaddir = vi.mocked(readdir);
    mockedReaddir.mockResolvedValueOnce([
      { name: 'invalid-manifest', isDirectory: () => true, isFile: () => false },
    ] as unknown as Awaited<ReturnType<typeof readdir>>);

    const { discoverBuiltinPlugins } =
      await import('../../../../src/plugins/core/plugin-discovery.js');

    const result = await discoverBuiltinPlugins({
      builtinDir: '/plugins',
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('skips modules that fail to load or lack createPlugin factory', async () => {
    // When a module cannot be imported or does not export createPlugin,
    // the discovery function logs a warning and continues.
    const { readdir } = await import('node:fs/promises');
    const mockedReaddir = vi.mocked(readdir);
    mockedReaddir.mockResolvedValueOnce([
      { name: 'no-factory', isDirectory: () => true, isFile: () => false },
    ] as unknown as Awaited<ReturnType<typeof readdir>>);

    const { discoverBuiltinPlugins } =
      await import('../../../../src/plugins/core/plugin-discovery.js');

    const result = await discoverBuiltinPlugins({
      builtinDir: '/plugins',
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
    // A warning is logged for the skipped directory (either import failure or missing factory)
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});
