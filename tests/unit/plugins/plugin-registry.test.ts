/**
 * Unit tests for the plugin registry.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginRegistry } from '@/plugins/plugin-registry.js';
import { PluginError } from '@/types/errors.js';
import type { IFormatImporter } from '@/types/interfaces/plugin.interface.js';
import { Ok } from '@/types/result.js';

function createMockImporter(overrides?: Partial<IFormatImporter>): IFormatImporter {
  return {
    format: 'conll',
    name: 'Test Importer',
    version: '1.0.0',
    parse: vi.fn().mockResolvedValue(
      Ok({
        format: 'conll',
        expressions: [],
        segmentations: [],
        annotationLayers: [],
        metadata: {},
      }),
    ),
    validate: vi.fn().mockReturnValue(Ok(undefined)),
    ...overrides,
  };
}

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new PluginRegistry({ logger: mockLogger });
  });

  describe('register', () => {
    it('registers an importer and logs the event', () => {
      const importer = createMockImporter();
      registry.register(importer);

      expect(registry.hasImporter('conll')).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Plugin registered', {
        format: 'conll',
        name: 'Test Importer',
      });
    });

    it('throws PluginError on duplicate format registration', () => {
      const importer1 = createMockImporter();
      const importer2 = createMockImporter({ name: 'Duplicate Importer' });

      registry.register(importer1);

      expect(() => registry.register(importer2)).toThrow(PluginError);
      expect(() => registry.register(importer2)).toThrow(/already registered/);
    });

    it('allows different formats to be registered', () => {
      registry.register(createMockImporter({ format: 'conll' }));
      registry.register(createMockImporter({ format: 'brat', name: 'BRAT Importer' }));

      expect(registry.hasImporter('conll')).toBe(true);
      expect(registry.hasImporter('brat')).toBe(true);
    });
  });

  describe('getImporter', () => {
    it('returns the registered importer for a format', () => {
      const importer = createMockImporter();
      registry.register(importer);

      const result = registry.getImporter('conll');
      expect(result).toBe(importer);
    });

    it('returns undefined for an unregistered format', () => {
      const result = registry.getImporter('brat');
      expect(result).toBeUndefined();
    });
  });

  describe('listPlugins', () => {
    it('returns metadata for all registered plugins', () => {
      registry.register(
        createMockImporter({ format: 'conll', name: 'CoNLL Importer', version: '1.0.0' }),
      );
      registry.register(
        createMockImporter({ format: 'brat', name: 'BRAT Importer', version: '2.0.0' }),
      );

      const plugins = registry.listPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins[0]).toEqual({
        id: 'conll-importer',
        name: 'CoNLL Importer',
        version: '1.0.0',
        format: 'conll',
        description: 'CoNLL Importer v1.0.0',
      });
      expect(plugins[1]).toEqual({
        id: 'brat-importer',
        name: 'BRAT Importer',
        version: '2.0.0',
        format: 'brat',
        description: 'BRAT Importer v2.0.0',
      });
    });

    it('returns empty array when no plugins are registered', () => {
      expect(registry.listPlugins()).toEqual([]);
    });
  });

  describe('hasImporter', () => {
    it('returns true for registered formats', () => {
      registry.register(createMockImporter());
      expect(registry.hasImporter('conll')).toBe(true);
    });

    it('returns false for unregistered formats', () => {
      expect(registry.hasImporter('elan')).toBe(false);
    });
  });
});
