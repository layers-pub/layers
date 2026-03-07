---
sidebar_label: Query and Discovery
sidebar_position: 7
---

# Query and Discovery Patterns

The appview answers two categories of questions: **retrieval** (get a specific record by its AT-URI) and **discovery** (find records matching some criteria). Retrieval hits PostgreSQL directly. Discovery queries fan out across PostgreSQL, Elasticsearch, and Neo4j depending on the query shape.

## Service Layer

Query logic is encapsulated in service classes in `src/services/`, matching Chive's pattern:

| Service | File | Responsibility |
|---------|------|----------------|
| `SearchService` | `src/services/search/search-service.ts` | Full-text search, faceted filtering via Elasticsearch |
| `RankingService` | `src/services/search/ranking-service.ts` | Result scoring by confidence, recency, persona reputation |
| `AutocompleteService` | `src/services/search/autocomplete-service.ts` | Expression text, ontology names, label value completion |
| `QueryCache` | `src/services/search/query-cache.ts` | Redis-backed TTL cache for ES query results |
| `DiscoveryService` | `src/services/discovery/discovery-service.ts` | Recommendations: "similar annotations", "related corpora" |

All service methods return `Result<T, LayersError>` and are injected via tsyringe.

## Discovery Use Cases

| Use Case | Primary Backend | Query Shape |
|---|---|---|
| Find all annotations on a given expression | PG | `WHERE expression_ref = $1` on `annotation_layers` |
| Find all expressions in a given corpus | PG + Neo4j | `corpus_memberships` join or Neo4j `MEMBER_OF` traversal |
| Find all annotation layers using a given ontology | PG | `WHERE ontology_ref = $1` on `annotation_layers` |
| Find all entities grounded to a Wikidata QID | Neo4j | `KNOWLEDGE_REF` edge traversal from a knowledge node |
| Find all annotations in Universal Dependencies formalism | ES | Faceted filter on `formalism = "universal-dependencies"` |
| Find all experiments measuring acceptability | ES | Faceted filter on `measureType = "acceptability"` |
| Find all corpora in a given language | ES | Keyword filter on `language` |
| Find all data linked to a given eprint | PG + Neo4j | `cross_references WHERE target_uri = $eprint` or `LINKS_EPRINT` traversal |
| Find all annotations by a specific persona | PG | `WHERE persona_ref = $1` on `annotation_layers` |
| Find the graph neighborhood of a node | Neo4j | Cypher variable-length path query |
| Find all changes to a given record | PG + ES | `changelogs WHERE subject_uri = $1` or ES filter on `subject` |
| Find recent changes across a collection type | ES | Faceted filter on `subjectCollection`, sorted by `createdAt` |

## Query Implementation Patterns

### Single-Record Retrieval

Every `get*` XRPC endpoint resolves to a PostgreSQL primary key lookup:

```sql
SELECT record FROM expressions WHERE uri = $1;
```

Expected latency: < 5ms for indexed lookups.

### Paginated Collection Listing

Every `list*` XRPC endpoint paginates with a cursor over a user's records:

```sql
SELECT uri, record
FROM expressions
WHERE did = $1
  AND uri > $2  -- cursor
ORDER BY uri ASC
LIMIT $3;
```

### Full-Text Search

Elasticsearch powers the `/api/v1/search` endpoint:

```json
{
  "query": {
    "bool": {
      "must": [
        { "multi_match": {
            "query": "syntactic ambiguity",
            "fields": ["text^3", "text.stemmed"]
        }}
      ],
      "filter": [
        { "term": { "lang": "en" } }
      ]
    }
  }
}
```

The `text` field uses a custom `layers_text` analyzer with ICU tokenization and Unicode normalization. The `text.stemmed` sub-field applies language-specific stemming.

### Faceted Annotation Search

The three-dimensional annotation search (kind, subkind, formalism) uses ES term aggregations:

```json
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "kind": "span" } },
        { "term": { "subkind": "ner" } },
        { "term": { "formalism": "ontonotes" } }
      ]
    }
  },
  "aggs": {
    "by_label": {
      "terms": { "field": "annotations.label", "size": 50 }
    }
  }
}
```

This returns matching annotation layers and a label distribution histogram in a single request.

### Graph Traversal

Neo4j handles multi-hop queries that would require expensive recursive CTEs in PostgreSQL:

```cypher
// Find all annotations transitively connected to a Wikidata entity
MATCH (kb:KnowledgeNode {externalId: "Q76"})
      <-[:KNOWLEDGE_REF]-(ann:Annotation)
      -[:PART_OF]->(layer:AnnotationLayer)
      -[:ANNOTATES]->(expr:Expression)
RETURN layer.uri, expr.uri, ann.label
LIMIT 100
```

