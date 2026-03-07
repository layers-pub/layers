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

Requests pass through a 7-layer middleware stack, matching Chive's ordering:

1. **secureHeaders** — X-Frame-Options, CSP, HSTS, X-Content-Type-Options
2. **CORS** — configurable origin allowlist
3. **serviceInjection** — injects tsyringe services into Hono context
4. **requestContext** — request ID (`req_<timestamp>_<random>`), timing, child logger with W3C Trace Context propagation (`traceparent` header)
5. **authentication** — ATProto OAuth token validation, service auth JWT verification (for indexer↔API), DID resolution with Redis cache
6. **rateLimiting** — tiered by user role, Redis sorted-set sliding window, with fail-open/fail-closed configuration
7. **errorHandler** — maps `LayersError` hierarchy to structured responses with request ID

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

Handlers are organized by feature in `src/api/handlers/xrpc/{namespace}/` and `src/api/handlers/rest/v1/`, matching Chive's directory structure. XRPC handlers return `Result<T, LayersError>` instead of throwing:

```typescript
// src/api/handlers/xrpc/expression/getExpression.ts
app.get('/xrpc/pub.layers.expression.getExpression', async (c) => {
  const params = getExpressionSchema.parse(c.req.query())
  const result = await expressionService.getByUri(params.uri)
  if (!result.ok) return c.json({ error: result.error.code, message: result.error.message }, 404)
  return c.json(result.value)
})
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

Rate limits are tiered by authentication status and enforced via a Redis sorted-set sliding window algorithm, matching Chive's 4-tier model:

| Tier | Requests/Minute | Applies To |
|---|---|---|
| Anonymous | 60 | Unauthenticated requests (keyed by IP) |
| Authenticated | 300 | Logged-in users (keyed by DID) |
| Premium | 1000 | Premium-tier users (keyed by DID) |
| Admin | 5000 | Administrators (keyed by DID) |

**Autocomplete endpoints** (`/api/v1/*/autocomplete`) have separate, stricter limits: Anonymous 10/min, Authenticated 50/min.

### Sliding Window Algorithm

```typescript
// Redis pipeline — atomic check-and-increment
async function checkRateLimit(redis: Redis, key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const windowStart = now - windowMs
  const pipe = redis.pipeline()
  pipe.zremrangebyscore(key, 0, windowStart)  // Remove expired entries
  pipe.zcard(key)                              // Count current window
  pipe.zadd(key, now, `${now}:${requestId}`)  // Add this request
  pipe.expire(key, Math.ceil(windowMs / 1000) + 1)  // Set TTL
  const results = await pipe.exec()
  const count = results[1][1] as number
  return { allowed: count < limit, remaining: Math.max(0, limit - count - 1) }
}
```

The rate limiter is configurable for **fail-open** (allow if Redis down — availability priority) or **fail-closed** (deny if Redis down — zero-trust priority).

### Response Headers

Both legacy and IETF draft rate limit headers are included in every response:

- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (legacy, GitHub/Stripe convention)
- `RateLimit-Policy`, `RateLimit-Limit`, `RateLimit-Remaining` (IETF draft)

## Error Handling

All errors use the `LayersError` hierarchy (see [Technology Stack](./technology-stack#error-handling)). The error handler middleware maps each error type to the appropriate HTTP status code and returns a consistent structure:

```json
{
  "error": "RecordNotFound",
  "message": "No expression found with URI at://did:plc:abc/pub.layers.expression.expression/xyz",
  "requestId": "req_abc123"
}
```

| Error Type | HTTP Status | XRPC Error Code |
|---|---|---|
| `NotFoundError` | 404 | `RecordNotFound` |
| `ValidationError` | 400 | `InvalidRequest` |
| `AuthenticationError` | 401 | `AuthRequired` |
| `AuthorizationError` | 403 | `Forbidden` |
| `RateLimitError` | 429 | `RateLimitExceeded` |
| `DatabaseError` | 500 | `InternalServerError` |
| `ServiceUnavailableError` | 503 | `ServiceUnavailable` |

XRPC errors use ATProto error codes. REST errors use standard HTTP status codes. Both share the same body format.

## See Also

- [Lexicon Overview](../foundations/lexicon-overview) for the complete XRPC query reference
- [Query and Discovery](./query-discovery) for query implementation patterns
- [Authentication](./authentication) for the auth middleware
