/**
 * Unit tests for the PanprotoService WASM integration service.
 *
 * All WASM interactions are mocked via vi.mock. These tests verify lazy
 * initialization, multi-level caching (in-memory L1 and Redis L2),
 * serialization/deserialization of chain handles, and error wrapping.
 *
 * @module
 */

import 'reflect-metadata';

import type {
  BuiltSchema,
  LensHandle,
  Panproto,
  ProtolensChainHandle,
  WasmModule,
} from '@panproto/core';
import type { Redis } from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceUnavailableError } from '@/types/errors.js';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockWasm = {} as WasmModule;

const mockChainHandle: ProtolensChainHandle = {
  toJson: vi.fn().mockReturnValue('{"chain":"serialized"}'),
  fuse: vi.fn(),
  compose: vi.fn(),
  instantiate: vi.fn(),
  requirements: vi.fn(),
  checkApplicability: vi.fn(),
  lift: vi.fn(),
  applyToFleet: vi.fn(),
  _handle: {} as ProtolensChainHandle['_handle'],
  [Symbol.dispose]: vi.fn(),
} as unknown as ProtolensChainHandle;

const mockLensHandle: LensHandle = {
  get: vi.fn(),
  put: vi.fn(),
  checkLaws: vi.fn(),
  checkGetPut: vi.fn(),
  checkPutGet: vi.fn(),
  _handle: {} as LensHandle['_handle'],
  [Symbol.dispose]: vi.fn(),
} as unknown as LensHandle;

// MigrationAnalysis is mocked via MockMigrationAnalysis class above.

/**
 * Mock the Panproto instance returned by Panproto.init().
 */
const mockPanprotoInstance: Panproto = {
  _wasm: mockWasm,
  protocol: vi.fn().mockReturnValue({
    schema: vi.fn().mockReturnValue({
      vertex: vi.fn().mockReturnThis(),
      edge: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({} as BuiltSchema),
    }),
    name: 'atproto',
  }),
  io: vi.fn().mockReturnValue({
    protocols: ['atproto', 'conllu'],
    parse: vi.fn(),
    emit: vi.fn(),
    hasProtocol: vi.fn(),
    categories: {},
    _handle: {},
    _wasm: mockWasm,
    [Symbol.dispose]: vi.fn(),
  }),
  protolensChain: vi.fn().mockReturnValue(mockChainHandle),
  lens: vi.fn().mockReturnValue(mockLensHandle),
  listProtocols: vi.fn().mockReturnValue([]),
  [Symbol.dispose]: vi.fn(),
} as unknown as Panproto;

const { MockMigrationAnalysis } = vi.hoisted(() => {
  class MockMigrationAnalysis {
    dryRun = vi.fn();
    opticKind = vi.fn();
  }
  return { MockMigrationAnalysis };
});

vi.mock('@panproto/core', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@panproto/core')>();
  return {
    ...orig,
    Panproto: {
      init: vi.fn().mockResolvedValue(mockPanprotoInstance),
    },
    LensHandle: {
      fromChain: vi.fn().mockReturnValue(mockLensHandle),
      autoGenerate: vi.fn(),
    },
    MigrationAnalysis: MockMigrationAnalysis,
    ProtolensChainHandle: {
      fromJson: vi.fn().mockImplementation((json: string) => {
        JSON.parse(json); // Throws on invalid JSON
        return mockChainHandle;
      }),
      autoGenerate: vi.fn(),
    },
  };
});

/**
 * Mock buildLayersSchema and enrichLayersSchema so the service does not
 * need the real schema builder logic.
 */
const mockBuiltSchema = {} as BuiltSchema;
const mockEnrichedSchema = {} as BuiltSchema;

vi.mock('@/services/panproto/layers-schema.js', () => ({
  buildLayersSchema: vi.fn().mockReturnValue(mockBuiltSchema),
}));

vi.mock('@/services/panproto/enrichments.js', () => ({
  enrichLayersSchema: vi.fn().mockReturnValue(mockEnrichedSchema),
}));

vi.mock('@/observability/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  }),
}));

// Import after mocks are set up.
let PanprotoService: typeof import('@/services/panproto/panproto-service.js').PanprotoService;
let CHAIN_CACHE_PREFIX: string;
let CHAIN_CACHE_TTL_SECONDS: number;

beforeEach(async () => {
  vi.clearAllMocks();

  // Re-import to get a clean module with fresh static state.
  const mod = await import('@/services/panproto/panproto-service.js');
  PanprotoService = mod.PanprotoService;
  CHAIN_CACHE_PREFIX = mod.CHAIN_CACHE_PREFIX;
  CHAIN_CACHE_TTL_SECONDS = mod.CHAIN_CACHE_TTL_SECONDS;
});

// ---------------------------------------------------------------------------
// Mock Redis factory
// ---------------------------------------------------------------------------

function createMockRedis(overrides?: Partial<Redis>): Redis {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    ...overrides,
  } as unknown as Redis;
}

// ---------------------------------------------------------------------------
// getInstance
// ---------------------------------------------------------------------------

