//! Layers-specific [`RecordHandler`] implementation.
//!
//! [`LayersRecordHandler`] dispatches each [`IndexerEvent`] to a typed
//! [`RecordSink`] method per record kind. The sink is the boundary against
//! `layers-storage`; this module owns the dispatch rule, not the writes.

use idiolect_indexer::{IndexerAction, IndexerError, IndexerEvent, RecordHandler};
use layers_records::LayersFamily;
use layers_storage::RecordSink;

/// `RecordHandler<LayersFamily>` impl that forwards to a [`RecordSink`].
#[derive(Debug)]
pub struct LayersRecordHandler<S> {
    sink: S,
}

impl<S> LayersRecordHandler<S> {
    /// Wrap a sink so the handler can dispatch decoded events to it.
    pub fn new(sink: S) -> Self {
        Self { sink }
    }

    /// Consume the handler and return the wrapped sink.
    pub fn into_inner(self) -> S {
        self.sink
    }

    /// Borrow the wrapped sink without consuming the handler.
    pub fn sink(&self) -> &S {
        &self.sink
    }
}

impl<S: RecordSink> RecordHandler<LayersFamily> for LayersRecordHandler<S> {
    async fn handle(&self, event: &IndexerEvent<LayersFamily>) -> Result<(), IndexerError> {
        match event.action {
            IndexerAction::Delete => {
                self.sink
                    .delete_record(&event.did, event.collection.as_str(), &event.rkey)
                    .await
            }
            IndexerAction::Create | IndexerAction::Update => {
                if let Some(rec) = event.record.as_ref() {
                    self.sink
                        .put_record(&event.did, &event.rkey, event.cid.as_deref(), rec)
                        .await
                } else {
                    tracing::warn!(
                        seq = event.seq,
                        did = %event.did,
                        collection = %event.collection,
                        "create/update event with no decoded record body; skipping",
                    );
                    Ok(())
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use idiolect_indexer::{
        InMemoryCursorStore, InMemoryEventStream, IndexerConfig, RawEvent, drive_indexer,
    };
    use layers_records::{AnyRecord, Nsid};
    use serde_json::json;

    use super::*;

    #[derive(Debug, Default)]
    struct Counters {
        puts: Mutex<Vec<(String, String, &'static str)>>,
        deletes: Mutex<Vec<(String, String, String)>>,
    }

    #[async_trait::async_trait]
    impl RecordSink for Counters {
        async fn put_record(
            &self,
            did: &str,
            rkey: &str,
            _cid: Option<&str>,
            record: &AnyRecord,
        ) -> Result<(), IndexerError> {
            self.puts
                .lock()
                .unwrap()
                .push((did.to_owned(), rkey.to_owned(), kind_of(record)));
            Ok(())
        }

        async fn delete_record(
            &self,
            did: &str,
            collection: &str,
            rkey: &str,
        ) -> Result<(), IndexerError> {
            self.deletes.lock().unwrap().push((
                did.to_owned(),
                collection.to_owned(),
                rkey.to_owned(),
            ));
            Ok(())
        }
    }

    fn kind_of(rec: &AnyRecord) -> &'static str {
        match rec {
            AnyRecord::Corpus(_) => "corpus",
            AnyRecord::Expression(_) => "expression",
            _ => "other",
        }
    }

    fn corpus_event(seq: u64, did: &str, rkey: &str) -> RawEvent {
        RawEvent {
            seq,
            live: true,
            did: did.to_owned(),
            rev: format!("rev-{seq}"),
            rkey: rkey.to_owned(),
            collection: Nsid::parse("pub.layers.corpus.corpus").unwrap(),
            action: IndexerAction::Create,
            cid: Some(format!("cid-{seq}")),
            body: Some(json!({
                "$type": "pub.layers.corpus.corpus",
                "name": "test corpus",
                "createdAt": "2026-04-28T00:00:00Z"
            })),
        }
    }

    fn delete_event(seq: u64, did: &str, rkey: &str, collection: &str) -> RawEvent {
        RawEvent {
            seq,
            live: true,
            did: did.to_owned(),
            rev: format!("rev-{seq}"),
            rkey: rkey.to_owned(),
            collection: Nsid::parse(collection).unwrap(),
            action: IndexerAction::Delete,
            cid: None,
            body: None,
        }
    }

    #[tokio::test]
    async fn dispatches_creates_and_deletes() {
        let mut stream = InMemoryEventStream::new();
        stream.push(corpus_event(1, "did:plc:alice", "rk1"));
        stream.push(corpus_event(2, "did:plc:alice", "rk2"));
        stream.push(delete_event(
            3,
            "did:plc:alice",
            "rk1",
            "pub.layers.corpus.corpus",
        ));

        let handler = LayersRecordHandler::new(Counters::default());
        let cursor = InMemoryCursorStore::new();
        let config = IndexerConfig {
            subscription_id: "test".to_owned(),
        };

        drive_indexer::<LayersFamily, _, _, _>(&mut stream, &handler, &cursor, &config)
            .await
            .unwrap();

        let counters = handler.into_inner();
        assert_eq!(counters.puts.lock().unwrap().len(), 2);
        assert_eq!(counters.deletes.lock().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn out_of_family_events_skip_handler() {
        let mut stream = InMemoryEventStream::new();
        stream.push(RawEvent {
            seq: 1,
            live: true,
            did: "did:plc:alice".to_owned(),
            rev: "rev1".to_owned(),
            rkey: "rk1".to_owned(),
            collection: Nsid::parse("app.bsky.feed.post").unwrap(),
            action: IndexerAction::Create,
            cid: Some("cid1".to_owned()),
            body: Some(json!({"$type": "app.bsky.feed.post", "text": "hi"})),
        });

        let handler = LayersRecordHandler::new(Counters::default());
        let cursor = InMemoryCursorStore::new();
        let config = IndexerConfig {
            subscription_id: "test".to_owned(),
        };

        drive_indexer::<LayersFamily, _, _, _>(&mut stream, &handler, &cursor, &config)
            .await
            .unwrap();

        let counters = handler.into_inner();
        assert!(counters.puts.lock().unwrap().is_empty());
        assert!(counters.deletes.lock().unwrap().is_empty());
    }
}
