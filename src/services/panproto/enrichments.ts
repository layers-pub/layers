/**
 * Per-protocol schema enrichments for panproto format conversion.
 *
 * When converting from an external annotation format to Layers, the source
 * format may lack fields that Layers requires (e.g., confidence scores).
 * Enrichments inject protocol-specific default values so conversions produce
 * complete records.
 *
 * @module
 */

import { ExprBuilder, SchemaEnrichment, type BuiltSchema } from '@panproto/core';

/**
 * Maximum confidence value (0-1000 scale).
 *
 * Applied as the default when the source format does not express
 * annotation confidence. A score of 1000 means "fully certain,"
 * which is the correct assumption for manually annotated gold data.
 */
const MAX_CONFIDENCE = 1000;

/**
 * Default formalism strings per protocol.
 *
 * When the source format implies a specific formalism that is not
 * explicitly stated in the data, the enrichment injects it as the
 * annotationLayer.formalism default.
 */
const PROTOCOL_FORMALISMS: Readonly<Record<string, string>> = {
  conllu: 'universal-dependencies',
  brat: 'brat-standoff',
  naf: 'naf',
  uima: 'uima-cas',
  folia: 'folia',
  tei: 'tei-inline',
  timeml: 'timeml',
  elan: 'elan-eaf',
  iso_space: 'iso-space',
  paula: 'paula-xml',
  laf_graf: 'laf-graf',
  decomp: 'decomp',
  ucca: 'ucca',
  fovea: 'fovea',
  bead: 'bead',
  web_annotation: 'w3c-web-annotation',
  amr: 'amr-penman',
  concrete: 'concrete',
  nif: 'nif-rdf',
  praat: 'praat-textgrid',
};

/**
 * Default subkind strings per protocol.
 *
 * Some formats predominantly produce a specific annotation subkind.
 * This provides a sensible default when the source data does not
 * specify one.
 */
const PROTOCOL_SUBKINDS: Readonly<Record<string, string>> = {
  conllu: 'dependency',
  amr: 'amr',
  praat: 'speaker',
  elan: 'speaker',
  timeml: 'temporal-expression',
  iso_space: 'spatial-expression',
};

/**
 * Enrichment descriptor applied to a schema field.
 */
interface FieldEnrichment {
  /** Dot-separated path to the field (e.g., "annotation:confidence"). */
  readonly path: string;
  /** The default value to inject when the field is absent. */
  readonly defaultValue: unknown;
}

/**
 * Computes the enrichments for a given protocol.
 *
 * @param protocol - the panproto protocol identifier (e.g., "conllu", "brat")
 * @returns the list of field enrichments to apply
 */
function computeEnrichments(protocol: string): readonly FieldEnrichment[] {
  const enrichments: FieldEnrichment[] = [];

  // All protocols default confidence to max when the source has no confidence.
  enrichments.push({
    path: 'annotation:confidence',
    defaultValue: MAX_CONFIDENCE,
  });

  // Protocol-specific formalism default.
  const formalism = PROTOCOL_FORMALISMS[protocol];
  if (formalism) {
    enrichments.push({
      path: 'annotationLayer:formalism',
      defaultValue: formalism,
    });
  }

  // Protocol-specific subkind default.
  const subkind = PROTOCOL_SUBKINDS[protocol];
  if (subkind) {
    enrichments.push({
      path: 'annotationLayer:subkind',
      defaultValue: subkind,
    });
  }

  return enrichments;
}

/**
 * Enriches a Layers schema with protocol-specific default values.
 *
 * The enrichment adds default value expressions to schema fields
 * that the source protocol does not populate. This ensures that
 * the lens output always contains all fields required by the Layers
 * record schema, even when the source format is less expressive.
 *
 * The function calls the schema's enrichment API if available.
 * If the schema does not expose an enrichment method (e.g., during
 * stub-only development), the schema is returned unchanged.
 *
 * @param schema - the base Layers annotation schema
 * @param protocol - the panproto protocol identifier
 * @returns the enriched schema (may be the same object if mutation-based)
 *
 * @example
 * ```typescript
 * const base = buildLayersSchema(panproto);
 * const enriched = enrichLayersSchema(base, "conllu");
 * ```
 */
function enrichLayersSchema(schema: BuiltSchema, protocol: string): BuiltSchema {
  const enrichments = computeEnrichments(protocol);

  if (enrichments.length === 0) {
    return schema;
  }

  let enrichment = new SchemaEnrichment(schema);

  for (const entry of enrichments) {
    // Convert the default value to an Expr literal suitable for panproto.
    const expr =
      typeof entry.defaultValue === 'number'
        ? ExprBuilder.lit({ type: 'int', value: entry.defaultValue })
        : ExprBuilder.lit({ type: 'str', value: String(entry.defaultValue) });

    enrichment = enrichment.addDefault(entry.path, expr);
  }

  return enrichment.build();
}

export {
  computeEnrichments,
  enrichLayersSchema,
  MAX_CONFIDENCE,
  PROTOCOL_FORMALISMS,
  PROTOCOL_SUBKINDS,
};
export type { FieldEnrichment };
