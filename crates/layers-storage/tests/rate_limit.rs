//! Integration tests for the Redis-backed sliding-window rate limiter.
//!
//! Boots a real Redis 7 container and exercises the four behaviours
//! the orchestrator depends on:
//!
//! 1. The first `limit` requests inside a window are admitted.
//! 2. The (limit+1)th request inside the same window is denied with
//!    a structured error carrying the used/limit/window fields.
//! 3. Requests under one identity do not affect another identity's
//!    budget.
//! 4. After the window elapses, the budget refills.

use std::time::Duration;

use layers_storage::rate_limit::{RateLimitError, SlidingWindow};
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::redis::Redis;

async fn boot_redis() -> (testcontainers::ContainerAsync<Redis>, redis::aio::ConnectionManager) {
    let container = Redis::default()
        .start()
        .await
        .expect("start redis container");
    let host_port = container
        .get_host_port_ipv4(6379)
        .await
        .expect("redis host port");
    let url = format!("redis://127.0.0.1:{host_port}");
    let conn = layers_storage::redis_cache::connect(&url)
        .await
        .expect("redis connect");
    (container, conn)
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn allows_under_limit_then_denies_excess() {
    let (_container, conn) = boot_redis().await;
    let limiter = SlidingWindow::new(conn, 3, Duration::from_secs(60));

    let used1 = limiter.check("did:plc:alice").await.expect("1st ok");
    assert_eq!(used1, 1);
    let used2 = limiter.check("did:plc:alice").await.expect("2nd ok");
    assert_eq!(used2, 2);
    let used3 = limiter.check("did:plc:alice").await.expect("3rd ok");
    assert_eq!(used3, 3);

    let err = limiter.check("did:plc:alice").await.unwrap_err();
    match err {
        RateLimitError::Exceeded { used, limit, window_seconds } => {
            assert_eq!(used, 4);
            assert_eq!(limit, 3);
            assert_eq!(window_seconds, 60);
        }
        other => panic!("expected Exceeded, got {other:?}"),
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn identities_have_independent_budgets() {
    let (_container, conn) = boot_redis().await;
    let limiter = SlidingWindow::new(conn, 2, Duration::from_secs(60));

    limiter.check("did:plc:alice").await.expect("alice 1");
    limiter.check("did:plc:alice").await.expect("alice 2");
    assert!(matches!(
        limiter.check("did:plc:alice").await.unwrap_err(),
        RateLimitError::Exceeded { .. }
    ));

    // Bob is unaffected.
    limiter.check("did:plc:bob").await.expect("bob 1");
    limiter.check("did:plc:bob").await.expect("bob 2");
    assert!(matches!(
        limiter.check("did:plc:bob").await.unwrap_err(),
        RateLimitError::Exceeded { .. }
    ));
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn window_refills_after_expiry() {
    let (_container, conn) = boot_redis().await;
    let limiter = SlidingWindow::new(conn, 2, Duration::from_millis(500));

    limiter.check("did:plc:carol").await.expect("1st ok");
    limiter.check("did:plc:carol").await.expect("2nd ok");
    assert!(matches!(
        limiter.check("did:plc:carol").await.unwrap_err(),
        RateLimitError::Exceeded { .. }
    ));

    tokio::time::sleep(Duration::from_millis(700)).await;
    let used_after = limiter.check("did:plc:carol").await.expect("post-window ok");
    assert_eq!(used_after, 1, "budget should refill after window expiry");
}
