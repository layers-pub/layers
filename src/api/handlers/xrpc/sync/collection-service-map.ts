/**
 * Maps collection NSIDs to DI container service keys.
 *
 * Used by sync endpoints to resolve the appropriate service for a given
 * pub.layers.* collection NSID.
 *
 * @module
 */

/**
 * Maps every indexed pub.layers.* collection NSID to its DI container key.
 *
 * The keys in this map correspond to the service names registered in
 * the DI container in `src/index.ts`.
 */
const COLLECTION_SERVICE_MAP: ReadonlyMap<string, string> = new Map([
  ['pub.layers.expression.expression', 'ExpressionService'],
  ['pub.layers.segmentation.segmentation', 'SegmentationService'],
  ['pub.layers.annotation.annotationLayer', 'AnnotationLayerService'],
  ['pub.layers.annotation.clusterSet', 'ClusterSetService'],
  ['pub.layers.ontology.ontology', 'OntologyService'],
  ['pub.layers.ontology.typeDef', 'TypeDefService'],
  ['pub.layers.corpus.corpus', 'CorpusService'],
  ['pub.layers.corpus.membership', 'CorpusMembershipService'],
  ['pub.layers.resource.entry', 'ResourceEntryService'],
  ['pub.layers.resource.collection', 'ResourceCollectionService'],
  ['pub.layers.resource.collectionMembership', 'CollectionMembershipService'],
  ['pub.layers.resource.template', 'TemplateService'],
  ['pub.layers.resource.filling', 'FillingService'],
  ['pub.layers.resource.templateComposition', 'TemplateCompositionService'],
  ['pub.layers.judgment.experimentDef', 'ExperimentDefService'],
  ['pub.layers.judgment.judgmentSet', 'JudgmentSetService'],
  ['pub.layers.judgment.agreementReport', 'AgreementReportService'],
  ['pub.layers.alignment.alignment', 'AlignmentService'],
  ['pub.layers.graph.graphNode', 'GraphNodeService'],
  ['pub.layers.graph.graphEdge', 'GraphEdgeService'],
  ['pub.layers.graph.graphEdgeSet', 'GraphEdgeSetService'],
  ['pub.layers.persona.persona', 'PersonaService'],
  ['pub.layers.media.media', 'MediaService'],
  ['pub.layers.eprint.eprint', 'EprintService'],
  ['pub.layers.eprint.dataLink', 'DataLinkService'],
  ['pub.layers.changelog.entry', 'ChangelogService'],
]);

export { COLLECTION_SERVICE_MAP };
