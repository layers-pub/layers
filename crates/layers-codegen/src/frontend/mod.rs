//! Frontend codegen umbrella.
//!
//! Extends the Layers codegen pipeline so the Next.js frontend at
//! `layers/web/` derives every spec-shaped artefact (typed XRPC
//! fetcher schema, `TanStack` Query hooks, lens registry, form
//! scaffolds) from the same lexicons and orchestrator spec the Rust
//! backend uses. The driver entry point is [`cmd_frontend`], invoked
//! from the `frontend` subcommand of `layers-codegen`.
//!
//! Each step writes to a sub-tree under `layers/web/`. Drift is
//! detected by re-running the emitter and comparing bytes; the
//! `check` subcommand reuses the same machinery.

use std::path::Path;
use std::process::ExitCode;

use anyhow::{Context, Result};

pub mod forms;
pub mod fragments;
pub mod lenses;
pub mod mutations;
pub mod queries;
pub mod registry;
pub mod schema;
pub mod ts;
pub mod views;

/// Run every frontend codegen step end-to-end.
pub fn cmd_frontend(repo_root: &Path, check_only: bool) -> Result<ExitCode> {
    let mut drift = false;
    drift |= queries::emit(repo_root, check_only)?;
    drift |= lenses::emit(repo_root, check_only)?;
    drift |= forms::emit(repo_root, check_only)?;
    drift |= mutations::emit(repo_root, check_only)?;
    drift |= schema::emit(repo_root, check_only)?;
    drift |= registry::emit(repo_root, check_only)?;
    drift |= views::emit(repo_root, check_only)?;
    if drift {
        Ok(ExitCode::from(1))
    } else {
        Ok(ExitCode::SUCCESS)
    }
}

/// Write `content` to `path`, or (in check mode) report drift without
/// writing. Returns `true` when the on-disk file differs.
///
/// # Errors
/// Propagates filesystem read/write failures.
pub(crate) fn write_or_check(path: &Path, content: &str, check_only: bool) -> Result<bool> {
    let actual = std::fs::read_to_string(path).unwrap_or_default();
    if actual == content {
        return Ok(false);
    }
    if check_only {
        eprintln!("drift in {}", path.display());
        Ok(true)
    } else {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("creating {}", parent.display()))?;
        }
        std::fs::write(path, content).with_context(|| format!("writing {}", path.display()))?;
        Ok(false)
    }
}
