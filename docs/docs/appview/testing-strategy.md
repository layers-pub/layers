---
sidebar_label: Testing Strategy
sidebar_position: 12
---

# Testing Strategy

`cargo test --workspace` runs every test in the Rust workspace.

## Unit tests

Each crate ships `#[cfg(test)]` modules covering the trait-level
contracts. Notable examples:

- `layers-auth`: scope grammar parsing, service-auth `aud`/`lxm`/`exp`
  validation against synthetic claim sets, `did:web` URL derivation.
- `layers-storage::multi`: `MultiSink` forwards to every inner sink
  and short-circuits on first error.
- `layers-verify`: round-trip runner against three reference lenses
  (identity, add/drop, lossy).
- `layers-observer`: annotation-coverage method on synthetic corpora.

## Integration tests with `testcontainers`

`tests/end_to_end.rs` (orchestrator) and `tests/jetstream_pipeline.rs`
(indexer) boot a real Postgres 16 container per test, run the SQL
migrations, drive synthetic events through the full pipeline, and
verify rows + cursor commits end-to-end. The orchestrator test then
issues real HTTP requests through the axum router to confirm the
generated route table mounts and serves the indexed rows.

## HTTP fixture tests

`layers-auth::tests::jwt_did_web` boots a `wiremock` HTTP server,
publishes a fresh ES256 keypair as a `did:web` document, mints a
real JWT with `jsonwebtoken`, and runs the full
`verify_jwt` -> `verify_service_auth` chain. Tampered payload,
expired token, and unsupported-algorithm cases each have their own
test.

## Codegen drift

`cargo run -p layers-codegen -- check` re-runs every emitter
(`generate`, `routes`) and exits non-zero if the output differs from
the checked-in tree. CI runs it on every PR.

## Frontend tests

`pnpm --filter @layers/web test` runs the Vitest suite plus React
Testing Library component tests. `pnpm --filter @layers/web test:e2e`
runs Playwright against a stood-up orchestrator + frontend pair.
