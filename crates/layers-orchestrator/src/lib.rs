//! HTTP query surface for the Layers appview.
//!
//! The orchestrator is the API server half of the two-process appview
//! architecture. It owns the axum router, the auth middleware stack
//! (request id, tracing, scope enforcement, error mapping), and the
//! per-NSID query handlers that read from `layers-storage`. The route
//! catalogue is declared in `orchestrator-spec/queries.json`; routes
//! mount under `/xrpc/<nsid>`.

#![cfg_attr(docsrs, feature(doc_cfg))]

pub mod auth;
pub mod error;
pub mod generated_routes;
pub mod import;
pub mod lens;
pub mod metrics;
pub mod oauth;
pub mod queries;
pub mod rate_limit;
pub mod router;
pub mod state;

pub use error::{ApiError, Result};
pub use router::build_router;
pub use state::AppState;
