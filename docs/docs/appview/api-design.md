---
sidebar_label: API Design
sidebar_position: 5
---

# API Design

`layers-orchestrator` serves the XRPC catalog declared in
`orchestrator-spec/queries.json`. Each entry mounts at the canonical
ATProto path `/xrpc/<nsid>`; the route table and per-NSID handler
functions are emitted from the spec by
`cargo run -p layers-codegen -- routes` into
`layers-orchestrator/src/generated_routes.rs`.

## Operational endpoints

Three root-level endpoints sit alongside the XRPC mounts:

- `GET /healthz`: liveness probe; returns 200 once the process is up.
- `GET /readyz`: readiness probe; 200 once `AppState::mark_ready` is
  called, 503 while warming.
- `GET /metrics`: Prometheus exposition format.

## Request shapes

Every `get*` method takes a single `?uri=<at-uri>` query parameter and
returns the record body plus identifying metadata:

```json
{
  "uri": "at://did:plc:alice/pub.layers.corpus.corpus/rk1",
  "did": "did:plc:alice",
  "rkey": "rk1",
  "record": { ... full record body ... }
}
```

Every `list*` method takes the standard `(did?, cursor?, limit?)` plus
the per-method filter columns declared in `queries.json`. Pagination
uses opaque cursors over `uri` (keyset, monotonic). Limits clamp to
`[1, 200]` with default 50. Response shape:

```json
{
  "records": [ ... ],
  "cursor": "<opaque>"
}
```

Filter columns query Postgres JSONB via `record->>'<key>'`, so any
filter declared in `queries.json` works without a schema migration.

## Auth

Every route is wrapped by the `layers-orchestrator::auth::require`
middleware. Routes carry a `Tier`:

- `Tier::PublicRead`: anonymous access permitted; the middleware
  decodes a Bearer token if present but does not require one.
- `Tier::AuthReadOnly` and higher: Bearer token required.

When a Bearer token is present, the middleware:

1. Parses the JWT header and rejects any algorithm other than ES256.
2. Resolves the issuer's DID document via `DidWebResolver`
   (`https://<host>/.well-known/did.json`).
3. Verifies the signature against the matching `verificationMethod`'s
   `publicKeyJwk`.
4. Validates `aud` matches this appview's DID, `lxm` matches the route
   being invoked, and `exp` is in the future.

Permission-set lexicons (`pub.layers.authReadOnly`, `authAnnotator`,
`authCorpusManager`, `authOntologyEditor`, `authExperimenter`,
`authFull`) declare the `rpc:` and `repo:` scopes each tier expands
into. The OAuth provider issues an `include:pub.layers.auth*` scope
referencing the tier; the orchestrator inspects the granted set on
write methods.

## Error envelope

Errors render as `{"error": "Code", "message": "..."}` per the ATProto
convention. Mappings are in `layers-orchestrator/src/error.rs`:
`BadRequest` (400), `Unauthorized` (401), `Forbidden` (403),
`NotFound` (404), `InternalError` (500).
