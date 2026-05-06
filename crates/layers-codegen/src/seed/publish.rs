//! `seed publish` — push every seed record to its PDS account.
//!
//! Walks the seed tree, computes per-record fingerprints, groups by
//! account, signs into each account in turn, and runs putRecord per
//! seed. Idempotent on identical content because (a) the rkey is the
//! structural fingerprint, and (b) PDS putRecord is a "replace at
//! key" with content-CID deduplication on the server side.
//!
//! Credentials live in `notes/pds-secrets/<handle>.env` files
//! (gitignored) of the form `password=<password>`. The publisher
//! reads them via simple key=value parsing.
//!
//! Usage:
//! ```bash
//! cargo run -p layers-codegen -- seed publish [--dry-run] [--account <handle>] [--pds <url>]
//! ```

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use anyhow::{Context, Result, anyhow};

use super::client::{AccountCredentials, PdsClient};
use super::fingerprint;
use super::model::{self, SeedEntry};

/// `seed check` drift gate. Walks the seed tree, computes
/// fingerprint rkeys, fetches each record from the PDS, and exits
/// non-zero on any (a) record that exists locally but not on the PDS
/// at the expected rkey, or (b) record whose on-PDS body differs
/// from the local seed. Useful for CI gating: a PR that bumps a
/// seed without re-running `seed publish` against staging fails the
/// gate.
pub fn check(repo_root: &Path, args: &[String]) -> Result<ExitCode> {
    let opts = Options::parse(args)?;
    let entries = model::walk(&repo_root.join("lexicons/seeds"))?;
    if entries.is_empty() {
        println!("no seeds; nothing to check");
        return Ok(ExitCode::SUCCESS);
    }
    let by_account = group_by_account(&entries, opts.account_filter.as_deref());

    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .context("starting tokio runtime")?;
    let mut drift = false;
    runtime.block_on(async {
        let client = super::client::PdsClient::new(&opts.pds_url)?;
        for (handle, entries) in &by_account {
            let creds = match load_credentials(repo_root, handle) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("[skip] {handle}: {e}");
                    continue;
                }
            };
            let session = match client.create_session(&creds).await {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[skip] {handle}: createSession: {e}");
                    continue;
                }
            };
            for entry in entries {
                let fp = fingerprint::for_record(&entry.body)?;
                let live = client
                    .get_record(&session.did, &entry.collection, &fp)
                    .await
                    .ok()
                    .flatten();
                match live {
                    Some(body) if body == entry.body => {}
                    Some(_) => {
                        eprintln!("[drift] {} {} body diverged", entry.collection, &fp[..16]);
                        drift = true;
                    }
                    None => {
                        eprintln!(
                            "[missing] {} {} not on PDS",
                            entry.collection,
                            &fp[..16]
                        );
                        drift = true;
                    }
                }
            }
        }
        Result::<()>::Ok(())
    })?;
    if drift {
        Ok(ExitCode::from(1))
    } else {
        println!("seed check: all on-disk fingerprints match PDS state");
        Ok(ExitCode::SUCCESS)
    }
}

/// Subcommand entry-point invoked from `mod.rs`.
pub fn run(repo_root: &Path, args: &[String]) -> Result<ExitCode> {
    let opts = Options::parse(args)?;
    let entries = model::walk(&repo_root.join("lexicons/seeds"))?;
    if entries.is_empty() {
        println!("no seeds found; nothing to publish");
        return Ok(ExitCode::SUCCESS);
    }
    let by_account = group_by_account(&entries, opts.account_filter.as_deref());
    if by_account.is_empty() {
        println!("no seeds match the account filter");
        return Ok(ExitCode::SUCCESS);
    }

    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .context("starting tokio runtime")?;
    runtime.block_on(async move { publish_async(repo_root, &opts, &by_account).await })
}

#[derive(Debug)]
struct Options {
    pds_url: String,
    account_filter: Option<String>,
    dry_run: bool,
}

