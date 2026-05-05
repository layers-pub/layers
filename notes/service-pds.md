# Layers service PDS

A Bluesky PDS that runs alongside the appview at
**`lexicons.layers.pub`** and hosts canonical `pub.layers.*` records
authored by the appview operator: the six `pub.layers.auth*`
permission sets, lens registry seed records, default ontologies,
default templates. Modeled on chive's `governance.${DOMAIN}` PDS.

## Why

bsky.social's OAuth consent screen renders `include:pub.layers.<tier>`
scopes only when it can resolve the lexicon record at that NSID over
`com.atproto.sync.getRecord` and verify the Merkle proof against the
publishing DID's `atproto` `verificationMethod`. That requires a real
signing PDS. `did:web` does not work because most `did:web` setups
don't host the full sync API and don't ship a signing key in the DID
document.

## Subdomain choice

Production hostname: `lexicons.layers.pub`. Alternates considered
(rejected for clarity):

- `canon.layers.pub` — short but ambiguous.
- `registry.layers.pub` — overlaps with future user-facing concepts.
- `bedrock.layers.pub` — fun but obscures purpose.
- `seed.layers.pub` — suggests temporary fixtures rather than canon.

`lexicons.layers.pub` matches the `_lexicon.layers.pub` DNS shape
already prescribed by `notes/atproto-permission-sets.md`, so an
operator reading either side guesses what the other holds.

## Bring-up

1. Generate the four secrets and put them in the deployment env file:

   ```sh
   echo "LAYERS_SERVICE_PDS_HOSTNAME=lexicons.layers.pub"
   echo "LAYERS_SERVICE_PDS_JWT_SECRET=$(openssl rand -hex 32)"
   echo "LAYERS_SERVICE_PDS_ADMIN_PASSWORD=$(openssl rand -hex 24)"
   echo "LAYERS_SERVICE_PDS_ROTATION_KEY=$(openssl rand -hex 32)"
   ```

2. Boot the PDS alongside the rest of the appview:

   ```sh
   docker compose \
     -f docker-compose.yml \
     -f docker-compose.service-pds.yml \
     up -d service-pds
   ```

3. Provision the canonical account once it is healthy. The handle
   matches the hostname so resolution is symmetric:

   ```sh
   PDS=https://lexicons.layers.pub \
   ADMIN_PASSWORD=$LAYERS_SERVICE_PDS_ADMIN_PASSWORD \
   HANDLE=lexicons.layers.pub \
   EMAIL=ops@layers.pub \
   PASSWORD=$(openssl rand -hex 24 | tee canonical-pds-password.txt) \
   node scripts/bootstrap-service-pds.mjs
   ```

   Save the printed DID and the canonical-account password somewhere
   the operator can find later.

4. Add the DNS TXT at `_lexicon.layers.pub`. Value is exactly what
   step 3 prints: `did=did:plc:...`.

5. Publish the permission-set lexicons:

   ```sh
   PASSWORD=$(cat canonical-pds-password.txt) \
   node scripts/publish-permission-sets.mjs
   ```

   Defaults: `PDS=https://lexicons.layers.pub`,
   `IDENTIFIER=lexicons.layers.pub`. Override either with an env var
   if the staging environment uses a different host.

6. Verify resolution:

   ```sh
   dig +short TXT _lexicon.layers.pub @8.8.8.8
   node -e "import('@atproto/lex-resolver').then(({LexResolver}) =>
     new LexResolver({}).get('pub.layers.authReadOnly', {noCache:true})
       .then(r => console.log(r.lexicon.defs.main.type)))"
   ```

   The first prints `did=did:plc:...`. The second prints
   `permission-set`.

7. Flip the OAuth login default in
   `web/lib/auth/oauth-client.ts` from `'login-only'` to
   `'read-only'`. The consent screen will now render the full
   permission bundle.

## Reading from the service PDS in Rust

`layers-storage::service_pds::ServicePdsClient` provides a typed
read-only client:

```rust
use layers_storage::service_pds::{ServicePdsClient, ServicePdsConfig};

let client = ServicePdsClient::new(ServicePdsConfig::from_env());
let record = client.permission_set("pub.layers.authReadOnly").await?;
```

The client caches the canonical DID after the first `resolveHandle`
call. Errors carry the originating endpoint name in the variant for
diagnostics.

## What goes on the service PDS, and what does not

**Goes on it.** Records that the appview itself authors and ships as
canon. The list below is the planned content; permission sets are the
only category live today, the rest are tracked work.

| Category | Lexicon NSIDs | Notes |
|---|---|---|
| Permission sets | `pub.layers.auth*` (six tiers) | Required for OAuth consent to render `include:` scopes. |
| Lens registry seeds | `dev.panproto.schema.{schema,lens}` | The 36 hand-authored panproto lens YAMLs become resolvable AT-URIs other apps can fetch. Replaces the current boot-time msgpack-blob loader. |
| Vendored foreign lexicons | `com.atproto.lexicon.schema` | 25+ entries from `lexicons/foreign/` (margin, leaflet, grain, cosmik, tangled, streamplace, voxport, dropanchor, mapped, greengale, beaconbits) so resolution does not depend on the upstream PDS. |
| Default ontologies | `pub.layers.ontology.ontology`, `pub.layers.ontology.typeDef` | UD POS, basic NER, span-relation, frame-arg ontologies. Users fork into their own PDS to customise. |
| Canonical kind nodes | `pub.layers.graph.graphNode` (referenced by `kindUri` on expressions + collections) | document / transcript / sentence / word / lexicon / frame-inventory / stimulus-pool / … |
| Default templates | `pub.layers.resource.template` | Cloze, forced-choice, ordinal-scale, magnitude-estimation. |
| Default experiment defs | `pub.layers.judgment.experimentDef` | Acceptability, plausibility, similarity, comprehension paradigms. |
| Annotation-method canon | (TBD; record kind to be defined) | Canonical method identifiers so layers from independent users link to shared method refs. |
| Demo corpus | `pub.layers.corpus.corpus` + `pub.layers.expression.expression` + `pub.layers.annotation.annotationLayer` | Small fixture set the getting-started flow forks. |
| Service config | (operator-authored) | Trusted lens publishers, indexed upstream DID list, scope-profile composition, feature flags. PDS history serves as audit trail. |
| Operator changelog | `pub.layers.changelog.entry` | Authored by the appview itself for canonical events (lexicon revs, registry expansions, etc.). |
| Reference eprints | `pub.layers.eprint.eprint` | Protocol spec, TOS, privacy policy, code of conduct. The OAuth consent flow can link to the exact version a user accepted. |
| Verification attestations | `dev.idiolect.verification` | Published by `layers-verify` against canonical fixtures. Optional. |
| Observation aggregates | `dev.idiolect.observation` | Currently in `external_records`. Could move here for stable AT-URIs. Optional. |

**Does not go on it.** User data. The appview never writes user
records — those live in the user's own PDS by ATProto-design. If you
find yourself reaching for the service PDS to store something on
behalf of a user, stop and route the write through the user's session
instead. The litmus test: would the user expect to see this record
disappear from Layers if they switched their PDS provider? If yes, it
is user data and belongs in their PDS.
