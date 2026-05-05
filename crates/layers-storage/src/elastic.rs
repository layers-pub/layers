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
use serde_json::{Map, Value};

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
        let value = HeaderValue::from_str(value)
            .map_err(|_| ElasticsearchHeaderError::InvalidValue)?;
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
        for (k, v) in extract_searchable_fields(record, &body) {
            doc.insert(k, v);
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
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Promote a small set of frequently-queried top-level fields out of
/// the JSONB body and into typed top-level keys. The full body is
/// always also stored under `record`, so this projection is just a
/// search hint, not a source of truth.
fn extract_searchable_fields(record: &AnyRecord, body: &Value) -> Vec<(String, Value)> {
    let Some(obj) = body.as_object() else {
        return Vec::new();
    };
    let mut out = Vec::new();
    let mut promote = |key: &str| {
        if let Some(v) = obj.get(key) {
            out.push((key.to_owned(), v.clone()));
        }
    };
    match record {
        AnyRecord::Corpus(_) | AnyRecord::Expression(_) => {
            promote("name");
            promote("language");
            promote("license");
            promote("domain");
        }
        AnyRecord::Eprint(_) => {
            promote("title");
            promote("authors");
            promote("year");
        }
        AnyRecord::Persona(_) => {
            promote("displayName");
            promote("handle");
        }
        AnyRecord::Media(_) => {
            promote("mimeType");
            promote("title");
        }
        AnyRecord::Ontology(_) => {
            promote("name");
            promote("version");
        }
        _ => {}
    }
    out
}
