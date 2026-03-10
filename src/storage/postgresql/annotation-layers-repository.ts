/**
 * Annotation layer repository extending {@link BaseRepository}.
 *
 * Annotation layers have no search endpoint at the repository level.
 * Neo4j edges connect annotation layers to expressions, ontologies,
 * and personas.
 *
 * @module
 */

import type { AnnotationLayerRecord, AnnotationLayerRow } from '../../types/annotation-layer.js';
import { toAnnotationLayerView } from '../../types/annotation-layer.js';
import type { DatabaseError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';
import {
  BaseRepository,
  type BaseRepositoryDeps,
  type RecordTypeConfig,
} from '../base-repository.js';

/**
 * Storage configuration for the annotation layer record type.
 */
const annotationLayerRepoConfig: RecordTypeConfig<AnnotationLayerRecord> = {
  collection: 'pub.layers.annotation.annotationLayer',
  table: 'annotation_layers',
  esIndex: 'annotation_layers',
  neo4jLabel: 'AnnotationLayer',
  resourceName: 'AnnotationLayer',

  extractRow(did, rkey, uri, record) {
    return {
      uri,
      did,
      rkey,
      expression_ref: record.expression,
      segmentation_ref: record.segmentationRef ?? null,
      kind: record.kind,
      subkind: record.subkind ?? null,
      formalism: record.formalism ?? null,
      ontology_ref: record.ontologyRef ?? null,
      persona_ref: record.personaRef ?? null,
      annotation_count: record.annotationCount ?? record.annotations.length,
      indexed_at: new Date(),
      record: JSON.stringify(record),
    };
  },

  extractNodeProps(uri, did, record) {
    return {
      uri,
      did,
      expressionRef: record.expression,
      kind: record.kind,
    };
  },

  extractEdges(uri, record) {
    const edges: { from: string; to: string; type: string }[] = [];

    // ANNOTATES edge from this layer to the expression
    if (record.expression) {
      edges.push({ from: uri, to: record.expression, type: 'ANNOTATES' });
    }

    // USES_ONTOLOGY edge from this layer to the ontology
    if (record.ontologyRef) {
      edges.push({ from: uri, to: record.ontologyRef, type: 'USES_ONTOLOGY' });
    }

    // BY_PERSONA edge from this layer to the persona
    if (record.personaRef) {
      edges.push({ from: uri, to: record.personaRef, type: 'BY_PERSONA' });
    }

    return edges;
  },
};

/**
 * Contract for annotation layer data access operations.
 */
interface IAnnotationLayersRepository {
  indexRecord(
    did: string,
    rkey: string,
    record: AnnotationLayerRecord,
  ): Promise<Result<void, DatabaseError>>;

  deleteRecord(uri: string): Promise<Result<void, DatabaseError>>;

  getByUri(uri: string): Promise<Result<AnnotationLayerRow | null, DatabaseError>>;

  listByDid(
    did: string,
    limit: number,
    cursor?: string,
  ): Promise<Result<{ rows: AnnotationLayerRow[]; cursor?: string | undefined }, DatabaseError>>;
}

/**
 * Annotation layer repository extending the generic base.
 *
 * No search method is needed at this level; annotation layers are
 * discovered through their parent expression or via faceted search
 * at a higher service level.
 */
class AnnotationLayersRepository
  extends BaseRepository<AnnotationLayerRecord, AnnotationLayerRow>
  implements IAnnotationLayersRepository
{
  constructor(deps: BaseRepositoryDeps) {
    super(deps, annotationLayerRepoConfig);
  }
}

export { AnnotationLayersRepository, annotationLayerRepoConfig, toAnnotationLayerView };
export type { IAnnotationLayersRepository };
