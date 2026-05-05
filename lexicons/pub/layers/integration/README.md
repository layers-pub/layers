# Cross-app integration map

The Layers appview indexes a curated set of foreign NSIDs into the
shared `external_records` table so cross-app interop works natively.
Records remain on the user's PDS; we store the JSON body, the at-URI,
and the originating DID without typed decoding.

The orchestrator query `pub.layers.integration.listExternal` reads
this table, paginated by `(nsid, did)`. The Neo4j sink labels foreign
target nodes with `is_foreign = true` and a captured `nsid` property
so cypher queries can filter cross-family relationships.

## Indexed prefixes

Every entry below is verified against the upstream's actual lexicon
JSON or generated bindings, with the verifying source named.

| Prefix             | Upstream | Verified against                                                                                            |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| `dev.idiolect.`    | idiolect | `idiolect/lexicons/dev/idiolect/community.json` (`id == "dev.idiolect.community"`).                         |
| `pub.leaflet.`     | Leaflet  | `hyperlink-academy/leaflet/lexicons/pub/leaflet/{document,publication}.json`.                               |
| `at.margin.`       | Margin   | `margin-at/margin/lexicons/at/margin/note.json` (`id == "at.margin.note"`).                                 |
| `network.cosmik.`  | Semble   | `cosmik-network/semble/.../lexicons/collectionLinkRemoval.json` (`id == "network.cosmik.collectionLinkRemoval"`). |
| `sh.tangled.`      | Tangled  | `pkg.go.dev/tangled.sh/tangled.sh/core/api/tangled` enumerates `sh.tangled.{repo,knot,pipeline,...}`.        |
| `social.grain.`    | Grain    | `grainsocial/grain/lexicons/social/grain/gallery/gallery.json` (`id == "social.grain.gallery"`).            |
| `place.stream.`    | Streamplace | `streamplace/streamplace/lexicons/place/stream/key.json` (`id == "place.stream.key"`); live video, chat, badges. |

Override at runtime with `LAYERS_FOREIGN_PREFIXES` (comma-separated).
Each prefix is appended to the foreign Jetstream URL as
`wantedCollections=<prefix>*`.

## Video sources

Layers' anchor types `temporalSpan` and `spatioTemporalAnchor`
(declared in `pub.layers.defs`) target arbitrary video AT-URIs, so
the indexer does not need to know which app produced the video; the
annotation layer's `target` field accepts any AT-URI.

Three buckets cover the ATProto-native video surface:

1. **Streamplace** (`place.stream.*`, indexed by default): live video
   sessions, chat, badges, branding.
2. **Bluesky-embedded video** (`app.bsky.embed.video` inside
   `app.bsky.feed.post`): Skylight (skylight.social) and Bluemotion
   both publish video this way rather than minting custom NSIDs.
   This is the largest video corpus in ATProto. We do *not* index
   `app.bsky.*` by default — at multi-tens-of-millions of users the
   firehose volume is qualitatively different from the
   linguistic-annotation tenants. Operators who want to annotate
   Bluesky videos opt in:

   ```
   LAYERS_FOREIGN_PREFIXES=...,app.bsky.feed.post
   ```

   The video CID lives in `record.embed.video.ref.$link`. Anchors
   point at the post's AT-URI plus the embed's video CID.
3. **Self-hosted MP4 / HLS endpoints** with arbitrary AT-URI
   identifiers — anchors carry the URL directly; the appview never
   stores the bytes.

## Surveyed but not indexed

These atstore.fyi tenants did not make the default list:

| Upstream    | Reason for skip                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Disperse    | Link-share format; lexicon prefix not yet verified against published JSON. Operator can add `com.quillmatiq.` or whatever the upstream ships. |
| Offprint    | Self-described as WIP; no published lexicons found on GitHub or atproto.com to verify a prefix against.                                 |
| ATlas       | Community aggregator; lexicon prefix not yet verified.                                                                                  |
| Stream.place | Livestreaming — orthogonal to text-bearing records.                                                                                     |
| Sifa ID     | Professional-identity records — orthogonal to linguistic annotation.                                                                    |
| ShelfCheck  | Book availability — could fit as `resource.entry`, but lexicon prefix not yet verified.                                                 |
| rpg.actor   | Character data — orthogonal.                                                                                                            |

The default list errs toward verifying every prefix end-to-end before
shipping, so operators can `cat /proc/.../environ` and trust each
entry maps to a real upstream NSID. Add unverified candidates via
`LAYERS_FOREIGN_PREFIXES` at deploy time.

## Integration recipes

### idiolect community

`dev.idiolect.community` records carry `coreSchemas` and `coreLenses`
arrays that name the lexicons + lenses a community has agreed on. A
Layers community deployment sets `coreSchemas` to the `pub.layers.*`
NSIDs the community accepts, and `appviewEndpoint` to the
orchestrator's public origin. The orchestrator can then gate write
methods on community membership: each operator-curated community
becomes a real OAuth scope tier (paired with one of
`pub.layers.auth*`).

