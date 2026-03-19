/**
 * Panproto WASM integration service.
 *
 * Provides lazy initialization of the panproto WASM module, caching of
 * compiled schemas, lenses, and protolens chains, and Redis-backed
 * persistence for serialized chain handles.
 *
 * @module
 */

import {
  type BuiltSchema,
  type IoRegistry,
  type LensHandle,
  LensHandle as LensHandleClass,
  MigrationAnalysis,
  type Panproto,
  Panproto as PanprotoClass,
  type ProtolensChainHandle,
  ProtolensChainHandle as ProtolensChainHandleClass,
} from '@panproto/core';
import type { Redis } from 'ioredis';
import { inject, injectable } from 'tsyringe';

import { createLogger } from '@/observability/logger.js';
import { ServiceUnavailableError } from '@/types/errors.js';
import type { ILogger } from '@/types/interfaces/logger.interface.js';
import type { IPanprotoService } from '@/types/interfaces/panproto.interface.js';

import { enrichLayersSchema } from './enrichments.js';
import { buildLayersSchema } from './layers-schema.js';

/**
 * Redis key prefix for serialized protolens chain handles.
 */
const CHAIN_CACHE_PREFIX = 'panproto:chain:';

/**
 * TTL for Redis-cached chain handles, in seconds (24 hours).
 */
const CHAIN_CACHE_TTL_SECONDS = 86_400;

/**
 * Implements IPanprotoService with lazy WASM initialization and multi-level caching.
 *
 * Caching strategy:
 * - L1 (in-memory Map): lenses and chains, keyed by protocol. Cleared on process restart.
 * - L2 (Redis): serialized chain handles, keyed by `panproto:chain:{protocol}`.
 *   Survives process restarts; TTL-based expiry.
 *
 * The WASM instance is initialized once via a deduplicating promise (#initPromise).
 * Subsequent calls to getInstance() return the cached instance without re-initialization.
 */
@injectable()
class PanprotoService implements IPanprotoService {
  readonly #redis: Redis;
  readonly #logger: ILogger;

  #initPromise: Promise<Panproto> | null = null;
  #layersSchema: BuiltSchema | null = null;
  #ioRegistry: IoRegistry | null = null;
  #analysis: MigrationAnalysis | null = null;

  readonly #lensCache = new Map<string, LensHandle>();
  readonly #chainCache = new Map<string, ProtolensChainHandle>();
  readonly #enrichedSchemaCache = new Map<string, BuiltSchema>();

  constructor(@inject('IRedisClient') redis: Redis) {
    this.#redis = redis;
    this.#logger = createLogger({ service: 'panproto-service' });
  }

  async getInstance(): Promise<Panproto> {
    if (!this.#initPromise) {
      this.#initPromise = this.#initialize();
    }

    try {
      return await this.#initPromise;
    } catch (err: unknown) {
      // Reset so subsequent calls retry initialization.
      this.#initPromise = null;
      throw new ServiceUnavailableError(
        'panproto',
        'Failed to initialize panproto WASM module',
        err instanceof Error ? err : undefined,
      );
    }
  }

  async getLayersSchema(): Promise<BuiltSchema> {
    if (this.#layersSchema) {
      return this.#layersSchema;
    }

    const instance = await this.getInstance();
    this.#layersSchema = buildLayersSchema(instance);
    return this.#layersSchema;
  }

  async getEnrichedSchema(protocol: string): Promise<BuiltSchema> {
    const cached = this.#enrichedSchemaCache.get(protocol);
    if (cached) {
      return cached;
    }

    const base = await this.getLayersSchema();
    const enriched = enrichLayersSchema(base, protocol);
    this.#enrichedSchemaCache.set(protocol, enriched);
    return enriched;
  }

  async getIoRegistry(): Promise<IoRegistry> {
    if (this.#ioRegistry) {
      return this.#ioRegistry;
    }

    const instance = await this.getInstance();
    this.#ioRegistry = instance.io();
    return this.#ioRegistry;
  }