describe('PanprotoService', () => {
  describe('getInstance', () => {
    it('returns a Panproto instance on first call', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const instance = await service.getInstance();

      expect(instance).toBe(mockPanprotoInstance);
    });

    it('returns the same cached instance on subsequent calls', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const first = await service.getInstance();
      const second = await service.getInstance();

      expect(first).toBe(second);
    });

    it('resets and retries on initialization failure', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      // Make Panproto.init() fail on the first call.
      const { Panproto: MockPanproto } = await import('@panproto/core');
      const initFn = (MockPanproto as unknown as { init: ReturnType<typeof vi.fn> }).init;
      initFn.mockRejectedValueOnce(new Error('WASM load failure'));

      // First call should fail with ServiceUnavailableError.
      await expect(service.getInstance()).rejects.toThrow(ServiceUnavailableError);

      // Second call should succeed because #initPromise was reset.
      initFn.mockResolvedValueOnce(mockPanprotoInstance);
      const instance = await service.getInstance();
      expect(instance).toBe(mockPanprotoInstance);
    });

    it('wraps WASM errors in ServiceUnavailableError', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const { Panproto: MockPanproto } = await import('@panproto/core');
      const initFn = (MockPanproto as unknown as { init: ReturnType<typeof vi.fn> }).init;
      initFn.mockRejectedValueOnce(new Error('WASM panic'));

      try {
        await service.getInstance();
        expect.fail('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ServiceUnavailableError);
        const sErr = err as ServiceUnavailableError;
        expect(sErr.service).toBe('panproto');
        expect(sErr.message).toContain('Failed to initialize panproto WASM module');
        expect(sErr.cause).toBeInstanceOf(Error);
      }
    });

    it('wraps non-Error throws in ServiceUnavailableError without a cause', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const { Panproto: MockPanproto } = await import('@panproto/core');
      const initFn = (MockPanproto as unknown as { init: ReturnType<typeof vi.fn> }).init;
      initFn.mockRejectedValueOnce('string failure');

      try {
        await service.getInstance();
        expect.fail('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ServiceUnavailableError);
        const sErr = err as ServiceUnavailableError;
        // Non-Error values do not produce a cause.
        expect(sErr.cause).toBeUndefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getLayersSchema
  // ---------------------------------------------------------------------------

  describe('getLayersSchema', () => {
    it('returns a BuiltSchema', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const schema = await service.getLayersSchema();

      expect(schema).toBe(mockBuiltSchema);
    });

    it('caches the schema across calls', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const first = await service.getLayersSchema();
      const second = await service.getLayersSchema();

      expect(first).toBe(second);

      // buildLayersSchema should only be called once.
      const { buildLayersSchema } = await import('@/services/panproto/layers-schema.js');
      expect(buildLayersSchema).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getEnrichedSchema
  // ---------------------------------------------------------------------------

  describe('getEnrichedSchema', () => {
    it('returns an enriched schema for a known protocol', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const schema = await service.getEnrichedSchema('conllu');

      expect(schema).toBe(mockEnrichedSchema);
    });

    it('caches the enriched schema per protocol', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const first = await service.getEnrichedSchema('conllu');
      const second = await service.getEnrichedSchema('conllu');

      expect(first).toBe(second);

      const { enrichLayersSchema } = await import('@/services/panproto/enrichments.js');
      expect(enrichLayersSchema).toHaveBeenCalledTimes(1);
    });

    it('different protocols get different enriched schemas', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const { enrichLayersSchema } = await import('@/services/panproto/enrichments.js');
      const enrichFn = enrichLayersSchema as ReturnType<typeof vi.fn>;

      const bratSchema = {} as BuiltSchema;
      // First call (conllu) returns default mock, second call (brat) returns bratSchema.
      enrichFn.mockReturnValueOnce(mockEnrichedSchema);
      enrichFn.mockReturnValueOnce(bratSchema);

      const conlluSchema = await service.getEnrichedSchema('conllu');
      const bratResult = await service.getEnrichedSchema('brat');

      expect(conlluSchema).toBe(mockEnrichedSchema);
      expect(bratResult).toBe(bratSchema);
      expect(enrichFn).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // getIoRegistry
  // ---------------------------------------------------------------------------

  describe('getIoRegistry', () => {
    it('returns an IoRegistry', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const registry = await service.getIoRegistry();

      expect(registry).toBeDefined();
      expect(registry.protocols).toBeDefined();
    });

    it('caches the registry across calls', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const first = await service.getIoRegistry();
      const second = await service.getIoRegistry();

      expect(first).toBe(second);
      expect(mockPanprotoInstance.io).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getLens
  // ---------------------------------------------------------------------------

  describe('getLens', () => {
    it('returns a LensHandle for a known protocol', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const lens = await service.getLens('conllu');

      expect(lens).toBeDefined();
      expect(lens).toBe(mockLensHandle);
    });

    it('caches the lens per protocol', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const first = await service.getLens('conllu');
      const second = await service.getLens('conllu');

      expect(first).toBe(second);
      // LensHandle.fromChain should only be called once.
      const { LensHandle: MockLensHandle } = await import('@panproto/core');
      expect(
        (MockLensHandle as unknown as { fromChain: ReturnType<typeof vi.fn> }).fromChain,
      ).toHaveBeenCalledTimes(1);
    });

    it('builds the lens from a chain on cache miss', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      await service.getLens('brat');

      const { LensHandle: MockLensHandle } = await import('@panproto/core');
      expect(
        (MockLensHandle as unknown as { fromChain: ReturnType<typeof vi.fn> }).fromChain,
      ).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getChain
  // ---------------------------------------------------------------------------

  describe('getChain', () => {
    it('returns a ProtolensChainHandle from L3 build on first call', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const chain = await service.getChain('conllu');

      expect(chain).toBeDefined();
      expect(chain).toBe(mockChainHandle);
    });

    it('L1 in-memory cache hit on second call', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const first = await service.getChain('conllu');
      const second = await service.getChain('conllu');

      expect(first).toBe(second);
      // protolensChain should only be called once (L3 build), not on second call.
      expect(mockPanprotoInstance.protolensChain).toHaveBeenCalledTimes(1);
    });

    it('L2 Redis cache hit (deserialization path)', async () => {
      const serializedChain = '{"chain":"serialized"}';
      const redis = createMockRedis({
        get: vi.fn().mockResolvedValue(serializedChain),
      });
      const service = new PanprotoService(redis);

      const chain = await service.getChain('brat');

      expect(chain).toBe(mockChainHandle);
      // Should NOT have called protolensChain since Redis had the chain.
      expect(mockPanprotoInstance.protolensChain).not.toHaveBeenCalled();
      expect(redis.get).toHaveBeenCalledWith('panproto:chain:brat');
    });

    it('L3 build-from-scratch (protolensChain + persist to Redis)', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const chain = await service.getChain('elan');

      expect(mockPanprotoInstance.protolensChain).toHaveBeenCalled();
      expect(chain).toBeDefined();

      // Allow the async Redis persist to settle.
      await vi.waitFor(() => {
        expect(redis.set).toHaveBeenCalled();
      });
    });

    it('Redis read error falls through to rebuild', async () => {
      const redis = createMockRedis({
        get: vi.fn().mockRejectedValue(new Error('Redis connection refused')),
      });
      const service = new PanprotoService(redis);

      const chain = await service.getChain('conllu');

      // Should fall through to L3 build.
      expect(chain).toBeDefined();
      expect(mockPanprotoInstance.protolensChain).toHaveBeenCalled();
    });

    it('Redis write error is swallowed; chain still returned', async () => {
      const redis = createMockRedis({
        set: vi.fn().mockRejectedValue(new Error('Redis write failure')),
      });
      const service = new PanprotoService(redis);

      // Should not throw despite Redis write failure.
      const chain = await service.getChain('conllu');

      expect(chain).toBeDefined();
      expect(chain).toBe(mockChainHandle);

      // Allow the async Redis persist to settle so the warning is logged.
      await vi.waitFor(() => {
        expect(redis.set).toHaveBeenCalled();
      });
    });

    it('serializes via toJson()', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      await service.getChain('conllu');

      // Allow the async Redis persist to settle.
      await vi.waitFor(() => {
        expect(redis.set).toHaveBeenCalled();
      });

      // The mock chain has toJson, so it should serialize via that method.
      const setCall = (redis.set as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(setCall).toBeDefined();
      const [key, value, exFlag, ttl] = setCall as [string, string, string, number];
      expect(key).toBe('panproto:chain:conllu');
      expect(value).toBe('{"chain":"serialized"}');
      expect(exFlag).toBe('EX');
      expect(ttl).toBe(CHAIN_CACHE_TTL_SECONDS);
    });

    it('deserialization returns null for invalid JSON', async () => {
      const redis = createMockRedis({
        get: vi.fn().mockResolvedValue('not valid json{{{'),
      });
      const service = new PanprotoService(redis);

      const chain = await service.getChain('conllu');

      // Invalid JSON should cause a fallthrough to L3 build.
      expect(chain).toBeDefined();
      expect(mockPanprotoInstance.protolensChain).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getAnalysis
  // ---------------------------------------------------------------------------

  describe('getAnalysis', () => {
    it('returns a MigrationAnalysis', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const analysis = await service.getAnalysis();

      expect(analysis).toBeDefined();
      expect(analysis).toBeInstanceOf(MockMigrationAnalysis);
    });

    it('caches the analysis across calls', async () => {
      const redis = createMockRedis();
      const service = new PanprotoService(redis);

      const first = await service.getAnalysis();
      const second = await service.getAnalysis();

      expect(first).toBe(second);
    });
  });

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  describe('exported constants', () => {
    it('CHAIN_CACHE_PREFIX is panproto:chain:', () => {
      expect(CHAIN_CACHE_PREFIX).toBe('panproto:chain:');
    });

    it('CHAIN_CACHE_TTL_SECONDS is 86400 (24 hours)', () => {
      expect(CHAIN_CACHE_TTL_SECONDS).toBe(86_400);
    });
  });
});
