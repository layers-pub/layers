//! Uniform error type and HTTP status mapping.
//!
//! XRPC clients expect errors as `{"error": "Code", "message": "..."}`,
//! so [`ApiError`] renders to that envelope on `IntoResponse`. Codes
//! follow the `ATProto` convention: `BadRequest`, `Unauthorized`,
//! `Forbidden`, `NotFound`, `InternalError`.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use thiserror::Error;

/// Result alias used in the handler layer.
pub type Result<T> = std::result::Result<T, ApiError>;

/// All errors that can leave a handler.
#[derive(Debug, Error)]
pub enum ApiError {
    /// Bad input from the client.
    #[error("bad request: {0}")]
    BadRequest(String),
    /// Missing or invalid authentication.
    #[error("unauthorized: {0}")]
    Unauthorized(String),
    /// Authenticated but not authorised for this method.
    #[error("forbidden: {0}")]
    Forbidden(String),
    /// Resource not found.
    #[error("not found: {0}")]
    NotFound(String),
    /// Caller exceeded their rate-limit budget.
    #[error("rate limit exceeded: {limit}/window")]
    TooManyRequests {
        /// Seconds until the limit resets.
        retry_after_secs: u64,
        /// Configured request budget per window.
        limit: u64,
    },
    /// Internal server error.
    #[error("internal: {0}")]
    Internal(String),
}

impl ApiError {
    fn status(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::Forbidden(_) => StatusCode::FORBIDDEN,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::TooManyRequests { .. } => StatusCode::TOO_MANY_REQUESTS,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn code(&self) -> &'static str {
        match self {
            Self::BadRequest(_) => "BadRequest",
            Self::Unauthorized(_) => "Unauthorized",
            Self::Forbidden(_) => "Forbidden",
            Self::NotFound(_) => "NotFound",
            Self::TooManyRequests { .. } => "RateLimitExceeded",
            Self::Internal(_) => "InternalError",
        }
    }
}

#[derive(Serialize)]
struct ErrorBody<'a> {
    error: &'a str,
    message: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = self.status();
        let code = self.code();
        let message = self.to_string();
        let mut response = (
            status,
            Json(ErrorBody {
                error: code,
                message,
            }),
        )
            .into_response();
        if let Self::TooManyRequests {
            retry_after_secs,
            limit,
        } = self
        {
            use axum::http::{HeaderName, HeaderValue};
            let headers = response.headers_mut();
            let _ = headers.insert(
                HeaderName::from_static("retry-after"),
                HeaderValue::from_str(&retry_after_secs.to_string()).unwrap(),
            );
            let _ = headers.insert(
                HeaderName::from_static("x-ratelimit-limit"),
                HeaderValue::from_str(&limit.to_string()).unwrap(),
            );
            let _ = headers.insert(
                HeaderName::from_static("x-ratelimit-remaining"),
                HeaderValue::from_static("0"),
            );
            let _ = headers.insert(
                HeaderName::from_static("x-ratelimit-reset"),
                HeaderValue::from_str(&retry_after_secs.to_string()).unwrap(),
            );
        }
        response
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => Self::NotFound("record not found".into()),
            other => Self::Internal(format!("database: {other}")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use http_body_util::BodyExt;

    async fn render(err: ApiError) -> (StatusCode, axum::http::HeaderMap, serde_json::Value) {
        let resp = err.into_response();
        let status = resp.status();
        let headers = resp.headers().clone();
        let body = resp.into_body().collect().await.unwrap().to_bytes();
        let value: serde_json::Value = serde_json::from_slice(&body).expect("json");
        (status, headers, value)
    }

    #[tokio::test]
    async fn bad_request_renders_400_with_atproto_envelope() {
        let (status, _, body) = render(ApiError::BadRequest("missing uri".into())).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(body["error"], "BadRequest");
        assert!(body["message"].as_str().unwrap().contains("missing uri"));
    }

    #[tokio::test]
    async fn unauthorized_renders_401() {
        let (status, _, body) = render(ApiError::Unauthorized("no bearer".into())).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(body["error"], "Unauthorized");
    }

    #[tokio::test]
    async fn forbidden_renders_403() {
        let (status, _, body) = render(ApiError::Forbidden("scope missing".into())).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
        assert_eq!(body["error"], "Forbidden");
    }

    #[tokio::test]
    async fn not_found_renders_404() {
        let (status, _, body) = render(ApiError::NotFound("missing".into())).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body["error"], "NotFound");
    }

    #[tokio::test]
    async fn internal_renders_500() {
        let (status, _, body) = render(ApiError::Internal("boom".into())).await;
        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(body["error"], "InternalError");
    }

    #[tokio::test]
    async fn too_many_requests_carries_rate_limit_headers() {
        let (status, headers, body) = render(ApiError::TooManyRequests {
            retry_after_secs: 60,
            limit: 120,
        })
        .await;
        assert_eq!(status, StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(body["error"], "RateLimitExceeded");
        assert_eq!(headers.get("retry-after").unwrap(), "60");
        assert_eq!(headers.get("x-ratelimit-limit").unwrap(), "120");
        assert_eq!(headers.get("x-ratelimit-remaining").unwrap(), "0");
        assert_eq!(headers.get("x-ratelimit-reset").unwrap(), "60");
    }

    #[tokio::test]
    async fn sqlx_row_not_found_maps_to_not_found() {
        let api: ApiError = sqlx::Error::RowNotFound.into();
        let (status, _, body) = render(api).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body["error"], "NotFound");
    }
}
