---
sidebar_label: Firehose Ingestion
sidebar_position: 4
---

# Firehose Ingestion

`layers-indexer` consumes the ATProto firehose and writes typed
`pub.layers.*` records to every configured backend.

## Transport

The indexer binary connects to a [Jetstream](https://github.com/bluesky-social/jetstream)
endpoint via `idiolect_indexer::JetstreamEventStream::connect`,
filtered to `wantedCollections=pub.layers.*` so out-of-family commits
are rejected at the source. The default endpoint is
`wss://jetstream2.us-east.bsky.network/subscribe`; override via
`LAYERS_JETSTREAM_URL`.

The connection is wrapped in `ReconnectingEventStream::with_cursor`
with the persisted cursor, so a transient WebSocket failure resumes
without dropping events. The `tapped`-backed transport is also
available behind the `firehose-tapped` feature.

## Decode and dispatch

Each Jetstream frame becomes a `RawEvent`. `drive_indexer::<LayersFamily, _, _, _>`:

1. Filters out commits whose `collection` is not in
   `LayersFamily::contains` (i.e. not under `pub.layers.*`).
2. Calls `LayersFamily::decode(nsid, body)` to produce a typed
   `AnyRecord` variant.
3. Hands the `IndexerEvent<LayersFamily>` to `LayersRecordHandler`,
   which dispatches by `IndexerAction`:
   - `Create` / `Update` → `RecordSink::put_record(did, rkey, record)`
   - `Delete` → `RecordSink::delete_record(did, collection, rkey)`
4. After each live event, commits the new sequence number to the
   `CursorStore`. Backfill events advance the handler but do not
   commit the cursor.

`LayersRecordHandler` wraps a single `RecordSink`. Multi-backend
deployments compose their sinks through `layers_storage::MultiSink`,
which holds an `Arc<dyn RecordSink>` per backend and forwards each
call sequentially. The first backend to fail short-circuits the rest.

## Cursors

Cursors live in `firehose_cursors(subscription_id, seq, updated_at)`.
`PostgresCursorStore::ensure_table` creates the table on first run.
The indexer binary reads a cursor on startup keyed by
`LAYERS_SUBSCRIPTION` (default `layers-default`) and resumes from
there. Multiple indexers can share a Postgres without colliding by
using distinct subscription ids.

## Error model

`drive_indexer` returns `IndexerError`, splitting transport failures
(`Stream`), cursor failures (`Cursor`), and handler failures
(`Handler`) so an operator can route them to different alert tiers.
The indexer binary maps every variant to a non-zero exit so the
process supervisor restarts it.
