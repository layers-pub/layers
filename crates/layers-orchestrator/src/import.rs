//! On-demand foreign-record import.
//!
//! `pub.layers.integration.getExternal` resolves an arbitrary
//! ATProto AT-URI to its source PDS, fetches the record via
//! `com.atproto.repo.getRecord`, persists it into the local
//! `external_records` table, and returns the imported view. Callers
//! use it to lift records from apps the indexer is not subscribed to
//! (e.g. a single Bluesky post with embedded video) into Layers'
//! local index without spinning up a firehose subscription.
//!
//! Cache semantics: by default the handler returns whatever is
//! already in `external_records`. Pass `?fresh=true` to force a
//! refetch.

use axum::Json;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::error::{ApiError, Result};
use crate::state::AppState;

/// Wire query for `pub.layers.integration.getExternal`.
#[derive(Debug, Deserialize)]
pub struct GetExternalParams {
    /// AT-URI of the record to import.
    pub uri: String,
    /// When `true`, bypass the local cache and refetch from the
    /// owning PDS.
    #[serde(default)]
    pub fresh: bool,
}

/// Response shape: identifying metadata plus the foreign record body.
#[derive(Debug, Serialize)]
pub struct ImportedRecord {
    /// AT-URI of the imported record.
    pub uri: String,
    /// Content-addressed identifier returned by the source PDS.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cid: Option<String>,
    /// Collection NSID.
    pub nsid: String,
    /// `true` when the response was served from `external_records`
    /// without a network fetch.
    pub from_cache: bool,
    /// Foreign record body as published by the source.
    pub value: serde_json::Value,
}

/// Parsed components of an `at://did/collection/rkey` URI.
#[derive(Debug)]
struct AtUriParts<'a> {
    did: &'a str,
    collection: &'a str,
    rkey: &'a str,
}

fn parse_at_uri(uri: &str) -> Result<AtUriParts<'_>> {
    let rest = uri
        .strip_prefix("at://")
        .ok_or_else(|| ApiError::BadRequest(format!("not an at-uri: {uri}")))?;
    let mut parts = rest.splitn(3, '/');
    let did = parts
        .next()
        .ok_or_else(|| ApiError::BadRequest(format!("missing did: {uri}")))?;
    let collection = parts
        .next()
        .ok_or_else(|| ApiError::BadRequest(format!("missing collection: {uri}")))?;
    let rkey = parts
        .next()
        .ok_or_else(|| ApiError::BadRequest(format!("missing rkey: {uri}")))?;
    if did.is_empty() || collection.is_empty() || rkey.is_empty() {
        return Err(ApiError::BadRequest(format!(
            "malformed at-uri: {uri} (did/collection/rkey segment empty)"
        )));
    }
    Ok(AtUriParts {
        did,
        collection,
        rkey,
    })
}

/// `GET /xrpc/pub.layers.integration.getExternal?uri=...`
pub async fn get_external(
    State(state): State<AppState>,
    Query(q): Query<GetExternalParams>,
) -> Result<Json<ImportedRecord>> {
    Ok(Json(fetch_or_cache(&state, &q.uri, q.fresh).await?))
}

/// Cache-or-fetch helper: looks the record up in `external_records`,
/// otherwise resolves the DID, calls `com.atproto.repo.getRecord`,
/// persists the response, and returns it. Reused by the lens import
/// path.
///
/// # Errors
/// Same surface as the route handler: [`ApiError::BadRequest`] for
/// malformed AT-URIs / unresolvable DIDs / DIDs without an
/// `#atproto_pds` service; [`ApiError::Internal`] for transport or
/// persistence failures.
pub async fn fetch_or_cache(state: &AppState, uri: &str, fresh: bool) -> Result<ImportedRecord> {
    let parts = parse_at_uri(uri)?;

    if !fresh {
        if let Some(hit) = lookup_cache(state, uri).await? {
            return Ok(hit);
        }
    }

    let doc = state
        .resolver()
        .resolve(parts.did)
        .await
        .map_err(|e| ApiError::BadRequest(format!("resolve {}: {e}", parts.did)))?;
    let pds = doc
        .pds_endpoint()
        .ok_or_else(|| {
            ApiError::BadRequest(format!(
                "did {} has no #atproto_pds service endpoint",
                parts.did
            ))
        })?
        .trim_end_matches('/')
        .to_owned();

    let (cid, value) = fetch_record_from_pds(&pds, parts.did, parts.collection, parts.rkey)
        .await
        .map_err(|e| ApiError::Internal(format!("fetch {uri}: {e}")))?;

    let did = parts.did.to_owned();
    let collection = parts.collection.to_owned();
    let rkey = parts.rkey.to_owned();
    if let Some(sink) = state.external_sink() {
        sink.put_external_record(&did, &collection, &rkey, cid.as_deref(), &value)
            .await
            .map_err(|e| ApiError::Internal(format!("persist {uri}: {e}")))?;
    }

    Ok(ImportedRecord {
        uri: uri.to_owned(),
        cid,
        nsid: collection,
        from_cache: false,
        value,
    })
}

