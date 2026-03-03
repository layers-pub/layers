---
sidebar_label: Technology Stack
sidebar_position: 2
---

# Technology Stack

This page documents every technology in the Layers appview stack, including version pins, roles, and selection rationale. The stack follows [Chive](https://chive.pub)'s production architecture closely, extending it where Layers' 26 record types, discriminated annotation model, and dense cross-referencing require additional infrastructure.

## Runtime and Language

| Technology | Version | Role |
|---|---|---|
| Node.js | 22+ (LTS) | Application runtime |
| TypeScript | 5.9+ | Primary language |
| pnpm | 10+ | Package manager and monorepo workspace management |

**Node.js 22+** is the current LTS line. It provides native ESM support without transpilation flags, a stable `fetch` implementation, and performance improvements in the V8 engine (Maglev compiler, resizable ArrayBuffers) that benefit high-throughput firehose processing.

**TypeScript 5.9+** is configured in strict mode with `experimentalDecorators` enabled for dependency injection via tsyringe. Strict mode catches null/undefined errors at compile time across all 26 record type handlers. Decorator support enables constructor-based DI without manual wiring:

```typescript
@injectable()
export class ExpressionIndexer {
  constructor(
    @inject('PostgresClient') private pg: PostgresClient,
    @inject('ElasticClient') private es: ElasticClient,
    @inject('Neo4jClient') private neo4j: Neo4jClient,
  ) {}
}
```

**pnpm 10+** manages the monorepo workspace. Its content-addressable store deduplicates shared dependencies across packages (api, workers, shared, cli), and `pnpm-workspace.yaml` defines package boundaries. Strict dependency resolution prevents phantom dependencies that could cause runtime failures in production.

## API Framework

| Technology | Version | Role |
|---|---|---|
| Hono | 4+ | HTTP framework |
| Zod | 4+ | Runtime validation and TypeScript type inference |
| @hono/zod-openapi | latest | OpenAPI 3.1 generation from Zod schemas |

**Hono 4+** serves as the HTTP framework for both XRPC and REST endpoints. It was selected for its benchmark performance (consistently fastest in Node.js HTTP framework comparisons), minimal footprint, and native middleware composition. Middleware chains handle authentication, rate limiting, request logging, and error normalization:

```typescript
const app = new Hono()
  .use('*', rateLimiter())
  .use('*', requestLogger())
  .use('/xrpc/*', xrpcAuth())
  .use('/api/*', bearerAuth())
```

The appview exposes a **dual XRPC + REST API surface**:

- **XRPC endpoints** implement the ATProto-native query interface. Clients using `@atproto/api` interact with these directly. All 38+ query endpoints defined in the [API Design](./api-design) page are served here.
- **REST endpoints** provide search, composite queries, and convenience routes for web clients and third-party integrations that do not use the ATProto SDK.

**Zod 4+** provides runtime validation with automatic TypeScript type inference. Every request body, query parameter, and response payload is defined as a Zod schema. Invalid requests are rejected before reaching handler logic:

```typescript
const SearchParams = z.object({
  q: z.string().min(1).max(500),
  kind: z.enum(['token', 'span', 'relation', 'sentence']).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
})

type SearchParams = z.infer<typeof SearchParams>
```

**@hono/zod-openapi** generates an OpenAPI 3.1 specification directly from Zod schemas registered on Hono routes. The generated spec powers interactive API documentation and client SDK generation without maintaining a separate schema file.

## ATProto Integration

| Technology | Version | Role |
|---|---|---|
| @atproto/api | latest | Protocol SDK for ATProto operations |
| @atproto/identity | latest | DID resolution (did:plc, did:web) |
| @atproto/lexicon | latest | Schema parsing and validation for `pub.layers.*` lexicons |
| @atproto/xrpc-server | latest | XRPC server implementation |
| @atproto/oauth-client-node | latest | OAuth 2.0 + PKCE authentication flow |

These packages are maintained by Bluesky PBC and provide the canonical implementation of ATProto primitives. The appview uses them as follows:

- **@atproto/api** provides the `Agent` class for making authenticated requests to PDSes and relays, the `AtUri` class for parsing and constructing AT-URIs, and typed interfaces for standard ATProto operations.
- **@atproto/identity** resolves DIDs to DID documents, extracting PDS endpoints and signing keys. The appview resolves DIDs during firehose ingestion (to validate record authorship) and during API requests (to link records to user identities).
- **@atproto/lexicon** parses the 26 `pub.layers.*` lexicon JSON files and validates incoming records against their schemas during firehose ingestion. Records that fail validation are routed to the dead letter queue. See [Firehose Ingestion](./firehose-ingestion) for the validation pipeline.
- **@atproto/xrpc-server** provides the XRPC route registration, method handler signature, and error response formatting that the ATProto ecosystem expects.
- **@atproto/oauth-client-node** implements the OAuth 2.0 + PKCE flow for user authentication. See [Authentication](./authentication) for the full auth flow.

## Databases

The appview uses four databases, each serving a distinct query pattern. PostgreSQL is the source of truth for all record types. Elasticsearch, Neo4j, and Redis are derived indexes that can be rebuilt from PostgreSQL or the firehose at any time. See [Database Design](./database-design) for schemas, mappings, and data models.

### PostgreSQL 16+

| Attribute | Detail |
|---|---|
| Role | Source of truth for all 26 record types |
| Key features | AT-URI foreign keys, JSONB for flexible fields, GIN indexes, partial indexes |

PostgreSQL stores every `pub.layers.*` record as a normalized row with AT-URI foreign keys for cross-references. JSONB columns store flexible fields (annotation feature maps, experiment parameters, knowledge references) that vary by record type without requiring schema migrations. GIN indexes on JSONB columns enable efficient containment queries (`@>` operator) for filtering by nested properties.

The schema uses AT-URIs as the primary foreign key type, following Chive's pattern:

```sql
CREATE TABLE expression (
  uri         TEXT PRIMARY KEY,  -- at://did:plc:xxx/pub.layers.expression.expression/rkey
  did         TEXT NOT NULL,
  rkey        TEXT NOT NULL,
  text        TEXT,
  granularity TEXT NOT NULL,
  parent_uri  TEXT REFERENCES expression(uri),
  eprint_ref  TEXT,
  metadata    JSONB,
  indexed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (did, rkey)
);

CREATE INDEX idx_expression_granularity ON expression(granularity);
CREATE INDEX idx_expression_parent ON expression(parent_uri) WHERE parent_uri IS NOT NULL;
CREATE INDEX idx_expression_metadata ON expression USING GIN (metadata);
```

### Elasticsearch 8+

| Attribute | Detail |
|---|---|
| Role | Full-text search, faceted queries, completion suggesters |
| Key features | Custom linguistic analyzers, nested objects, faceted aggregations |

Elasticsearch indexes a subset of record types that require full-text search or faceted filtering (see the coverage matrix on the [Overview](./) page). Custom analyzers handle linguistic data: language-specific stemmers, ICU tokenization for CJK text, phonetic analysis for lexical resources, and n-gram tokenization for partial matching.

Annotation layers are indexed as nested objects in Elasticsearch, enabling faceted search across the three-dimensional `kind`/`subkind`/`formalism` space:

```json
{
  "mappings": {
    "properties": {
      "annotations": {
        "type": "nested",
        "properties": {
          "kind": { "type": "keyword" },
          "subkind": { "type": "keyword" },
          "formalism": { "type": "keyword" },
          "label": { "type": "text", "fields": { "raw": { "type": "keyword" } } }
        }
      }
    }
  }
}
```

### Neo4j 5+

| Attribute | Detail |
|---|---|
| Role | Knowledge graph, cross-reference traversal, path queries |
| Key features | Native graph storage, Cypher query language, APOC library |

Neo4j stores the knowledge graph built from `graph.graphNode` and `graph.graphEdge` records, corpus membership edges, type hierarchy edges, alignment links, and cross-reference relationships. It answers queries that require multi-hop traversal: "find all annotations that reference an entity grounded in this Wikidata entry" or "find all corpora that contain expressions linked to this eprint."

Neo4j was chosen over PostgreSQL recursive CTEs because graph traversal performance degrades significantly with depth in relational databases (each hop adds a self-join), while Neo4j's index-free adjacency provides constant-time per-hop traversal regardless of graph size.

```cypher
// Find all annotations linked to expressions in a corpus
MATCH (c:Corpus {uri: $corpusUri})-[:CONTAINS]->(e:Expression)
      <-[:ANNOTATES]-(a:AnnotationLayer)
RETURN a.uri, a.kind, a.subkind
ORDER BY a.indexed_at DESC
LIMIT 100
```

### Redis 7+

| Attribute | Detail |
|---|---|
| Role | Session cache, rate limiting, BullMQ job queue backend, pub/sub |
| Key features | In-memory performance, TTL-based expiry, Streams, pub/sub |

Redis serves four distinct functions:

1. **Session cache**: Stores authenticated user sessions with TTL-based expiry, avoiding per-request database lookups.
2. **Rate limiting**: Implements sliding-window rate limiting per DID using `INCR` and `PEXPIRE`.
3. **Job queue backend**: BullMQ uses Redis Streams for persistent, ordered job queues with at-least-once delivery.
4. **Pub/sub**: Real-time event notifications for connected clients (e.g., "new annotation on this expression").

## Job Queue

| Technology | Version | Role |
|---|---|---|
| BullMQ | 5+ | Job queue framework on Redis |

**BullMQ 5+** manages all asynchronous processing: firehose event ingestion, Elasticsearch/Neo4j indexing, format import pipelines, enrichment workers, and maintenance tasks. It uses Redis Streams as the backing store.

The appview organizes queues in a **per-namespace topology**. Each `pub.layers.*` namespace gets its own queue with independent concurrency, priority, and retry settings. This prevents a slow namespace (e.g., large annotation layer imports) from blocking fast namespaces (e.g., persona records):

```typescript
const queues = {
  'expression':  new Queue('expression',  { connection: redis }),
  'annotation':  new Queue('annotation',  { connection: redis }),
  'corpus':      new Queue('corpus',      { connection: redis }),
  'graph':       new Queue('graph',       { connection: redis }),
  'enrichment':  new Queue('enrichment',  { connection: redis }),
  'maintenance': new Queue('maintenance', { connection: redis }),
}
```

Key features:

- **Priority queues**: Firehose events are processed at higher priority than enrichment or maintenance jobs.
- **Dead letter queue**: Jobs that exceed the retry limit (default: 5 retries with exponential backoff) are moved to a dead letter queue for manual inspection. See [Firehose Ingestion](./firehose-ingestion) for DLQ handling.
- **Backpressure**: Workers pause consumption when downstream databases are unhealthy (detected via health checks), preventing queue buildup during outages.
- **Dashboard**: BullMQ's Bull Board provides a web UI for inspecting queue state, retrying failed jobs, and monitoring throughput.

See [Background Jobs](./background-jobs) for the full worker architecture.

## Authentication and Authorization

| Technology | Version | Role |
|---|---|---|
| @atproto/oauth-client-node | latest | ATProto OAuth 2.0 + PKCE flow |
| jose | 6+ | JWT signing and verification |
| Casbin | 5+ | RBAC policy engine |
| @simplewebauthn/server | latest | WebAuthn/FIDO2 passkey support |
| @otplib | latest | TOTP-based MFA |

**ATProto OAuth 2.0 + PKCE** is the primary authentication mechanism. Users authenticate with their ATProto identity (DID) through the standard OAuth flow. The `@atproto/oauth-client-node` package handles authorization URL generation, callback verification, token exchange, and token refresh.

**jose 6+** signs and verifies JWT session tokens issued after OAuth completion. JWTs encode the user's DID, session ID, and permission claims. The library was chosen for its standards compliance (RFC 7515-7519), zero-dependency footprint, and Web Crypto API compatibility.

**Casbin 5+** enforces role-based access control for annotation workflows. Layers requires more granular authorization than Chive's publish/read model: annotators, adjudicators, and corpus managers have different permissions over annotation layers, corpora, and experiment data. Casbin evaluates policies defined in a PERM model:

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

**@simplewebauthn/server** provides WebAuthn/FIDO2 support for passkey-based authentication as a second factor or passwordless alternative. **@otplib** provides TOTP-based MFA for users who prefer authenticator apps. See [Authentication](./authentication) for the full auth architecture.

## Observability

| Technology | Version | Role |
|---|---|---|
| Pino | 10+ | Structured JSON logging |
| OpenTelemetry | 0.208+ | Distributed tracing with OTLP exporter |
| prom-client | 15+ | Prometheus metrics |
| Grafana | latest | Dashboards and alerting |

**Pino 10+** produces structured JSON logs with automatic redaction of sensitive fields (tokens, passwords, PII). It is the fastest Node.js logging library by benchmark, which matters for high-throughput firehose processing where logging overhead is measurable. Log levels are configured per namespace:

```typescript
const logger = pino({
  level: 'info',
  redact: ['req.headers.authorization', 'user.email'],
  transport: {
    target: 'pino-pretty',
    options: { colorize: process.env.NODE_ENV !== 'production' },
  },
})
```

**OpenTelemetry 0.208+** provides distributed tracing across the appview's async processing pipeline. Traces follow a firehose event from ingestion through queue processing, database writes, and index updates. The OTLP exporter sends traces to a collector (Jaeger or Grafana Tempo) for visualization and debugging.

**prom-client 15+** exposes Prometheus-format metrics at `/metrics`. Key metrics include:

- `firehose_events_total` (counter, by NSID)
- `queue_depth` (gauge, by queue name)
- `db_query_duration_seconds` (histogram, by database and operation)
- `http_request_duration_seconds` (histogram, by route and status)

**Grafana** provides dashboards for all metrics and traces, with alerting rules for queue depth, error rates, and database latency. See [Observability](./observability) for dashboard definitions and alerting policies.

## Infrastructure

| Technology | Version | Role |
|---|---|---|
| Docker | latest | Container builds (multi-stage, Alpine base) |
| Kubernetes | 1.28+ | Container orchestration |
| Kustomize | latest | Environment-specific configuration overlays |
| External Secrets Operator | latest | Production secrets management |
| cert-manager | latest | TLS certificate automation |

**Docker** builds use multi-stage Dockerfiles with Alpine base images to minimize image size. The build stage compiles TypeScript with `tsc`, prunes dev dependencies, and copies only production artifacts to the runtime stage:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

**Kubernetes** manages deployment with Horizontal Pod Autoscaler (HPA) for scaling API and worker pods based on CPU/memory utilization and custom metrics (queue depth), Pod Disruption Budgets (PDB) for safe rollouts, and liveness/readiness probes that verify database connectivity.

**Kustomize** provides base manifests with overlays for dev, staging, and production environments. Each overlay adjusts resource limits, replica counts, database connection strings, and feature flags without duplicating manifests.

**External Secrets Operator** syncs secrets from a cloud provider's secret manager (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault) into Kubernetes secrets. Database credentials, API keys, and signing keys never appear in manifests or environment variables.

**cert-manager** automates TLS certificate issuance and renewal via Let's Encrypt, eliminating manual certificate management.

See [Deployment](./deployment) for the full deployment architecture, CI/CD pipeline, and backup strategy.

## Testing

| Technology | Version | Role |
|---|---|---|
| Vitest | 4+ | Unit, integration, compliance, and pre-deployment tests |
| Testcontainers | latest | Ephemeral database containers for integration tests |
| Playwright | 1.57+ | End-to-end browser tests |
| k6 | latest | Load and performance testing |

**Vitest 4+** is the test runner for all non-E2E tests. It provides native ESM support, TypeScript execution without a separate compilation step, and a Jest-compatible API. Tests are organized into four tiers:

1. **Unit tests**: Test individual record type handlers, validation logic, and utility functions in isolation with mocked dependencies.
2. **Integration tests**: Test complete ingestion and query pipelines against real databases using Testcontainers.
3. **Compliance tests**: Verify that every `pub.layers.*` lexicon is correctly parsed, validated, and indexed. These tests generate sample records from lexicon schemas and verify round-trip correctness.
4. **Pre-deployment tests**: Run against a staging environment after deployment to verify API health, database connectivity, and firehose subscription.

**Testcontainers** spins up ephemeral PostgreSQL, Elasticsearch, Neo4j, and Redis containers for integration tests. Each test suite gets a fresh set of containers, ensuring test isolation:

```typescript
const pg = await new PostgreSqlContainer('postgres:16-alpine').start()
const es = await new ElasticsearchContainer('elasticsearch:8.17.0').start()
const neo4j = await new Neo4jContainer('neo4j:5-community').start()
const redis = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start()
```

**Playwright 1.57+** tests the Bull Board dashboard, OpenAPI documentation UI, and any web-facing admin interfaces end-to-end.

**k6** runs load tests against staging to validate throughput targets: firehose ingestion rate, query latency percentiles, and concurrent connection limits.

See [Testing Strategy](./testing-strategy) for the full testing architecture.

## Plugins and Extensibility

| Technology | Version | Role |
|---|---|---|
| isolated-vm | 6+ | V8 isolate sandbox per plugin |

**isolated-vm 6+** provides a secure execution environment for third-party plugins. Each plugin runs in its own V8 isolate with no access to the host Node.js process, filesystem, or network. The appview injects a controlled API surface into each isolate.

The plugin system supports three extension points:

1. **Format importers**: Convert external annotation formats (CoNLL, BRAT, ELAN, TEI, etc.) into `pub.layers.*` records for ingestion.
2. **Harvesters**: Fetch records from external sources (institutional repositories, data archives) and submit them for indexing.
3. **Enrichment processors**: Augment indexed records with derived data (e.g., automatic language detection, entity linking).

**Permission model**: Plugins declare required capabilities in a manifest. The appview grants only declared capabilities:

```json
{
  "name": "conll-importer",
  "version": "1.0.0",
  "capabilities": ["read:expression", "write:annotation", "write:segmentation"],
  "limits": {
    "maxMemoryMB": 128,
    "maxCpuMs": 5000,
    "maxWallTimeMs": 30000
  }
}
```

**Resource governor**: The isolate enforces CPU time limits (via V8's `--max-old-space-size` and wall-time interrupts), memory limits (per-isolate heap cap), and execution time limits (wall-clock timeout). Plugins that exceed limits are terminated and their jobs are retried or routed to the dead letter queue.

isolated-vm was chosen over vm2 (deprecated due to security vulnerabilities) and Deno subprocesses (heavier resource footprint, more complex IPC).

See [Plugin System](./plugin-system) for the full plugin architecture.

## Build and Development

| Technology | Version | Role |
|---|---|---|
| Turbo | 2+ | Monorepo build orchestration |
| @atproto/lex-cli | latest | TypeScript codegen from lexicon JSON |
| ESLint | 9+ | Linting (flat config) |
| Prettier | 3+ | Code formatting |
| Husky | 9+ | Git hook management |

**Turbo 2+** orchestrates builds across the monorepo. It understands package dependency graphs and caches build outputs, so incremental builds after a change to a single package only rebuild affected downstream packages. CI pipelines use `turbo run build test lint` with remote caching for fast feedback.

**@atproto/lex-cli** generates TypeScript types and validation functions from the 26 `pub.layers.*` lexicon JSON files. Generated types are used throughout the codebase for type-safe record handling:

```bash
lex-cli gen-ts ./lexicons --out ./packages/shared/src/lexicon-types
```

**ESLint 9+** uses the flat config format (`eslint.config.js`) with strict TypeScript rules. **Prettier 3+** handles formatting. **Husky 9+** runs lint and format checks on pre-commit hooks to prevent CI failures.

## Resilience

| Technology | Version | Role |
|---|---|---|
| cockatiel | 3+ | Circuit breaker, bulkhead, timeout |
| p-queue | 9+ | Concurrency control |
| p-retry | 7+ | Exponential backoff retry |

**cockatiel 3+** implements resilience patterns for external service calls (database queries, DID resolution, PDS requests):

- **Circuit breaker**: Opens after a configurable failure threshold (default: 5 failures in 30 seconds), preventing cascading failures. Half-open state tests recovery before closing.
- **Bulkhead**: Limits concurrent requests to each external service, preventing one slow service from exhausting the connection pool.
- **Timeout**: Enforces per-request timeouts for database queries and HTTP calls.

```typescript
const pgPolicy = Policy.wrap(
  Policy.handleAll()
    .retry().attempts(3).exponential(),
  Policy.timeout(5000),
  Policy.circuitBreaker(5, Duration.ofSeconds(30)),
  Policy.bulkhead(20),
)

const result = await pgPolicy.execute(() => pg.query(sql))
```

**p-queue 9+** controls concurrency for bulk operations (batch indexing, format imports) to prevent resource exhaustion. Each queue has a configurable concurrency limit and can pause/resume based on system load.

**p-retry 7+** provides exponential backoff retry with jitter for transient failures (network timeouts, temporary database unavailability). It is used for operations outside the cockatiel policy chain, such as one-off administrative tasks.

## Decision Log

Key architectural decisions, recorded in ADR (Architecture Decision Record) style:

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| API framework | Hono | Fastest benchmarks, native middleware composition, Zod integration | Fastify (heavier), Express (legacy API) |
| Primary database | PostgreSQL | AT-URI foreign keys, JSONB flexibility, mature ecosystem | CockroachDB (overkill for single-region) |
| Search engine | Elasticsearch | Faceted search, custom analyzers for linguistic data, nested objects | Meilisearch (lacks nested), Typesense (lacks custom analyzers) |
| Graph database | Neo4j | Native graph storage, Cypher query language, APOC library | PostgreSQL recursive CTEs (poor performance at depth), Dgraph (less mature) |
| Job queue | BullMQ | Redis-backed, per-queue concurrency, priority, DLQ, dashboard | Temporal (complex setup), pg-boss (single-database bottleneck) |
| Plugin sandbox | isolated-vm | V8 isolate per plugin, memory/CPU limits, no host access | vm2 (deprecated, security issues), Deno subprocesses (heavier) |
| Validation | Zod | TypeScript type inference, composable, OpenAPI generation | Joi (no type inference), AJV (JSON Schema only) |
| Logging | Pino | Fastest Node.js logger, structured JSON, redaction | Winston (slower), Bunyan (unmaintained) |
| DI framework | tsyringe | Decorator-based, lightweight, TypeScript-native | InversifyJS (heavier), manual DI (tedious at scale) |

## See Also

- [Overview](./) for the architecture diagram and record type coverage matrix
- [Database Design](./database-design) for PostgreSQL schema, Elasticsearch mappings, Neo4j graph model, and Redis data model
- [Firehose Ingestion](./firehose-ingestion) for the subscription, filtering, and queue topology
- [API Design](./api-design) for XRPC and REST endpoint definitions
- [Authentication](./authentication) for the full OAuth 2.0, JWT, and RBAC architecture
- [Deployment](./deployment) for Docker, Kubernetes, and CI/CD configuration
- [Testing Strategy](./testing-strategy) for the four-tier testing approach
- [Plugin System](./plugin-system) for the sandboxed plugin architecture
