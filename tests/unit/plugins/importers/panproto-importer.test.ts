/**
 * Unit tests for the PanprotoImporter class.
 *
 * Since @panproto/core is not installed (ambient type stubs only), all tests
 * mock the IPanprotoService. These tests verify the adapter logic: validation,
 * service method call ordering, result mapping, and error wrapping.
 *
 * Each of the 19 fixture files is read from the phrom repository and fed
 * through the importer with a mocked panproto pipeline.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { BuiltSchema, IoRegistry, LensHandle } from '@panproto/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPanprotoImporters,
  PanprotoImporter,
} from '@/plugins/importers/panproto-importer.js';
import { ANNOTATION_PROTOCOLS } from '@/services/panproto/protocol-registry.js';
import type { ProtocolMeta } from '@/services/panproto/protocol-registry.js';
import { PluginError, ValidationError } from '@/types/errors.js';
import type { IPanprotoService } from '@/types/interfaces/panproto.interface.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURES_DIR = resolve(
  '/Users/awhite48/Projects/phrom/crates/panproto-io/fixtures/annotation',
);

/**
 * Maps each format key to the fixture filename on disk.
 * The 19 fixture files correspond to 19 of the 20 panproto protocols.
 * praat does not have a fixture in the panproto-io directory.
 */
const FIXTURE_MAP: Partial<Record<string, string>> = {
  conllu: 'sample.conllu',
  brat: 'brat_annotation.json',
  elan: 'elan_annotation.xml',
  tei: 'tei_document.xml',
  naf: 'naf_document.xml',
  uima: 'uima_cas.xml',
  folia: 'folia_document.xml',
  timeml: 'timeml_document.xml',
  'iso-space': 'iso_space_document.xml',
  paula: 'paula_annotation.xml',
  'laf-graf': 'laf_graf_annotation.xml',
  decomp: 'decomp_annotation.json',
  ucca: 'ucca_passage.json',
  fovea: 'fovea_annotation.json',
  bead: 'bead_experiment.json',
  'web-annotation': 'web_annotation.json',
  amr: 'amr_graph.tsv',
  concrete: 'concrete_comm.json',
  nif: 'nif_document.json',
};

/**
 * Reads a fixture file, returning its string content.
 */
