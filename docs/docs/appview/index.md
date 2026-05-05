---
sidebar_label: Overview
sidebar_position: 1
---

# AppView Architecture

The Layers appview is a read-only indexing service that subscribes to
the ATProto firehose, decodes `pub.layers.*` records, and serves them
back through XRPC. The appview never owns user data; every record lives
in a user-controlled PDS and the appview's databases can be rebuilt
from a firehose replay.

The appview indexes all 26 `pub.layers.*` record types and exposes the
indexed view through the catalogue declared in
`orchestrator-spec/queries.json`.

## Two-process layout

The appview runs as two independent binaries:

- **`layers-orchestrator`** — axum HTTP server. Mounts each XRPC method
  at `/xrpc/<nsid>` (the canonical ATProto convention), runs the auth
  middleware (Bearer JWT decode + `did:web` signature verify +
  service-auth `aud`/`lxm` check), and reads from Postgres.
- **`layers-indexer`** — Jetstream consumer. Connects to a Bluesky
  Jetstream endpoint filtered to `pub.layers.*`, decodes each commit
  through `LayersFamily::decode` from `idiolect-records`, and fans the
  typed record out to every configured `RecordSink` in
  `layers-storage` (Postgres, Elasticsearch, Neo4j).

The two processes share Postgres, the cursor table, and the lexicon
contract; they never call each other directly.

## Crates

The Rust workspace at `layers/crates/` is the authoritative backend.

| Crate                  | Role                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `layers-records`       | Generated record types for the 26 `pub.layers.*` NSIDs and the `LayersFamily` `RecordFamily` impl. |
| `layers-codegen`       | Driver that emits `layers-records`, the orchestrator route table, and the TypeScript schema.       |
| `layers-indexer`       | `LayersRecordHandler` over `idiolect_indexer::drive_indexer::<LayersFamily, _, _, _>`.             |
| `layers-storage`       | `RecordSink` trait + Postgres / Elasticsearch / Neo4j sinks + `MultiSink` + `PostgresCursorStore`. |
| `layers-auth`          | Granular scope parsing, `did:web` resolution, ES256 JWT verification, service-auth `lxm` check.    |
| `layers-orchestrator`  | axum HTTP API serving the XRPC catalogue.                                                           |
| `layers-verify`        | Round-trip runner over fixture corpora for published lenses.                                        |
| `layers-observer`      | Aggregate methods (annotation coverage).                                                            |

## ATProto compliance

Four invariants the design preserves:

- The appview never writes to user PDSes.
- The appview never stores blob bytes (BlobRefs only).
- Every indexed row can be rebuilt from a firehose replay.
- Every indexed row records the source DID for audit.
