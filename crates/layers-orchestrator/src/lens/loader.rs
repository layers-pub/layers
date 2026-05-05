//! Filesystem loader: scans `lexicons/lenses/<name>/` and populates
//! `(InMemoryResolver, InMemorySchemaLoader, registry)` on
//! [`PanprotoLensApplier`] from the codegen-emitted record bodies.
//!
//! Each lens entry on disk consists of three files:
//!
//! - `source.schema.record.json` — `dev.panproto.schema.schema` body
//!   whose blob is a base64-url msgpack-encoded `panproto_schema::Schema`.
//! - `target.schema.record.json` — same, for the target schema.
//! - `lens.record.json` — `dev.panproto.schema.lens` body whose blob
//!   is a base64-url msgpack-encoded `idiolect_lens::runtime::LensBody`.
//!
//! The orchestrator's boot path calls [`load_lenses_from_dir`] with
//! the path to `lexicons/lenses/`; the manifest at the same path
//! supplies `(source_nsid, target_nsid)` for the registry mapping.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use base64::Engine;
use idiolect_lens::AtUri;
use idiolect_lens::resolver::InMemoryResolver;
use idiolect_lens::runtime::LensBody;
use idiolect_lens::schema_loader::InMemorySchemaLoader;
use idiolect_records::PanprotoLens as PanprotoLensRecord;
use panproto_schema::{Protocol, Schema};
use serde::Deserialize;

use super::{LensRegistration, PanprotoLensApplier};

/// Manifest entry shape (subset; matches what codegen reads).
#[derive(Debug, Deserialize)]
struct ManifestEntry {
    name: String,
    source_nsid: String,
    target_nsid: String,
}

#[derive(Debug, Deserialize)]
struct Manifest {
    authoring_did: String,
    entries: Vec<ManifestEntry>,
}

/// Errors raised while loading lenses from disk.
#[derive(Debug, thiserror::Error)]
pub enum LoadError {
    /// IO failure reading a lens artefact.
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    /// JSON parse failure on a record envelope.
    #[error("parse {path}: {message}")]
    Parse {
        /// Path to the file that failed to parse.
        path: PathBuf,
        /// serde_json error message.
        message: String,
    },
    /// Base64 decode failure on a blob.
    #[error("base64 {0}")]
    Base64(String),
    /// msgpack decode failure on a blob.
    #[error("msgpack {0}")]
    Msgpack(String),
    /// Malformed AT-URI on a record.
    #[error("at-uri {0}")]
    AtUri(String),
}

/// Wire shape we expect on the codegen-emitted records. Mirrors
/// `layers-codegen::lenses::SchemaRecord` / `LensRecord`.
#[derive(Debug, Deserialize)]
struct EnvelopeBlob {
    base64: String,
}

#[derive(Debug, Deserialize)]
struct SchemaEnvelope {
    blob: EnvelopeBlob,
}

#[derive(Debug, Deserialize)]
struct LensEnvelope {
    #[serde(rename = "sourceSchema")]
    source_schema: String,
    #[serde(rename = "targetSchema")]
    target_schema: String,
    #[serde(rename = "objectHash")]
    object_hash: String,
    blob: EnvelopeBlob,
    #[serde(rename = "createdAt")]
    created_at: String,
}

/// Load every lens under `dir` (expected layout: `manifest.json`
/// at the dir root and one subfolder per entry). Returns a fully
/// configured [`PanprotoLensApplier`].
///
/// # Errors
/// See [`LoadError`].
pub fn load_lenses_from_dir(dir: &Path) -> Result<PanprotoLensApplier, LoadError> {
    let manifest_path = dir.join("manifest.json");
    let manifest_raw = std::fs::read_to_string(&manifest_path)?;
    let manifest: Manifest = serde_json::from_str(&manifest_raw).map_err(|e| LoadError::Parse {
        path: manifest_path.clone(),
        message: e.to_string(),
    })?;

    let mut resolver = InMemoryResolver::new();
    let mut schemas = InMemorySchemaLoader::new();
    let mut registry: HashMap<String, LensRegistration> = HashMap::new();

    for entry in &manifest.entries {
        let entry_dir = dir.join(&entry.name);
        let source_uri =
            install_schema(&entry_dir, "source", &entry.name, &manifest.authoring_did, &mut schemas)?;
        let target_uri =
            install_schema(&entry_dir, "target", &entry.name, &manifest.authoring_did, &mut schemas)?;
        let lens_uri = install_lens(
            &entry_dir,
            &entry.name,
            &manifest.authoring_did,
            &source_uri,
            &target_uri,
            &mut resolver,
        )?;
        registry.insert(
            entry.source_nsid.clone(),
            LensRegistration {
                lens_uri,
                target_nsid: entry.target_nsid.clone(),
            },
        );
    }

    Ok(PanprotoLensApplier::with_registry(
        Arc::new(resolver),
        Arc::new(schemas),
        Protocol::default(),
        registry,
    ))
}

