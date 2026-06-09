//! Seed pipeline.
//!
//! Reads the YAML record-set tree under `lexicons/seeds/`, computes a
//! structural-fingerprint rkey for each record, and either lists the
//! plan, runs a dry-run against a live PDS, publishes, or gates drift.
//! Subcommands dispatch from [`run`].
//!
//! Hierarchy: each YAML file under `lexicons/seeds/<account>/<file>.yaml`
//! describes one record. The directory name is the PDS handle (the
//! `<leaf>.<…>.<namespace>.layers.pub` of the catalogue) so the
//! handle-to-content mapping is the file path, no metadata needed.

use std::path::Path;
use std::process::ExitCode;

use anyhow::{Context, Result};

pub mod client;
pub mod fingerprint;
pub mod model;
pub mod publish;
pub mod resolve;
pub mod stamp;

/// Dispatch entry point invoked by `main.rs`.
pub fn run(repo_root: &Path, args: &[String]) -> Result<ExitCode> {
    let sub = args.first().map_or("help", String::as_str);
    match sub {
        "list" => list(repo_root),
        "plan" => {
            eprintln!("seed plan not yet implemented; falling back to list");
            list(repo_root)
        }
        "publish" => publish::run(repo_root, &args[1..]),
        "check" => publish::check(repo_root, &args[1..]),
        "help" | "--help" | "-h" => {
            help();
            Ok(ExitCode::SUCCESS)
        }
        other => {
            eprintln!("unknown seed subcommand: {other}");
            help();
            Ok(ExitCode::from(2))
        }
    }
}

fn help() {
    eprintln!(
        "layers-codegen seed — publish canonical content to the PDS\n\n\
         USAGE:\n    layers-codegen seed <SUBCOMMAND>\n\n\
         SUBCOMMANDS:\n    list      Walk lexicons/seeds/ and print every record + its fingerprint rkey\n    plan      Dry-run that prints the planned publishes without network I/O\n    publish   Push every seed to its account on the PDS (idempotent on fingerprint match)\n    check     Drift gate; non-zero if any seed's fingerprint differs from on-PDS state\n    help      Show this message\n"
    );
}

/// Walk the seeds tree and print each (account, rkey, file) triple.
fn list(repo_root: &Path) -> Result<ExitCode> {
    let seeds_dir = repo_root.join("lexicons/seeds");
    if !seeds_dir.exists() {
        println!("no seeds tree at {} — nothing to list", seeds_dir.display());
        return Ok(ExitCode::SUCCESS);
    }
    let entries =
        model::walk(&seeds_dir).with_context(|| format!("walking {}", seeds_dir.display()))?;
    if entries.is_empty() {
        println!("seeds tree is empty");
        return Ok(ExitCode::SUCCESS);
    }
    for entry in &entries {
        let fp = fingerprint::for_record(&entry.body)?;
        println!(
            "{:60} {}  {}",
            entry.account,
            &fp[..16],
            entry.relpath.display()
        );
    }
    println!(
        "\n{} seeds across {} accounts",
        entries.len(),
        entries
            .iter()
            .map(|e| &e.account)
            .collect::<std::collections::BTreeSet<_>>()
            .len()
    );
    Ok(ExitCode::SUCCESS)
}
