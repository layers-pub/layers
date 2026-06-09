//! Redis cache helpers for the Layers appview.
//!
//! Owns the connection-manager wiring + key conventions used by the
//! orchestrator's response cache and the OAuth session store. The
//! firehose path does not write here; cache invalidation on record
//! updates is the orchestrator's job (it knows which queries the
//! mutation invalidates).

use redis::Client;
use redis::aio::ConnectionManager;

/// Build a `ConnectionManager` from a Redis URL.
///
/// # Errors
/// Returns the underlying [`redis::RedisError`] when the URL is
/// malformed or the initial connection fails.
pub async fn connect(url: &str) -> Result<ConnectionManager, redis::RedisError> {
    let client = Client::open(url)?;
    ConnectionManager::new(client).await
}

/// Conventional cache-key prefix for orchestrator response caching.
pub const RESPONSE_CACHE_PREFIX: &str = "layers:resp:";

/// Conventional cache-key prefix for rate-limit sliding-windows.
pub const RATE_LIMIT_PREFIX: &str = "layers:rl:";

/// Conventional cache-key prefix for OAuth session persistence.
pub const OAUTH_SESSION_PREFIX: &str = "layers:oauth:";
