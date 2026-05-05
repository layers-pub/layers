//! Shared application state plumbed through axum extractors.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use layers_auth::did::{DidResolver, DidWebResolver};
use layers_storage::ExternalRecordSink;
use metrics_exporter_prometheus::PrometheusHandle;
use sqlx::PgPool;

/// Shared state passed to every handler.
#[derive(Clone)]
pub struct AppState {
    inner: Arc<Inner>,
}

struct Inner {
    pool: PgPool,
    ready: AtomicBool,
    service_did: String,
    resolver: Arc<dyn DidResolver>,
    metrics: Option<PrometheusHandle>,
    rate_limiter: Option<layers_storage::SlidingWindow>,
    redis: Option<redis::aio::ConnectionManager>,
    trust_forwarded_for: bool,
    oauth_metadata: Option<crate::oauth::OAuthClientMetadata>,
    external_sink: Option<Arc<dyn ExternalRecordSink>>,
    lens_applier: Option<Arc<dyn crate::lens::LensApplier>>,
}

impl AppState {
    /// Build an app state that is immediately ready, with the default
    /// `did:web` + `did:plc` resolver.
    #[must_use]
    pub fn ready(pool: PgPool, service_did: impl Into<String>) -> Self {
        Self::builder(pool, service_did)
            .resolver(Arc::new(DidWebResolver::new()))
            .ready(true)
            .build()
    }

    /// Build an app state that starts not ready.
    #[must_use]
    pub fn warming(pool: PgPool, service_did: impl Into<String>) -> Self {
        Self::builder(pool, service_did)
            .resolver(Arc::new(DidWebResolver::new()))
            .ready(false)
            .build()
    }

    /// Start a builder for fine-grained construction.
    #[must_use]
    pub fn builder(pool: PgPool, service_did: impl Into<String>) -> AppStateBuilder {
        AppStateBuilder {
            pool,
            service_did: service_did.into(),
            ready: true,
            resolver: None,
            metrics: None,
            rate_limiter: None,
            redis: None,
            trust_forwarded_for: false,
            oauth_metadata: None,
            external_sink: None,
            lens_applier: None,
        }
    }

    /// Borrow the Prometheus handle, if a recorder was installed.
    #[must_use]
    pub fn metrics(&self) -> Option<&PrometheusHandle> {
        self.inner.metrics.as_ref()
    }

    /// Borrow the rate limiter, if one is configured.
    #[must_use]
    pub fn rate_limiter(&self) -> Option<&layers_storage::SlidingWindow> {
        self.inner.rate_limiter.as_ref()
    }

    /// Borrow the Redis connection, if one is configured. Used by the
    /// readiness probe to verify downstream connectivity.
    #[must_use]
    pub fn redis(&self) -> Option<redis::aio::ConnectionManager> {
        self.inner.redis.clone()
    }

    /// Whether the orchestrator should honour `X-Forwarded-For` /
    /// `Forwarded` headers when determining the caller's IP.
    /// Operators set this `true` only when the orchestrator sits
    /// behind a trusted reverse proxy.
    #[must_use]
    pub fn trust_forwarded_for(&self) -> bool {
        self.inner.trust_forwarded_for
    }

    /// Borrow the OAuth client metadata, if the appview is configured
    /// as an OAuth client.
    #[must_use]
    pub fn oauth_metadata(&self) -> Option<&crate::oauth::OAuthClientMetadata> {
        self.inner.oauth_metadata.as_ref()
    }

    /// Borrow the external-record sink, if one is configured. The
    /// `getExternal` import handler uses it to persist on-demand
    /// fetches.
    #[must_use]
    pub fn external_sink(&self) -> Option<&dyn ExternalRecordSink> {
        self.inner.external_sink.as_deref()
    }

    /// Borrow the lens applier, if one is configured. The
    /// `applyLens` handler uses it to project foreign records into
    /// `pub.layers.*` shapes.
    #[must_use]
    pub fn lens_applier(&self) -> Option<Arc<dyn crate::lens::LensApplier>> {
        self.inner.lens_applier.as_ref().map(Arc::clone)
    }

    /// Borrow the configured DID resolver.
    #[must_use]
    pub fn resolver(&self) -> Arc<dyn DidResolver> {
        Arc::clone(&self.inner.resolver)
    }

