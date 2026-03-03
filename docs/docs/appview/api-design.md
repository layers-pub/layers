---
sidebar_label: API Design
sidebar_position: 5
---

# API Design

## Dual API Strategy

The appview exposes two API surfaces from a single Hono server:

- **XRPC** (`/xrpc/{nsid}`) serves ATProto-native queries defined by lexicon schemas. Every `get*` and `list*` query in the [Lexicon Overview](../foundations/lexicon-overview) maps to an XRPC endpoint.
- **REST** (`/api/v1/*`) serves web clients with search, filtering, composite queries, and OpenAPI documentation. REST endpoints complement XRPC by adding capabilities that the lexicon query model does not cover (full-text search, faceted filtering, multi-record composition).

Both surfaces share the same validation layer (Zod schemas generated from lexicon JSON), service layer, and database connections.

### Middleware Stack

Requests pass through middleware in this order:

1. **secureHeaders** (X-Frame-Options, CSP, HSTS)
2. **CORS** (configurable origin allowlist)
3. **requestContext** (request ID, timing, logger correlation)
4. **authentication** (ATProto OAuth token validation, JWT session)
5. **rateLimiting** (tiered by user role, Redis-backed sliding window)
6. **errorHandler** (structured error responses with request ID)

## XRPC Endpoints

### Query Pattern

Every record type follows the same `get` / `list` pattern defined by its lexicon:

| Query Type | Parameters | Response |
|---|---|---|
| `get<Record>` | `uri` (at-uri, required) | Single record object |
| `list<Records>` | `repo` (did, required), `limit` (1-100), `cursor` | `{ records, cursor }` |

### Complete XRPC Reference

| Namespace | Endpoints |
|---|---|
| expression | `getExpression`, `listExpressions` |
| segmentation | `getSegmentation`, `listSegmentations` |
| annotation | `getAnnotationLayer`, `listAnnotationLayers`, `getClusterSet`, `listClusterSets` |
| ontology | `getOntology`, `listOntologies`, `getTypeDef`, `listTypeDefs` |
| corpus | `getCorpus`, `listCorpora`, `getMembership`, `listMemberships` |
| resource | `getEntry`, `listEntries`, `getCollection`, `listCollections`, `getTemplate`, `listTemplates`, `getFilling`, `listFillings`, `getTemplateComposition`, `listTemplateCompositions`, `getCollectionMembership`, `listCollectionMemberships` |
| judgment | `getExperimentDef`, `listExperimentDefs`, `getJudgmentSet`, `listJudgmentSets`, `getAgreementReport`, `listAgreementReports` |
| alignment | `getAlignment`, `listAlignments` |
| graph | `getGraphNode`, `listGraphNodes`, `getGraphEdge`, `listGraphEdges`, `getGraphEdgeSet`, `listGraphEdgeSets` |
| persona | `getPersona`, `listPersonas` |
| media | `getMedia`, `listMedia` |
| eprint | `getEprint`, `listEprints`, `getDataLink`, `listDataLinks` |
| changelog | `getEntry`, `listEntries`, `listByCollection` |

### Implementation

XRPC routes are generated programmatically from lexicon JSON files using `@atproto/lex-cli` for TypeScript types and Zod for runtime validation:

```typescript
// Generated from pub.layers.expression.getExpression lexicon
app.get('/xrpc/pub.layers.expression.getExpression', async (c) => {
  const { uri } = getExpressionSchema.parse(c.req.query());
  const record = await expressionService.getByUri(uri);
  if (!record) throw new XRPCError(404, 'RecordNotFound');
  return c.json(record);
});
```

## REST API

### URL Structure

```
/api/v1/expressions
/api/v1/expressions/:uri
/api/v1/expressions/:uri/annotations
/api/v1/annotations
/api/v1/corpora
/api/v1/corpora/:uri/members
/api/v1/search
/api/v1/graph/nodes
/api/v1/graph/nodes/:uri/neighbors
```

### Search Endpoints

#### Full-Text Search

`GET /api/v1/search`

Powered by Elasticsearch. Searches across expressions, annotations, ontologies, graph nodes, and eprints.

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Full-text query |
| `type` | string | Record type filter (expression, annotation, ontology, etc.) |
| `language` | string | ISO 639 language code |
| `limit` | integer | Results per page (1-100, default 20) |
| `cursor` | string | Pagination cursor |

#### Faceted Annotation Search

`GET /api/v1/annotations`

Three-dimensional faceted search over the discriminated annotation model:

| Parameter | Type | Description |
|---|---|---|
| `kind` | string | Annotation kind (token-tag, span, relation, tree, etc.) |
| `subkind` | string | Annotation subkind (pos, ner, lemma, sentiment, etc.) |
| `formalism` | string | Formalism (universal-dependencies, penn-treebank, framenet, etc.) |
| `expression` | at-uri | Filter to annotations on a specific expression |
| `corpus` | at-uri | Filter to annotations within a specific corpus |
| `persona` | at-uri | Filter to annotations by a specific persona |
| `language` | string | Language filter |
| `label` | string | Filter by annotation label value |
| `confidence_min` | integer | Minimum confidence threshold (0-1000) |

#### Cross-Reference Search

`GET /api/v1/references`

Find all records that reference a given target:

| Parameter | Type | Description |
|---|---|---|
| `target` | string | AT-URI or URL being referenced |
| `ref_type` | string | Reference type filter (sourceRef, sourceUrl, eprintRef, etc.) |
| `limit` | integer | Results per page |
| `cursor` | string | Pagination cursor |

### Composite Endpoints

These endpoints join across record types to reduce client round-trips:

| Endpoint | Returns |
|---|---|
| `GET /api/v1/expressions/:uri/full` | Expression with segmentations, annotation layers, and metadata |
| `GET /api/v1/corpora/:uri/full` | Corpus with member expressions and annotation statistics |
| `GET /api/v1/experiments/:uri/full` | Experiment definition with judgment sets and agreement reports |
| `GET /api/v1/graph/nodes/:uri/neighborhood` | Graph node with adjacent edges and connected nodes (configurable depth) |

### Pagination

All list and search endpoints use **cursor-based pagination**. The cursor is an opaque string encoding the sort position of the last returned item. This avoids the offset drift problems of page-number pagination.

```json
{
  "records": [ ... ],
  "cursor": "eyJ0IjoiMjAyNi0wMS0xNVQxMDowMDowMFoiLCJpIjoiM2sifQ"
}
```

## OpenAPI Documentation

The REST API generates an OpenAPI 3.1 specification from Zod schemas via `@hono/zod-openapi`:

- `GET /openapi.json` returns the specification
- `GET /docs` serves an interactive SwaggerUI

XRPC endpoints are documented separately through lexicon JSON files, which serve as their own schema documentation.

## Rate Limiting

Rate limits are tiered by authentication status and enforced via Redis sliding window counters:

| Tier | Requests/Minute | Applies To |
|---|---|---|
| Anonymous | 60 | Unauthenticated requests |
| Authenticated | 300 | Logged-in users |
| Service | 1000 | Machine-to-machine (service auth) |

Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included in every response.

## Error Handling

All errors follow a consistent structure:

```json
{
  "error": "RecordNotFound",
  "message": "No expression found with URI at://did:plc:abc/pub.layers.expression.expression/xyz",
  "requestId": "req_abc123"
}
```

XRPC errors use ATProto error codes. REST errors use standard HTTP status codes with the same body format.

## See Also

- [Lexicon Overview](../foundations/lexicon-overview) for the complete XRPC query reference
- [Query and Discovery](./query-discovery) for query implementation patterns
- [Authentication](./authentication) for the auth middleware
