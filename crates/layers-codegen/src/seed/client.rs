//! Minimal PDS client for the seed publisher.
//!
//! Only the three endpoints the publisher needs:
//! - `com.atproto.server.createSession` — exchange handle + password for an access token.
//! - `com.atproto.repo.putRecord` — write a record at `(repo, collection, rkey)`.
//! - `com.atproto.repo.getRecord` — fetch the current record body for fingerprint comparison.
//!
//! No streaming, no firehose, no blob handling — those live in
//! `idiolect-indexer` and friends. This crate-internal client stays
//! tiny because the seed pipeline only ever writes typed records.

use anyhow::{Context, Result, anyhow};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

/// Per-account credentials. Loaded from `notes/pds-secrets/<handle>.env`
/// (gitignored) by the publisher entry-point.
#[derive(Debug, Clone)]
pub struct AccountCredentials {
    /// PDS-resolvable handle (`auth.layers.pub`, `paradigms.resource.layers.pub`, …).
    pub handle: String,
    /// Account password (the canonical app password the operator created at bootstrap).
    pub password: String,
}

/// Authenticated session returned by `createSession`.
///
/// Mirrors the AT Protocol response shape; `handle`/`refresh_jwt` are parsed
/// for completeness even though the seed publisher only reads `access_jwt`.
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code, reason = "deserialization target mirrors the wire response")]
pub struct Session {
    pub did: String,
    pub handle: String,
    #[serde(rename = "accessJwt")]
    pub access_jwt: String,
    #[serde(rename = "refreshJwt")]
    pub refresh_jwt: String,
}

#[derive(Debug, Clone)]
pub struct PdsClient {
    base_url: String,
    http: Client,
}

impl PdsClient {
    /// Build a client pointed at a PDS host (e.g. `https://pds.layers.pub`).
    pub fn new(base_url: impl Into<String>) -> Result<Self> {
        let http = Client::builder()
            .connect_timeout(Duration::from_secs(8))
            .timeout(Duration::from_secs(30))
            .user_agent("layers-codegen/0.1 (seed-publisher)")
            .build()
            .context("building reqwest client")?;
        let base_url = base_url.into();
        Ok(Self {
            base_url: base_url.trim_end_matches('/').to_owned(),
            http,
        })
    }

    /// Sign in and return an access-token-bearing session.
    pub async fn create_session(&self, creds: &AccountCredentials) -> Result<Session> {
        #[derive(Serialize)]
        struct Req<'a> {
            identifier: &'a str,
            password: &'a str,
        }
        let url = format!("{}/xrpc/com.atproto.server.createSession", self.base_url);
        let resp = self
            .http
            .post(&url)
            .json(&Req {
                identifier: &creds.handle,
                password: &creds.password,
            })
            .send()
            .await
            .with_context(|| format!("POST {url}"))?;
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(anyhow!(
                "createSession for {} failed: {} {}",
                creds.handle,
                status,
                body
            ));
        }
        let session: Session = serde_json::from_str(&body)
            .with_context(|| format!("decoding createSession response: {body}"))?;
        Ok(session)
    }

    /// Fetch a record's current body, returning `None` on 404.
    pub async fn get_record(
        &self,
        repo: &str,
        collection: &str,
        rkey: &str,
    ) -> Result<Option<Value>> {
        let url = format!(
            "{}/xrpc/com.atproto.repo.getRecord?repo={}&collection={}&rkey={}",
            self.base_url, repo, collection, rkey
        );
        let resp = self.http.get(&url).send().await?;
        if resp.status() == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(anyhow!("getRecord {url} failed: {status} {body}"));
        }
        let parsed: Value = serde_json::from_str(&body)?;
        Ok(parsed.get("value").cloned())
    }

    /// Write a record. Idempotent on the server side: putRecord is a
    /// "replace at this key" operation, so re-uploading identical
    /// content with the same rkey is a no-op (the PDS dedupes via the
    /// content CID).
    pub async fn put_record(
        &self,
        session: &Session,
        collection: &str,
        rkey: &str,
        record: &Value,
    ) -> Result<PutResult> {
        #[derive(Serialize)]
        struct Req<'a> {
            repo: &'a str,
            collection: &'a str,
            rkey: &'a str,
            record: &'a Value,
            validate: bool,
        }
        let url = format!("{}/xrpc/com.atproto.repo.putRecord", self.base_url);
        let resp = self
            .http
            .post(&url)
            .bearer_auth(&session.access_jwt)
            .json(&Req {
                repo: &session.did,
                collection,
                rkey,
                record,
                validate: false,
            })
            .send()
            .await?;
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(anyhow!(
                "putRecord {collection}/{rkey} failed: {status} {body}"
            ));
        }
        let parsed: PutResult = serde_json::from_str(&body)
            .with_context(|| format!("decoding putRecord response: {body}"))?;
        Ok(parsed)
    }
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code, reason = "deserialization target mirrors the wire response")]
pub struct PutResult {
    pub uri: String,
    pub cid: String,
}