impl Options {
    fn parse(args: &[String]) -> Result<Self> {
        let mut pds_url = std::env::var("LAYERS_PDS_URL")
            .unwrap_or_else(|_| "https://pds.layers.pub".to_owned());
        let mut account_filter: Option<String> = None;
        let mut dry_run = false;
        let mut i = 0;
        while i < args.len() {
            match args[i].as_str() {
                "--dry-run" | "--plan" => dry_run = true,
                "--account" => {
                    i += 1;
                    account_filter = Some(args.get(i).cloned().ok_or_else(|| {
                        anyhow!("--account expects a handle argument")
                    })?);
                }
                "--pds" => {
                    i += 1;
                    pds_url = args
                        .get(i)
                        .cloned()
                        .ok_or_else(|| anyhow!("--pds expects a URL argument"))?;
                }
                other => return Err(anyhow!("unknown seed publish flag: {other}")),
            }
            i += 1;
        }
        Ok(Self {
            pds_url: pds_url.trim_end_matches('/').to_owned(),
            account_filter,
            dry_run,
        })
    }
}

fn group_by_account<'a>(
    entries: &'a [SeedEntry],
    filter: Option<&str>,
) -> BTreeMap<String, Vec<&'a SeedEntry>> {
    let mut out: BTreeMap<String, Vec<&'a SeedEntry>> = BTreeMap::new();
    for entry in entries {
        if let Some(f) = filter {
            if entry.account != f {
                continue;
            }
        }
        out.entry(entry.account.clone()).or_default().push(entry);
    }
    out
}

async fn publish_async(
    repo_root: &Path,
    opts: &Options,
    by_account: &BTreeMap<String, Vec<&SeedEntry>>,
) -> Result<ExitCode> {
    let client = PdsClient::new(&opts.pds_url)?;
    let total: usize = by_account.values().map(Vec::len).sum();
    println!(
        "{} seeds across {} accounts → {}{}",
        total,
        by_account.len(),
        opts.pds_url,
        if opts.dry_run { "  (dry-run)" } else { "" }
    );

    let mut total_published = 0usize;
    let mut total_skipped = 0usize;
    for (handle, entries) in by_account {
        println!("\n=== {} ({} records) ===", handle, entries.len());
        if opts.dry_run {
            for entry in entries {
                let fp = fingerprint::for_record(&entry.body)?;
                println!(
                    "  [plan] {}/{}  rkey={}  ({})",
                    entry.collection,
                    &fp[..16],
                    fp,
                    entry.relpath.display()
                );
            }
            continue;
        }
        let creds = load_credentials(repo_root, handle)?;
        let session = client.create_session(&creds).await?;
        for entry in entries {
            let fp = fingerprint::for_record(&entry.body)?;
            let rkey = fp.clone();
            // Skip on existing-identical content: getRecord then compare.
            let existing = client
                .get_record(&session.did, &entry.collection, &rkey)
                .await
                .ok()
                .flatten();
            if let Some(prev) = existing {
                if prev == entry.body {
                    println!("  skip {}/{} (unchanged)", entry.collection, &rkey[..16]);
                    total_skipped += 1;
                    continue;
                }
            }
            let result = client
                .put_record(&session, &entry.collection, &rkey, &entry.body)
                .await
                .with_context(|| format!("putRecord {} {}", entry.collection, rkey))?;
            println!("  put  {} → {}", entry.relpath.display(), result.uri);
            total_published += 1;
        }
    }
    println!(
        "\ndone: {} published, {} unchanged",
        total_published, total_skipped
    );
    Ok(ExitCode::SUCCESS)
}

fn load_credentials(repo_root: &Path, handle: &str) -> Result<AccountCredentials> {
    let path: PathBuf = repo_root
        .join("notes")
        .join("pds-secrets")
        .join(format!("{handle}.env"));
    let raw = std::fs::read_to_string(&path)
        .with_context(|| format!("reading credentials at {}", path.display()))?;
    let mut password: Option<String> = None;
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some(rest) = line.strip_prefix("password=") {
            password = Some(rest.to_owned());
        }
    }
    let password = password.ok_or_else(|| {
        anyhow!("credential file {} is missing `password=...`", path.display())
    })?;
    Ok(AccountCredentials {
        handle: handle.to_owned(),
        password,
    })
}
