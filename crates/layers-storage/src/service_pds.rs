//! Read-only client for the Layers service PDS.
//!
//! The service PDS (production hostname `lexicons.layers.pub`) hosts
//! canonical `pub.layers.*` records authored by the appview operator:
//! the six `pub.layers.auth*` permission sets, lens registry seed
//! records, and any ontology / template sets the project ships as
//! defaults. The orchestrator reads these via
//! `com.atproto.repo.getRecord` over plain HTTPS — there is no
//! signing in this direction, so unauthenticated GETs are
//! sufficient.
//!
//! Module is intentionally minimal: a base URL, a typed
//! `get_record(nsid, rkey)` call, and a pre-baked
//! [`ServicePdsConfig::canonical_did`] helper that resolves the
//! canonical-handle DID once and caches it. Anything richer (writes,
//! firehose subscription, blob fetches) belongs upstream in
//! `idiolect-lens` / `idiolect-records`.

use std::sync::Arc;
use std::time::Duration;

use reqwest::Client;
use serde::Deserialize;
use thiserror::Error;
use tokio::sync::OnceCell;

/// Base URL for the canonical service PDS plus the publishing handle
/// or DID that owns canonical records.
#[derive(Debug, Clone)]
pub struct ServicePdsConfig {
    /// e.g. `https://lexicons.layers.pub`. Trailing slash optional.
    pub base_url: String,
    /// Either a handle (`lexicons.layers.pub`) or a DID. Resolved to
    /// a DID on first use.
    pub canonical_handle: String,
}

impl ServicePdsConfig {
    /// Read configuration from `LAYERS_SERVICE_PDS_URL` and
    /// `LAYERS_SERVICE_PDS_HANDLE`. Falls back to the production
    /// defaults so dev environments work without explicit wiring.
    pub fn from_env() -> Self {
        let base_url = std::env::var("LAYERS_SERVICE_PDS_URL")
            .unwrap_or_else(|_| "https://lexicons.layers.pub".to_owned());
        let canonical_handle = std::env::var("LAYERS_SERVICE_PDS_HANDLE")
            .unwrap_or_else(|_| "lexicons.layers.pub".to_owned());
        Self {
            base_url: base_url.trim_end_matches('/').to_owned(),
            canonical_handle,
        }
    }
}

/// Error variants produced by [`ServicePdsClient`] calls.
#[derive(Debug, Error)]
pub enum ServicePdsError {
    /// Network-level failure on the outbound HTTPS call.
    #[error("service-pds transport error: {0}")]
    Transport(#[from] reqwest::Error),
    /// The PDS returned a non-2xx status.
    #[error("service-pds {endpoint} returned {status}: {body}")]
    Status {
        endpoint: &'static str,
        status: u16,
        body: String,
    },
    /// The response body could not be parsed as JSON of the expected shape.
    #[error("service-pds {1} returned malformed body: {0}")]
    Decode(serde_json::Error, &'static str),
}

/// Minimal `com.atproto.repo.getRecord` response.
#[derive(Debug, Deserialize)]
pub struct RecordView {
    /// AT-URI of the record.
    pub uri: String,
    /// CID of the record.
    pub cid: Option<String>,
    /// Record body. Caller decides how to parse — this is intentionally
    /// untyped because every consumer cares about a different lexicon.
    pub value: serde_json::Value,
}

/// Read-only client for the service PDS.
#[derive(Clone)]
pub struct ServicePdsClient {
    config: ServicePdsConfig,
    http: Client,
    /// Lazily-resolved DID cache. Set on first call to
    /// [`ServicePdsClient::canonical_did`].
    did: Arc<OnceCell<String>>,
}

impl ServicePdsClient {
    /// Build a client with sensible defaults (5s connect timeout,
    /// 15s overall timeout).
    pub fn new(config: ServicePdsConfig) -> Self {
        let http = Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(15))
            .user_agent("layers-orchestrator/0.1 (service-pds-client)")
            .build()
            .expect("reqwest client must build with default config");
        Self {
            config,
            http,
            did: Arc::new(OnceCell::new()),
        }
    }

    /// Resolve the canonical handle to a DID and cache it. Idempotent.
    ///
    /// # Errors
    /// Propagates HTTP / parse failures from
    /// `com.atproto.identity.resolveHandle`.
    pub async fn canonical_did(&self) -> Result<&str, ServicePdsError> {
        self.did
            .get_or_try_init(|| async {
                if self.config.canonical_handle.starts_with("did:") {
                    return Ok(self.config.canonical_handle.clone());
                }
                let url = format!(
                    "{}/xrpc/com.atproto.identity.resolveHandle?handle={}",
                    self.config.base_url, self.config.canonical_handle
                );
                let resp = self.http.get(&url).send().await?;
                let status = resp.status();
                if !status.is_success() {
                    let body = resp.text().await.unwrap_or_default();
                    return Err(ServicePdsError::Status {
                        endpoint: "resolveHandle",
                        status: status.as_u16(),
                        body,
                    });
                }
                #[derive(Deserialize)]
                struct Resolved {
                    did: String,
                }
                let body = resp.text().await.unwrap_or_default();
                let parsed: Resolved = serde_json::from_str(&body)
                    .map_err(|e| ServicePdsError::Decode(e, "resolveHandle"))?;
                Ok(parsed.did)
            })
            .await
            .map(String::as_str)
    }

    /// Fetch a single canonical record by NSID + rkey from the
    /// service PDS. The collection is taken to be `nsid` itself so
    /// callers can pass `pub.layers.authReadOnly` and get back the
    /// permission-set body directly.
    ///
    /// # Errors
    /// Returns transport, status, or decode errors; missing records
    /// surface as `Status { status: 404, .. }`.
    pub async fn get_record(
        &self,
        nsid: &str,
        rkey: &str,
    ) -> Result<RecordView, ServicePdsError> {
        let did = self.canonical_did().await?.to_owned();
        let url = format!(
            "{}/xrpc/com.atproto.repo.getRecord?repo={}&collection={}&rkey={}",
            self.config.base_url, did, nsid, rkey
        );
        let resp = self.http.get(&url).send().await?;
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(ServicePdsError::Status {
                endpoint: "getRecord",
                status: status.as_u16(),
                body,
            });
        }
        serde_json::from_str(&body).map_err(|e| ServicePdsError::Decode(e, "getRecord"))
    }

    /// Fetch a permission-set record for an `pub.layers.auth*` tier.
    /// rkey is the lexicon NSID by convention (matches the publish
    /// script's `rkey: lex.id` choice). Returns the full record
    /// body — caller deserialises into the lexicon shape they want.
    pub async fn permission_set(
        &self,
        nsid: &str,
    ) -> Result<RecordView, ServicePdsError> {
        self.get_record("com.atproto.lexicon.schema", nsid).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_defaults_match_production() {
        let cfg = ServicePdsConfig::from_env();
        // The defaults bake in the production hostname so an
        // appview that ships without `LAYERS_SERVICE_PDS_URL` set
        // still talks to the canonical store.
        assert!(cfg.base_url.contains("lexicons.layers.pub"));
        assert_eq!(cfg.canonical_handle, "lexicons.layers.pub");
    }
}
