//! Foreign-record lensing via the panproto runtime.
//!
//! Every transform that lifts a foreign `ATProto` record into a
//! `pub.layers.*` shape goes through [`idiolect_lens::apply_lens`].
//! There is no Rust-closure escape hatch: a transform exists only
//! when a `dev.panproto.schema.lens` record has been authored,
//! published, and registered against the orchestrator's
//! [`PanprotoLensApplier`].
//!
//! # Architecture
//!
//! [`LensApplier`] is the trait the orchestrator's `applyLens`
//! handler dispatches through. It returns a [`LensOutput`] carrying
//! the lensed body, the target NSID, and the lens AT-URI for audit.
//!
//! [`PanprotoLensApplier`] is the only impl. It holds:
//!
//! - A registry mapping each foreign source NSID to the AT-URI of
//!   the published lens plus the expected target NSID. Operators
//!   populate this at boot from a config file or by indexing
//!   `dev.panproto.schema.lens` records off the firehose.
//! - An [`idiolect_lens::Resolver`] for fetching lens records.
//! - An [`idiolect_lens::SchemaLoader`] for fetching source/target
//!   panproto schemas.
//! - A [`panproto_schema::Protocol`] the lens runtime resolves
//!   vertices against.
//!
//! Send bounds on the resolver/schema-loader trait methods (added
//! in idiolect-lens via the upstream PR for issue #53) let the
//! boxed futures cross thread-pool boundaries, so this struct can
//! sit on `AppState` behind `Arc<dyn LensApplier>`.

use std::collections::HashMap;
use std::sync::Arc;

use axum::Json;
use axum::extract::{Query, State};
use idiolect_lens::{ApplyLensInput, AtUri, Resolver, SchemaLoader, apply_lens};
use panproto_schema::Protocol;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

use crate::error::{ApiError, Result as ApiResult};
use crate::import::{ImportedRecord, fetch_or_cache};
use crate::state::AppState;

pub mod loader;

/// Output of [`LensApplier::apply`].
#[derive(Debug, Clone, Serialize)]
pub struct LensOutput {
    /// NSID of the projected target record (always under `pub.layers.*`).
    pub target_nsid: String,
    /// JSON body of the projected target record.
    pub value: Value,
    /// AT-URI of the `dev.panproto.schema.lens` record that produced
    /// this output.
    pub lens_uri: String,
}

/// Errors a [`LensApplier`] can raise.
#[derive(Debug, Error)]
pub enum LensError {
    /// No registered lens for the given source NSID.
    #[error("no lens registered for source nsid `{0}`")]
    NotRegistered(String),
    /// The panproto runtime rejected the input. The string carries
    /// the underlying [`idiolect_lens::LensError`] formatted for
    /// operators.
    #[error("apply: {0}")]
    Apply(String),
}

/// Trait the orchestrator's `applyLens` route dispatches through.
///
/// `&self` is `Send + Sync` so the applier can be cloned across
/// tokio tasks; the inner futures are `Send` because the underlying
/// idiolect-lens `Resolver`/`SchemaLoader` futures are `Send`.
#[async_trait::async_trait]
pub trait LensApplier: Send + Sync {
    /// Project a foreign record body into a Layers record body.
    ///
    /// # Errors
    /// [`LensError::NotRegistered`] when `source_nsid` has no lens
    /// in the registry; [`LensError::Apply`] for every other
    /// failure (resolver miss, schema loader miss, lens body
    /// rejected, runtime translation failure).
    async fn apply(
        &self,
        source_nsid: &str,
        source_value: &Value,
    ) -> std::result::Result<LensOutput, LensError>;

    /// Inspect the registry. Used by operators to confirm which
    /// foreign records the appview lenses today.
    fn registered_sources(&self) -> Vec<String>;
}

/// Registry entry: lens AT-URI plus the expected target NSID.
#[derive(Debug, Clone)]
pub struct LensRegistration {
    /// AT-URI of the published `dev.panproto.schema.lens` record.
    pub lens_uri: AtUri,
    /// Expected target NSID. Surfaced on [`LensOutput::target_nsid`]
    /// so callers can persist or forward the lensed body without
    /// re-introspecting the lens.
    pub target_nsid: String,
}

/// The only [`LensApplier`] impl. Routes through
/// [`idiolect_lens::apply_lens`] for every transform.
pub struct PanprotoLensApplier {
    /// `source_nsid -> (lens_uri, target_nsid)`.
    registry: HashMap<String, LensRegistration>,
    /// Lens record fetcher.
    resolver: Arc<dyn Resolver>,
    /// Source/target schema fetcher.
    schemas: Arc<dyn SchemaLoader>,
    /// Panproto protocol the runtime resolves vertices against.
    protocol: Protocol,
}

impl std::fmt::Debug for PanprotoLensApplier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // `resolver`/`schemas`/`protocol` are trait objects / opaque and not
        // usefully `Debug`; only the registry keys are printed.
        f.debug_struct("PanprotoLensApplier")
            .field("registered", &self.registry.keys().collect::<Vec<_>>())
            .finish_non_exhaustive()
    }
}

impl PanprotoLensApplier {
    /// Build an applier from caller-supplied resolver, schema
    /// loader, and protocol. Start with an empty registry and add
    /// entries via [`Self::register`].
    #[must_use]
    pub fn new(
        resolver: Arc<dyn Resolver>,
        schemas: Arc<dyn SchemaLoader>,
        protocol: Protocol,
    ) -> Self {
        Self {
            registry: HashMap::new(),
            resolver,
            schemas,
            protocol,
        }
    }

