/**
 * Panproto-backed format exporter for all 20 annotation protocols.
 *
 * A single parameterized class handles every panproto-supported format.
 * The factory function creates one exporter instance per protocol
 * registered in ANNOTATION_PROTOCOLS.
 *
 * @module
 */

import { Instance } from '@panproto/core';

import { createLogger } from '@/observability/logger.js';
import { fromLayersData } from '@/services/panproto/instance-mapper.js';
import type { ProtocolMeta } from '@/services/panproto/protocol-registry.js';
import { ANNOTATION_PROTOCOLS } from '@/services/panproto/protocol-registry.js';
import { PluginError } from '@/types/errors.js';
import type { LayersError } from '@/types/errors.js';
import type { IPanprotoService } from '@/types/interfaces/panproto.interface.js';
import type { ImportFormat, ImportResult } from '@/types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '@/types/result.js';

/**
 * A format exporter backed by a panproto protocol converter.
 *
 * Each instance handles one annotation format (e.g., CoNLL-U, BRAT, ELAN).
 * The export pipeline is:
 * 1. Convert Layers records to the panproto view shape via fromLayersData
 * 2. Apply the compiled lens `put` to produce format-native bytes
 * 3. Emit the bytes through the protocol's I/O writer
 */
class PanprotoExporter {
  readonly format: ImportFormat;
  readonly name: string;
  readonly mimeType: string;
  readonly extension: string;

  readonly #meta: ProtocolMeta;
  readonly #panproto: IPanprotoService;
  readonly #logger;

  constructor(meta: ProtocolMeta, panproto: IPanprotoService) {
    this.#meta = meta;
    this.#panproto = panproto;
    this.format = meta.format;
    this.name = `${meta.name} Exporter (panproto)`;
    this.mimeType = meta.mimeType;
    this.extension = meta.primaryExtension;
    this.#logger = createLogger({ service: `panproto-exporter-${meta.protocol}` });
  }

  /**
   * Exports Layers annotation data to the target format.
   *
   * @param data - the ImportResult containing expressions, segmentations, and annotation layers
   * @returns the exported file content as a byte array, or an error
   *
   * @example
   * ```typescript
   * const exporter = new PanprotoExporter(conlluMeta, panprotoService);
   * const result = await exporter.export(importResult);
   * if (result.ok) {
   *   writeFile("output.conllu", result.value);
   * }
   * ```
   */
  async export(data: ImportResult): Promise<Result<Uint8Array, LayersError>> {
    try {
      // Step 1: Convert Layers records to the panproto view shape.
      const view = fromLayersData(data.expressions, data.segmentations, data.annotationLayers);

      // Recover complement data for round-trip fidelity if available.
      const complement = data.metadata._complement ?? new Uint8Array();

      // Step 2: Get the lens, panproto instance, and apply put to produce format-native bytes.
      const [io, schema, lens, panprotoInstance] = await Promise.all([
        this.#panproto.getIoRegistry(),
        this.#panproto.getEnrichedSchema(this.#meta.protocol),
        this.#panproto.getLens(this.#meta.protocol),
        this.#panproto.getInstance(),
      ]);

      // Serialize the view to msgpack bytes for the lens put operation.
      const viewBytes = panprotoInstance.toJson(
        schema,
        new Instance(
          new TextEncoder().encode(JSON.stringify(view)),
          schema,
          panprotoInstance._wasm,
        ),
      );
      const putResult = lens.put(viewBytes, complement);

      // Construct an Instance from the put result's raw bytes for I/O emission.
      const rawBytes =
        putResult._rawBytes ?? new TextEncoder().encode(JSON.stringify(putResult.data));
      const resultInstance = new Instance(rawBytes, schema, panprotoInstance._wasm);

      // Step 3: Emit through the I/O writer.
      const output = io.emit(this.#meta.protocol, schema, resultInstance);

      this.#logger.debug('Panproto export complete', {
        protocol: this.#meta.protocol,
        outputBytes: output.byteLength,
      });

      return Ok(output);
    } catch (err: unknown) {
      const cause = err instanceof Error ? err : undefined;
      return Err(
        new PluginError(
          this.name,
          'export',
          `Failed to export to ${this.#meta.name}: ${cause?.message ?? String(err)}`,
          cause,
        ),
      );
    }
  }
}

/**
 * Creates one PanprotoExporter for each of the 20 annotation protocols.
 *
 * @param service - the initialized panproto service
 * @returns an array of exporter instances, one per protocol
 *
 * @example
 * ```typescript
 * const exporters = createPanprotoExporters(panprotoService);
 * for (const exporter of exporters) {
 *   registry.registerPlugin(exporter);
 * }
 * ```
 */
function createPanprotoExporters(service: IPanprotoService): PanprotoExporter[] {
  return ANNOTATION_PROTOCOLS.map((meta) => new PanprotoExporter(meta, service));
}

export { createPanprotoExporters, PanprotoExporter };
