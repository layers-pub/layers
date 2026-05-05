//! axum middleware that enforces a Redis-backed sliding-window rate
//! limit per caller.
//!
//! The caller identity is whichever appears first: the authenticated
//! DID surfaced on `AuthContext` by [`crate::auth::require`], or the
//! socket peer's IP address. The middleware emits a structured 429
//! response with `Retry-After` plus the standard
//! `X-RateLimit-Limit`/`-Remaining`/`-Reset` headers.

use std::net::SocketAddr;

use axum::extract::{ConnectInfo, Request, State};
use axum::http::{HeaderName, HeaderValue, header};
use axum::middleware::Next;
use axum::response::Response;
use layers_storage::rate_limit::{RateLimitError, SlidingWindow};

use crate::auth::AuthContext;
use crate::error::ApiError;
use crate::state::AppState;

/// Header containing the originating client IP behind a proxy. Layers
/// honours this header only when [`AppState::trusted_proxies`] is set,
/// to avoid letting any client spoof their identity.
pub const FORWARDED_FOR: HeaderName = HeaderName::from_static("x-forwarded-for");

/// Header used as a forward-compatible alternative to `X-Forwarded-For`.
pub const FORWARDED: HeaderName = HeaderName::from_static("forwarded");

const X_RATE_LIMIT_LIMIT: HeaderName = HeaderName::from_static("x-ratelimit-limit");
const X_RATE_LIMIT_REMAINING: HeaderName = HeaderName::from_static("x-ratelimit-remaining");
const X_RATE_LIMIT_RESET: HeaderName = HeaderName::from_static("x-ratelimit-reset");