    /// Register a lens for `source_nsid`. Returns `self` for fluent
    /// composition.
    #[must_use]
    pub fn register(
        mut self,
        source_nsid: impl Into<String>,
        lens_uri: AtUri,
        target_nsid: impl Into<String>,
    ) -> Self {
        self.registry.insert(
            source_nsid.into(),
            LensRegistration {
                lens_uri,
                target_nsid: target_nsid.into(),
            },
        );
        self
    }

    /// Build with a pre-populated registry (used by the boot-time
    /// `loader::load_lenses_from_dir` path).
    #[must_use]
    pub fn with_registry(
        resolver: Arc<dyn Resolver>,
        schemas: Arc<dyn SchemaLoader>,
        protocol: Protocol,
        registry: HashMap<String, LensRegistration>,
    ) -> Self {
        Self {
            registry,
            resolver,
            schemas,
            protocol,
        }
    }

    /// Wrap into [`Arc<dyn LensApplier>`].
    #[must_use]
    pub fn into_dyn(self) -> Arc<dyn LensApplier> {
        Arc::new(self)
    }
}

#[async_trait::async_trait]
impl LensApplier for PanprotoLensApplier {
    async fn apply(
        &self,
        source_nsid: &str,
        source_value: &Value,
    ) -> std::result::Result<LensOutput, LensError> {
        let entry = self
            .registry
            .get(source_nsid)
            .ok_or_else(|| LensError::NotRegistered(source_nsid.to_owned()))?;
        let input = ApplyLensInput {
            lens_uri: entry.lens_uri.clone(),
            source_record: source_value.clone(),
            source_root_vertex: None,
        };
        // `Resolver` and `SchemaLoader` are blanket-impl'd on
        // `Arc<T: Resolver + ?Sized>` upstream, so `&self.resolver`
        // (a `&Arc<dyn Resolver>`) satisfies `apply_lens`'s `R:
        // Resolver` bound without `?Sized` propagation.
        let output = apply_lens(&self.resolver, &self.schemas, &self.protocol, input)
            .await
            .map_err(|e| LensError::Apply(format!("apply_lens: {e}")))?;
        Ok(LensOutput {
            target_nsid: entry.target_nsid.clone(),
            value: output.target_record,
            lens_uri: entry.lens_uri.to_string(),
        })
    }

    fn registered_sources(&self) -> Vec<String> {
        let mut out: Vec<String> = self.registry.keys().cloned().collect();
        out.sort();
        out
    }
}

/// Wire query for `pub.layers.integration.applyLens`.
#[derive(Debug, Deserialize)]
pub struct ApplyLensParams {
    /// AT-URI of the foreign record to project.
    pub uri: String,
    /// When `true`, force a refetch from the source PDS even if the
    /// foreign record is cached.
    #[serde(default)]
    pub fresh: bool,
}

/// Wire response for `pub.layers.integration.applyLens`.
#[derive(Debug, Serialize)]
pub struct AppliedLens {
    /// The imported source record (cache or fresh fetch).
    pub source: ImportedRecord,
    /// The lensed target record + metadata.
    pub target: LensOutput,
}

/// `GET /xrpc/pub.layers.integration.applyLens?uri=<at-uri>`.
pub async fn apply_lens_route(
    State(state): State<AppState>,
    Query(q): Query<ApplyLensParams>,
) -> ApiResult<Json<AppliedLens>> {
    let applier = state.lens_applier().ok_or_else(|| {
        ApiError::BadRequest("this appview is not configured with a lens applier".into())
    })?;
    let source = fetch_or_cache(&state, &q.uri, q.fresh).await?;
    let target = applier
        .apply(&source.nsid, &source.value)
        .await
        .map_err(|e| ApiError::BadRequest(format!("{e}")))?;
    Ok(Json(AppliedLens { source, target }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use idiolect_lens::resolver::InMemoryResolver;
    use idiolect_lens::schema_loader::InMemorySchemaLoader;

    fn empty_applier() -> PanprotoLensApplier {
        PanprotoLensApplier::new(
            Arc::new(InMemoryResolver::new()),
            Arc::new(InMemorySchemaLoader::new()),
            Protocol::default(),
        )
    }

    #[tokio::test]
    async fn unregistered_nsid_returns_not_registered() {
        let applier = empty_applier();
        let err = applier
            .apply("at.margin.note", &serde_json::json!({}))
            .await
            .unwrap_err();
        assert!(matches!(err, LensError::NotRegistered(s) if s == "at.margin.note"));
    }

    #[tokio::test]
    async fn registry_round_trips_through_register() {
        let lens_uri =
            AtUri::parse("at://did:plc:lensowner/dev.panproto.schema.lens/margin-note").unwrap();
        let applier = empty_applier().register(
            "at.margin.note",
            lens_uri,
            "pub.layers.annotation.annotationLayer",
        );
        let sources = applier.registered_sources();
        assert_eq!(sources, vec!["at.margin.note".to_owned()]);
    }

    #[tokio::test]
    async fn registered_nsid_with_missing_lens_record_surfaces_apply_error() {
        // Registry knows about the source NSID but the resolver has
        // no matching lens record — exactly the shape an operator
        // hits when they configure a lens URI before publishing the
        // record.
        let lens_uri = AtUri::parse(
            "at://did:plc:lensowner/dev.panproto.schema.lens/margin-note-not-published",
        )
        .unwrap();
        let applier = empty_applier().register(
            "at.margin.note",
            lens_uri,
            "pub.layers.annotation.annotationLayer",
        );
        let err = applier
            .apply("at.margin.note", &serde_json::json!({}))
            .await
            .unwrap_err();
        assert!(
            matches!(&err, LensError::Apply(msg) if msg.contains("apply_lens")),
            "expected Apply(apply_lens...), got {err:?}"
        );
    }
}
