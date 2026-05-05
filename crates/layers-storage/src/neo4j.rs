//! Neo4j sink for the Layers indexer (Cypher over HTTP).
//!
//! For each `pub.layers.*` record this sink runs a `MERGE` cypher to
//! create or update a single `(:LayersRecord {uri})` node carrying the
//! NSID and the JSON body, then projects a small set of typed
//! relationships out of records that carry references to other
//! at-uris (e.g. `pub.layers.corpus.membership.corpus`,
//! `pub.layers.alignment.alignment.source`/`target`,
//! `pub.layers.graph.graphEdge.source`/`target`). The relationship set
//! is intentionally narrow: traversal-heavy queries can extend it
//! later without touching the firehose path.
//!
//! Authentication is via Bearer or basic auth headers passed through
//! [`Neo4jRecordSink::with_header`]; the `transaction/commit` endpoint
//! handles cypher batches in a single round trip.

use idiolect_indexer::IndexerError;
use layers_records::{AnyRecord, LayersFamily, RecordFamily};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Client;
use serde::Serialize;
use serde_json::{Value, json};

use crate::RecordSink;

/// Neo4j writer.
#[derive(Debug, Clone)]
pub struct Neo4jRecordSink {
    client: Client,
    base_url: String,
    database: String,
    headers: HeaderMap,
}

impl Neo4jRecordSink {
    /// Build a sink against the given Neo4j base URL
    /// (e.g. `"https://neo4j.example.com:7474"`) and target database.
    ///
    /// # Errors
    /// Returns the underlying [`reqwest::Error`] when the HTTP client
    /// cannot be built.
    pub fn new(
        base_url: impl Into<String>,
        database: impl Into<String>,
    ) -> Result<Self, reqwest::Error> {
        let mut base_url: String = base_url.into();
        while base_url.ends_with('/') {
            base_url.pop();
        }
        Ok(Self {
            client: Client::builder().build()?,
            base_url,
            database: database.into(),
            headers: HeaderMap::new(),
        })
    }

    /// Attach a header to every request (e.g. `Authorization: Basic ...`).
    ///
    /// # Errors
    /// Returns an error when the header name or value is invalid.
    pub fn with_header(
        mut self,
        name: &str,
        value: &str,
    ) -> Result<Self, Neo4jHeaderError> {
        let name: HeaderName = name
            .parse()
            .map_err(|_| Neo4jHeaderError::InvalidName(name.to_owned()))?;
        let value =
            HeaderValue::from_str(value).map_err(|_| Neo4jHeaderError::InvalidValue)?;
        self.headers.insert(name, value);
        Ok(self)
    }

    async fn run_statements(
        &self,
        statements: Vec<Statement>,
    ) -> Result<(), IndexerError> {
        if statements.is_empty() {
            return Ok(());
        }
        let path = format!("db/{}/tx/commit", self.database);
        let url = format!("{}/{path}", self.base_url);
        let resp = self
            .client
            .post(&url)
            .headers(self.headers.clone())
            .json(&Payload { statements })
            .send()
            .await
            .map_err(|e| IndexerError::Handler(format!("Neo4j POST {path}: {e}")))?;
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        if !status.is_success() || body.contains(r#""errors":[{"#) {
            return Err(IndexerError::Handler(format!(
                "Neo4j POST {path}: {status} {body}"
            )));
        }
        Ok(())
    }
}

/// Errors from [`Neo4jRecordSink::with_header`].
#[derive(Debug, thiserror::Error)]
pub enum Neo4jHeaderError {
    /// The header name was not a valid HTTP header name.
    #[error("invalid HTTP header name: {0}")]
    InvalidName(String),
    /// The header value contained bytes invalid in an HTTP header.
    #[error("invalid HTTP header value")]
    InvalidValue,
}

#[derive(Serialize)]
struct Payload {
    statements: Vec<Statement>,
}

#[derive(Serialize)]
struct Statement {
    statement: String,
    parameters: Value,
}

#[async_trait::async_trait]
impl RecordSink for Neo4jRecordSink {
    async fn put_record(
        &self,
        did: &str,
        rkey: &str,
        cid: Option<&str>,
        record: &AnyRecord,
    ) -> Result<(), IndexerError> {
        let nsid = LayersFamily::nsid_str(record);
        let uri = format!("at://{did}/{nsid}/{rkey}");
        let body = serde_json::to_value(record)
            .map_err(|e| IndexerError::Handler(format!("serialize {nsid}: {e}")))?;

        let mut statements = vec![Statement {
            statement: "MERGE (n:LayersRecord {uri: $uri}) \
                       SET n.did = $did, n.rkey = $rkey, n.nsid = $nsid, \
                           n.cid = $cid, n.indexedAt = timestamp(), \
                           n.body = $body"
                .to_owned(),
            parameters: json!({
                "uri": uri,
                "did": did,
                "rkey": rkey,
                "nsid": nsid,
                "cid": cid,
                "body": body.to_string(),
            }),
        }];

        for (rel, target) in extract_relationships(record, &body) {
            let foreign = is_foreign_uri(&target);
            statements.push(Statement {
                statement: format!(
                    "MATCH (s:LayersRecord {{uri: $src}}) \
                     MERGE (t:LayersRecord {{uri: $tgt}}) \
                     SET t.nsid = coalesce(t.nsid, $tgt_nsid), \
                         t.is_foreign = coalesce(t.is_foreign, $foreign) \
                     MERGE (s)-[:{rel}]->(t)"
                ),
                parameters: json!({
                    "src": uri,
                    "tgt": target,
                    "tgt_nsid": nsid_from_uri(&target),
                    "foreign": foreign,
                }),
            });
        }

        self.run_statements(statements).await
    }

