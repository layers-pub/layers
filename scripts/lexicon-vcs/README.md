# Layers lexicon history

This crate builds the retroactive Panproto repository for the Layers record and
shared-definition lexicons. It reads the `v0.1.0` through `v0.8.0` Git tags,
excludes query and permission-set lexicons, and writes:

- one per-file project-schema commit and lightweight tag per release under
  `lexicons/.panproto`;
- one bundled ATProto schema per release under `lexicons/.schemas`;
- one adjacent structural migration per release pair under `lexicons/lenses`.

The dependency graph is pinned to Panproto v0.64.0.

## Build

Run the builder against a Layers Git worktree and an empty output directory:

```bash
cargo run \
  --manifest-path scripts/lexicon-vcs/Cargo.toml \
  --bin layers-lexicon-vcs \
  -- /path/to/layers /tmp/layers-lexicon-history
```

The builder refuses to replace an existing `.panproto` directory. This makes
rebuilding safe and leaves installation as an explicit step.

## Real-data round trip

Export a bounded sample from `layers-repo`, including authored seed records and
the acceptability and veridicality importers:

```bash
/path/to/layers-repo/.venv/bin/python \
  scripts/export_migration_samples.py \
  /path/to/layers-repo \
  /tmp/layers-migration-samples.json
```

Then migrate every record backward through every schema in which its collection
exists, validate every intermediate instance, and restore it forward with the
per-hop Panproto complements:

```bash
cargo run \
  --manifest-path scripts/lexicon-vcs/Cargo.toml \
  --bin roundtrip \
  -- lexicons/.schemas /tmp/layers-migration-samples.json
```

The command fails if an input record does not validate, an intermediate backward
view does not validate, Panproto cannot restore the source instance, or the final
JSON differs from the input.

## Panproto v0.64.0 compatibility

The repository builder stages project trees directly. This uses the v0.64.0
project-bundle parser while avoiding automatic homomorphism search for historical
additions and removals.

The round-trip runner uses an edge-aware projection before calling Panproto
`put`. Panproto v0.64.0 determines node survival from vertex anchors alone, which
can retain a shared-definition node after the record field that reached it has
been removed. The edge-aware projection drops that unreachable subtree into the
standard Panproto complement. It also resolves reference-to-inline changes, such
as the v0.8.0 structured citation to the earlier citation string, and preserves
the original array arc order when restoring the source instance.