    /// Mark the application ready. Idempotent.
    pub fn mark_ready(&self) {
        self.inner.ready.store(true, Ordering::SeqCst);
    }

    /// Probe readiness.
    #[must_use]
    pub fn is_ready(&self) -> bool {
        self.inner.ready.load(Ordering::SeqCst)
    }

    /// Borrow the connection pool.
    #[must_use]
    pub fn pool(&self) -> &PgPool {
        &self.inner.pool
    }

    /// DID of this appview (used as the expected `aud` in service-auth tokens).
    #[must_use]
    pub fn service_did(&self) -> &str {
        &self.inner.service_did
    }
}

/// Fluent builder for [`AppState`].
pub struct AppStateBuilder {
    pool: PgPool,
    service_did: String,
    ready: bool,
    resolver: Option<Arc<dyn DidResolver>>,
    metrics: Option<PrometheusHandle>,
    rate_limiter: Option<layers_storage::SlidingWindow>,
    redis: Option<redis::aio::ConnectionManager>,
    trust_forwarded_for: bool,
    oauth_metadata: Option<crate::oauth::OAuthClientMetadata>,
    external_sink: Option<Arc<dyn ExternalRecordSink>>,
    lens_applier: Option<Arc<dyn crate::lens::LensApplier>>,
}

impl AppStateBuilder {
    /// Override the default `did:web` resolver.
    #[must_use]
    pub fn resolver(mut self, resolver: Arc<dyn DidResolver>) -> Self {
        self.resolver = Some(resolver);
        self
    }

    /// Set the initial readiness flag.
    #[must_use]
    pub fn ready(mut self, ready: bool) -> Self {
        self.ready = ready;
        self
    }

    /// Attach a Prometheus handle to be served at `/metrics`.
    #[must_use]
    pub fn metrics(mut self, handle: PrometheusHandle) -> Self {
        self.metrics = Some(handle);
        self
    }

    /// Attach a rate limiter to be applied to every XRPC request.
    #[must_use]
    pub fn rate_limiter(mut self, limiter: layers_storage::SlidingWindow) -> Self {
        self.rate_limiter = Some(limiter);
        self
    }

    /// Attach a Redis connection so `/readyz` can probe it.
    #[must_use]
    pub fn redis(mut self, conn: redis::aio::ConnectionManager) -> Self {
        self.redis = Some(conn);
        self
    }

    /// Trust `X-Forwarded-For` / `Forwarded` headers when computing
    /// the caller IP. Set this only behind a trusted reverse proxy.
    #[must_use]
    pub fn trust_forwarded_for(mut self, trust: bool) -> Self {
        self.trust_forwarded_for = trust;
        self
    }

    /// Publish a static OAuth client metadata document at
    /// `/oauth/client-metadata.json`.
    #[must_use]
    pub fn oauth_metadata(mut self, meta: crate::oauth::OAuthClientMetadata) -> Self {
        self.oauth_metadata = Some(meta);
        self
    }

    /// Attach an external-record sink so on-demand imports persist
    /// fetched records into `external_records`.
    #[must_use]
    pub fn external_sink(mut self, sink: Arc<dyn ExternalRecordSink>) -> Self {
        self.external_sink = Some(sink);
        self
    }

    /// Attach a lens applier so `applyLens` and lens-on-import flows
    /// can project foreign records into `pub.layers.*` shapes.
    #[must_use]
    pub fn lens_applier(mut self, applier: Arc<dyn crate::lens::LensApplier>) -> Self {
        self.lens_applier = Some(applier);
        self
    }

    /// Finalise the state.
    #[must_use]
    pub fn build(self) -> AppState {
        AppState {
            inner: Arc::new(Inner {
                pool: self.pool,
                ready: AtomicBool::new(self.ready),
                service_did: self.service_did,
                resolver: self
                    .resolver
                    .unwrap_or_else(|| Arc::new(DidWebResolver::new())),
                metrics: self.metrics,
                rate_limiter: self.rate_limiter,
                redis: self.redis,
                trust_forwarded_for: self.trust_forwarded_for,
                oauth_metadata: self.oauth_metadata,
                external_sink: self.external_sink,
                lens_applier: self.lens_applier,
            }),
        }
    }
}
