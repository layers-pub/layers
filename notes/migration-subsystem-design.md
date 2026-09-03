# Layers lexicon migration subsystem (quivers-pattern), design + proven recipe

Written 2026-07-22. Adopts the quivers `qvr migrate` pattern for `pub.layers.*`:
a panproto VCS of the lexicons plus a composable lens between every adjacent release,
and a user-facing batch data-migration command. Confirmed by spiking against the real
lexicons and the panproto Python API in lairs's venv.

## Decisions (owner-confirmed)

- VCS lives at **`lexicons/.panproto/`** in the appview repo (not `lexicons/vcs/`; no
  extra `vcs` dir).
- **Commit every lexicon version in order** and write **a composable lens between each
  adjacent pair**. Autolens where it works; hand-write the lens where it does not.
- The user-facing **batch migration lives in lairs** (`lairs migrate`), Python, using the
  panproto Python API directly (as quivers does). lairs vendors the `.panproto/` VCS and
  lens specs alongside the lexicon tree it already vendors.

## The full chain: 8 existing versions

`v0.1.0 v0.2.0 v0.3.0 v0.4.0 v0.5.0 v0.6.0 v0.7.0 v0.8.0`, all git-tagged, plus `v0.9.0`
to be authored. So 7 adjacent lenses now, an 8th when 0.9.0 lands. Each hop composes via
`ProtolensChain` so any version can migrate to any later one.

## How Layers differs from quivers

quivers migrates SOURCE TEXT (`.qvr`) via token-local span edits. Layers migrates DATA
RECORDS (`pub.layers.*` JSON) via **panproto lenses** (`chain.get(record)` forward,
round-trip laws), which is the toolkit's `atproto-migration.md` example exactly and
matches the project's "panproto lenses only" rule.

## Proven pipeline (spiked, works)

The panproto Python API in lairs's venv (panproto 0.58.0) has every piece:
- `panproto.parse_atproto_lexicon(text) -> Schema` (wraps Rust
  `web_document::atproto::parse_lexicon`; walks a lexicon's defs into vertices/edges).
  VERIFIED: parses a real `corpus/corpus.json` into a `Schema`.
- `Schema.from_atproto_lexicon`, `Schema.to_json`, `to_dict`, `normalize`, `validate`.
- `panproto.auto_generate_lens(a, b, stringency=...)` -> best validated morphism + a
  quality score; `auto_generate_lens_candidates`; `diff_and_classify` / `diff_schemas`
  (backward / breaking classification); `ProtolensChain` (compose + get/put).
- `VcsRepository` (in-memory, content-addressed DAG, colimit merge) BUT minimal surface
  (`add`, `list_refs` only).

The on-disk VCS at `lexicons/.panproto/` is built by the **`schema` CLI** (init, commit,
tag, log, diff, lens generate/compose/verify, data migrate/convert/sync). So the build is
a HYBRID: Python does atproto ingestion; the CLI owns the persisted VCS.

The batch command a user runs is `schema data migrate <dir> [--range] [--dry-run]
[--coverage]` under the hood, wrapped as `lairs migrate` over a fetched account's records
(lairs already pulls a whole repo at ~5.5 MB/s and has a local content-addressed store).

## Two open assembly questions (resolve in the build's first step)

1. **Merge 26 lexicon files into one Schema per version.** `parse_atproto_lexicon` takes
   ONE document; a Layers version is 90 files. Need either a schema-union/merge (colimit
   via the repo, or SchemaBuilder re-assembly) or a combined-document parse. No `merge`
   method on `Schema` directly; `VcsRepository` merge is colimit-based. This is the one
   real unknown.
2. **Python -> CLI handoff for persistence.** Python parses+merges -> `schema.to_json()`
   (panproto format) -> the `schema` CLI stages/commits/tags into `lexicons/.panproto/`.
   Confirm the CLI ingests panproto-format schema JSON (it rejected RAW lexicons wanting a
   `protocol` field, which the panproto-format JSON supplies).

## Tooling note

The global `schema` CLI is **0.40.0** while the library is **0.58.0**. Per the
always-latest policy, update the CLI before building, or drive the VCS entirely through
the Python API if it gains commit/tag persistence at 0.58.0.

## What ships per release, going forward

Every lexicon release now includes: the `.panproto/` commit + tag for that version, the
lens from the prior version (auto or hand-written), a lens-law verification, and a
migration-guide doc entry. `lairs migrate` is built once and reused. A coverage check
(every breaking change in `diff_and_classify` has a lens) gates CI, per the toolkit's
`data-migration.yml` template.

## Integration with 0.9.0

0.9.0 is the first release under this policy. Sequence: build the VCS over v0.1.0..v0.8.0
with their 7 lenses FIRST (retroactive backfill), then author the 0.9.0 lexicons, commit
v0.9.0, write the v0.8.0->v0.9.0 lens (the clean breaks: `digest`->`contentDigest`,
`dataLink` refs -> `catalogRef` need explicit lenses; the additive changes autolens).
