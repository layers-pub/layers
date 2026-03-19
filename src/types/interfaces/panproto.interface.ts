/**
 * Abstract interface for the panproto WASM integration service.
 *
 * Provides access to the initialized panproto instance, schema construction,
 * I/O protocol registry, lens caching, and migration analysis. All methods
 * return promises because the underlying WASM module loads asynchronously.
 *
 * @module
 */

import type {
  BuiltSchema,
  IoRegistry,
  LensHandle,
  MigrationAnalysis,
  Panproto,
  ProtolensChainHandle,
} from '@panproto/core';

/**
 * Defines the contract for interacting with the panproto WASM runtime.
 *
 * Implementations manage lazy initialization of the WASM module,
 * cache compiled lenses and protolens chains by source protocol,
 * and expose the Layers ATProto annotation schema for format conversion.
 */
export interface IPanprotoService {
  /**
   * Returns the initialized panproto WASM instance.
   *
   * The instance is lazily loaded on first call and cached for subsequent
   * invocations. Callers should not store the returned value long-term;
   * call this method each time to ensure the instance is valid.
   *
   * @returns the panproto WASM instance
   */
  getInstance(): Promise<Panproto>;

  /**
   * Returns the Layers ATProto annotation schema.
   *
   * This schema describes the `pub.layers.annotation.annotationLayer`
   * record structure and is used as the target schema for all format
   * conversions.
   *
   * @returns the built Layers annotation schema
   */
  getLayersSchema(): Promise<BuiltSchema>;

  /**
   * Returns the Layers schema enriched with protocol-specific defaults and coercions.
   *
   * Enrichment adds default values and type coercions appropriate for the
   * given source protocol, enabling lossless round-trip conversion where
   * the source format supports it.
   *
   * @param protocol - the panproto protocol identifier (e.g., "conllu", "brat")
   * @returns the enriched schema for the specified protocol
   */
  getEnrichedSchema(protocol: string): Promise<BuiltSchema>;

  /**
   * Returns the I/O protocol registry.
   *
   * The registry maps protocol identifiers to their reader/writer
   * implementations and format metadata.
   *
   * @returns the I/O protocol registry
   */
  getIoRegistry(): Promise<IoRegistry>;

  /**
   * Returns a cached lens for converting from the given source protocol to Layers format.
   *
   * Lenses are compiled once per protocol and cached for the lifetime of the
   * service. A lens provides bidirectional conversion between a source format
   * and the Layers annotation schema.
   *
   * @param sourceProtocol - the panproto protocol identifier (e.g., "conllu", "brat")
   * @returns a handle to the compiled lens
   */
  getLens(sourceProtocol: string): Promise<LensHandle>;

  /**
   * Returns a cached protolens chain for the given source protocol.
   *
   * A protolens chain composes multiple lenses to handle multi-step
   * conversions (e.g., source -> intermediate -> Layers). Chains are
   * compiled once per protocol and cached.
   *
   * @param sourceProtocol - the panproto protocol identifier
   * @returns a handle to the compiled protolens chain
   */
  getChain(sourceProtocol: string): Promise<ProtolensChainHandle>;

  /**
   * Returns the migration analysis instance.
   *
   * Migration analysis inspects schema differences between a source
   * protocol and the Layers target schema, reporting field mappings,
   * lossy conversions, and unsupported features.
   *
   * @returns the migration analysis instance
   */
  getAnalysis(): Promise<MigrationAnalysis>;
}
