//! Elasticsearch sink for the Layers indexer.
//!
//! Indexes one document per `pub.layers.*` record. The index name is
//! derived from the record's NSID (e.g. `pub.layers.corpus.corpus`
//! lands in `pub-layers-corpus-corpus`); the document id is the
//! record's at-uri so updates and deletes are addressable. The full
//! record body is stored under `record`, plus a few extracted top-
//! level fields the orchestrator's search predicates can match on
//! without a script query.
//!
//! Authentication is via header injection (Bearer token, Elastic Cloud
//! API key, basic auth) through [`ElasticsearchRecordSink::with_header`].
//! No special cluster setup is required: indices auto-create on first
//! write with permissive default mappings, which is fine for a
//! linguistic corpus where a fixed analyzer is rarely the right call
//! up front.

use idiolect_indexer::IndexerError;
use layers_records::{AnyRecord, LayersFamily, RecordFamily};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::{Client, StatusCode};
use std::fmt::Write as _;

use serde_json::{Map, Value, json};

use crate::RecordSink;

/// Elasticsearch writer.
#[derive(Debug, Clone)]
pub struct ElasticsearchRecordSink {
    client: Client,
    base_url: String,
    headers: HeaderMap,
}

impl ElasticsearchRecordSink {
    /// Build a sink against the given Elasticsearch base URL
    /// (e.g. `"https://elastic.example.com:9200"`).
    ///
    /// # Errors
    /// Returns the underlying [`reqwest::Error`] when the HTTP client
    /// cannot be built.
    pub fn new(base_url: impl Into<String>) -> Result<Self, reqwest::Error> {
        let mut base_url: String = base_url.into();
        while base_url.ends_with('/') {
            base_url.pop();
        }
        Ok(Self {
            client: Client::builder().build()?,
            base_url,
            headers: HeaderMap::new(),
        })
    }

    /// Attach a header to every request (e.g. `Authorization: ApiKey ...`).
    ///
    /// # Errors
    /// Returns an error when `name` is not a valid HTTP header name or
    /// `value` is not a valid HTTP header value.
    pub fn with_header(
        mut self,
        name: &str,
        value: &str,
    ) -> Result<Self, ElasticsearchHeaderError> {
        let name: HeaderName = name
            .parse()
            .map_err(|_| ElasticsearchHeaderError::InvalidName(name.to_owned()))?;
        let value =
            HeaderValue::from_str(value).map_err(|_| ElasticsearchHeaderError::InvalidValue)?;
        self.headers.insert(name, value);
        Ok(self)
    }

    fn url(&self, path: &str) -> String {
        format!("{}/{path}", self.base_url)
    }
}

/// Errors from [`ElasticsearchRecordSink::with_header`].
#[derive(Debug, thiserror::Error)]
pub enum ElasticsearchHeaderError {
    /// The header name was not a valid HTTP header name.
    #[error("invalid HTTP header name: {0}")]
    InvalidName(String),
    /// The header value contained bytes invalid in an HTTP header.
    #[error("invalid HTTP header value")]
    InvalidValue,
}

#[async_trait::async_trait]
impl RecordSink for ElasticsearchRecordSink {
    async fn put_record(
        &self,
        did: &str,
        rkey: &str,
        cid: Option<&str>,
        record: &AnyRecord,
    ) -> Result<(), IndexerError> {
        let nsid = LayersFamily::nsid_str(record);
        let uri = format!("at://{did}/{nsid}/{rkey}");
        let index = index_name_for(nsid);

        let mut doc = Map::new();
        doc.insert("uri".into(), Value::String(uri.clone()));
        doc.insert("did".into(), Value::String(did.to_owned()));
        doc.insert("rkey".into(), Value::String(rkey.to_owned()));
        doc.insert("nsid".into(), Value::String(nsid.to_owned()));
        if let Some(c) = cid {
            doc.insert("cid".into(), Value::String(c.to_owned()));
        }
        let body = serde_json::to_value(record)
            .map_err(|e| IndexerError::Handler(format!("serialize {nsid}: {e}")))?;
        for (k, v) in extract_searchable_fields(record) {
            doc.insert(k.to_owned(), v);
        }
        doc.insert("record".into(), body);

        let path = format!("{index}/_doc/{}", percent_encode(&uri));
        let resp = self
            .client
            .put(self.url(&path))
            .headers(self.headers.clone())
            .json(&Value::Object(doc))
            .send()
            .await
            .map_err(|e| IndexerError::Handler(format!("ES PUT {path}: {e}")))?;
        if !resp.status().is_success() {
            return Err(IndexerError::Handler(format!(
                "ES PUT {path}: {} {}",
                resp.status(),
                resp.text().await.unwrap_or_default()
            )));
        }
        Ok(())
    }

