/**
 * Unit tests for plugin lifecycle management.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';

import type {
  IPlugin,
  IPluginContext,
  IPluginManifest,
  PluginPermission,
} from '../../../../src/plugins/core/plugin-interface.js';
import {
  checkPermissions,
  disposePlugin,
  initPlugin,
  startPlugin,
  stopPlugin,
  validateManifest,
} from '../../../../src/plugins/core/plugin-lifecycle.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createValidManifest(overrides?: Partial<IPluginManifest>): IPluginManifest {
  return {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin for unit testing',
    author: 'Test Author',
    type: 'export',
    permissions: ['read:records'] as readonly PluginPermission[],
    sandboxed: false,
    ...overrides,
  };
}

function createMockPlugin(manifestOverrides?: Partial<IPluginManifest>): IPlugin {
  return {
    manifest: createValidManifest(manifestOverrides),
    init: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    start: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    dispose: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  };
}

function createMockContext(): IPluginContext {
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
    config: {},
    eventBus: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    apiClient: {
      getExpression: vi.fn(),
      getAnnotationLayer: vi.fn(),
      searchExpressions: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// validateManifest
// ---------------------------------------------------------------------------

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    const result = validateManifest(createValidManifest());
    expect(result.ok).toBe(true);
  });

  it('accepts all valid plugin types', () => {
    const types = [
      'importer',
      'harvester',
      'backlink',
      'search',
      'annotation-tool',
      'enrichment',
      'export',
      'visualization',
    ] as const;

    for (const type of types) {
      const result = validateManifest(createValidManifest({ type }));
      expect(result.ok).toBe(true);
    }
  });

  it('accepts all valid permissions', () => {
    const permissions: PluginPermission[] = [
      'read:records',
      'write:records',
      'network:outbound',
      'storage:local',
      'ui:render',
    ];
    const result = validateManifest(createValidManifest({ permissions }));
    expect(result.ok).toBe(true);
  });

  it('accepts manifest with optional fields', () => {
    const result = validateManifest(
      createValidManifest({
        homepage: 'https://example.com',
        repository: 'https://github.com/test/plugin',
        license: 'MIT',
        dependencies: { 'some-lib': '1.0.0' },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects manifest with empty name', () => {
    const result = validateManifest(createValidManifest({ name: '' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Invalid plugin manifest');
    }
  });

  it('rejects manifest with invalid version format', () => {
    const result = validateManifest(createValidManifest({ version: 'not-semver' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Invalid plugin manifest');
    }
  });

  it('rejects manifest with missing required fields', () => {
    const result = validateManifest({ name: 'test' });
    expect(result.ok).toBe(false);
  });

  it('rejects manifest with invalid plugin type', () => {
    const result = validateManifest(createValidManifest({ type: 'invalid-type' as never }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Invalid plugin manifest');
    }
  });

  it('rejects null manifest', () => {
    const result = validateManifest(null);
    expect(result.ok).toBe(false);
  });

  it('rejects undefined manifest', () => {
    const result = validateManifest(undefined);
    expect(result.ok).toBe(false);
  });

  it('rejects manifest with empty description', () => {
    const result = validateManifest(createValidManifest({ description: '' }));
    expect(result.ok).toBe(false);
  });

  it('rejects manifest with empty author', () => {
    const result = validateManifest(createValidManifest({ author: '' }));
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkPermissions
// ---------------------------------------------------------------------------

describe('checkPermissions', () => {
  it('accepts when all requested permissions are allowed', () => {
    const requested: PluginPermission[] = ['read:records', 'write:records'];
    const allowed = new Set<PluginPermission>([
      'read:records',
      'write:records',
      'network:outbound',
    ]);
    const result = checkPermissions(requested, allowed, 'test-plugin');
    expect(result.ok).toBe(true);
  });

  it('accepts empty requested permissions', () => {
    const result = checkPermissions([], new Set(), 'test-plugin');
    expect(result.ok).toBe(true);
  });

  it('rejects when a requested permission is not allowed', () => {
    const requested: PluginPermission[] = ['read:records', 'network:outbound'];
    const allowed = new Set<PluginPermission>(['read:records']);
    const result = checkPermissions(requested, allowed, 'test-plugin');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('network:outbound');
    }
  });

  it('lists all denied permissions in the error message', () => {
    const requested: PluginPermission[] = ['network:outbound', 'ui:render'];
    const allowed = new Set<PluginPermission>(['read:records']);
    const result = checkPermissions(requested, allowed, 'test-plugin');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('network:outbound');
      expect(result.error.message).toContain('ui:render');
    }
  });
});

// ---------------------------------------------------------------------------
// initPlugin
// ---------------------------------------------------------------------------

describe('initPlugin', () => {
  it('initializes a valid plugin successfully', async () => {
    const plugin = createMockPlugin();
    const context = createMockContext();
    const result = await initPlugin(plugin, context);

    expect(result.ok).toBe(true);
    expect(plugin.init).toHaveBeenCalledWith(context);
  });

  it('returns error when manifest is invalid', async () => {
    const plugin = createMockPlugin({ name: '' });
    const context = createMockContext();
    const result = await initPlugin(plugin, context);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Invalid plugin manifest');
    }
    expect(plugin.init).not.toHaveBeenCalled();
  });

  it('returns error when permissions are denied', async () => {
    const plugin = createMockPlugin({ permissions: ['network:outbound'] });
    const context = createMockContext();
    const allowed = new Set<PluginPermission>(['read:records']);
    const result = await initPlugin(plugin, context, allowed);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('denied permissions');
    }
  });

  it('uses default permissions when allowedPermissions is not provided', async () => {
    const plugin = createMockPlugin({
      permissions: [
        'read:records',
        'write:records',
        'network:outbound',
        'storage:local',
        'ui:render',
      ],
    });
    const context = createMockContext();
    const result = await initPlugin(plugin, context);

    expect(result.ok).toBe(true);
  });

  it('returns error when plugin.init throws', async () => {
    const plugin = createMockPlugin();
    vi.mocked(plugin.init).mockRejectedValueOnce(new Error('init crashed'));
    const context = createMockContext();
    const result = await initPlugin(plugin, context);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Plugin init threw');
      expect(result.error.message).toContain('init crashed');
    }
  });

  it('propagates result from plugin.init', async () => {
    const plugin = createMockPlugin();
    vi.mocked(plugin.init).mockResolvedValueOnce({
      ok: false,
      error: new (await import('../../../../src/types/errors.js')).PluginError(
        'test-plugin',
        'init',
        'Custom init error',
      ),
    });
    const context = createMockContext();
    const result = await initPlugin(plugin, context);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Custom init error');
    }
  });
});

// ---------------------------------------------------------------------------
// startPlugin
// ---------------------------------------------------------------------------

describe('startPlugin', () => {
  it('starts a plugin successfully', async () => {
    const plugin = createMockPlugin();
    const result = await startPlugin(plugin);

    expect(result.ok).toBe(true);
    expect(plugin.start).toHaveBeenCalledOnce();
  });

  it('returns error when plugin.start throws', async () => {
    const plugin = createMockPlugin();
    vi.mocked(plugin.start).mockRejectedValueOnce(new Error('start failed'));
    const result = await startPlugin(plugin);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Plugin start threw');
    }
  });
});

// ---------------------------------------------------------------------------
// stopPlugin
// ---------------------------------------------------------------------------

describe('stopPlugin', () => {
  it('stops a plugin successfully', async () => {
    const plugin = createMockPlugin();
    const result = await stopPlugin(plugin);

    expect(result.ok).toBe(true);
    expect(plugin.stop).toHaveBeenCalledOnce();
  });

  it('returns error when plugin.stop throws', async () => {
    const plugin = createMockPlugin();
    vi.mocked(plugin.stop).mockRejectedValueOnce(new Error('stop failed'));
    const result = await stopPlugin(plugin);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Plugin stop threw');
    }
  });
});

// ---------------------------------------------------------------------------
// disposePlugin
// ---------------------------------------------------------------------------

describe('disposePlugin', () => {
  it('disposes a plugin successfully', async () => {
    const plugin = createMockPlugin();
    const result = await disposePlugin(plugin);

    expect(result.ok).toBe(true);
    expect(plugin.dispose).toHaveBeenCalledOnce();
  });

  it('returns error when plugin.dispose throws', async () => {
    const plugin = createMockPlugin();
    vi.mocked(plugin.dispose).mockRejectedValueOnce(new Error('dispose failed'));
    const result = await disposePlugin(plugin);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Plugin dispose threw');
    }
  });
});
