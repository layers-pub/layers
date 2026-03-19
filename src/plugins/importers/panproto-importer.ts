/**
 * Panproto-backed format importer for all 20 annotation protocols.
 *
 * A single parameterized class handles every panproto-supported format.
 * The factory function creates one importer instance per protocol
 * registered in ANNOTATION_PROTOCOLS.
 *
 * @module
 */

import { createLogger } from '@/observability/logger.js';
import { toImportResult } from '@/services/panproto/instance-mapper.js';
import type { ProtocolMeta } from '@/services/panproto/protocol-registry.js';
import { ANNOTATION_PROTOCOLS } from '@/services/panproto/protocol-registry.js';
import { PluginError, ValidationError } from '@/types/errors.js';
import type { LayersError } from '@/types/errors.js';
import type { IPanprotoService } from '@/types/interfaces/panproto.interface.js';
import type {
  IFormatImporter,
  ImportFormat,
  ImportResult,
} from '@/types/interfaces/plugin.interface.js';
import { Err, Ok, type Result } from '@/types/result.js';

/**
 * A format importer backed by a panproto protocol converter.
 *
 * Each instance handles one annotation format (e.g., CoNLL-U, BRAT, ELAN).
 * The parsing pipeline is:
 * 1. Get the I/O registry and enriched schema from the panproto service
 * 2. Parse the raw input through the protocol's I/O reader
 * 3. Apply the compiled lens to extract the Layers view
 * 4. Map the view to an ImportResult via the instance mapper
 */
class PanprotoImporter implements IFormatImporter {
  readonly format: ImportFormat;
  readonly name: string;
  readonly version: string;

  readonly #meta: ProtocolMeta;
  readonly #panproto: IPanprotoService;
  readonly #logger;

  constructor(meta: ProtocolMeta, panproto: IPanprotoService) {
    this.#meta = meta;
    this.#panproto = panproto;
    this.format = meta.format;
    this.name = `${meta.name} Importer (panproto)`;
    this.version = '1.0.0';
    this.#logger = createLogger({ service: `panproto-importer-${meta.protocol}` });
  }

  validate(input: string): Result<void, LayersError> {
    if (!input || input.trim().length === 0) {
      return Err(
        new ValidationError(`Input is empty for ${this.#meta.name} format`, 'input', 'non-empty'),
      );
    }

    return Ok(undefined);
  }

  async parse(
    input: string,
    _options?: Record<string, unknown>,
  ): Promise<Result<ImportResult, LayersError>> {
    const validation = this.validate(input);
    if (!validation.ok) {
      return Err(validation.error);
    }

    try {
      // Step 1: Obtain registry, schema, and lens from the panproto service.
      const [io, schema, lens] = await Promise.all([
        this.#panproto.getIoRegistry(),
        this.#panproto.getEnrichedSchema(this.#meta.protocol),
        this.#panproto.getLens(this.#meta.protocol),
      ]);

      // Step 2: Encode the input string to bytes and parse through I/O.
      const encoded = new TextEncoder().encode(input);
      const instance = io.parse(this.#meta.protocol, schema, encoded);

      // Step 3: Apply the lens to extract the Layers view.
      const { view, complement } = lens.get(instance._bytes);

      // Step 4: Map the view to an ImportResult.
      const result = toImportResult(view, this.format, complement);

      this.#logger.debug('Panproto import complete', {
        protocol: this.#meta.protocol,
        expressions: result.expressions.length,
        segmentations: result.segmentations.length,
        annotationLayers: result.annotationLayers.length,
      });

      return Ok(result);
    } catch (err: unknown) {
      const cause = err instanceof Error ? err : undefined;
      return Err(
        new PluginError(
          this.name,
          'import',
          `Failed to parse ${this.#meta.name} input: ${cause?.message ?? String(err)}`,
          cause,
        ),
      );
    }
  }
}

/**
 * Creates one PanprotoImporter for each of the 20 annotation protocols.
 *
 * @param service - the initialized panproto service
 * @returns an array of importer instances, one per protocol
 *
 * @example
 * ```typescript
 * const importers = createPanprotoImporters(panprotoService);
 * for (const importer of importers) {
 *   registry.register(importer);
 * }
 * ```
 */
function createPanprotoImporters(service: IPanprotoService): PanprotoImporter[] {
  return ANNOTATION_PROTOCOLS.map((meta) => new PanprotoImporter(meta, service));
}

export { createPanprotoImporters, PanprotoImporter };