## Cross-Reference Traversal

### Forward References ("What does this record point to?")

```sql
SELECT to_uri, ref_type
FROM cross_references
WHERE from_uri = $1;
```

### Reverse References ("What points to this record?")

```sql
SELECT from_uri, ref_type
FROM cross_references
WHERE to_uri = $1;
```

### Transitive Closure ("All descendants of this expression")

Expression hierarchy traversal uses Neo4j's variable-length path syntax:

```cypher
MATCH (root:Expression {uri: $1})-[:PARENT_OF*1..]->(desc:Expression)
RETURN desc.uri, length(path) AS depth
ORDER BY depth
```

This is faster than PostgreSQL recursive CTEs for deep hierarchies (documents with hundreds of nested paragraphs, sentences, and words).

## Annotation-Specific Queries

### By Kind/Subkind/Formalism

All three fields are keyword-indexed in Elasticsearch, enabling combinatorial filtering:

| Query | ES Filter |
|---|---|
| All POS layers | `kind = "token-tag"` AND `subkind = "pos"` |
| All NER layers in OntoNotes | `subkind = "ner"` AND `formalism = "ontonotes"` |
| All dependency parses | `kind = "relation"` AND `subkind = "dependency"` |
| All UD layers | `formalism = "universal-dependencies"` |

### By Label/Value

Individual annotation labels within layers are indexed as nested objects in ES:

```json
{
  "query": {
    "nested": {
      "path": "annotations",
      "query": {
        "term": { "annotations.label": "PERSON" }
      }
    }
  }
}
```

### By Confidence Threshold

```json
{
  "query": {
    "nested": {
      "path": "annotations",
      "query": {
        "range": { "annotations.confidence": { "gte": 800 } }
      }
    }
  }
}
```

### By Anchor Type

```json
{
  "query": {
    "nested": {
      "path": "annotations",
      "query": {
        "term": { "annotations.anchor_type": "temporalSpan" }
      }
    }
  }
}
```

This finds annotations anchored to temporal regions (audio/video), as opposed to text spans or token references.

## Graph Queries

### Neighborhood Expansion

```cypher
MATCH (n {uri: $1})-[r]-(neighbor)
RETURN type(r) AS edgeType, r.edgeType AS semanticType,
       neighbor.uri AS neighborUri, labels(neighbor) AS nodeLabels
LIMIT 50
```

### Typed Traversal

Follow only edges of a specific type (e.g., only `denotes` edges):

```cypher
MATCH (n {uri: $1})-[r:GRAPH_EDGE {edgeType: "denotes"}]->(target)
RETURN target.uri, target.name
```

### Shortest Path

```cypher
MATCH path = shortestPath(
  (a {uri: $1})-[*..10]-(b {uri: $2})
)
RETURN [n IN nodes(path) | n.uri] AS nodeUris,
       [r IN relationships(path) | type(r)] AS edgeTypes
```

## Aggregation Queries

### Label Distribution per Corpus

```sql
SELECT a.label, COUNT(*) AS count
FROM annotations a
JOIN annotation_layers al ON a.layer_uri = al.uri
JOIN cross_references cr ON cr.from_uri = al.expression_ref
JOIN corpus_memberships cm ON cm.expression_ref = cr.to_uri
WHERE cm.corpus_ref = $1
GROUP BY a.label
ORDER BY count DESC;
```

### Annotation Coverage per Expression

```sql
SELECT al.kind, al.subkind, COUNT(*) AS layer_count
FROM annotation_layers al
WHERE al.expression_ref = $1
GROUP BY al.kind, al.subkind
ORDER BY layer_count DESC;
```

## Caching Strategy

Redis caches frequently accessed data to reduce database load:

| Cache Key Pattern | TTL | Content |
|---|---|---|
| `record:{uri}` | 5 min | Full record JSONB |
| `refs:{uri}` | 5 min | Cross-reference list for a record |
| `search:{hash}` | 1 min | ES search result page |
| `corpus_stats:{uri}` | 15 min | Materialized corpus statistics |

Cache invalidation: when a record is updated or deleted via the firehose, its cache key and related cache keys are evicted immediately.

## Future Considerations

- **Semantic search**: ES `dense_vector` fields could enable vector-based semantic search over annotation label embeddings, complementing keyword-based faceting with similarity-based retrieval.
- **Learning-to-rank**: A `RelevanceLogger` (analogous to Chive's) could collect click-through data on search results to train a learning-to-rank model for improved result ordering.

## See Also

- [API Design](./api-design) for endpoint definitions and request parameters
- [Indexing Strategy](./indexing-strategy) for how data is prepared for these queries
- [Database Design](./database-design) for schema and mapping details
