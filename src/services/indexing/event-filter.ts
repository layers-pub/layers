/**
 * Firehose event filter for pub.layers.* collection NSIDs.
 *
 * @module
 */

/**
 * All 26 pub.layers.* collection NSIDs that the appview indexes.
 */
const LAYERS_NSIDS: ReadonlySet<string> = new Set([
  'pub.layers.expression.expression',
  'pub.layers.segmentation.segmentation',
  'pub.layers.annotation.annotationLayer',
  'pub.layers.annotation.clusterSet',
  'pub.layers.ontology.ontology',
  'pub.layers.ontology.typeDef',
  'pub.layers.corpus.corpus',
  'pub.layers.corpus.membership',
  'pub.layers.resource.entry',
  'pub.layers.resource.collection',
  'pub.layers.resource.collectionMembership',
  'pub.layers.resource.template',
  'pub.layers.resource.filling',
  'pub.layers.resource.templateComposition',
  'pub.layers.judgment.experimentDef',
  'pub.layers.judgment.judgmentSet',
  'pub.layers.judgment.agreementReport',
  'pub.layers.alignment.alignment',
  'pub.layers.graph.graphNode',
  'pub.layers.graph.graphEdge',
  'pub.layers.graph.graphEdgeSet',
  'pub.layers.persona.persona',
  'pub.layers.media.media',
  'pub.layers.eprint.eprint',
  'pub.layers.eprint.dataLink',
  'pub.layers.changelog.entry',
]);

/**
 * Filters firehose events by collection NSID.
 *
 * Uses a Set lookup for zero-allocation filtering of non-matching events.
 */
class EventFilter {
  private readonly nsids: ReadonlySet<string>;

  constructor(nsids: ReadonlySet<string>) {
    this.nsids = nsids;
  }

  /**
   * Returns true if the collection NSID is one the appview indexes.
   */
  isRelevant(collection: string): boolean {
    return this.nsids.has(collection);
  }
}

export { EventFilter, LAYERS_NSIDS };
