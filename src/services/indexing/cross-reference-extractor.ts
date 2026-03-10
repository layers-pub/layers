/**
 * Pure function module for extracting cross-references from indexed records.
 *
 * Given a collection NSID and its parsed record, returns an array of
 * extracted references with their target URIs and reference types.
 * Collections with no meaningful cross-references return an empty array.
 *
 * @module
 */

/**
 * A single extracted reference from a record.
 */
interface ExtractedRef {
  readonly targetUri: string;
  readonly refType: string;
}

/**
 * Safely extracts a string value from a record field.
 *
 * @param record - the record object
 * @param field - the field name to extract
 * @returns the string value, or undefined if missing or not a string
 */
function getString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

/**
 * Pushes a reference to the array if the field value is a non-empty string.
 *
 * @param refs - the accumulator array
 * @param record - the record object
 * @param field - the field name to check
 * @param refType - the reference type label
 */
function pushIfPresent(
  refs: ExtractedRef[],
  record: Record<string, unknown>,
  field: string,
  refType: string,
): void {
  const value = getString(record, field);
  if (value !== undefined) {
    refs.push({ targetUri: value, refType });
  }
}

/**
 * Extracts cross-references from an expression.expression record.
 */
function extractExpression(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'sourceRef', 'sourceRef');
  pushIfPresent(refs, record, 'eprintRef', 'eprintRef');
  pushIfPresent(refs, record, 'parentRef', 'parentRef');
  return refs;
}

/**
 * Extracts cross-references from a segmentation.segmentation record.
 */
function extractSegmentation(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'expression', 'expressionRef');
  return refs;
}

/**
 * Extracts cross-references from an annotation.annotationLayer record.
 */
function extractAnnotationLayer(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'expression', 'expressionRef');
  pushIfPresent(refs, record, 'segmentationRef', 'segmentationRef');
  pushIfPresent(refs, record, 'ontologyRef', 'ontologyRef');
  pushIfPresent(refs, record, 'personaRef', 'personaRef');
  return refs;
}

/**
 * Extracts cross-references from an annotation.clusterSet record.
 */
function extractClusterSet(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'expression', 'expressionRef');
  pushIfPresent(refs, record, 'layerRef', 'layerRef');
  return refs;
}

/**
 * Extracts cross-references from an ontology.typeDef record.
 */
function extractTypeDef(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'ontologyRef', 'ontologyRef');
  pushIfPresent(refs, record, 'parentTypeRef', 'parentTypeRef');
  return refs;
}

/**
 * Extracts cross-references from a corpus.membership record.
 */
function extractCorpusMembership(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'corpusRef', 'corpusRef');
  pushIfPresent(refs, record, 'expressionRef', 'expressionRef');
  return refs;
}

/**
 * Extracts cross-references from a resource.collectionMembership record.
 */
function extractCollectionMembership(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'collectionRef', 'collectionRef');
  pushIfPresent(refs, record, 'entryRef', 'entryRef');
  return refs;
}

/**
 * Extracts cross-references from a resource.template record.
 */
function extractTemplate(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'ontologyRef', 'ontologyRef');
  pushIfPresent(refs, record, 'experimentRef', 'experimentRef');
  return refs;
}

/**
 * Extracts cross-references from a resource.filling record.
 */
function extractFilling(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'templateRef', 'templateRef');
  pushIfPresent(refs, record, 'expressionRef', 'expressionRef');
  return refs;
}

/**
 * Extracts cross-references from a resource.templateComposition record.
 *
 * Iterates the members array and extracts templateRef from each element.
 */
function extractTemplateComposition(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  const members = record.members;
  if (Array.isArray(members)) {
    for (const member of members) {
      if (typeof member === 'object' && member !== null) {
        const memberRecord = member as Record<string, unknown>;
        pushIfPresent(refs, memberRecord, 'templateRef', 'templateRef');
      }
    }
  }
  return refs;
}

/**
 * Extracts cross-references from a graph.graphEdge record.
 */
function extractGraphEdge(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'edgeSetRef', 'edgeSetRef');
  return refs;
}