fn install_schema(
    entry_dir: &Path,
    side: &str,
    lens_name: &str,
    authoring_did: &str,
    schemas: &mut InMemorySchemaLoader,
) -> Result<AtUri, LoadError> {
    let path = entry_dir.join(format!("{side}.schema.record.json"));
    let raw = std::fs::read_to_string(&path)?;
    let env: SchemaEnvelope = serde_json::from_str(&raw).map_err(|e| LoadError::Parse {
        path: path.clone(),
        message: e.to_string(),
    })?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(env.blob.base64.as_bytes())
        .map_err(|e| LoadError::Base64(format!("{}: {e}", path.display())))?;
    let schema: Schema =
        rmp_serde::from_slice(&bytes).map_err(|e| LoadError::Msgpack(format!("{}: {e}", path.display())))?;
    let object_hash = sha256_hex(&bytes);
    schemas.insert(object_hash, schema);
    let rkey = format!("{lens_name}-{side}");
    let uri_str = format!("at://{authoring_did}/dev.panproto.schema.schema/{rkey}");
    AtUri::parse(&uri_str).map_err(|e| LoadError::AtUri(format!("{uri_str}: {e}")))
}

fn install_lens(
    entry_dir: &Path,
    lens_name: &str,
    authoring_did: &str,
    source_uri: &AtUri,
    target_uri: &AtUri,
    resolver: &mut InMemoryResolver,
) -> Result<AtUri, LoadError> {
    let path = entry_dir.join("lens.record.json");
    let raw = std::fs::read_to_string(&path)?;
    let env: LensEnvelope = serde_json::from_str(&raw).map_err(|e| LoadError::Parse {
        path: path.clone(),
        message: e.to_string(),
    })?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(env.blob.base64.as_bytes())
        .map_err(|e| LoadError::Base64(format!("{}: {e}", path.display())))?;
    // We don't need to deserialize the LensBody here — the resolver
    // hands it back to apply_lens which msgpack-decodes it itself.
    // But validate the bytes parse so we fail fast at boot rather
    // than at first apply.
    let _: LensBody =
        rmp_serde::from_slice(&bytes).map_err(|e| LoadError::Msgpack(format!("{}: {e}", path.display())))?;

    let _ = (source_uri, target_uri);
    let _ = env.source_schema;
    let _ = env.target_schema;

    let rkey = format!("{lens_name}");
    let uri_str = format!("at://{authoring_did}/dev.panproto.schema.lens/{rkey}");
    let uri = AtUri::parse(&uri_str).map_err(|e| LoadError::AtUri(format!("{uri_str}: {e}")))?;

    let lens_record = PanprotoLensRecord {
        blob: Some(serde_json::Value::Array(
            bytes.iter().map(|b| serde_json::Value::Number((*b).into())).collect(),
        )),
        created_at: idiolect_records::Datetime::parse(&env.created_at)
            .map_err(|e| LoadError::Parse {
                path: path.clone(),
                message: format!("createdAt: {e}"),
            })?,
        laws_verified: None,
        object_hash: env.object_hash,
        round_trip_class: None,
        source_schema: source_uri.clone(),
        target_schema: target_uri.clone(),
    };
    resolver.insert(&uri, lens_record);
    Ok(uri)
}

fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lens::LensApplier;

    fn lenses_dir() -> PathBuf {
        let manifest = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR");
        Path::new(&manifest)
            .parent()
            .expect("crates dir")
            .parent()
            .expect("workspace root")
            .join("lexicons/lenses")
    }

    #[test]
    fn loads_every_authored_lens_into_the_registry() {
        let dir = lenses_dir();
        if !dir.join("manifest.json").exists() {
            eprintln!("skipping: {} missing", dir.display());
            return;
        }
        let applier = load_lenses_from_dir(&dir).expect("load");
        let sources = applier.registered_sources();
        for nsid in [
            "at.margin.note",
            "at.margin.collection",
            "at.margin.collectionItem",
            "at.margin.reply",
            "site.standard.document",
            "site.standard.publication",
            "pub.leaflet.comment",
            "social.grain.gallery",
            "social.grain.gallery.item",
            "social.grain.photo.exif",
            "social.grain.comment",
            "social.grain.story",
            "network.cosmik.card",
            "network.cosmik.collection",
            "network.cosmik.collectionLink",
            "sh.tangled.repo",
            "sh.tangled.repo.issue",
            "sh.tangled.repo.issue.comment",
            "sh.tangled.repo.pull",
            "sh.tangled.repo.pull.comment",
            "place.stream.livestream",
            "place.stream.segment",
            "dev.idiolect.belief",
            "dev.idiolect.encounter",
            "dev.idiolect.retrospection",
            "com.voxport.podcast.episode",
            "com.voxport.podcast.series",
            "app.dropanchor.checkin",
            "app.dropanchor.comment",
            "at.mapped.post",
            "at.mapped.trail",
            "at.mapped.activity",
            "app.greengale.document",
            "app.greengale.publication",
            "app.beaconbits.beacon",
            "app.beaconbits.venue",
        ] {
            assert!(
                sources.contains(&nsid.to_owned()),
                "registry missing `{nsid}`; got {sources:?}"
            );
        }
        assert_eq!(sources.len(), 36);
    }
}