function readFixture(filename: string): string {
  return readFileSync(resolve(FIXTURES_DIR, filename), 'utf8');
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock IPanprotoService that returns stub objects.
 * The mock IoRegistry.parse returns empty instance bytes.
 * The mock LensHandle.get returns a view with sample data.
 */
function createMockPanprotoService(): IPanprotoService {
  const mockIoRegistry: IoRegistry = {
    protocols: ['atproto', 'conllu'],
    parse: vi.fn().mockReturnValue({ _bytes: new Uint8Array([1, 2, 3]) }),
    emit: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
    hasProtocol: vi.fn().mockReturnValue(true),
    categories: {},
    _handle: {} as IoRegistry['_handle'],
    _wasm: {} as IoRegistry['_wasm'],
    [Symbol.dispose]: vi.fn(),
  } as unknown as IoRegistry;

  const mockSchema = {} as BuiltSchema;

  const mockLens: LensHandle = {
    get: vi.fn().mockReturnValue({
      view: {
        expressions: [{ text: 'Mock expression text', language: 'en' }],
        segmentations: [{ tokens: ['Mock', 'expression', 'text'], strategy: 'whitespace' }],
        annotationLayers: [
          {
            kind: 'token-tag',
            subkind: 'pos',
            annotations: [{ label: 'NN', tokenIndex: 0 }],
          },
        ],
      },
      complement: new Uint8Array(),
    }),
    put: vi.fn(),
    checkLaws: vi.fn(),
    checkGetPut: vi.fn(),
    checkPutGet: vi.fn(),
    _handle: {} as LensHandle['_handle'],
    [Symbol.dispose]: vi.fn(),
  } as unknown as LensHandle;

  return {
    getInstance: vi.fn(),
    getLayersSchema: vi.fn().mockResolvedValue(mockSchema),
    getEnrichedSchema: vi.fn().mockResolvedValue(mockSchema),
    getIoRegistry: vi.fn().mockResolvedValue(mockIoRegistry),
    getLens: vi.fn().mockResolvedValue(mockLens),
    getChain: vi.fn(),
    getAnalysis: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// createPanprotoImporters factory
// ---------------------------------------------------------------------------

describe('createPanprotoImporters', () => {
  it('creates one importer per annotation protocol', () => {
    const service = createMockPanprotoService();
    const importers = createPanprotoImporters(service);
    expect(importers).toHaveLength(ANNOTATION_PROTOCOLS.length);
  });

  it('each importer has a distinct format matching the protocol', () => {
    const service = createMockPanprotoService();
    const importers = createPanprotoImporters(service);
    const formats = importers.map((imp) => imp.format);
    expect(new Set(formats).size).toBe(ANNOTATION_PROTOCOLS.length);

    for (const proto of ANNOTATION_PROTOCOLS) {
      expect(formats).toContain(proto.format);
    }
  });

  it('each importer has a version string', () => {
    const service = createMockPanprotoService();
    const importers = createPanprotoImporters(service);
    for (const importer of importers) {
      expect(importer.version).toBe('1.0.0');
    }
  });
});

// ---------------------------------------------------------------------------
// PanprotoImporter.validate
// ---------------------------------------------------------------------------

describe('PanprotoImporter.validate', () => {
  let service: IPanprotoService;
  let conlluMeta: ProtocolMeta;

  beforeEach(() => {
    service = createMockPanprotoService();
    conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
  });

  it('returns Err for empty string', () => {
    const importer = new PanprotoImporter(conlluMeta, service);
    const result = importer.validate('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('returns Err for whitespace-only string', () => {
    const importer = new PanprotoImporter(conlluMeta, service);
    const result = importer.validate('   \n\t  ');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('returns Ok for non-empty input', () => {
    const importer = new PanprotoImporter(conlluMeta, service);
    const result = importer.validate('some content');
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PanprotoImporter.parse - service call ordering
// ---------------------------------------------------------------------------

describe('PanprotoImporter.parse (service interactions)', () => {
  let service: IPanprotoService;
  let conlluMeta: ProtocolMeta;

  beforeEach(() => {
    service = createMockPanprotoService();
    conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
  });

  it('calls getIoRegistry, getEnrichedSchema, and getLens in parallel', async () => {
    const importer = new PanprotoImporter(conlluMeta, service);
    await importer.parse('some conllu content');

    expect(service.getIoRegistry).toHaveBeenCalledTimes(1);
    expect(service.getEnrichedSchema).toHaveBeenCalledWith('conllu');
    expect(service.getLens).toHaveBeenCalledWith('conllu');
  });

  it('calls io.parse with the correct protocol and encoded input', async () => {
    const importer = new PanprotoImporter(conlluMeta, service);
    await importer.parse('test input');

    const mockIo = await service.getIoRegistry();
    expect(mockIo.parse).toHaveBeenCalledTimes(1);

    const [protocol, schema, data] = (mockIo.parse as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      BuiltSchema,
      Uint8Array,
    ];
    expect(protocol).toBe('conllu');
    expect(schema).toBeDefined();
    // Verify the data is the UTF-8 encoding of 'test input'
    expect(Buffer.from(data).toString('utf8')).toBe('test input');
  });

  it('calls lens.get with the parsed instance bytes', async () => {
    const importer = new PanprotoImporter(conlluMeta, service);
    await importer.parse('test input');

    const mockLens = await service.getLens('conllu');
    expect(mockLens.get).toHaveBeenCalledTimes(1);
    // The argument should be the return value of io.parse
    // The argument should be instance._bytes from the parsed result
    expect(mockLens.get).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
  });

  it('returns Ok with a valid ImportResult', async () => {
    const importer = new PanprotoImporter(conlluMeta, service);
    const result = await importer.parse('test input');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.format).toBe('conllu');
      expect(result.value.expressions).toHaveLength(1);
      expect(result.value.segmentations).toHaveLength(1);
      expect(result.value.annotationLayers).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// PanprotoImporter.parse - error handling
// ---------------------------------------------------------------------------

describe('PanprotoImporter.parse (error handling)', () => {
  let service: IPanprotoService;
  let conlluMeta: ProtocolMeta;

  beforeEach(() => {
    service = createMockPanprotoService();
    conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
  });

  it('returns Err with ValidationError for empty input', async () => {
    const importer = new PanprotoImporter(conlluMeta, service);
    const result = await importer.parse('');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('wraps service errors in PluginError', async () => {
    vi.mocked(service.getIoRegistry).mockRejectedValueOnce(new Error('WASM module crashed'));

    const importer = new PanprotoImporter(conlluMeta, service);
    const result = await importer.parse('valid content');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('WASM module crashed');
    }
  });

  it('wraps io.parse errors in PluginError', async () => {
    const mockIo = await service.getIoRegistry();
    vi.mocked(mockIo.parse).mockImplementation(() => {
      throw new Error('Parse failed: invalid format');
    });

    const importer = new PanprotoImporter(conlluMeta, service);
    const result = await importer.parse('bad content');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('Parse failed: invalid format');
    }
  });

  it('wraps lens.get errors in PluginError', async () => {
    const mockLens = await service.getLens('conllu');
    vi.mocked(mockLens.get).mockImplementation(() => {
      throw new Error('Lens conversion failed');
    });

    const importer = new PanprotoImporter(conlluMeta, service);
    const result = await importer.parse('valid content');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('Lens conversion failed');
    }
  });

  it('wraps non-Error throws in PluginError', async () => {
    vi.mocked(service.getLens).mockRejectedValueOnce('string error');

    const importer = new PanprotoImporter(conlluMeta, service);
    const result = await importer.parse('valid content');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('string error');
    }
  });

  it('includes the importer name in PluginError', async () => {
    vi.mocked(service.getIoRegistry).mockRejectedValueOnce(new Error('fail'));

    const importer = new PanprotoImporter(conlluMeta, service);
    const result = await importer.parse('valid content');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const pluginErr = result.error as PluginError;
      expect(pluginErr.pluginName).toContain('CoNLL-U');
      expect(pluginErr.operation).toBe('import');
    }
  });
});

// ---------------------------------------------------------------------------
// Per-fixture tests for all 19 formats
// ---------------------------------------------------------------------------

describe('PanprotoImporter per-fixture tests', () => {
  /**
   * For each fixture, we test:
   * 1. validate('') returns Err
   * 2. validate(fixtureContent) returns Ok
   * 3. parse(fixtureContent) calls service methods and returns Ok with ImportResult
   * 4. parse wraps panproto errors in PluginError
   */
  const fixtureFormats = Object.entries(FIXTURE_MAP) as [string, string][];

  for (const [format, filename] of fixtureFormats) {
    const meta = ANNOTATION_PROTOCOLS.find((p) => p.format === format);
    if (!meta) continue;

    describe(`${meta.name} (${format})`, () => {
      let service: IPanprotoService;
      let fixtureContent: string;

      beforeEach(() => {
        service = createMockPanprotoService();
        fixtureContent = readFixture(filename);
      });

      it('fixture file is non-empty', () => {
        expect(fixtureContent.length).toBeGreaterThan(0);
      });

      it('validate returns Err for empty input', () => {
        const importer = new PanprotoImporter(meta, service);
        const result = importer.validate('');
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain(meta.name);
        }
      });

      it('validate returns Ok for fixture content', () => {
        const importer = new PanprotoImporter(meta, service);
        const result = importer.validate(fixtureContent);
        expect(result.ok).toBe(true);
      });

      it('parse returns Ok with a valid ImportResult', async () => {
        const importer = new PanprotoImporter(meta, service);
        const result = await importer.parse(fixtureContent);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.format).toBe(format);
          expect(Array.isArray(result.value.expressions)).toBe(true);
          expect(Array.isArray(result.value.segmentations)).toBe(true);
          expect(Array.isArray(result.value.annotationLayers)).toBe(true);
          expect(result.value.metadata).toBeDefined();
        }
      });

      it('parse calls service methods with the correct protocol', async () => {
        const importer = new PanprotoImporter(meta, service);
        await importer.parse(fixtureContent);

        expect(service.getEnrichedSchema).toHaveBeenCalledWith(meta.protocol);
        expect(service.getLens).toHaveBeenCalledWith(meta.protocol);
      });

      it('parse passes the fixture content as UTF-8 bytes to io.parse', async () => {
        const importer = new PanprotoImporter(meta, service);
        await importer.parse(fixtureContent);

        const mockIo = await service.getIoRegistry();
        const [protocol, , data] = (mockIo.parse as ReturnType<typeof vi.fn>).mock.calls[0] as [
          string,
          BuiltSchema,
          Uint8Array,
        ];
        expect(protocol).toBe(meta.protocol);
        expect(Buffer.from(data).toString('utf8')).toBe(fixtureContent);
      });

      it('parse wraps service errors in PluginError', async () => {
        vi.mocked(service.getIoRegistry).mockRejectedValueOnce(new Error('Service failure'));

        const importer = new PanprotoImporter(meta, service);
        const result = await importer.parse(fixtureContent);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(PluginError);
          expect(result.error.message).toContain(meta.name);
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Optic kinds
// ---------------------------------------------------------------------------

describe('PanprotoImporter.parse (lens get results)', () => {
  it('handles successful lens get with empty annotations', async () => {
    const service = createMockPanprotoService();

    const mockLens: LensHandle = {
      get: vi.fn().mockReturnValue({
        view: {
          expressions: [{ text: 'Test text', language: 'en' }],
          segmentations: [{ tokens: ['Test', 'text'], strategy: 'whitespace' }],
          annotationLayers: [],
        },
        complement: new Uint8Array(),
      }),
      put: vi.fn(),
      checkLaws: vi.fn(),
      checkGetPut: vi.fn(),
      checkPutGet: vi.fn(),
      _handle: {} as LensHandle['_handle'],
      [Symbol.dispose]: vi.fn(),
    } as unknown as LensHandle;
    vi.mocked(service.getLens).mockResolvedValue(mockLens);

    const conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
    const importer = new PanprotoImporter(conlluMeta, service);
    const result = await importer.parse('test content');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metadata).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// _options parameter
// ---------------------------------------------------------------------------

describe('PanprotoImporter.parse (options parameter)', () => {
  it('accepts an _options parameter without error', async () => {
    const service = createMockPanprotoService();
    const conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
    const importer = new PanprotoImporter(conlluMeta, service);

    const result = await importer.parse('test content', { mappings: [], foo: 'bar' });

    expect(result.ok).toBe(true);
  });

  it('accepts undefined options without error', async () => {
    const service = createMockPanprotoService();
    const conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
    const importer = new PanprotoImporter(conlluMeta, service);

    const result = await importer.parse('test content', undefined);

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// praat protocol (no fixture file available)
// ---------------------------------------------------------------------------

describe('PanprotoImporter for praat (no fixture)', () => {
  it('creates an importer with the praat format', () => {
    const service = createMockPanprotoService();
    const praatMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'praat')!;
    expect(praatMeta).toBeDefined();

    const importer = new PanprotoImporter(praatMeta, service);
    expect(importer.format).toBe('praat');
    expect(importer.name).toContain('Praat');
  });

  it('validate returns Ok for non-empty input', () => {
    const service = createMockPanprotoService();
    const praatMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'praat')!;
    const importer = new PanprotoImporter(praatMeta, service);

    const result = importer.validate('"ooTextFile"\n"TextGrid"');
    expect(result.ok).toBe(true);
  });

  it('parse returns Ok with mock data', async () => {
    const service = createMockPanprotoService();
    const praatMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'praat')!;
    const importer = new PanprotoImporter(praatMeta, service);

    const result = await importer.parse('"ooTextFile"\n"TextGrid"');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.format).toBe('praat');
    }
  });
});
