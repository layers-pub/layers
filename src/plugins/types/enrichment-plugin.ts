/**
 * Enrichment plugin interface for automatic annotation generation.
 *
 * Enrichment plugins analyze existing expressions and layers to
 * produce additional annotation layers automatically (e.g.,
 * language detection, NER, sentiment analysis).
 *
 * @module
 */

import type { PluginError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';

import type { IPlugin } from '../core/plugin-interface.js';

/**
 * An expression record as provided to enrichment plugins.
 */
interface IEnrichmentExpression {
  readonly uri: string;
  readonly text: string;
  readonly language?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * An existing annotation layer provided as context for enrichment.
 */
interface IEnrichmentAnnotationLayer {
  readonly uri: string;
  readonly kind: string;
  readonly subkind?: string | undefined;
  readonly formalism?: string | undefined;
  readonly annotations: readonly Readonly<Record<string, unknown>>[];
}

/**
 * A generated annotation layer produced by the enrichment plugin.
 *
 * Contains the same structure as an annotation layer record
 * but without a URI (it will be assigned when written to the PDS).
 */
interface IEnrichmentOutput {
  readonly kind: string;
  readonly subkind?: string | undefined;
  readonly formalism?: string | undefined;
  readonly annotations: readonly Readonly<Record<string, unknown>>[];
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Plugin that generates annotations from existing expression data.
 *
 * Enrichment plugins declare which annotation kinds they produce
 * via `outputKinds`. The host invokes `enrich` with the expression
 * and any existing layers, and the plugin returns zero or more
 * new annotation layers.
 */
interface IEnrichmentPlugin extends IPlugin {
  /**
   * Annotation kinds that this plugin can produce.
   *
   * Used by the host to determine which enrichments are applicable
   * for a given expression.
   */
  readonly outputKinds: readonly string[];

  /**
   * Generate annotation layers from an expression and existing layers.
   *
   * @param expression - the expression to enrich
   * @param existingLayers - existing annotation layers for context
   * @returns generated annotation layers, or a PluginError
   */
  enrich(
    expression: IEnrichmentExpression,
    existingLayers: readonly IEnrichmentAnnotationLayer[],
  ): Promise<Result<IEnrichmentOutput[], PluginError>>;
}

export type {
  IEnrichmentAnnotationLayer,
  IEnrichmentExpression,
  IEnrichmentOutput,
  IEnrichmentPlugin,
};
