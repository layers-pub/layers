/**
 * Unit tests for the PanprotoExporter class.
 *
 * Since @panproto/core is not installed (ambient type stubs only), all tests
 * mock the IPanprotoService. These tests verify the adapter logic: service
 * method call ordering, lens put invocation, I/O emit invocation, result
 * mapping, complement handling, and error wrapping.
 *
 * @module
 */

import type { BuiltSchema, IoRegistry, LensHandle, Panproto, WasmModule } from '@panproto/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPanprotoExporters,
  PanprotoExporter,
} from '@/plugins/exporters/panproto-exporter.js';
import { ANNOTATION_PROTOCOLS } from '@/services/panproto/protocol-registry.js';
import type { ProtocolMeta } from '@/services/panproto/protocol-registry.js';
import { PluginError } from '@/types/errors.js';
import type { IPanprotoService } from '@/types/interfaces/panproto.interface.js';
import type { ImportResult } from '@/types/interfaces/plugin.interface.js';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock IPanprotoService that returns stub objects.
 * The mock IoRegistry.emit returns sample output bytes.
 * The mock LensHandle.put returns a stub instance bytes object.
 */
/**
 * Mock the Instance class used in the exporter.
 */
const { MockInstance } = vi.hoisted(() => {
  class MockInstance {
    readonly _bytes: Uint8Array;
    readonly _schema: unknown;
    readonly _wasm: unknown;
    constructor(bytes: Uint8Array, schema: unknown, wasm: unknown) {
      this._bytes = bytes;
      this._schema = schema;
      this._wasm = wasm;
    }
  }
  return { MockInstance };
});

vi.mock('@panproto/core', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@panproto/core')>();
  return {
    ...orig,
    Instance: MockInstance,
  };
});

function createMockPanprotoService(): IPanprotoService {
  const mockWasm = {} as WasmModule;

  const mockIoRegistry: IoRegistry = {
    protocols: ['atproto', 'conllu'],
    parse: vi.fn().mockReturnValue({ _bytes: new Uint8Array([1, 2, 3]) }),
    emit: vi.fn().mockReturnValue(new Uint8Array([10, 20, 30])),
    hasProtocol: vi.fn().mockReturnValue(true),
    categories: {},
    _handle: {} as IoRegistry['_handle'],
    _wasm: mockWasm,
    [Symbol.dispose]: vi.fn(),
  } as unknown as IoRegistry;

  const mockSchema = {} as BuiltSchema;

  const mockLens: LensHandle = {
    get: vi.fn().mockReturnValue({
      view: { expressions: [], segmentations: [], annotationLayers: [] },
      complement: new Uint8Array(),
    }),
    put: vi.fn().mockReturnValue({
      data: { converted: true },
      _rawBytes: new Uint8Array([7, 8, 9]),
    }),
    checkLaws: vi.fn(),
    checkGetPut: vi.fn(),
    checkPutGet: vi.fn(),
    _handle: {} as LensHandle['_handle'],
    [Symbol.dispose]: vi.fn(),
  } as unknown as LensHandle;

  const mockPanprotoInstance: Panproto = {
    _wasm: mockWasm,
    toJson: vi.fn().mockReturnValue(new Uint8Array([20, 21, 22])),
    parseJson: vi.fn(),
    [Symbol.dispose]: vi.fn(),
  } as unknown as Panproto;

  return {
    getInstance: vi.fn().mockResolvedValue(mockPanprotoInstance),
    getLayersSchema: vi.fn().mockResolvedValue(mockSchema),
    getEnrichedSchema: vi.fn().mockResolvedValue(mockSchema),
    getIoRegistry: vi.fn().mockResolvedValue(mockIoRegistry),
    getLens: vi.fn().mockResolvedValue(mockLens),
    getChain: vi.fn(),
    getAnalysis: vi.fn(),
  };
}

/**
 * Creates a minimal ImportResult for testing the export pipeline.
 */
