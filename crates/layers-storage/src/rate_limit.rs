//! Redis-backed sliding-window rate limiter.
//!
//! `SlidingWindow` enforces "at most N requests per window seconds"
//! over a Redis sorted set keyed by the caller identity. Each request
//! adds the current millisecond timestamp as both score and member,
//! drops members older than `now - window`, and returns the count of
//! remaining members. Members carry the high-resolution clock to
//! avoid score collisions inside a single millisecond.

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use redis::aio::ConnectionManager;
use thiserror::Error;

use crate::redis_cache::RATE_LIMIT_PREFIX;

/// Errors returned by [`SlidingWindow::check`].
#[derive(Debug, Error)]
pub enum RateLimitError {
    /// Redis returned a transport / protocol error.
    #[error("redis: {0}")]
    Redis(#[from] redis::RedisError),
    /// The caller is over the configured budget for this window.
    #[error("rate limit exceeded: {used}/{limit} in last {window_seconds}s")]
    Exceeded {
        /// Requests counted inside the active window (including this one).
        used: u64,
        /// Configured limit.
        limit: u64,
        /// Window length in seconds.
        window_seconds: u64,
    },
}

/// Sliding-window rate limiter.
#[derive(Clone)]
pub struct SlidingWindow {
    conn: ConnectionManager,
    limit: u64,
    window: Duration,
}

impl std::fmt::Debug for SlidingWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SlidingWindow")
            .field("limit", &self.limit)
            .field("window", &self.window)
            .finish()
    }
}

impl SlidingWindow {
    /// Build a limiter that allows `limit` requests per `window`.
    #[must_use]
    pub fn new(conn: ConnectionManager, limit: u64, window: Duration) -> Self {
        Self { conn, limit, window }
    }

    /// Configured request limit per window.
    #[must_use]
    pub fn limit(&self) -> u64 {
        self.limit
    }

    /// Configured window length.
    #[must_use]
    pub fn window(&self) -> Duration {
        self.window
    }

    fn key(&self, identity: &str) -> String {
        format!("{RATE_LIMIT_PREFIX}{identity}")
    }

    /// Check whether `identity` may proceed and, if so, record this
    /// request. Returns the number of requests counted in the active
    /// window after recording (so the caller can populate
    /// `X-RateLimit-Remaining`).
    ///
    /// Atomic: the trim + count + insert path runs as a single Lua
    /// script on the Redis server, so two callers racing on the same
    /// identity never both observe `count < limit` and both insert.
    ///
    /// # Errors
    /// Returns [`RateLimitError::Exceeded`] when the caller is over
    /// budget; [`RateLimitError::Redis`] for transport failures.
    pub async fn check(&self, identity: &str) -> Result<u64, RateLimitError> {
        let mut conn = self.conn.clone();
        let key = self.key(identity);
        let now_ns = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or_default() as i64;
        let window_ns = self.window.as_nanos() as i64;
        let cutoff = now_ns - window_ns;
        let ttl_secs = self.window.as_secs() as i64 + 1;

        // The script returns the count *after* the would-be insert
        // when admitted (`{0, used}`), or `{1, used}` when denied. The
        // wrapper then maps the first slot to either `Ok(used)` or
        // `Err(Exceeded { used, .. })`.
        let script = redis::Script::new(LIMIT_SCRIPT);
        let (denied, used): (i64, u64) = script
            .key(&key)
            .arg(cutoff)
            .arg(now_ns)
            .arg(self.limit as i64)
            .arg(ttl_secs)
            .invoke_async(&mut conn)
            .await?;
        if denied == 1 {
            return Err(RateLimitError::Exceeded {
                used,
                limit: self.limit,
                window_seconds: self.window.as_secs().max(1),
            });
        }
        Ok(used)
    }
}

/// Atomic "trim + count + insert" Lua script.
///
/// `KEYS[1]`  the sorted-set key for the identity.
/// `ARGV[1]`  cutoff timestamp; entries below this are evicted.
/// `ARGV[2]`  the current timestamp used as both score and member.
/// `ARGV[3]`  the limit; values >= limit deny the call.
/// `ARGV[4]`  TTL applied after insertion (in seconds).
///
/// Returns `{denied, used}` where `denied` is `0` or `1`.
const LIMIT_SCRIPT: &str = r#"
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
local used = tonumber(redis.call('ZCARD', KEYS[1]))
local limit = tonumber(ARGV[3])
if used >= limit then
  return {1, used + 1}
end
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[4])
return {0, used + 1}
"#;