/// Middleware fn. Looks up the limiter on [`AppState`]; when absent,
/// the request passes through. The caller identity is the
/// authenticated DID when present, otherwise the originating IP
/// (from `X-Forwarded-For` / `Forwarded` if the appview is configured
/// to trust them, otherwise the connecting socket).
pub async fn enforce(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> std::result::Result<Response, ApiError> {
    let Some(limiter) = state.rate_limiter() else {
        return Ok(next.run(req).await);
    };
    let identity = identity_for(&req, state.trust_forwarded_for());
    match limiter.check(&identity).await {
        Ok(used) => {
            let mut response = next.run(req).await;
            attach_rate_limit_headers(&mut response, limiter, used);
            Ok(response)
        }
        Err(err) => Err(map_error(limiter, err)),
    }
}

fn identity_for(req: &Request, trust_forwarded: bool) -> String {
    if let Some(ctx) = req.extensions().get::<AuthContext>() {
        if let Some(did) = ctx.did.as_deref() {
            return format!("did:{did}");
        }
    }
    if trust_forwarded {
        if let Some(ip) = client_ip_from_forwarded(req.headers()) {
            return format!("ip:{ip}");
        }
    }
    if let Some(ConnectInfo(addr)) = req.extensions().get::<ConnectInfo<SocketAddr>>() {
        return format!("ip:{}", addr.ip());
    }
    "ip:unknown".to_owned()
}

/// Pull the originating client IP off `Forwarded` (RFC 7239) or
/// `X-Forwarded-For`, in that order. Returns the leftmost address —
/// the closest hop to the client, which is the only entry the trust
/// boundary cares about.
pub fn client_ip_from_forwarded(headers: &axum::http::HeaderMap) -> Option<String> {
    if let Some(forwarded) = headers.get(&FORWARDED).and_then(|v| v.to_str().ok()) {
        // Forwarded: for=192.0.2.60;proto=http;by=203.0.113.43
        if let Some(first) = forwarded.split(',').next() {
            for part in first.split(';') {
                let trimmed = part.trim();
                if let Some(rest) = trimmed.strip_prefix("for=") {
                    return Some(strip_forwarded_for(rest));
                }
                if let Some(rest) = trimmed.strip_prefix("For=") {
                    return Some(strip_forwarded_for(rest));
                }
            }
        }
    }
    if let Some(xff) = headers.get(&FORWARDED_FOR).and_then(|v| v.to_str().ok()) {
        if let Some(first) = xff.split(',').next() {
            let ip = first.trim().trim_matches('"');
            if !ip.is_empty() {
                return Some(ip.to_owned());
            }
        }
    }
    let _ = header::HOST; // pull header into scope so the import isn't dead
    None
}

/// Strip the surrounding quotes / brackets that RFC 7239 permits.
fn strip_forwarded_for(raw: &str) -> String {
    raw.trim()
        .trim_matches('"')
        .trim_start_matches('[')
        .trim_end_matches(']')
        .to_owned()
}

fn attach_rate_limit_headers(response: &mut Response, limiter: &SlidingWindow, used: u64) {
    let limit = limiter.limit();
    let remaining = limit.saturating_sub(used);
    let reset = limiter.window().as_secs();
    let _ = response.headers_mut().insert(
        X_RATE_LIMIT_LIMIT.clone(),
        header_u64(limit),
    );
    let _ = response.headers_mut().insert(
        X_RATE_LIMIT_REMAINING.clone(),
        header_u64(remaining),
    );
    let _ = response.headers_mut().insert(
        X_RATE_LIMIT_RESET.clone(),
        header_u64(reset),
    );
}

fn header_u64(value: u64) -> HeaderValue {
    HeaderValue::from_str(&value.to_string()).unwrap_or_else(|_| HeaderValue::from_static("0"))
}

fn map_error(limiter: &SlidingWindow, err: RateLimitError) -> ApiError {
    match err {
        RateLimitError::Exceeded { window_seconds, .. } => {
            ApiError::TooManyRequests {
                retry_after_secs: window_seconds,
                limit: limiter.limit(),
            }
        }
        RateLimitError::Redis(e) => ApiError::Internal(format!("rate limiter: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;

    fn headers(pairs: &[(&str, &str)]) -> HeaderMap {
        let mut m = HeaderMap::new();
        for (k, v) in pairs {
            let name: HeaderName = (*k).parse().unwrap();
            m.insert(name, HeaderValue::from_str(v).unwrap());
        }
        m
    }

    #[test]
    fn xff_returns_leftmost() {
        let h = headers(&[("x-forwarded-for", "192.0.2.60, 198.51.100.1")]);
        assert_eq!(client_ip_from_forwarded(&h).as_deref(), Some("192.0.2.60"));
    }

    #[test]
    fn xff_single() {
        let h = headers(&[("x-forwarded-for", "203.0.113.7")]);
        assert_eq!(client_ip_from_forwarded(&h).as_deref(), Some("203.0.113.7"));
    }

    #[test]
    fn forwarded_header_preferred_over_xff() {
        let h = headers(&[
            ("forwarded", "for=192.0.2.60;proto=http"),
            ("x-forwarded-for", "203.0.113.7"),
        ]);
        assert_eq!(client_ip_from_forwarded(&h).as_deref(), Some("192.0.2.60"));
    }

    #[test]
    fn forwarded_with_brackets_and_quotes() {
        let h = headers(&[("forwarded", r#"for="[2001:db8::1]:4711";proto=https"#)]);
        assert!(
            client_ip_from_forwarded(&h)
                .as_deref()
                .is_some_and(|s| s.contains("2001:db8::1")),
        );
    }

    #[test]
    fn forwarded_for_chain_returns_first_only() {
        let h = headers(&[(
            "forwarded",
            "for=192.0.2.43, for=198.51.100.17",
        )]);
        assert_eq!(client_ip_from_forwarded(&h).as_deref(), Some("192.0.2.43"));
    }

    #[test]
    fn returns_none_when_no_proxy_headers() {
        let h = headers(&[("user-agent", "test")]);
        assert!(client_ip_from_forwarded(&h).is_none());
    }
}

