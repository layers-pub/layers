---
sidebar_label: Authentication
sidebar_position: 8
---

# Authentication

The orchestrator accepts ATProto OAuth Bearer tokens and service-auth
JWTs. Both are ES256-signed; verification goes through `layers-auth`.

## Permission-set lexicons

Six tiered permission sets live under `layers/lexicons/pub/layers/auth*.json`:

| Lexicon                         | Grants                                                                |
| ------------------------------- | --------------------------------------------------------------------- |
| `pub.layers.authReadOnly`       | Read every `pub.layers.*` query method.                               |
| `pub.layers.authCorpusManager`  | Reader + writes on corpora, expressions, media, resource entries.     |
| `pub.layers.authAnnotator`      | Corpus manager + annotation, segmentation, alignment, judgment writes.|
| `pub.layers.authOntologyEditor` | Reader + ontology, graph, typeDef writes.                             |
| `pub.layers.authExperimenter`   | Annotator + experimentDef, judgmentSet, agreementReport writes.       |
| `pub.layers.authFull`           | Every collection + every query.                                       |

Each lexicon is a `permission-set` declaring `rpc:` (lxm) and `repo:`
(collection) permissions. OAuth clients request a tier via
`include:pub.layers.auth<tier>`; the OAuth server expands the include
into the underlying scope strings.

## JWT verification

`layers_auth::jwt::verify_jwt(token, resolver)`:

1. Parses the JWT header. Algorithms other than ES256 are rejected.
2. Resolves the issuer (`iss`) via the supplied `DidResolver`.
   `DidWebResolver` fetches `https://<host>/.well-known/did.json` (or
   `https://<host>/<path>/did.json` for nested DIDs) per the W3C
   `did:web` spec.
3. Selects the `verificationMethod` whose `id` matches the JWT
   header's `kid`, or the first method when no `kid` is supplied.
4. Builds a P-256 JWK decoding key from the method's `publicKeyJwk`.
5. Calls `jsonwebtoken::decode` with `validate_exp = true`, returning
   the parsed `ServiceAuthClaims`.

`layers_auth::verify::verify_service_auth(claims, expected_aud, expected_lxm, now)`
then checks `aud` matches the appview's DID and `lxm` matches the
method being dispatched.

## Middleware wiring

`layers-orchestrator::auth::require(tier, lxm)` returns an axum
middleware closure that runs the JWT verification, attaches an
`AuthContext` to the request, and rejects with `401` on any failure.
Routes carry the tier in their declaration; codegen mounts the
middleware on every route.

## Frontend integration

The frontend builds scope strings from
`web/lib/auth/scope-profiles.ts`, which mirrors the lexicon set. The
`ScopeUpgradePrompt` component re-enters the OAuth flow with a higher
tier when a UI action requires more access than the current session
holds.
