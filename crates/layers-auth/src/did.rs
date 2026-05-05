//! DID resolution for `did:web` and `did:plc`.
//!
//! `did:web:<host>[:<path>]` resolves to a DID document hosted at
//! `https://<host>/.well-known/did.json` (or `https://<host>/<path>/did.json`
//! when a path is present).
//!
//! `did:plc:<id>` resolves through the public PLC directory at
//! `https://plc.directory/<full-did>`. Override the directory base
//! URL via [`DidResolverConfig::plc_directory`] for self-hosted
//! mirrors.
//!
//! The trait [`DidResolver`] abstracts the HTTP fetch so tests can
//! supply pre-canned documents. [`DidResolverImpl`] is the production
//! impl backed by `reqwest`, with an in-process cache.

use std::collections::HashMap;
use std::sync::Arc;

use reqwest::Client;
use serde::Deserialize;
use thiserror::Error;
use tokio::sync::Mutex;

/// Errors raised by [`DidResolver::resolve`].
#[derive(Debug, Error)]
pub enum ResolveError {
    /// The DID is not in a supported method (`did:web` or `did:plc`).
    #[error("unsupported did method: {0}")]
    UnsupportedDid(String),
    /// The HTTP fetch for the DID document failed.
    #[error("did doc fetch failed: {0}")]
    Fetch(String),
    /// The DID document JSON did not parse.
    #[error("did doc parse failed: {0}")]
    Parse(String),
    /// The DID document carried no usable verification method.
    #[error("did doc has no verification method")]
    NoVerificationMethod,
}

/// One verification method extracted from a DID document.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct VerificationMethod {
    /// Fully qualified id, e.g. `did:web:example.com#key-1`.
    pub id: String,
    /// JWK serialised as JSON (kty, crv, x, y, kid).
    #[serde(rename = "publicKeyJwk")]
    pub public_key_jwk: serde_json::Value,
}

/// Service endpoint declared in a DID document. ATProto deployments
/// publish at least one entry whose `id` ends in `#atproto_pds` and
/// whose `type` is `AtprotoPersonalDataServer`; the appview imports
/// foreign records by hitting that endpoint's `com.atproto.repo.getRecord`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct ServiceEndpoint {
    /// Fully qualified id, e.g. `did:plc:alice#atproto_pds`.
    pub id: String,
    /// Service type, e.g. `AtprotoPersonalDataServer`.
    #[serde(rename = "type")]
    pub type_: String,
    /// HTTPS base URL of the service.
    #[serde(rename = "serviceEndpoint")]
    pub service_endpoint: String,
}

/// Minimal subset of a W3C DID document used by Layers.
#[derive(Debug, Clone, Deserialize)]
pub struct DidDocument {
    /// `verificationMethod` array. Each entry must declare a JWK.
    #[serde(default, rename = "verificationMethod")]
    pub verification_method: Vec<VerificationMethod>,
    /// Optional service array. ATProto-aware DIDs include at least
    /// one entry whose id ends in `#atproto_pds`.
    #[serde(default)]
    pub service: Vec<ServiceEndpoint>,
}

impl DidDocument {
    /// Pull the `serviceEndpoint` URL out of the entry whose `id`
    /// ends in `#atproto_pds`. Returns `None` if no such entry
    /// exists.
    #[must_use]
    pub fn pds_endpoint(&self) -> Option<&str> {
        self.service
            .iter()
            .find(|s| s.id.ends_with("#atproto_pds"))
            .map(|s| s.service_endpoint.as_str())
    }
}

/// Trait the auth middleware consumes.
#[async_trait::async_trait]
pub trait DidResolver: Send + Sync {
    /// Fetch the DID document for `did` and return its verification methods.
    async fn resolve(&self, did: &str) -> Result<DidDocument, ResolveError>;
}

/// Resolver configuration.
#[derive(Debug, Clone)]
pub struct DidResolverConfig {
    /// Base URL of the PLC directory used to resolve `did:plc:*`.
    /// Defaults to `https://plc.directory`.
    pub plc_directory: String,
    /// Timeout for a single HTTP fetch. Defaults to 5 seconds.
    pub timeout: std::time::Duration,
}

impl Default for DidResolverConfig {
    fn default() -> Self {
        Self {
            plc_directory: "https://plc.directory".into(),
            timeout: std::time::Duration::from_secs(5),
        }
    }
}

/// Combined `did:web` + `did:plc` resolver backed by `reqwest`.
/// Caches successful fetches in-process for the resolver's lifetime.
#[derive(Debug, Clone)]
pub struct DidResolverImpl {
    client: Client,
    config: DidResolverConfig,
    cache: Arc<Mutex<HashMap<String, DidDocument>>>,
}

/// Backwards-compatible alias for callers that only target `did:web`.
pub type DidWebResolver = DidResolverImpl;

impl Default for DidResolverImpl {
    fn default() -> Self {
        Self::new()
    }
}

impl DidResolverImpl {
    /// Build a resolver with a default reqwest client and config.
    #[must_use]
    pub fn new() -> Self {
        Self::with_config(DidResolverConfig::default())
    }