/**
 * Extracts cross-references from a graph.graphEdgeSet record.
 */
function extractGraphEdgeSet(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'expressionRef', 'expressionRef');
  return refs;
}

/**
 * Extracts cross-references from an eprint.dataLink record.
 */
function extractDataLink(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'eprintUri', 'eprintRef');
  pushIfPresent(refs, record, 'corpusRef', 'corpusRef');
  return refs;
}

/**
 * Extracts cross-references from an alignment.alignment record.
 */
function extractAlignment(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'expression', 'expressionRef');
  return refs;
}

/**
 * Extracts cross-references from a judgment.experimentDef record.
 */
function extractExperimentDef(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'ontologyRef', 'ontologyRef');
  pushIfPresent(refs, record, 'personaRef', 'personaRef');
  pushIfPresent(refs, record, 'corpusRef', 'corpusRef');
  return refs;
}

/**
 * Extracts cross-references from a judgment.judgmentSet record.
 */
function extractJudgmentSet(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'experimentRef', 'experimentRef');
  return refs;
}

/**
 * Extracts cross-references from a judgment.agreementReport record.
 */
function extractAgreementReport(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'experimentRef', 'experimentRef');
  return refs;
}

/**
 * Extracts cross-references from a changelog.entry record.
 */
function extractChangelogEntry(record: Record<string, unknown>): ExtractedRef[] {
  const refs: ExtractedRef[] = [];
  pushIfPresent(refs, record, 'subject', 'subjectRef');
  return refs;
}

/**
 * Maps collection NSIDs to their extraction functions.
 */
const EXTRACTORS: ReadonlyMap<string, (record: Record<string, unknown>) => ExtractedRef[]> =
  new Map([
    ['pub.layers.expression.expression', extractExpression],
    ['pub.layers.segmentation.segmentation', extractSegmentation],
    ['pub.layers.annotation.annotationLayer', extractAnnotationLayer],
    ['pub.layers.annotation.clusterSet', extractClusterSet],
    ['pub.layers.ontology.typeDef', extractTypeDef],
    ['pub.layers.corpus.membership', extractCorpusMembership],
    ['pub.layers.resource.collectionMembership', extractCollectionMembership],
    ['pub.layers.resource.template', extractTemplate],
    ['pub.layers.resource.filling', extractFilling],
    ['pub.layers.resource.templateComposition', extractTemplateComposition],
    ['pub.layers.graph.graphEdge', extractGraphEdge],
    ['pub.layers.graph.graphEdgeSet', extractGraphEdgeSet],
    ['pub.layers.eprint.dataLink', extractDataLink],
    ['pub.layers.alignment.alignment', extractAlignment],
    ['pub.layers.judgment.experimentDef', extractExperimentDef],
    ['pub.layers.judgment.judgmentSet', extractJudgmentSet],
    ['pub.layers.judgment.agreementReport', extractAgreementReport],
    ['pub.layers.changelog.entry', extractChangelogEntry],
  ]);

/**
 * Extracts cross-references from a record based on its collection NSID.
 *
 * Returns an empty array for collections without meaningful cross-references
 * (ontology.ontology, corpus.corpus, persona.persona, media.media,
 * eprint.eprint, graph.graphNode, resource.collection, resource.entry).
 *
 * @param collection - the collection NSID
 * @param record - the parsed record object
 * @returns an array of extracted references
 *
 * @example
 * ```typescript
 * const refs = extractCrossReferences(
 *   'pub.layers.annotation.annotationLayer',
 *   { expression: 'at://did:plc:abc/pub.layers.expression.expression/123', ontologyRef: 'at://...' }
 * );
 * // [{ targetUri: 'at://...', refType: 'expressionRef' }, { targetUri: 'at://...', refType: 'ontologyRef' }]
 * ```
 */
function extractCrossReferences(
  collection: string,
  record: Record<string, unknown>,
): ExtractedRef[] {
  const extractor = EXTRACTORS.get(collection);
  if (!extractor) {
    return [];
  }
  return extractor(record);
}

export { extractCrossReferences };
export type { ExtractedRef };
