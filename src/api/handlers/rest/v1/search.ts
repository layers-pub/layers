/**
 * Cross-type full-text search REST endpoint.
 *
 * Queries Elasticsearch across all 26 record type indices and returns
 * unified results with highlights, scores, and cursor-based pagination.
 *
 * @module
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Context, Hono } from 'hono';

/**
 * Maximum results per request.
 */
const MAX_LIMIT = 100;

/**
 * Default results per request.
 */
const DEFAULT_LIMIT = 20;

/**
 * Mapping from ES index name to ATProto collection NSID.
 */
const INDEX_TO_COLLECTION: Record<string, string> = {
  expressions: 'pub.layers.expression.expression',
  ontologies: 'pub.layers.ontology.ontology',
  type_defs: 'pub.layers.ontology.typeDef',
  corpora: 'pub.layers.corpus.corpus',
  corpus_memberships: 'pub.layers.corpus.membership',
  segmentations: 'pub.layers.segmentation.segmentation',
  annotation_layers: 'pub.layers.annotation.annotationLayer',
  cluster_sets: 'pub.layers.annotation.clusterSet',
  resource_collections: 'pub.layers.resource.collection',
  resource_entries: 'pub.layers.resource.entry',
  templates: 'pub.layers.resource.template',
  fillings: 'pub.layers.resource.filling',
  collection_memberships: 'pub.layers.resource.collectionMembership',
  template_compositions: 'pub.layers.resource.templateComposition',
  judgment_sets: 'pub.layers.judgment.judgmentSet',
  experiment_defs: 'pub.layers.judgment.experimentDef',
  agreement_reports: 'pub.layers.judgment.agreementReport',
  alignments: 'pub.layers.alignment.alignment',
  graph_nodes: 'pub.layers.graph.graphNode',
  graph_edges: 'pub.layers.graph.graphEdge',
  graph_edge_sets: 'pub.layers.graph.graphEdgeSet',
  personas: 'pub.layers.persona.persona',
  media_records: 'pub.layers.media.media',
  eprints: 'pub.layers.eprint.eprint',
  data_links: 'pub.layers.eprint.dataLink',
  changelogs: 'pub.layers.changelog.entry',
};

/**
 * Reverse mapping from collection NSID to ES index name.
 */
const COLLECTION_TO_INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(INDEX_TO_COLLECTION).map(([idx, col]) => [col, idx]),
);

/**
 * All ES index names for cross-type search.
 */
const ALL_INDICES = Object.keys(INDEX_TO_COLLECTION);

/**
 * Fields to search with boosting weights.
 */
const SEARCH_FIELDS = [
  'text^5',
  'name^3',
  'form^3',
  'label^2',
  'description^1.5',
  'lemma^2',
  'language^1',
  'did^1',
];

/**
 * Parses and clamps a limit parameter.
 */
function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

/**
 * Decodes a base64url cursor into search_after values.
 */
function decodeCursor(cursor: string | undefined): unknown[] | undefined {
  if (!cursor) return undefined;
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Encodes search_after values into a base64url cursor.
 */
function encodeCursor(sort: unknown[]): string {
  return Buffer.from(JSON.stringify(sort)).toString('base64url');
}

/**
 * Dependencies for the search route handler.
 */
interface SearchDeps {
  readonly esClient: EsClient;
}

/**
 * Registers the cross-type search REST route on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param deps - Elasticsearch client
 */
function searchRoutes(app: Hono, deps: SearchDeps): void {
  /**
   * GET /api/v1/search
   *
   * Cross-type full-text search across all record type indices.
   *
   * Query params:
   *   q (required) - search query string
   *   type (optional) - collection NSID to filter by
   *   language (optional) - language code to filter by
   *   limit (optional) - max results (default 20, max 100)
   *   cursor (optional) - base64url-encoded search_after cursor
   */
  app.get('/api/v1/search', async (c: Context) => {
    const q = c.req.query('q');

    if (!q || q.trim().length === 0) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: 'The "q" query parameter is required' },
        400,
      );
    }

    const typeFilter = c.req.query('type');
    const languageFilter = c.req.query('language');
    const limit = parseLimit(c.req.query('limit'));
    const searchAfter = decodeCursor(c.req.query('cursor'));

    // Determine which indices to search
    let indices: string[];
    if (typeFilter) {
      const idx = COLLECTION_TO_INDEX[typeFilter];
      if (!idx) {
        return c.json(
          { error: 'VALIDATION_ERROR', message: `Unknown collection type: ${typeFilter}` },
          400,
        );
      }
      indices = [idx];
    } else {
      indices = ALL_INDICES;
    }

    // Build ES query
    const must: unknown[] = [
      {
        multi_match: {
          query: q.trim(),
          fields: SEARCH_FIELDS,
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    if (languageFilter) {
      must.push({ term: { language: languageFilter } });
    }

    const esQuery: Record<string, unknown> = {
      index: indices.join(','),
      ignore_unavailable: true,
      size: limit,
      body: {
        query: { bool: { must } },
        sort: [{ _score: 'desc' }, { uri: 'asc' }],
        highlight: {
          fields: {
            text: { fragment_size: 200, number_of_fragments: 1 },
            name: { fragment_size: 200, number_of_fragments: 1 },
            form: { fragment_size: 200, number_of_fragments: 1 },
            description: { fragment_size: 200, number_of_fragments: 1 },
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        },
        ...(searchAfter ? { search_after: searchAfter } : {}),
      },
    };

    try {
      const response = await deps.esClient.search(esQuery);
      const hits = (response.hits?.hits ?? []) as Array<{
        _index: string;
        _source?: Record<string, unknown>;
        _score?: number;
        sort?: unknown[];
        highlight?: Record<string, string[]>;
      }>;

      const total =
        typeof response.hits?.total === 'number'
          ? response.hits.total
          : ((response.hits?.total as { value: number })?.value ?? 0);

      const results = hits.map((hit) => {
        const source = hit._source ?? {};
        const collection = INDEX_TO_COLLECTION[hit._index] ?? hit._index;
        const highlights: Record<string, string[]> = hit.highlight ?? {};

        return {
          uri: (source.uri as string) ?? '',
          collection,
          did: (source.did as string) ?? '',
          score: hit._score ?? 0,
          highlights,
          record: source,
        };
      });

      // Build cursor from the last hit's sort values
      const lastHit = hits[hits.length - 1];
      const nextCursor =
        hits.length === limit && lastHit?.sort ? encodeCursor(lastHit.sort) : undefined;

      return c.json({ results, total, cursor: nextCursor ?? null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search query failed';
      return c.json({ error: 'SEARCH_ERROR', message }, 500);
    }
  });
}

export { searchRoutes, INDEX_TO_COLLECTION, COLLECTION_TO_INDEX };
export type { SearchDeps };
