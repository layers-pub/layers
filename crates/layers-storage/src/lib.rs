//! Storage adapters for the Layers appview.
//!
//! Four backends: PostgreSQL is the source of truth (mirrors the firehose),
//! Elasticsearch powers search, Neo4j holds the cross-record relation graph,
//! Redis backs caching + rate limiting + OAuth sessions. Each adapter sits
//! behind a generic [`RecordStore`] trait parameterised by record type so
//! [`layers_indexer`]'s `RecordHandler` impl can stay uniform across the 26
//! `pub.layers.*` NSIDs.

#![cfg_attr(docsrs, feature(doc_cfg))]

use idiolect_indexer::IndexerError;
use layers_records::AnyRecord;

pub mod cursor;

#[cfg(feature = "postgres")]
pub mod postgres;

#[cfg(feature = "postgres")]
pub mod sink;

#[cfg(feature = "postgres")]
pub mod external;

#[cfg(feature = "service-pds")]
pub mod service_pds;

#[cfg(feature = "postgres")]
pub use external::{
    DEFAULT_FOREIGN_PREFIXES, ExternalRecordSink, PostgresExternalSink, is_default_foreign,
};

#[cfg(feature = "postgres")]
pub use cursor::PostgresCursorStore;

#[cfg(feature = "postgres")]
pub use sink::PostgresRecordSink;

#[cfg(feature = "elasticsearch")]
pub mod elastic;

#[cfg(feature = "elasticsearch")]
pub use elastic::ElasticsearchRecordSink;

#[cfg(feature = "neo4j")]
pub mod neo4j;

#[cfg(feature = "neo4j")]
pub use neo4j::Neo4jRecordSink;

#[cfg(feature = "redis")]
pub mod redis_cache;

#[cfg(feature = "redis")]
pub mod rate_limit;

#[cfg(feature = "redis")]
pub use rate_limit::{RateLimitError, SlidingWindow};

/// Storage boundary the firehose handler delegates to.
///
/// One method per write action. Default impls are no-ops so a partial
/// sink (e.g. one that only persists corpora) compiles. Returning
/// [`IndexerError::Handler`] from any method retries per the indexer's
/// configured policy.
///
/// `delete_record` carries the originating collection NSID so a sink
/// can route the tombstone to the right table without re-decoding.
///
/// `#[async_trait]` is used so a heterogeneous list of backends can be
/// composed via [`MultiSink`] behind `Arc<dyn RecordSink>`. The boxing
/// cost is in the noise compared to a network round-trip.
#[async_trait::async_trait]
#[allow(unused_variables)]
pub trait RecordSink: Send + Sync {
    /// Persist a record. Called once per `Create` and once per
    /// `Update`. `cid` is the content-addressed identifier carried on
    /// the firehose commit; sinks that surface ATProto-conformant
    /// responses (orchestrator, observation publishers) should store
    /// it. Sinks that don't care can ignore it.
    async fn put_record(
        &self,
        did: &str,
        rkey: &str,
        cid: Option<&str>,
        record: &AnyRecord,
    ) -> Result<(), IndexerError> {
        Ok(())
    }

    /// Remove a record by `(did, collection, rkey)`. Idempotent.
    async fn delete_record(
        &self,
        did: &str,
        collection: &str,
        rkey: &str,
    ) -> Result<(), IndexerError> {
        Ok(())
    }
}

pub mod multi;
pub use multi::MultiSink;