    async fn delete_record(
        &self,
        did: &str,
        collection: &str,
        rkey: &str,
    ) -> Result<(), IndexerError> {
        let uri = format!("at://{did}/{collection}/{rkey}");
        self.run_statements(vec![Statement {
            statement: "MATCH (n:LayersRecord {uri: $uri}) DETACH DELETE n".to_owned(),
            parameters: json!({"uri": uri}),
        }])
        .await
    }
}

/// Pull the collection NSID out of an `at://did/collection/rkey` URI.
/// Returns the empty string when the URI is malformed; callers thread
/// that through cypher as a `null`-equivalent without panicking.
fn nsid_from_uri(uri: &str) -> String {
    uri.strip_prefix("at://")
        .and_then(|rest| rest.split('/').nth(1))
        .unwrap_or("")
        .to_owned()
}

/// True when an at-URI's collection NSID does not start with the
/// `pub.layers.` prefix. Foreign target nodes get `is_foreign = true`
/// in Neo4j so cross-app queries can filter on them.
fn is_foreign_uri(uri: &str) -> bool {
    let nsid = nsid_from_uri(uri);
    !nsid.is_empty() && !nsid.starts_with("pub.layers.")
}

/// Extract a small set of typed relationships from a record body.
///
/// Returns `(rel_type, target_uri)` pairs. Relationship types are
/// upper-snake-cased so they fit the cypher convention. The set is
/// intentionally narrow: only edges that carry obvious traversal
/// meaning are projected; richer traversal predicates can read the
/// full body off the source node.
fn extract_relationships(record: &AnyRecord, body: &Value) -> Vec<(String, String)> {
    let Some(obj) = body.as_object() else {
        return Vec::new();
    };
    let mut out = Vec::new();
    let take_str = |obj: &serde_json::Map<String, Value>, key: &str| -> Option<String> {
        obj.get(key).and_then(|v| v.as_str()).map(str::to_owned)
    };
    let take_str_array =
        |obj: &serde_json::Map<String, Value>, key: &str| -> Vec<String> {
            obj.get(key)
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(str::to_owned))
                        .collect()
                })
                .unwrap_or_default()
        };
    match record {
        AnyRecord::Membership(_) => {
            if let Some(c) = take_str(obj, "corpus") {
                out.push(("MEMBER_OF".into(), c));
            }
            if let Some(e) = take_str(obj, "expression") {
                out.push(("FOR_EXPRESSION".into(), e));
            }
        }
        AnyRecord::Alignment(_) => {
            if let Some(s) = take_str(obj, "source") {
                out.push(("ALIGNS_FROM".into(), s));
            }
            if let Some(t) = take_str(obj, "target") {
                out.push(("ALIGNS_TO".into(), t));
            }
        }
        AnyRecord::GraphEdge(_) => {
            if let Some(s) = take_str(obj, "source") {
                out.push(("GRAPH_FROM".into(), s));
            }
            if let Some(t) = take_str(obj, "target") {
                out.push(("GRAPH_TO".into(), t));
            }
        }
        AnyRecord::AnnotationLayer(_) => {
            if let Some(t) = take_str(obj, "target") {
                out.push(("ANNOTATES".into(), t));
            }
        }
        AnyRecord::Segmentation(_) => {
            if let Some(t) = take_str(obj, "target") {
                out.push(("SEGMENTS".into(), t));
            }
        }
        AnyRecord::DataLink(_) => {
            if let Some(e) = take_str(obj, "eprint") {
                out.push(("ATTACHED_TO_EPRINT".into(), e));
            }
        }
        AnyRecord::Eprint(_) => {
            for c in take_str_array(obj, "corpora") {
                out.push(("CITES_CORPUS".into(), c));
            }
        }
        AnyRecord::CollectionMembership(_) => {
            if let Some(c) = take_str(obj, "collection") {
                out.push(("IN_COLLECTION".into(), c));
            }
        }
        AnyRecord::TypeDef(_) => {
            if let Some(o) = take_str(obj, "ontology") {
                out.push(("DEFINED_IN".into(), o));
            }
        }
        _ => {}
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nsid_from_uri_extracts_collection_segment() {
        assert_eq!(
            nsid_from_uri("at://did:plc:alice/pub.layers.corpus.corpus/rk1"),
            "pub.layers.corpus.corpus"
        );
        assert_eq!(
            nsid_from_uri("at://did:plc:bob/at.margin.annotation/abc"),
            "at.margin.annotation"
        );
    }

    #[test]
    fn nsid_from_uri_returns_empty_for_malformed() {
        assert_eq!(nsid_from_uri("not-an-aturi"), "");
        assert_eq!(nsid_from_uri("at://did:plc:x"), "");
    }

    #[test]
    fn foreign_uri_detection_matches_non_layers_namespaces() {
        assert!(is_foreign_uri("at://did:plc:b/at.margin.annotation/rk"));
        assert!(is_foreign_uri("at://did:plc:c/pub.leaflet.document/rk"));
        assert!(is_foreign_uri("at://did:plc:d/dev.idiolect.community/rk"));
    }

    #[test]
    fn layers_uris_are_not_foreign() {
        assert!(!is_foreign_uri("at://did:plc:a/pub.layers.corpus.corpus/rk"));
        assert!(!is_foreign_uri("at://did:plc:a/pub.layers.annotation.annotationLayer/rk"));
    }
}
