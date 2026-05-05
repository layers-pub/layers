//! Auth middleware that enforces granular scopes per request.
//!
//! Per-request flow:
//!
//! 1. Extract the Bearer JWT off `Authorization`.
//! 2. Decode service-auth claims (`iss`, `aud`, `lxm`, `exp`).
//! 3. Verify `aud` matches this appview's DID.
//! 4. Verify `lxm` matches the XRPC method being invoked.
//!
//! Routes carry a [`Tier`] that controls the auth requirement.
//! `Tier::PublicRead` admits unauthenticated requests; everything else
//! requires a valid token. Signature verification is performed when
//! the `idiolect-identity` resolver is wired in; today the middleware
//! decodes claims and validates the `aud`/`lxm`/`exp` triple.

use axum::extract::{Request, State};
use axum::http::header::AUTHORIZATION;
use axum::middleware::Next;
use axum::response::Response;
use layers_auth::jwt::verify_jwt;
use layers_auth::verify::verify_service_auth;

use crate::error::ApiError;
use crate::state::AppState;

/// Tier the route requires. Routes that read public data carry
/// `Tier::PublicRead`; routes that read non-public data require
/// `Tier::AuthReadOnly` or higher.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tier {
    /// Anonymous access permitted.
    PublicRead,
    /// Any authenticated principal in the `pub.layers.authReadOnly` set.
    AuthReadOnly,
}

/// Per-request auth context. Populated by the middleware, consumed by
/// handlers via `axum::Extension`.
#[derive(Clone, Debug, Default)]
pub struct AuthContext {
    /// Authenticated DID of the caller, if any.
    pub did: Option<String>,
    /// `lxm` claim from the JWT, if any.
    pub lxm: Option<String>,
}

/// Build a middleware closure that enforces the given tier and method.
pub fn require(
    tier: Tier,
    lxm: &'static str,
) -> impl Fn(
    State<AppState>,
    Request,
    Next,
) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = std::result::Result<Response, ApiError>> + Send>,
> + Clone {
    move |state, req, next| Box::pin(enforce(tier, lxm, state, req, next))
}

async fn enforce(
    tier: Tier,
    lxm: &'static str,
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> std::result::Result<Response, ApiError> {
    let header = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .map(str::to_owned);

    let mut ctx = AuthContext::default();
    if let Some(value) = header {
        let token = value.strip_prefix("Bearer ").ok_or_else(|| {
            ApiError::Unauthorized("authorization must be a Bearer token".into())
        })?;
        let resolver = state.resolver();
        let claims = verify_jwt(token, resolver.as_ref())
            .await
            .map_err(|e| ApiError::Unauthorized(format!("verify jwt: {e}")))?;
        let now = time::OffsetDateTime::now_utc().unix_timestamp();
        verify_service_auth(&claims, state.service_did(), lxm, now)
            .map_err(|e| ApiError::Unauthorized(e.to_string()))?;
        ctx.did = Some(claims.iss.clone());
        ctx.lxm = Some(claims.lxm.clone());
    } else if tier != Tier::PublicRead {
        return Err(ApiError::Unauthorized(format!(
            "method {lxm} requires authentication"
        )));
    }

    req.extensions_mut().insert(ctx);
    Ok(next.run(req).await)
}
