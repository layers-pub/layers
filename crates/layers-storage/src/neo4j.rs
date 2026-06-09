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
use reqwest::Client;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
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
    pub fn with_header(mut self, name: &str, value: &str) -> Result<Self, Neo4jHeaderError> {
        let name: HeaderName = name
            .parse()
            .map_err(|_| Neo4jHeaderError::InvalidName(name.to_owned()))?;
        let value = HeaderValue::from_str(value).map_err(|_| Neo4jHeaderError::InvalidValue)?;
        self.headers.insert(name, value);
        Ok(self)
    }

    async fn run_statements(&self, statements: Vec<Statement>) -> Result<(), IndexerError> {
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

        for (rel, target) in extract_relationships(record) {
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

/// Extract a small set of typed relationships from a record.
///
/// Returns `(rel_type, target_uri)` pairs. Relationship types are
/// upper-snake-cased so they fit the cypher convention. Field access is
/// on the generated record structs (and the `objectRef.recordRef`
/// at-uri for `source`/`target`), so a lexicon rename regenerates the
/// struct and breaks this match at compile time rather than silently
/// projecting zero edges. The set is intentionally narrow: only edges
/// that carry obvious traversal meaning are projected; richer traversal
/// predicates can read the full body off the source node.
fn extract_relationships(record: &AnyRecord) -> Vec<(&'static str, String)> {
    match record {
        AnyRecord::Membership(m) => vec![
            ("MEMBER_OF", m.corpus_ref.as_str().to_owned()),
            ("FOR_EXPRESSION", m.expression_ref.as_str().to_owned()),
        ],
        AnyRecord::Alignment(a) => {
            let mut out = Vec::new();
            if let Some(s) = a.source.as_ref().and_then(|o| o.record_ref.as_ref()) {
                out.push(("ALIGNS_FROM", s.as_str().to_owned()));
            }
            if let Some(t) = a.target.as_ref().and_then(|o| o.record_ref.as_ref()) {
                out.push(("ALIGNS_TO", t.as_str().to_owned()));
            }
            out
        }
        AnyRecord::GraphEdge(g) => {
            let mut out = Vec::new();
            if let Some(s) = g.source.record_ref.as_ref() {
                out.push(("GRAPH_FROM", s.as_str().to_owned()));
            }
            if let Some(t) = g.target.record_ref.as_ref() {
                out.push(("GRAPH_TO", t.as_str().to_owned()));
            }
            out
        }
        AnyRecord::AnnotationLayer(l) => {
            vec![("ANNOTATES", l.expression.as_str().to_owned())]
        }
        AnyRecord::Segmentation(s) => {
            vec![("SEGMENTS", s.expression.as_str().to_owned())]
        }
        AnyRecord::DataLink(d) => {
            vec![("ATTACHED_TO_EPRINT", d.eprint_uri.as_str().to_owned())]
        }
        AnyRecord::Eprint(e) => e
            .corpus_ref
            .as_ref()
            .map(|c| vec![("CITES_CORPUS", c.as_str().to_owned())])
            .unwrap_or_default(),
        AnyRecord::CollectionMembership(c) => {
            vec![("IN_COLLECTION", c.collection_ref.as_str().to_owned())]
        }
        AnyRecord::TypeDef(t) => {
            vec![("DEFINED_IN", t.ontology_ref.as_str().to_owned())]
        }
        _ => Vec::new(),
    }
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
        assert!(!is_foreign_uri(
            "at://did:plc:a/pub.layers.corpus.corpus/rk"
        ));
        assert!(!is_foreign_uri(
            "at://did:plc:a/pub.layers.annotation.annotationLayer/rk"
        ));
    }

    /// Build an `AnyRecord` of the given variant from a JSON body using
    /// the wire (camelCase) field names, exactly as the firehose
    /// decoder would. `from_value` enforces the lexicon shape.
    fn record(make: impl FnOnce(Value) -> AnyRecord, body: Value) -> AnyRecord {
        make(body)
    }

    fn rels(record: &AnyRecord) -> Vec<(&'static str, String)> {
        extract_relationships(record)
    }

    #[test]
    fn membership_projects_corpus_and_expression_edges() {
        let r = record(
            |b| AnyRecord::Membership(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "corpusRef": "at://did:plc:a/pub.layers.corpus.corpus/c1",
                "expressionRef": "at://did:plc:a/pub.layers.expression.expression/e1",
            }),
        );
        assert_eq!(
            rels(&r),
            vec![
                (
                    "MEMBER_OF",
                    "at://did:plc:a/pub.layers.corpus.corpus/c1".to_owned()
                ),
                (
                    "FOR_EXPRESSION",
                    "at://did:plc:a/pub.layers.expression.expression/e1".to_owned()
                ),
            ]
        );
    }

    #[test]
    fn alignment_projects_objectref_record_refs() {
        let r = record(
            |b| AnyRecord::Alignment(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "kind": "translation",
                "links": [],
                "source": { "recordRef": "at://did:plc:a/pub.layers.expression.expression/s1" },
                "target": { "recordRef": "at://did:plc:a/pub.layers.expression.expression/t1" },
            }),
        );
        assert_eq!(
            rels(&r),
            vec![
                (
                    "ALIGNS_FROM",
                    "at://did:plc:a/pub.layers.expression.expression/s1".to_owned()
                ),
                (
                    "ALIGNS_TO",
                    "at://did:plc:a/pub.layers.expression.expression/t1".to_owned()
                ),
            ]
        );
    }

    #[test]
    fn alignment_without_record_refs_projects_nothing() {
        // An alignment whose `source`/`target` are absent (or carry no
        // recordRef at-uri) must not produce graph edges.
        let r = record(
            |b| AnyRecord::Alignment(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "kind": "translation",
                "links": [],
            }),
        );
        assert!(rels(&r).is_empty());
    }

    #[test]
    fn graph_edge_projects_source_and_target() {
        let r = record(
            |b| AnyRecord::GraphEdge(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "edgeType": "depends-on",
                "source": { "recordRef": "at://did:plc:a/pub.layers.graph.graphNode/n1" },
                "target": { "recordRef": "at://did:plc:a/pub.layers.graph.graphNode/n2" },
            }),
        );
        assert_eq!(
            rels(&r),
            vec![
                (
                    "GRAPH_FROM",
                    "at://did:plc:a/pub.layers.graph.graphNode/n1".to_owned()
                ),
                (
                    "GRAPH_TO",
                    "at://did:plc:a/pub.layers.graph.graphNode/n2".to_owned()
                ),
            ]
        );
    }

    #[test]
    fn annotation_layer_projects_annotates_expression() {
        let r = record(
            |b| AnyRecord::AnnotationLayer(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "kind": "token-tag",
                "expression": "at://did:plc:a/pub.layers.expression.expression/e1",
                "annotations": [],
            }),
        );
        assert_eq!(
            rels(&r),
            vec![(
                "ANNOTATES",
                "at://did:plc:a/pub.layers.expression.expression/e1".to_owned()
            )]
        );
    }

    #[test]
    fn segmentation_projects_segments_expression() {
        let r = record(
            |b| AnyRecord::Segmentation(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "expression": "at://did:plc:a/pub.layers.expression.expression/e1",
                "tokenizations": [],
            }),
        );
        assert_eq!(
            rels(&r),
            vec![(
                "SEGMENTS",
                "at://did:plc:a/pub.layers.expression.expression/e1".to_owned()
            )]
        );
    }

    #[test]
    fn data_link_projects_eprint() {
        let r = record(
            |b| AnyRecord::DataLink(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "dataKind": "annotations",
                "eprintUri": "at://did:plc:a/pub.layers.eprint.eprint/p1",
            }),
        );
        assert_eq!(
            rels(&r),
            vec![(
                "ATTACHED_TO_EPRINT",
                "at://did:plc:a/pub.layers.eprint.eprint/p1".to_owned()
            )]
        );
    }

    #[test]
    fn eprint_projects_corpus_when_present_else_nothing() {
        let with = record(
            |b| AnyRecord::Eprint(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "eprintIdentifier": "10.1000/x",
                "linkType": "doi",
                "corpusRef": "at://did:plc:a/pub.layers.corpus.corpus/c1",
            }),
        );
        assert_eq!(
            rels(&with),
            vec![(
                "CITES_CORPUS",
                "at://did:plc:a/pub.layers.corpus.corpus/c1".to_owned()
            )]
        );

        let without = record(
            |b| AnyRecord::Eprint(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "eprintIdentifier": "10.1000/x",
                "linkType": "doi",
            }),
        );
        assert!(rels(&without).is_empty());
    }

    #[test]
    fn collection_membership_projects_collection() {
        let r = record(
            |b| AnyRecord::CollectionMembership(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "collectionRef": "at://did:plc:a/pub.layers.resource.collection/col1",
                "entryRef": "at://did:plc:a/pub.layers.resource.entry/en1",
            }),
        );
        assert_eq!(
            rels(&r),
            vec![(
                "IN_COLLECTION",
                "at://did:plc:a/pub.layers.resource.collection/col1".to_owned()
            )]
        );
    }

    #[test]
    fn type_def_projects_ontology() {
        let r = record(
            |b| AnyRecord::TypeDef(serde_json::from_value(b).unwrap()),
            json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "name": "Person",
                "typeKind": "entity",
                "ontologyRef": "at://did:plc:a/pub.layers.ontology.ontology/o1",
            }),
        );
        assert_eq!(
            rels(&r),
            vec![(
                "DEFINED_IN",
                "at://did:plc:a/pub.layers.ontology.ontology/o1".to_owned()
            )]
        );
    }

    #[test]
    fn unprojected_record_kind_yields_no_edges() {
        let r = record(
            |b| AnyRecord::Corpus(serde_json::from_value(b).unwrap()),
            json!({ "createdAt": "2026-04-28T00:00:00Z", "name": "C" }),
        );
        assert!(rels(&r).is_empty());
    }
}