    /// Build a resolver with a caller-supplied config (e.g. a mirrored
    /// PLC directory).
    #[must_use]
    pub fn with_config(config: DidResolverConfig) -> Self {
        let client = Client::builder()
            .timeout(config.timeout)
            .build()
            .expect("reqwest client construction");
        Self {
            client,
            config,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Build a resolver that issues HTTP requests via `client`. Useful
    /// in tests that want to inject a mocked transport pointed at a
    /// wiremock base.
    #[must_use]
    pub fn with_client_and_config(client: Client, config: DidResolverConfig) -> Self {
        Self {
            client,
            config,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    async fn fetch(&self, url: &str) -> Result<DidDocument, ResolveError> {
        let resp = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| ResolveError::Fetch(format!("{url}: {e}")))?;
        if !resp.status().is_success() {
            return Err(ResolveError::Fetch(format!(
                "{url}: HTTP {}",
                resp.status()
            )));
        }
        let text = resp
            .text()
            .await
            .map_err(|e| ResolveError::Fetch(format!("{url}: body: {e}")))?;
        let doc: DidDocument =
            serde_json::from_str(&text).map_err(|e| ResolveError::Parse(e.to_string()))?;
        if doc.verification_method.is_empty() {
            return Err(ResolveError::NoVerificationMethod);
        }
        Ok(doc)
    }
}

#[async_trait::async_trait]
impl DidResolver for DidResolverImpl {
    async fn resolve(&self, did: &str) -> Result<DidDocument, ResolveError> {
        if let Some(hit) = self.cache.lock().await.get(did).cloned() {
            return Ok(hit);
        }
        let url = if did.starts_with("did:web:") {
            did_web_url(did)?
        } else if did.starts_with("did:plc:") {
            format!(
                "{}/{}",
                self.config.plc_directory.trim_end_matches('/'),
                did
            )
        } else {
            return Err(ResolveError::UnsupportedDid(did.to_owned()));
        };
        let doc = self.fetch(&url).await?;
        self.cache.lock().await.insert(did.to_owned(), doc.clone());
        Ok(doc)
    }
}

/// Translate a `did:web:<host>[:<path...>]` to the URL where its DID
/// document is hosted, per the spec:
///
/// - `did:web:example.com` -> `https://example.com/.well-known/did.json`
/// - `did:web:example.com:user:alice` -> `https://example.com/user/alice/did.json`
fn did_web_url(did: &str) -> Result<String, ResolveError> {
    let rest = did
        .strip_prefix("did:web:")
        .ok_or_else(|| ResolveError::UnsupportedDid(did.to_owned()))?;
    if rest.is_empty() {
        return Err(ResolveError::UnsupportedDid(did.to_owned()));
    }
    let parts: Vec<&str> = rest.split(':').collect();
    let host = parts[0];
    if parts.len() == 1 {
        Ok(format!("https://{host}/.well-known/did.json"))
    } else {
        let path = parts[1..].join("/");
        Ok(format!("https://{host}/{path}/did.json"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn well_known_url_for_bare_host() {
        assert_eq!(
            did_web_url("did:web:example.com").unwrap(),
            "https://example.com/.well-known/did.json"
        );
    }

    #[test]
    fn nested_path_url() {
        assert_eq!(
            did_web_url("did:web:example.com:user:alice").unwrap(),
            "https://example.com/user/alice/did.json"
        );
    }

    #[test]
    fn rejects_did_plc_in_web_helper() {
        assert!(matches!(
            did_web_url("did:plc:abc"),
            Err(ResolveError::UnsupportedDid(_))
        ));
    }

    #[test]
    fn rejects_bare_did_web() {
        assert!(matches!(
            did_web_url("did:web:"),
            Err(ResolveError::UnsupportedDid(_))
        ));
    }

    #[tokio::test]
    async fn rejects_unknown_method() {
        let resolver = DidResolverImpl::new();
        let err = resolver.resolve("did:bogus:abc").await.unwrap_err();
        assert!(matches!(err, ResolveError::UnsupportedDid(_)));
    }

    #[test]
    fn pds_endpoint_picks_atproto_pds_service() {
        let doc: DidDocument = serde_json::from_value(serde_json::json!({
            "verificationMethod": [{
                "id": "did:plc:alice#k1",
                "publicKeyJwk": {"kty":"EC","crv":"P-256","x":"x","y":"y"}
            }],
            "service": [
                {
                    "id": "did:plc:alice#atproto_pds",
                    "type": "AtprotoPersonalDataServer",
                    "serviceEndpoint": "https://pds.alice.example"
                },
                {
                    "id": "did:plc:alice#labeler",
                    "type": "AtprotoLabeler",
                    "serviceEndpoint": "https://labeler.alice.example"
                }
            ]
        })).unwrap();
        assert_eq!(doc.pds_endpoint(), Some("https://pds.alice.example"));
    }

    #[test]
    fn pds_endpoint_returns_none_when_no_pds_service() {
        let doc: DidDocument = serde_json::from_value(serde_json::json!({
            "service": []
        })).unwrap();
        assert!(doc.pds_endpoint().is_none());
    }
}