    async fn delete_record(
        &self,
        did: &str,
        collection: &str,
        rkey: &str,
    ) -> Result<(), IndexerError> {
        let uri = format!("at://{did}/{collection}/{rkey}");
        let index = index_name_for(collection);
        let path = format!("{index}/_doc/{}", percent_encode(&uri));
        let resp = self
            .client
            .delete(self.url(&path))
            .headers(self.headers.clone())
            .send()
            .await
            .map_err(|e| IndexerError::Handler(format!("ES DELETE {path}: {e}")))?;
        if !resp.status().is_success() && resp.status() != StatusCode::NOT_FOUND {
            return Err(IndexerError::Handler(format!(
                "ES DELETE {path}: {} {}",
                resp.status(),
                resp.text().await.unwrap_or_default()
            )));
        }
        Ok(())
    }
}

/// Map an NSID to its Elasticsearch index name. ES does not allow
/// dots, uppercase letters, or several other characters in index
/// names, so we lowercase and rewrite to dashes.
fn index_name_for(nsid: &str) -> String {
    nsid.replace('.', "-").to_ascii_lowercase()
}

/// Percent-encode a string for use in an ES document id path segment.
/// Allow-list keeps this dependency-free.
fn percent_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 2);
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
            out.push(b as char);
        } else {
            let _ = write!(out, "%{b:02X}");
        }
    }
    out
}

