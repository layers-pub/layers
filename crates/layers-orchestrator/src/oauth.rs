//! OAuth client metadata endpoint.
//!
//! Per the `ATProto` OAuth spec, an appview that registers as an OAuth
//! client publishes a JSON document at a stable URL describing itself
//! (DID, redirect URIs, scopes, JWKS endpoint). This module renders
//! that document at `/oauth/client-metadata.json` from
//! [`OAuthClientConfig`] held on [`AppState`].
//!
//! The shipped shape matches the spec's `application/json` schema for
//! `client-metadata` documents; it is not a full OAuth provider — the
//! appview is an OAuth client, and the resource server side is
//! handled by `layers-auth::verify_jwt`.

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};

use crate::state::AppState;

/// Client metadata published at `/oauth/client-metadata.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthClientMetadata {
    /// Stable client identifier — usually the URL of this document.
    pub client_id: String,
    /// Human-readable application name.
    pub client_name: String,
    /// URL of the appview's homepage.
    pub client_uri: String,
    /// URL of the appview's logo (PNG / SVG).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_uri: Option<String>,
    /// Per-app DID (`did:web:<this app's host>`).
    pub dpop_bound_access_tokens: bool,
    /// Allowed redirect URIs after auth.
    pub redirect_uris: Vec<String>,
    /// Token-endpoint auth method.
    pub token_endpoint_auth_method: String,
    /// JWKS URI used to verify the client's signed assertions.
    pub jwks_uri: String,
    /// Application type — always `web` for the appview.
    pub application_type: String,
    /// Grant types this client supports.
    pub grant_types: Vec<String>,
    /// Response types this client supports (`code` for `ATProto` OAuth).
    pub response_types: Vec<String>,
    /// Scope string — space-separated `include:` references.
    pub scope: String,
    /// PAR-required flag (`true` per the `ATProto` profile).
    pub require_pushed_authorization_requests: bool,
}

/// Caller-supplied configuration. Built once at boot and shared via
/// [`AppState`]. The shipped defaults reference the six tiered
/// permission-set lexicons under `pub.layers.auth*`.
#[derive(Debug, Clone)]
pub struct OAuthClientConfig {
    /// Public origin of the appview, e.g. `https://layers.pub`.
    pub origin: String,
    /// Display name to surface in OAuth consent screens.
    pub display_name: String,
    /// Allowed redirect URIs (must include the public callback URL).
    pub redirect_uris: Vec<String>,
    /// JWKS URI; defaults to `<origin>/.well-known/jwks.json`.
    pub jwks_uri: Option<String>,
}

impl OAuthClientConfig {
    /// Build a config with sensible defaults: every redirect URI under
    /// `<origin>/oauth/callback`, JWKS at `/.well-known/jwks.json`, and
    /// scope `include:pub.layers.authReadOnly`.
    #[must_use]
    pub fn defaults_for(origin: impl Into<String>) -> Self {
        let origin = origin.into();
        let trimmed = origin.trim_end_matches('/');
        let redirect = format!("{trimmed}/oauth/callback");
        Self {
            origin: trimmed.to_owned(),
            display_name: "Layers".into(),
            redirect_uris: vec![redirect],
            jwks_uri: None,
        }
    }

    /// Resolve the runtime metadata document.
    #[must_use]
    pub fn into_metadata(self) -> OAuthClientMetadata {
        let origin = self.origin.trim_end_matches('/').to_owned();
        let client_id = format!("{origin}/oauth/client-metadata.json");
        let jwks_uri = self
            .jwks_uri
            .unwrap_or_else(|| format!("{origin}/.well-known/jwks.json"));
        OAuthClientMetadata {
            client_id,
            client_name: self.display_name,
            client_uri: origin.clone(),
            logo_uri: None,
            dpop_bound_access_tokens: true,
            redirect_uris: self.redirect_uris,
            token_endpoint_auth_method: "private_key_jwt".into(),
            jwks_uri,
            application_type: "web".into(),
            grant_types: vec!["authorization_code".into(), "refresh_token".into()],
            response_types: vec!["code".into()],
            scope: "atproto transition:generic include:pub.layers.authReadOnly".into(),
            require_pushed_authorization_requests: true,
        }
    }
}

/// Handler for `GET /oauth/client-metadata.json`.
pub async fn client_metadata(State(state): State<AppState>) -> impl IntoResponse {
    match state.oauth_metadata() {
        Some(meta) => (StatusCode::OK, Json(meta.clone())).into_response(),
        None => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "error": "OAuthNotConfigured",
                "message": "this appview is not configured as an OAuth client"
            })),
        )
            .into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_compute_callback_and_jwks() {
        let cfg = OAuthClientConfig::defaults_for("https://layers.pub/");
        let meta = cfg.into_metadata();
        assert_eq!(
            meta.client_id,
            "https://layers.pub/oauth/client-metadata.json"
        );
        assert_eq!(meta.jwks_uri, "https://layers.pub/.well-known/jwks.json");
        assert_eq!(
            meta.redirect_uris,
            vec!["https://layers.pub/oauth/callback".to_owned()]
        );
        assert!(meta.dpop_bound_access_tokens);
        assert!(meta.require_pushed_authorization_requests);
    }

    #[test]
    fn explicit_jwks_uri_wins() {
        let cfg = OAuthClientConfig {
            origin: "https://layers.pub".into(),
            display_name: "Layers".into(),
            redirect_uris: vec!["https://layers.pub/oauth/callback".into()],
            jwks_uri: Some("https://layers.pub/keys.json".into()),
        };
        let meta = cfg.into_metadata();
        assert_eq!(meta.jwks_uri, "https://layers.pub/keys.json");
    }
}