async fn lookup_cache(state: &AppState, uri: &str) -> Result<Option<ImportedRecord>> {
    let row = sqlx::query(
        "SELECT cid, nsid, record FROM external_records WHERE uri = $1",
    )
    .bind(uri)
    .fetch_optional(state.pool())
    .await?;
    let Some(row) = row else { return Ok(None) };
    let nsid: String = row.try_get("nsid")?;
    let cid: Option<String> = row.try_get("cid")?;
    let value: sqlx::types::Json<serde_json::Value> = row.try_get("record")?;
    Ok(Some(ImportedRecord {
        uri: uri.to_owned(),
        cid,
        nsid,
        from_cache: true,
        value: value.0,
    }))
}

/// Hit `<pds>/xrpc/com.atproto.repo.getRecord` with the supplied
/// repo / collection / rkey. Returns `(cid, record body)`.
pub async fn fetch_record_from_pds(
    pds: &str,
    repo: &str,
    collection: &str,
    rkey: &str,
) -> std::result::Result<(Option<String>, serde_json::Value), FetchError> {
    let url = format!(
        "{pds}/xrpc/com.atproto.repo.getRecord?repo={repo}&collection={collection}&rkey={rkey}"
    );
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| FetchError::Transport(e.to_string()))?;
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| FetchError::Transport(format!("{url}: {e}")))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| FetchError::Transport(format!("{url}: body: {e}")))?;
    if status == StatusCode::NOT_FOUND {
        return Err(FetchError::NotFound);
    }
    if !status.is_success() {
        return Err(FetchError::HttpStatus {
            status: status.as_u16(),
            body: text,
        });
    }
    let parsed: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| FetchError::Parse(e.to_string()))?;
    let cid = parsed
        .get("cid")
        .and_then(|v| v.as_str())
        .map(str::to_owned);
    let value = parsed
        .get("value")
        .cloned()
        .ok_or_else(|| FetchError::Parse("response missing `value`".into()))?;
    Ok((cid, value))
}

/// Errors `fetch_record_from_pds` can return.
#[derive(Debug, thiserror::Error)]
pub enum FetchError {
    /// Underlying HTTP transport failure.
    #[error("transport: {0}")]
    Transport(String),
    /// PDS returned a non-2xx response (other than 404).
    #[error("HTTP {status}: {body}")]
    HttpStatus {
        /// HTTP status code returned by the PDS.
        status: u16,
        /// Response body, useful for debugging.
        body: String,
    },
    /// PDS returned 404.
    #[error("not found")]
    NotFound,
    /// Response did not parse as JSON in the expected shape.
    #[error("parse: {0}")]
    Parse(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_canonical_at_uri() {
        let p = parse_at_uri("at://did:plc:alice/app.bsky.feed.post/abc123").unwrap();
        assert_eq!(p.did, "did:plc:alice");
        assert_eq!(p.collection, "app.bsky.feed.post");
        assert_eq!(p.rkey, "abc123");
    }

    #[test]
    fn rejects_non_at_uri() {
        assert!(matches!(
            parse_at_uri("https://example.com"),
            Err(ApiError::BadRequest(_))
        ));
    }

    #[test]
    fn rejects_at_uri_missing_segments() {
        assert!(matches!(
            parse_at_uri("at://did:plc:alice"),
            Err(ApiError::BadRequest(_))
        ));
        assert!(matches!(
            parse_at_uri("at://did:plc:alice/app.bsky.feed.post"),
            Err(ApiError::BadRequest(_))
        ));
        assert!(matches!(
            parse_at_uri("at:///x/y/z"),
            Err(ApiError::BadRequest(_))
        ));
    }
}
