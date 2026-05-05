---
sidebar_label: Deployment
sidebar_position: 11
---

# Deployment

Both binaries are statically-linked Rust. They are 12-factor friendly:
configuration is environment variables only, state lives in Postgres,
and the processes are stateless across restarts (the cursor table is
the only durable indexer state).

## Indexer environment

| Var                       | Purpose                                                              | Default                                                                  |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `LAYERS_DB_URL`           | Postgres connection URL                                              | required                                                                 |
| `LAYERS_JETSTREAM_URL`    | Jetstream subscribe URL                                              | `wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=pub.layers.*` |
| `LAYERS_ES_URL`           | Elasticsearch base URL (enables the ES sink when set)                | unset                                                                    |
| `LAYERS_ES_AUTH`          | `Authorization` header value sent to ES                              | unset                                                                    |
| `LAYERS_NEO4J_URL`        | Neo4j base URL (enables the Neo4j sink when set)                     | unset                                                                    |
| `LAYERS_NEO4J_DB`         | Neo4j database name                                                  | `neo4j`                                                                  |
| `LAYERS_NEO4J_AUTH`       | `Authorization` header value sent to Neo4j                           | unset                                                                    |
| `LAYERS_SUBSCRIPTION`     | Cursor slot identifier                                               | `layers-default`                                                         |
| `LAYERS_LOG`              | Tracing filter                                                       | `layers_indexer=info,idiolect_indexer=info`                              |

## Orchestrator environment

| Var               | Purpose                                                  | Default                       |
| ----------------- | -------------------------------------------------------- | ----------------------------- |
| `LAYERS_DB_URL`   | Postgres connection URL                                  | required                      |
| `LAYERS_BIND`     | `<host>:<port>` to listen on                             | `0.0.0.0:8080`                |
| `LAYERS_DID`      | Service DID used as the expected `aud` in service-auth   | `did:web:layers.pub`          |
| `LAYERS_LOG`      | Tracing filter                                           | `layers_orchestrator=info`    |

## Migrations

Apply the SQL files under `layers/migrations/` in order. The Rust
binaries also call `ensure_table()` on startup so a fresh deployment
boots without an explicit migration step, but a managed environment
should drive migrations through a deliberate tool (e.g. `sqlx migrate`).

## Failure recovery

- Lose the Postgres database: redeploy and let the indexer replay the
  Jetstream from cursor zero. Every record can be rebuilt.
- Lose the Elasticsearch cluster: redeploy and restart the indexer
  (no cursor logic touches ES; it re-indexes from the next live
  event). For a clean rebuild, drop the indexer cursor and replay.
- Lose Neo4j: same shape as Elasticsearch.
- Lose Redis: caches and rate-limit windows reset; nothing durable
  is lost.