function createTestImportResult(overrides?: Partial<ImportResult>): ImportResult {
  return {
    format: 'conllu',
    expressions: [{ text: 'The cat sat on the mat.', language: 'en' }],
    segmentations: [
      { tokens: ['The', 'cat', 'sat', 'on', 'the', 'mat', '.'], strategy: 'whitespace' },
    ],
    annotationLayers: [
      {
        kind: 'token-tag',
        subkind: 'pos',
        annotations: [
          { label: 'DT', tokenIndex: 0 },
          { label: 'NN', tokenIndex: 1 },
        ],
      },
    ],
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createPanprotoExporters factory
// ---------------------------------------------------------------------------

describe('createPanprotoExporters', () => {
  it('creates one exporter per annotation protocol', () => {
    const service = createMockPanprotoService();
    const exporters = createPanprotoExporters(service);
    expect(exporters).toHaveLength(ANNOTATION_PROTOCOLS.length);
  });

  it('each exporter has a distinct format matching the protocol', () => {
    const service = createMockPanprotoService();
    const exporters = createPanprotoExporters(service);
    const formats = exporters.map((exp) => exp.format);
    expect(new Set(formats).size).toBe(ANNOTATION_PROTOCOLS.length);

    for (const proto of ANNOTATION_PROTOCOLS) {
      expect(formats).toContain(proto.format);
    }
  });

  it('each exporter has a name containing the protocol display name', () => {
    const service = createMockPanprotoService();
    const exporters = createPanprotoExporters(service);

    for (const proto of ANNOTATION_PROTOCOLS) {
      const exporter = exporters.find((exp) => exp.format === proto.format)!;
      expect(exporter.name).toContain(proto.name);
      expect(exporter.name).toContain('Exporter');
      expect(exporter.name).toContain('panproto');
    }
  });

  it('each exporter has a mimeType and extension from the protocol metadata', () => {
    const service = createMockPanprotoService();
    const exporters = createPanprotoExporters(service);

    for (const proto of ANNOTATION_PROTOCOLS) {
      const exporter = exporters.find((exp) => exp.format === proto.format)!;
      expect(exporter.mimeType).toBe(proto.mimeType);
      expect(exporter.extension).toBe(proto.primaryExtension);
    }
  });

  it('all 20 formats are distinct', () => {
    const service = createMockPanprotoService();
    const exporters = createPanprotoExporters(service);
    const formats = new Set(exporters.map((exp) => exp.format));
    expect(formats.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// PanprotoExporter.export - service call ordering
// ---------------------------------------------------------------------------

describe('PanprotoExporter.export (service interactions)', () => {
  let service: IPanprotoService;
  let conlluMeta: ProtocolMeta;

  beforeEach(() => {
    service = createMockPanprotoService();
    conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
  });

  it('calls getIoRegistry, getEnrichedSchema, and getLens with the correct protocol', async () => {
    const exporter = new PanprotoExporter(conlluMeta, service);
    await exporter.export(createTestImportResult());

    expect(service.getIoRegistry).toHaveBeenCalledTimes(1);
    expect(service.getEnrichedSchema).toHaveBeenCalledWith('conllu');
    expect(service.getLens).toHaveBeenCalledWith('conllu');
  });

  it('passes serialized view bytes to lens.put', async () => {
    const exporter = new PanprotoExporter(conlluMeta, service);
    const data = createTestImportResult();
    await exporter.export(data);

    const mockLens = await service.getLens('conllu');
    expect(mockLens.put).toHaveBeenCalledTimes(1);

    const [viewBytes] = (mockLens.put as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Uint8Array,
      Uint8Array,
    ];
    // The view bytes come from panprotoInstance.toJson()
    expect(viewBytes).toBeInstanceOf(Uint8Array);
  });

  it('passes complement from metadata to lens.put', async () => {
    const complement = new Uint8Array([99, 100, 101]);
    const data = createTestImportResult({
      metadata: { _complement: complement },
    });

    const exporter = new PanprotoExporter(conlluMeta, service);
    await exporter.export(data);

    const mockLens = await service.getLens('conllu');
    const [, putComplement] = (mockLens.put as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Uint8Array,
      Uint8Array,
    ];
    expect(putComplement).toEqual(complement);
  });

  it('uses empty Uint8Array when complement is missing from metadata', async () => {
    const data = createTestImportResult({ metadata: {} });

    const exporter = new PanprotoExporter(conlluMeta, service);
    await exporter.export(data);

    const mockLens = await service.getLens('conllu');
    const [, putComplement] = (mockLens.put as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Uint8Array,
      Uint8Array,
    ];
    expect(putComplement).toEqual(new Uint8Array());
  });

  it('calls io.emit with protocol, schema, and lens.put result', async () => {
    const exporter = new PanprotoExporter(conlluMeta, service);
    await exporter.export(createTestImportResult());

    const mockIo = await service.getIoRegistry();
    expect(mockIo.emit).toHaveBeenCalledTimes(1);

    const [protocol, schema, data] = (mockIo.emit as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      BuiltSchema,
      unknown,
    ];
    expect(protocol).toBe('conllu');
    expect(schema).toBeDefined();
    // The data argument should be an Instance constructed from the put result's raw bytes
    expect(data).toBeDefined();
  });

  it('returns Ok with Uint8Array output bytes', async () => {
    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeInstanceOf(Uint8Array);
      expect(result.value).toEqual(new Uint8Array([10, 20, 30]));
    }
  });
});

// ---------------------------------------------------------------------------
// PanprotoExporter.export - error handling
// ---------------------------------------------------------------------------

describe('PanprotoExporter.export (error handling)', () => {
  let service: IPanprotoService;
  let conlluMeta: ProtocolMeta;

  beforeEach(() => {
    service = createMockPanprotoService();
    conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
  });

  it('returns Err wrapping PluginError when getIoRegistry fails', async () => {
    vi.mocked(service.getIoRegistry).mockRejectedValueOnce(new Error('WASM module crashed'));

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('WASM module crashed');
    }
  });

  it('returns Err wrapping PluginError when getEnrichedSchema fails', async () => {
    vi.mocked(service.getEnrichedSchema).mockRejectedValueOnce(new Error('Schema build failure'));

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('Schema build failure');
    }
  });

  it('returns Err wrapping PluginError when getLens fails', async () => {
    vi.mocked(service.getLens).mockRejectedValueOnce(new Error('Lens compilation failed'));

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('Lens compilation failed');
    }
  });

  it('returns Err wrapping PluginError when lens.put throws', async () => {
    const mockLens = await service.getLens('conllu');
    vi.mocked(mockLens.put).mockImplementation(() => {
      throw new Error('Put operation failed');
    });

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('Put operation failed');
    }
  });

  it('returns Err wrapping PluginError when io.emit throws', async () => {
    const mockIo = await service.getIoRegistry();
    vi.mocked(mockIo.emit).mockImplementation(() => {
      throw new Error('Emit serialization error');
    });

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('Emit serialization error');
    }
  });

  it('wraps non-Error throws in PluginError', async () => {
    vi.mocked(service.getLens).mockRejectedValueOnce('string error');

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PluginError);
      expect(result.error.message).toContain('string error');
    }
  });

  it('includes the exporter name and "export" operation in PluginError', async () => {
    vi.mocked(service.getIoRegistry).mockRejectedValueOnce(new Error('fail'));

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const pluginErr = result.error as PluginError;
      expect(pluginErr.pluginName).toContain('CoNLL-U');
      expect(pluginErr.operation).toBe('export');
    }
  });

  it('includes the protocol name in the error message', async () => {
    vi.mocked(service.getIoRegistry).mockRejectedValueOnce(new Error('boom'));

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(createTestImportResult());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('CoNLL-U');
    }
  });
});

