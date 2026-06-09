//! Foreign-record driver: a parallel pipeline that ingests
//! cross-family records into the [`ExternalRecordSink`] without
//! routing them through `LayersFamily`'s typed decoder.
//!
//! The Layers indexer binary spawns one [`drive_external`] task per
//! foreign Jetstream subscription. Each tick:
//!
//! 1. Pulls the next event off the supplied [`EventStream`].
//! 2. Routes by [`IndexerAction`]: `Create`/`Update` → `put_external_record`,
//!    `Delete` → `delete_external_record`.
//! 3. Filters out events whose collection NSID does not match the
//!    caller's `wanted_prefixes` allowlist (defence in depth: the
//!    Jetstream URL is already filtered, but a misconfigured client
//!    could otherwise spam the table with unrelated traffic).
//!
//! Foreign records do not own a cursor; the layers cursor table is
//! reserved for the typed `LayersFamily` pipeline. Restarting an
//! indexer process therefore re-reads from the foreign Jetstream's
//! current head — which is fine because we only need eventual
//! consistency for cross-references.

use idiolect_indexer::{EventStream, IndexerAction, IndexerError, RawEvent};
use layers_storage::ExternalRecordSink;

/// Loop until the stream returns `None`, applying every event to the
/// configured sink. Returns when the stream terminates.
///
/// `wanted_prefixes` is an inclusion allowlist: only events whose
/// `collection` starts with one of these strings are processed.
///
/// # Errors
/// Bubbles transport errors from the underlying [`EventStream`] and
/// sink errors from the [`ExternalRecordSink`].
pub async fn drive_external<S, T>(
    stream: &mut S,
    sink: &T,
    wanted_prefixes: &[&str],
) -> Result<(), IndexerError>
where
    S: EventStream + ?Sized,
    T: ExternalRecordSink + ?Sized,
{
    while let Some(event) = stream.next_event().await? {
        if !is_in_family(&event, wanted_prefixes) {
            continue;
        }
        apply(sink, &event).await?;
    }
    Ok(())
}

fn is_in_family(event: &RawEvent, wanted: &[&str]) -> bool {
    let nsid = event.collection.as_str();
    wanted.iter().any(|p| nsid.starts_with(p))
}

async fn apply<T: ExternalRecordSink + ?Sized>(
    sink: &T,
    event: &RawEvent,
) -> Result<(), IndexerError> {
    let nsid = event.collection.as_str();
    let did = &event.did;
    let rkey = &event.rkey;
    let uri = format!("at://{did}/{nsid}/{rkey}");
    match event.action {
        IndexerAction::Delete => sink.delete_external_record(&uri).await,
        IndexerAction::Create | IndexerAction::Update => {
            let body = event
                .body
                .clone()
                .unwrap_or_else(|| serde_json::Value::Object(serde_json::Map::new()));
            sink.put_external_record(did, nsid, rkey, event.cid.as_deref(), &body)
                .await
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use layers_records::Nsid;
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    struct CaptureSink {
        puts: Mutex<Vec<(String, String, String)>>,
        deletes: Mutex<Vec<String>>,
    }

    #[async_trait::async_trait]
    impl ExternalRecordSink for CaptureSink {
        async fn put_external_record(
            &self,
            did: &str,
            nsid: &str,
            rkey: &str,
            _cid: Option<&str>,
            _body: &serde_json::Value,
        ) -> Result<(), IndexerError> {
            self.puts
                .lock()
                .unwrap()
                .push((did.to_owned(), nsid.to_owned(), rkey.to_owned()));
            Ok(())
        }

        async fn delete_external_record(&self, uri: &str) -> Result<(), IndexerError> {
            self.deletes.lock().unwrap().push(uri.to_owned());
            Ok(())
        }
    }

    fn event(seq: u64, action: IndexerAction, did: &str, collection: &str, rkey: &str) -> RawEvent {
        RawEvent {
            seq,
            live: true,
            did: did.to_owned(),
            rev: "rev1".into(),
            collection: Nsid::parse(collection.to_owned()).expect("nsid"),
            rkey: rkey.to_owned(),
            action,
            cid: Some("bafy_x".into()),
            body: Some(serde_json::json!({"hello": "world"})),
        }
    }

    struct VecStream {
        events: Vec<RawEvent>,
    }

    impl EventStream for VecStream {
        async fn next_event(&mut self) -> Result<Option<RawEvent>, IndexerError> {
            Ok(self.events.pop())
        }
    }

    #[tokio::test]
    async fn drives_create_and_delete_through_sink() {
        let sink = Arc::new(CaptureSink::default());
        // Pop is LIFO so insert in reverse to get chronological order.
        let mut stream = VecStream {
            events: vec![
                event(
                    2,
                    IndexerAction::Delete,
                    "did:plc:b",
                    "dev.idiolect.community",
                    "rk2",
                ),
                event(
                    1,
                    IndexerAction::Create,
                    "did:plc:a",
                    "dev.idiolect.community",
                    "rk1",
                ),
            ],
        };
        drive_external(&mut stream, &*sink, &["dev.idiolect."])
            .await
            .expect("driver");

        let puts = sink.puts.lock().unwrap();
        assert_eq!(puts.len(), 1);
        assert_eq!(
            puts[0],
            (
                "did:plc:a".into(),
                "dev.idiolect.community".into(),
                "rk1".into()
            )
        );
        let deletes = sink.deletes.lock().unwrap();
        assert_eq!(deletes.len(), 1);
        assert_eq!(deletes[0], "at://did:plc:b/dev.idiolect.community/rk2");
    }

    #[tokio::test]
    async fn skips_events_outside_wanted_prefixes() {
        let sink = Arc::new(CaptureSink::default());
        let mut stream = VecStream {
            events: vec![event(
                1,
                IndexerAction::Create,
                "did:plc:a",
                "app.bsky.feed.post",
                "rk",
            )],
        };
        drive_external(&mut stream, &*sink, &["dev.idiolect.", "pub.leaflet."])
            .await
            .expect("driver");
        assert!(sink.puts.lock().unwrap().is_empty());
        assert!(sink.deletes.lock().unwrap().is_empty());
    }

    #[tokio::test]
    async fn missing_body_treated_as_empty_object() {
        let sink = Arc::new(CaptureSink::default());
        let mut e = event(
            1,
            IndexerAction::Create,
            "did:plc:a",
            "pub.leaflet.document",
            "rk",
        );
        e.body = None;
        let mut stream = VecStream { events: vec![e] };
        drive_external(&mut stream, &*sink, &["pub.leaflet."])
            .await
            .expect("driver");
        let puts = sink.puts.lock().unwrap();
        assert_eq!(puts.len(), 1);
    }
}
