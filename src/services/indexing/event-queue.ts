/**
 * BullMQ queue dispatch and backpressure for firehose events.
 *
 * @module
 */

import { Queue, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';

import { createLogger } from '../../observability/logger.js';
import { LayersMetrics } from '../../observability/metrics-exporter.js';
import type { ILogger } from '../../types/interfaces/logger.interface.js';

/**
 * BullMQ queue names for the 12 indexing queues.
 */
const QUEUE_NAMES = {
  EXPRESSION: 'layers:expression',
  SEGMENTATION: 'layers:segmentation',
  ANNOTATION: 'layers:annotation',
  ONTOLOGY: 'layers:ontology',
  CORPUS: 'layers:corpus',
  RESOURCE: 'layers:resource',
  JUDGMENT: 'layers:judgment',
  ALIGNMENT: 'layers:alignment',
  GRAPH: 'layers:graph',
  INTEGRATION: 'layers:integration',
  ENRICHMENT: 'layers:enrichment',
  IMPORT: 'layers:import',
} as const;

/**
 * Maps each collection NSID to its BullMQ queue.
 */
const NSID_TO_QUEUE: ReadonlyMap<string, string> = new Map([
  ['pub.layers.expression.expression', QUEUE_NAMES.EXPRESSION],
  ['pub.layers.segmentation.segmentation', QUEUE_NAMES.SEGMENTATION],
  ['pub.layers.annotation.annotationLayer', QUEUE_NAMES.ANNOTATION],
  ['pub.layers.annotation.clusterSet', QUEUE_NAMES.ANNOTATION],
  ['pub.layers.ontology.ontology', QUEUE_NAMES.ONTOLOGY],
  ['pub.layers.ontology.typeDef', QUEUE_NAMES.ONTOLOGY],
  ['pub.layers.corpus.corpus', QUEUE_NAMES.CORPUS],
  ['pub.layers.corpus.membership', QUEUE_NAMES.CORPUS],
  ['pub.layers.resource.entry', QUEUE_NAMES.RESOURCE],
  ['pub.layers.resource.collection', QUEUE_NAMES.RESOURCE],
  ['pub.layers.resource.collectionMembership', QUEUE_NAMES.RESOURCE],
  ['pub.layers.resource.template', QUEUE_NAMES.RESOURCE],
  ['pub.layers.resource.filling', QUEUE_NAMES.RESOURCE],
  ['pub.layers.resource.templateComposition', QUEUE_NAMES.RESOURCE],
  ['pub.layers.judgment.experimentDef', QUEUE_NAMES.JUDGMENT],
  ['pub.layers.judgment.judgmentSet', QUEUE_NAMES.JUDGMENT],
  ['pub.layers.judgment.agreementReport', QUEUE_NAMES.JUDGMENT],
  ['pub.layers.alignment.alignment', QUEUE_NAMES.ALIGNMENT],
  ['pub.layers.graph.graphNode', QUEUE_NAMES.GRAPH],
  ['pub.layers.graph.graphEdge', QUEUE_NAMES.GRAPH],
  ['pub.layers.graph.graphEdgeSet', QUEUE_NAMES.GRAPH],
  ['pub.layers.persona.persona', QUEUE_NAMES.INTEGRATION],
  ['pub.layers.media.media', QUEUE_NAMES.INTEGRATION],
  ['pub.layers.eprint.eprint', QUEUE_NAMES.INTEGRATION],
  ['pub.layers.eprint.dataLink', QUEUE_NAMES.INTEGRATION],
  ['pub.layers.changelog.entry', QUEUE_NAMES.INTEGRATION],
]);

/**
 * Manages BullMQ queue dispatch and backpressure for firehose events.
 */
class EventQueue {
  private readonly queues: Map<string, Queue>;
  private readonly maxDepth: number;
  private readonly logger: ILogger;

  constructor(redis: Redis, options?: { maxDepth?: number }) {
    this.maxDepth = options?.maxDepth ?? 10_000;
    this.logger = createLogger({ service: 'event-queue' });
    this.queues = new Map();

    for (const queueName of Object.values(QUEUE_NAMES)) {
      this.queues.set(
        queueName,
        new Queue(queueName, { connection: redis as unknown as ConnectionOptions }),
      );
    }
  }

  /**
   * Dispatches an event to the appropriate queue based on collection NSID.
   */
  async dispatch(collection: string, data: Record<string, unknown>): Promise<void> {
    const queueName = NSID_TO_QUEUE.get(collection);
    if (!queueName) {
      this.logger.warn('No queue mapping for collection', { collection });
      return;
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      this.logger.error('Queue not found', { queueName });
      return;
    }

    await queue.add(collection, data);
    LayersMetrics.firehoseQueueDepth.labels(queueName).inc();
  }

  /**
   * Returns the current depth of a specific queue.
   */
  async getQueueDepth(queueName: string): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return 0;
    }
    const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
    return (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
  }

  /**
   * Returns the total depth across all queues.
   */
  async getTotalDepth(): Promise<number> {
    let total = 0;
    for (const queueName of this.queues.keys()) {
      total += await this.getQueueDepth(queueName);
    }
    return total;
  }

  /**
   * Returns true if total queue depth exceeds the backpressure threshold.
   */
  async isBackpressured(): Promise<boolean> {
    const depth = await this.getTotalDepth();
    return depth > this.maxDepth;
  }

  /**
   * Closes all queues.
   */
  async close(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((q) => q.close());
    await Promise.all(closePromises);
  }
}

export { EventQueue, NSID_TO_QUEUE, QUEUE_NAMES };