// ---------------------------------------------------------------------------
// Per-protocol coverage: representative formats
// ---------------------------------------------------------------------------

describe('PanprotoExporter per-protocol representative tests', () => {
  /**
   * Test three representative formats spanning different serialization families:
   * - TEI (XML-based, application/xml)
   * - brat (text/JSON-based, text/plain)
   * - CoNLL-U (text-based, text/plain)
   */
  const REPRESENTATIVE_FORMATS: {
    format: string;
    protocol: string;
    mimeType: string;
    family: string;
  }[] = [
    { format: 'tei', protocol: 'tei', mimeType: 'application/xml', family: 'XML' },
    { format: 'brat', protocol: 'brat', mimeType: 'text/plain', family: 'text/standoff' },
    { format: 'conllu', protocol: 'conllu', mimeType: 'text/plain', family: 'columnar text' },
  ];

  for (const { format, protocol, mimeType, family } of REPRESENTATIVE_FORMATS) {
    const meta = ANNOTATION_PROTOCOLS.find((p) => p.format === format);
    if (!meta) continue;

    describe(`${meta.name} (${family})`, () => {
      let service: IPanprotoService;

      beforeEach(() => {
        service = createMockPanprotoService();
      });

      it(`creates an exporter with format "${format}" and mimeType "${mimeType}"`, () => {
        const exporter = new PanprotoExporter(meta, service);
        expect(exporter.format).toBe(format);
        expect(exporter.mimeType).toBe(mimeType);
      });

      it('export calls service methods with the correct protocol', async () => {
        const exporter = new PanprotoExporter(meta, service);
        const data = createTestImportResult({ format: format as ImportResult['format'] });
        await exporter.export(data);

        expect(service.getEnrichedSchema).toHaveBeenCalledWith(protocol);
        expect(service.getLens).toHaveBeenCalledWith(protocol);
      });

      it('export returns Ok with Uint8Array for valid data', async () => {
        const exporter = new PanprotoExporter(meta, service);
        const data = createTestImportResult({ format: format as ImportResult['format'] });
        const result = await exporter.export(data);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBeInstanceOf(Uint8Array);
          expect(result.value.byteLength).toBeGreaterThan(0);
        }
      });

      it('export passes view and complement through the full pipeline', async () => {
        const complement = new Uint8Array([42, 43, 44]);
        const data = createTestImportResult({
          format: format as ImportResult['format'],
          metadata: { _complement: complement },
        });

        const exporter = new PanprotoExporter(meta, service);
        await exporter.export(data);

        // Verify lens.put was called with complement
        const mockLens = await service.getLens(protocol);
        const [, putComplement] = (mockLens.put as ReturnType<typeof vi.fn>).mock.calls[0] as [
          Uint8Array,
          Uint8Array,
        ];
        expect(putComplement).toEqual(complement);

        // Verify io.emit was called with the lens.put result
        const mockIo = await service.getIoRegistry();
        const [emitProtocol, , emitData] = (mockIo.emit as ReturnType<typeof vi.fn>).mock
          .calls[0] as [string, BuiltSchema, unknown];
        expect(emitProtocol).toBe(protocol);
        // emitData is an Instance constructed from the put result
        expect(emitData).toBeDefined();
      });

      it('export wraps errors in PluginError with protocol-specific info', async () => {
        vi.mocked(service.getIoRegistry).mockRejectedValueOnce(new Error('Service down'));

        const exporter = new PanprotoExporter(meta, service);
        const data = createTestImportResult({ format: format as ImportResult['format'] });
        const result = await exporter.export(data);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(PluginError);
          expect(result.error.message).toContain(meta.name);
          const pluginErr = result.error as PluginError;
          expect(pluginErr.operation).toBe('export');
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('PanprotoExporter.export (edge cases)', () => {
  let service: IPanprotoService;
  let conlluMeta: ProtocolMeta;

  beforeEach(() => {
    service = createMockPanprotoService();
    conlluMeta = ANNOTATION_PROTOCOLS.find((p) => p.format === 'conllu')!;
  });

  it('handles empty expressions, segmentations, and annotationLayers', async () => {
    const data = createTestImportResult({
      expressions: [],
      segmentations: [],
      annotationLayers: [],
    });

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(data);

    expect(result.ok).toBe(true);
  });

  it('handles metadata with undefined _complement', async () => {
    const data = createTestImportResult({
      metadata: { opticKind: 'lens' },
    });

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(data);

    expect(result.ok).toBe(true);

    // Verify empty Uint8Array fallback was used
    const mockLens = await service.getLens('conllu');
    const [, putComplement] = (mockLens.put as ReturnType<typeof vi.fn>).mock.calls[0] as [
      unknown,
      Uint8Array,
    ];
    expect(putComplement).toEqual(new Uint8Array());
  });

  it('calls lens.put with serialized bytes and complement for data with extra metadata', async () => {
    const data = createTestImportResult({
      expressions: [
        {
          text: 'Hello',
          language: 'en',
          sourceFormat: 'conllu',
          uri: 'at://did:plc:test/pub.layers.expression.expression/123',
          cid: 'bafytest',
          pds_url: 'https://pds.example.com',
        },
      ],
    });

    const exporter = new PanprotoExporter(conlluMeta, service);
    const result = await exporter.export(data);

    expect(result.ok).toBe(true);

    // Verify lens.put was called with Uint8Array arguments
    const mockLens = await service.getLens('conllu');
    const putCall = (mockLens.put as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Uint8Array,
      Uint8Array,
    ];
    expect(putCall[0]).toBeInstanceOf(Uint8Array);
    expect(putCall[1]).toBeInstanceOf(Uint8Array);
  });
});
