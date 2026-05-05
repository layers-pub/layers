//! Emit `web/lib/lenses/generated/registry.ts` from
//! `lexicons/lenses/manifest.json`.
//!
//! The frontend `/lenses` browse page (and any "View as Layers"
//! affordance on a foreign-record card) reads this registry as the
//! source of truth for which panproto lens connects which
//! source/target NSID pair, including the hand-authored DSL source so
//! the detail drawer can show it without an extra fetch.
//!
//! Output is composed from typed [`TsItem`] nodes; see
//! [`super::ts`] for the IR.

use std::path::Path;

use anyhow::{Context, Result};
use serde::Deserialize;

use super::ts::{TsItem, TsModule};

#[derive(Debug, Deserialize)]
struct ManifestEntry {
    name: String,
    source_nsid: String,
    target_nsid: String,
}

#[derive(Debug, Deserialize)]
struct Manifest {
    #[serde(rename = "authoring_did")]
    authoring_did: String,
    entries: Vec<ManifestEntry>,
}

#[derive(Debug, Deserialize)]
struct LensYaml {
    id: String,
    #[serde(default)]
    description: Option<String>,
}

/// Read the manifest + each lens.yaml; emit the registry. Returns
/// true on drift in `check_only`.
pub fn emit(repo_root: &Path, check_only: bool) -> Result<bool> {
    let manifest_path = repo_root.join("lexicons/lenses/manifest.json");
    let raw = std::fs::read_to_string(&manifest_path)
        .with_context(|| format!("reading {}", manifest_path.display()))?;
    let manifest: Manifest = serde_json::from_str(&raw)
        .with_context(|| format!("parsing {} as json", manifest_path.display()))?;

    let mut module = TsModule::new();
    module.leading_comment = Some(
        "Generated registry of every panproto lens declared in\n\
`layers/lexicons/lenses/manifest.json`. The frontend imports this\n\
for the `/lenses` browse page and the lens detail drawer."
            .into(),
    );
    module.item(TsItem::Raw(LENS_REGISTRY_INTERFACE.into()));

    let mut entries: Vec<String> = Vec::with_capacity(manifest.entries.len());
    for entry in &manifest.entries {
        let yaml_path = repo_root
            .join("lexicons/lenses")
            .join(&entry.name)
            .join("lens.yaml");
        let dsl_source = std::fs::read_to_string(&yaml_path)
            .with_context(|| format!("reading {}", yaml_path.display()))?;
        let parsed: LensYaml = serde_yaml::from_str(&dsl_source)
            .with_context(|| format!("parsing {} as yaml", yaml_path.display()))?;
        let description = parsed
            .description
            .as_deref()
            .map(str::trim)
            .unwrap_or("")
            .to_owned();
        let lens_uri = format!(
            "at://{}/dev.panproto.schema.lens/{}",
            manifest.authoring_did, entry.name
        );
        entries.push(format!(
            "  {{\n    name: {name},\n    sourceNsid: {src},\n    targetNsid: {tgt},\n    lensUri: {uri},\n    description: {desc},\n    id: {id},\n    dslSource: {dsl},\n  }}",
            name = ts_string_literal(&entry.name),
            src = ts_string_literal(&entry.source_nsid),
            tgt = ts_string_literal(&entry.target_nsid),
            uri = ts_string_literal(&lens_uri),
            desc = ts_string_literal(&description),
            id = ts_string_literal(&parsed.id),
            dsl = ts_string_literal(&dsl_source),
        ));
    }

    module.item(TsItem::Const {
        doc: Some("Every panproto lens registered with the codegen pipeline.".into()),
        exported: true,
        name: "lensRegistry".into(),
        annotation: Some("readonly LensRegistryEntry[]".into()),
        value: format!("[\n{},\n]", entries.join(",\n")),
    });
    module.item(TsItem::Raw(REGISTRY_HELPERS.into()));

    let out_path = repo_root.join("web/lib/lenses/generated/registry.ts");
    let content = module.emit();
    let actual = std::fs::read_to_string(&out_path).unwrap_or_default();
    if actual == content {
        return Ok(false);
    }
    if check_only {
        eprintln!("drift in {}", out_path.display());
        return Ok(true);
    }
    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&out_path, &content)
        .with_context(|| format!("writing {}", out_path.display()))?;
    println!("wrote {}", out_path.display());
    Ok(false)
}

const LENS_REGISTRY_INTERFACE: &str = "export interface LensRegistryEntry {\n  /** Folder name; matches the AT-URI rkey of the lens record. */\n  readonly name: string;\n  /** Source NSID the lens applies to. */\n  readonly sourceNsid: string;\n  /** Target NSID the lens projects into. */\n  readonly targetNsid: string;\n  /** AT-URI of the published lens record. */\n  readonly lensUri: string;\n  /** Human-readable description from the lens YAML. */\n  readonly description: string;\n  /** Lens identifier (`id` field of the YAML). */\n  readonly id: string;\n  /** Verbatim lens DSL source (YAML), inlined for the detail drawer. */\n  readonly dslSource: string;\n}\n";

const REGISTRY_HELPERS: &str = "/** Look a lens up by source NSID. Returns the first match (registration order). */\nexport function findLensBySource(sourceNsid: string): LensRegistryEntry | undefined {\n  return lensRegistry.find((entry) => entry.sourceNsid === sourceNsid);\n}\n\n/** All distinct upstream NSID prefixes covered by the registry. */\nexport function lensSourcePrefixes(): readonly string[] {\n  const prefixes = new Set<string>();\n  for (const entry of lensRegistry) {\n    const head = entry.sourceNsid.split('.').slice(0, 2).join('.');\n    prefixes.add(head);\n  }\n  return Array.from(prefixes).sort();\n}\n";

/// Encode `s` as a TypeScript double-quoted string literal. Falls
/// back to a backtick template-literal when the string spans multiple
/// lines so generated YAML reads naturally in the registry file.
fn ts_string_literal(s: &str) -> String {
    if s.contains('\n') {
        let escaped = s
            .replace('\\', "\\\\")
            .replace('`', "\\`")
            .replace("${", "\\${");
        format!("`{escaped}`")
    } else {
        let escaped = s.replace('\\', "\\\\").replace('"', "\\\"");
        format!("\"{escaped}\"")
    }
}