`dev.idiolect.observation` is the publication target for
`layers-observer`'s aggregate methods. The shipped `annotation_coverage`
method emits `ObservationReport` rows; a sidecar publisher writes
each one as a `dev.idiolect.observation` record back into the
operator's PDS.

`dev.idiolect.deliberation` (+ `Statement` / `Vote` / `Outcome`) is
the editorial decision primitive: a community proposes, votes on, and
records outcomes about which annotations / ontologies become
canonical.

### Acorn (Blacksky)

Acorn provides community infrastructure (custom feeds, badges,
governance polls, custom clients, dedicated PDS). Composition shape:

```
Acorn community (governance, feed, badges, PDS)
    └── idiolect community (conventions, coreSchemas, coreLenses)
            └── Layers corpora / annotations / ontologies
```

Acorn consumes our records via the public Jetstream like any other
appview. We consume Acorn role/badge records (when those NSIDs land)
through the foreign pipeline and gate per-collection writes on the
caller's badge set. No code changes to the orchestrator's auth path —
the scope tier already accepts `include:pub.layers.auth<tier>`
references; Acorn's badge records are an additional sidecar evidence
the middleware can check.

### Semble

Semble's Cards-to-Collections shape maps onto
`pub.layers.resource.collection` + `entry` + `membership`. Direct
recipes:

- A Semble Card → emit a `pub.layers.resource.entry` with
  `kind: "card"` and `sourceRef` pointing at the Semble record's
  AT-URI.
- A Layers expression → emit a Semble Card pointing at the
  expression's AT-URI when the expression carries the
  `published-as-card` token in `kindUri`.

Semble's planned Web Annotations feature targets
`pub.layers.expression.expression` AT-URIs and writes into our
`annotation.annotationLayer` records directly.

### Margin

Margin's `at.margin.annotation`, `highlight`, `bookmark`, `collection`,
`reply` are 1:1 with our `pub.layers.annotation.annotationLayer` plus
the seven anchor types we already ship (`textSpan`, `tokenRef`,
`tokenRefSequence`, `temporalSpan`, `boundingBox`, `spatioTemporalAnchor`,
`pageAnchor`). Three integration moves:

1. Lift Margin records into Layers annotation layers via a panproto
   lens registered against `at.margin.annotation -> pub.layers.annotation.annotationLayer`.
2. Reverse adapter emits Margin-shaped records mirroring our
   annotations so any Margin client can read them.
3. `pub.layers.annotation.annotationLayer.target` already accepts an
   arbitrary AT-URI, so Margin URLs work as targets without code
   changes.

### Leaflet

`pub.leaflet.publication` and `pub.leaflet.document` are the natural
payloads for `pub.layers.expression.expression`. Recipes:

- `pub.layers.expression.expression.kindUri` points at a
  `pub.leaflet.document#main` ref. Layers treats the leaflet record
  as the canonical content source.
- A small firehose harvester running off the `pub.leaflet.document`
  prefix creates a Layers expression for each new leaflet document,
  with `sourceRef` set to the leaflet AT-URI.
- A reverse "annotate on Layers" callback URL on every Leaflet
  document opens the workspace pre-filled with the constructed
  expression.

## Querying foreign records

```http
GET /xrpc/pub.layers.integration.listExternal?nsidPrefix=dev.idiolect.&did=did:plc:alice
```

Returns paginated `{ uri, cid, nsid, value }` objects from the
`external_records` table. The orchestrator's standard auth, rate
limit, and CORS middleware applies; this is just another XRPC route
in the catalogue.

## On-demand import

`pub.layers.integration.getExternal?uri=<at-uri>` lifts a single
foreign record into the appview without subscribing the indexer to
its NSID prefix. Use this to annotate a specific Bluesky video, a
single Skylight clip, or any other one-off ATProto record:

```http
GET /xrpc/pub.layers.integration.getExternal?uri=at%3A%2F%2Fdid%3Aplc%3Abob%2Fapp.bsky.feed.post%2Frkey
```

The handler:

1. Parses the AT-URI into `(did, collection, rkey)`.
2. Returns the cached row from `external_records` if present (unless
   `?fresh=true` forces a refetch).
3. Otherwise resolves the DID via the configured resolver, picks the
   `#atproto_pds` service endpoint, and calls
   `<pds>/xrpc/com.atproto.repo.getRecord?repo=...&collection=...&rkey=...`.
4. Persists the response into `external_records` and returns it.

The response carries `fromCache: true|false` so callers can
distinguish a fresh fetch from a cache hit. Errors:

- `BadRequest` — malformed AT-URI, DID has no `#atproto_pds`
  service, or the resolver rejects the DID method.
- `InternalError` — PDS fetch failed or persisting the body failed.

The same record can be re-imported with `?fresh=true` once the
upstream updates it; the upsert is idempotent over `(uri)`.
