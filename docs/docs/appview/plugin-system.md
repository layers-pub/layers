---
sidebar_label: Plugin System
sidebar_position: 13
---

# Plugin System

The Rust appview's extension surface is the `RecordSink` trait
(`layers-storage::RecordSink`). An operator who wants behavior beyond
the four shipped backends (Postgres, Elasticsearch, Neo4j, Redis)
ships their own crate with a struct that implements `RecordSink` and
adds it to the `MultiSink` in the indexer binary.

The trait is `async-trait`-compatible so the sink list can be
heterogeneous behind `Arc<dyn RecordSink>`:

```rust
#[async_trait::async_trait]
impl RecordSink for MyCustomSink {
    async fn put_record(
        &self,
        did: &str,
        rkey: &str,
        record: &AnyRecord,
    ) -> Result<(), IndexerError> { ... }

    async fn delete_record(
        &self,
        did: &str,
        collection: &str,
        rkey: &str,
    ) -> Result<(), IndexerError> { ... }
}
```

`MultiSink` invokes each inner sink sequentially; the first error
short-circuits the rest, so a sink that may fail without invalidating
the firehose pipeline (e.g. an analytics tap) should swallow its own
errors before returning `Ok(())`.

The frontend has no plugin surface. Format importers, exporters, and
visualizations all live as ordinary React components under
`layers/web/components/`.
