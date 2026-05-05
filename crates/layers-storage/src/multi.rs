//! Fan a single decoded record out to several [`RecordSink`] backends.
//!
//! Operators wire up exactly the backends they run: PG-only deployments
//! pass `MultiSink::new(vec![Arc::new(pg_sink)])`; full-stack deployments
//! add ES, Neo4j, and Redis sinks to the same vector. Each inner sink is
//! awaited sequentially so a backpressure stall on one backend does not
//! advance writes on the others past it; switch to `tokio::join!` if
//! independent failure domains are preferred over consistency.

use std::sync::Arc;

use idiolect_indexer::IndexerError;
use layers_records::AnyRecord;

use crate::RecordSink;

/// Composite sink that forwards every call to a list of inner sinks.
#[derive(Clone)]
pub struct MultiSink {
    sinks: Vec<Arc<dyn RecordSink>>,
}

impl MultiSink {
    /// Build a multi-sink from a list of dynamically-typed sinks.
    #[must_use]
    pub fn new(sinks: Vec<Arc<dyn RecordSink>>) -> Self {
        Self { sinks }
    }

    /// Append a sink to an existing multi-sink.
    pub fn push(&mut self, sink: Arc<dyn RecordSink>) {
        self.sinks.push(sink);
    }

    /// Number of inner sinks.
    #[must_use]
    pub fn len(&self) -> usize {
        self.sinks.len()
    }

    /// `true` when no inner sinks are configured.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.sinks.is_empty()
    }
}

impl std::fmt::Debug for MultiSink {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MultiSink")
            .field("sinks", &self.sinks.len())
            .finish()
    }
}

#[async_trait::async_trait]
impl RecordSink for MultiSink {
    async fn put_record(
        &self,
        did: &str,
        rkey: &str,
        cid: Option<&str>,
        record: &AnyRecord,
    ) -> Result<(), IndexerError> {
        for sink in &self.sinks {
            sink.put_record(did, rkey, cid, record).await?;
        }
        Ok(())
    }

    async fn delete_record(
        &self,
        did: &str,
        collection: &str,
        rkey: &str,
    ) -> Result<(), IndexerError> {
        for sink in &self.sinks {
            sink.delete_record(did, collection, rkey).await?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::*;

    #[derive(Debug, Default)]
    struct CountingSink {
        puts: AtomicUsize,
        deletes: AtomicUsize,
    }

    #[async_trait::async_trait]
    impl RecordSink for CountingSink {
        async fn put_record(
            &self,
            _did: &str,
            _rkey: &str,
            _cid: Option<&str>,
            _record: &AnyRecord,
        ) -> Result<(), IndexerError> {
            self.puts.fetch_add(1, Ordering::SeqCst);
            Ok(())
        }

        async fn delete_record(
            &self,
            _did: &str,
            _collection: &str,
            _rkey: &str,
        ) -> Result<(), IndexerError> {
            self.deletes.fetch_add(1, Ordering::SeqCst);
            Ok(())
        }
    }

    #[derive(Debug)]
    struct FailingSink;

    #[async_trait::async_trait]
    impl RecordSink for FailingSink {
        async fn put_record(
            &self,
            _did: &str,
            _rkey: &str,
            _cid: Option<&str>,
            _record: &AnyRecord,
        ) -> Result<(), IndexerError> {
            Err(IndexerError::Handler("boom".into()))
        }
        async fn delete_record(
            &self,
            _did: &str,
            _collection: &str,
            _rkey: &str,
        ) -> Result<(), IndexerError> {
            Err(IndexerError::Handler("boom".into()))
        }
    }

    #[tokio::test]
    async fn forwards_to_every_sink() {
        let a = Arc::new(CountingSink::default());
        let b = Arc::new(CountingSink::default());
        let multi = MultiSink::new(vec![a.clone(), b.clone()]);

        // synthetic AnyRecord variant doesn't matter for counters
        let rec = AnyRecord::Corpus(serde_json::from_value(serde_json::json!({
            "createdAt": "2026-04-28T00:00:00Z",
            "name": "x",
        })).unwrap());

        multi.put_record("did:plc:a", "r1", Some("bafy_test_cid"), &rec).await.unwrap();
        multi
            .delete_record("did:plc:a", "pub.layers.corpus.corpus", "r1")
            .await
            .unwrap();

        assert_eq!(a.puts.load(Ordering::SeqCst), 1);
        assert_eq!(a.deletes.load(Ordering::SeqCst), 1);
        assert_eq!(b.puts.load(Ordering::SeqCst), 1);
        assert_eq!(b.deletes.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn first_failure_short_circuits() {
        let counter = Arc::new(CountingSink::default());
        let multi = MultiSink::new(vec![Arc::new(FailingSink), counter.clone()]);

        let rec = AnyRecord::Corpus(serde_json::from_value(serde_json::json!({
            "createdAt": "2026-04-28T00:00:00Z",
            "name": "x",
        })).unwrap());

        let err = multi.put_record("did:plc:a", "r1", Some("bafy_test_cid"), &rec).await;
        assert!(err.is_err());
        assert_eq!(counter.puts.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn empty_multi_sink_is_a_noop() {
        let multi = MultiSink::new(vec![]);
        assert_eq!(multi.len(), 0);
        let rec = AnyRecord::Corpus(serde_json::from_value(serde_json::json!({
            "createdAt": "2026-04-28T00:00:00Z",
            "name": "x",
        })).unwrap());
        multi
            .put_record("did:plc:a", "r1", None, &rec)
            .await
            .expect("zero-sink put_record should succeed");
        multi
            .delete_record("did:plc:a", "pub.layers.corpus.corpus", "r1")
            .await
            .expect("zero-sink delete_record should succeed");
    }

    #[tokio::test]
    async fn delete_short_circuits_on_first_failure_too() {
        let counter = Arc::new(CountingSink::default());
        let multi = MultiSink::new(vec![Arc::new(FailingSink), counter.clone()]);
        let err = multi
            .delete_record("did:plc:a", "pub.layers.corpus.corpus", "r1")
            .await;
        assert!(err.is_err());
        assert_eq!(counter.deletes.load(Ordering::SeqCst), 0);
    }
}