  async getLens(sourceProtocol: string): Promise<LensHandle> {
    const cached = this.#lensCache.get(sourceProtocol);
    if (cached) {
      return cached;
    }

    // Build a lens from the chain for this protocol.
    const chain = await this.getChain(sourceProtocol);
    const instance = await this.getInstance();
    const schema = await this.getEnrichedSchema(sourceProtocol);
    const lens = LensHandleClass.fromChain(chain, schema, instance._wasm);
    this.#lensCache.set(sourceProtocol, lens);

    this.#logger.debug('Lens compiled and cached', { protocol: sourceProtocol });
    return lens;
  }

  async getChain(sourceProtocol: string): Promise<ProtolensChainHandle> {
    // L1: in-memory cache
    const memoryCached = this.#chainCache.get(sourceProtocol);
    if (memoryCached) {
      return memoryCached;
    }

    // L2: Redis cache
    const redisKey = `${CHAIN_CACHE_PREFIX}${sourceProtocol}`;
    try {
      const serialized = await this.#redis.get(redisKey);
      if (serialized) {
        const chain = await this.#deserializeChain(serialized);
        if (chain) {
          this.#chainCache.set(sourceProtocol, chain);
          this.#logger.debug('Chain restored from Redis', { protocol: sourceProtocol });
          return chain;
        }
      }
    } catch (err: unknown) {
      // Redis failure is non-fatal; we can rebuild the chain.
      this.#logger.warn('Failed to read chain from Redis, rebuilding', {
        protocol: sourceProtocol,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // L3: build from scratch
    const chain = await this.#buildChain(sourceProtocol);
    this.#chainCache.set(sourceProtocol, chain);

    // Persist to Redis asynchronously. Do not await; a failure here
    // is acceptable since the chain is in-memory.
    this.#persistChainToRedis(sourceProtocol, chain).catch((err: unknown) => {
      this.#logger.warn('Failed to persist chain to Redis', {
        protocol: sourceProtocol,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return chain;
  }

  async getAnalysis(): Promise<MigrationAnalysis> {
    if (this.#analysis) {
      return this.#analysis;
    }

    const instance = await this.getInstance();
    this.#analysis = new MigrationAnalysis(instance);
    return this.#analysis;
  }

  /**
   * Initializes the panproto WASM module.
   *
   * This performs the async import and instantiation of the WASM binary.
   * Called once; the result is cached via #initPromise.
   */
  async #initialize(): Promise<Panproto> {
    this.#logger.info('Initializing panproto WASM module');

    // Initialize the panproto WASM module via its static factory method.
    const instance = await PanprotoClass.init();

    this.#logger.info('panproto WASM module initialized');
    return instance;
  }

  /**
   * Builds a protolens chain for converting from a source protocol to Layers.
   *
   * Uses panproto's auto-generate and fuse capabilities to find the
   * optimal conversion path.
   */
  async #buildChain(sourceProtocol: string): Promise<ProtolensChainHandle> {
    const instance = await this.getInstance();
    const layersSchema = await this.getLayersSchema();
    const enrichedSchema = await this.getEnrichedSchema(sourceProtocol);
    const chain = instance.protolensChain(enrichedSchema, layersSchema);

    this.#logger.info('Protolens chain built', {
      protocol: sourceProtocol,
    });

    return chain;
  }

  /**
   * Serializes and persists a chain handle to Redis.
   */
  async #persistChainToRedis(sourceProtocol: string, chain: ProtolensChainHandle): Promise<void> {
    const redisKey = `${CHAIN_CACHE_PREFIX}${sourceProtocol}`;
    const json = chain.toJson();
    await this.#redis.set(redisKey, json, 'EX', CHAIN_CACHE_TTL_SECONDS);
    this.#logger.debug('Chain persisted to Redis', { protocol: sourceProtocol });
  }

  /**
   * Deserializes a chain handle from a Redis JSON string.
   *
   * @returns the deserialized chain handle, or null if deserialization fails
   */
  async #deserializeChain(serialized: string): Promise<ProtolensChainHandle | null> {
    try {
      const instance = await this.getInstance();
      return ProtolensChainHandleClass.fromJson(serialized, instance._wasm);
    } catch {
      return null;
    }
  }
}

export { PanprotoService, CHAIN_CACHE_PREFIX, CHAIN_CACHE_TTL_SECONDS };