/// Promote a small set of frequently-queried top-level fields out of
/// the JSONB body and into typed top-level keys. The full body is
/// always also stored under `record`, so this projection is just a
/// search hint, not a source of truth.
fn extract_searchable_fields(record: &AnyRecord) -> Vec<(&'static str, Value)> {
    // Field access is on the generated record structs, so a lexicon
    // rename regenerates the struct and breaks this match at compile
    // time. Each arm promotes only fields that actually exist on that
    // record; keys are the wire (camelCase) names. `push` drops absent
    // optional fields so the ES doc stays sparse.
    let mut out: Vec<(&'static str, Value)> = Vec::new();
    let mut push = |key: &'static str, value: Value| {
        if !value.is_null() {
            out.push((key, value));
        }
    };
    match record {
        AnyRecord::Corpus(c) => {
            push("name", json!(c.name));
            push("languages", json!(c.languages));
            push("license", json!(c.license));
            push("domain", json!(c.domain));
        }
        AnyRecord::Expression(e) => {
            push("id", json!(e.id));
            push("kind", json!(e.kind));
            push("text", json!(e.text));
            push("languages", json!(e.languages));
        }
        AnyRecord::Eprint(e) => {
            push("eprintIdentifier", json!(e.eprint_identifier));
            push("linkType", json!(e.link_type));
            push("citation", json!(e.citation));
            push("description", json!(e.description));
        }
        AnyRecord::Persona(p) => {
            push("name", json!(p.name));
            push("domain", json!(p.domain));
            push("kind", json!(p.kind));
        }
        AnyRecord::Media(m) => {
            push("kind", json!(m.kind));
            push("title", json!(m.title));
        }
        AnyRecord::Ontology(o) => {
            push("name", json!(o.name));
            push("version", json!(o.version));
        }
        _ => {}
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fields(record: &AnyRecord) -> std::collections::HashMap<&'static str, Value> {
        extract_searchable_fields(record).into_iter().collect()
    }

    #[test]
    fn corpus_promotes_name_languages_license_domain() {
        let r = AnyRecord::Corpus(
            serde_json::from_value(json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "name": "Alpha",
                "languages": ["eng", "fra"],
                "license": "CC-BY-4.0",
                "domain": "news",
            }))
            .unwrap(),
        );
        let f = fields(&r);
        assert_eq!(f["name"], json!("Alpha"));
        assert_eq!(f["languages"], json!(["eng", "fra"]));
        assert_eq!(f["license"], json!("CC-BY-4.0"));
        assert_eq!(f["domain"], json!("news"));
    }

    #[test]
    fn corpus_omits_absent_optional_fields() {
        let r = AnyRecord::Corpus(
            serde_json::from_value(json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "name": "Alpha",
            }))
            .unwrap(),
        );
        let f = fields(&r);
        assert_eq!(f["name"], json!("Alpha"));
        assert!(!f.contains_key("languages"));
        assert!(!f.contains_key("license"));
        assert!(!f.contains_key("domain"));
    }

    #[test]
    fn expression_promotes_its_own_fields_not_corpus_fields() {
        let r = AnyRecord::Expression(
            serde_json::from_value(json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "id": "s1",
                "kind": "sentence",
                "text": "Hello world.",
                "languages": ["eng"],
            }))
            .unwrap(),
        );
        let f = fields(&r);
        assert_eq!(f["id"], json!("s1"));
        assert_eq!(f["kind"], json!("sentence"));
        assert_eq!(f["text"], json!("Hello world."));
        assert_eq!(f["languages"], json!(["eng"]));
        // Expression has no name/license/domain — must not be promoted.
        assert!(!f.contains_key("name"));
        assert!(!f.contains_key("license"));
        assert!(!f.contains_key("domain"));
    }

    #[test]
    fn eprint_promotes_real_fields() {
        let r = AnyRecord::Eprint(
            serde_json::from_value(json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "eprintIdentifier": "10.1000/xyz",
                "linkType": "doi",
                "citation": "Doe 2026",
            }))
            .unwrap(),
        );
        let f = fields(&r);
        assert_eq!(f["eprintIdentifier"], json!("10.1000/xyz"));
        assert_eq!(f["linkType"], json!("doi"));
        assert_eq!(f["citation"], json!("Doe 2026"));
        // The old code promoted title/authors/year, none of which exist.
        assert!(!f.contains_key("title"));
        assert!(!f.contains_key("authors"));
        assert!(!f.contains_key("year"));
    }

    #[test]
    fn persona_promotes_name_not_displayname() {
        let r = AnyRecord::Persona(
            serde_json::from_value(json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "name": "Annotator A",
                "domain": "linguistics",
            }))
            .unwrap(),
        );
        let f = fields(&r);
        assert_eq!(f["name"], json!("Annotator A"));
        assert_eq!(f["domain"], json!("linguistics"));
        assert!(!f.contains_key("displayName"));
        assert!(!f.contains_key("handle"));
    }

    #[test]
    fn media_and_ontology_promote_their_fields() {
        let media = AnyRecord::Media(
            serde_json::from_value(json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "kind": "audio",
                "title": "Recording 1",
            }))
            .unwrap(),
        );
        let mf = fields(&media);
        assert_eq!(mf["kind"], json!("audio"));
        assert_eq!(mf["title"], json!("Recording 1"));

        let ontology = AnyRecord::Ontology(
            serde_json::from_value(json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "name": "UD",
                "version": "2.14",
            }))
            .unwrap(),
        );
        let of = fields(&ontology);
        assert_eq!(of["name"], json!("UD"));
        assert_eq!(of["version"], json!("2.14"));
    }

    #[test]
    fn unprojected_record_kind_promotes_nothing() {
        let r = AnyRecord::Membership(
            serde_json::from_value(json!({
                "createdAt": "2026-04-28T00:00:00Z",
                "corpusRef": "at://did:plc:a/pub.layers.corpus.corpus/c1",
                "expressionRef": "at://did:plc:a/pub.layers.expression.expression/e1",
            }))
            .unwrap(),
        );
        assert!(extract_searchable_fields(&r).is_empty());
    }
}
