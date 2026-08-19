# Cross-app integration

The `pub.layers.integration.*` lexicons define three appview query contracts for working with ATProto records outside the `pub.layers.*` family:

1. `pub.layers.integration.listExternal` lists foreign records already known to an appview.
2. `pub.layers.integration.getExternal` resolves one foreign record from its source PDS.
3. `pub.layers.integration.applyLens` resolves a foreign record and projects it into a `pub.layers.*` shape through a registered panproto lens.

These files define request, response, and error shapes. They do not prescribe an appview's storage backend, firehose subscription, or publication policy. In particular, `applyLens` returns a projected value but does not write that value to a PDS.

## List indexed records

`listExternal` accepts an exact NSID, an NSID prefix, a repository DID, or a combination of those filters. Results are cursor-paginated and contain the source AT-URI, optional CID, collection NSID, and original record value.

```http
GET /xrpc/pub.layers.integration.listExternal?nsidPrefix=dev.idiolect.&did=did:plc:alice&limit=50
```

```json
{
  "records": [
    {
      "uri": "at://did:plc:alice/dev.idiolect.community/3k...",
      "cid": "bafy...",
      "nsid": "dev.idiolect.community",
      "value": {}
    }
  ],
  "cursor": "..."
}
```

## Resolve one record

`getExternal` accepts a foreign record AT-URI and an optional `fresh` flag. The response adds `fromCache` so callers can distinguish an appview result from a new PDS fetch.

```http
GET /xrpc/pub.layers.integration.getExternal?uri=at%3A%2F%2Fdid%3Aplc%3Abob%2Fapp.bsky.feed.post%2F3k...
```

The method declares `BadRequest`, `NotFound`, and `InternalError` responses. Implementations may cache the resolved record, but the PDS remains the source of truth.

## Apply a lens

`applyLens` accepts the same `uri` and `fresh` parameters as `getExternal`. It returns two objects:

- `source` contains the imported foreign record and cache status.
- `target` contains the projected value, its `pub.layers.*` target NSID, and the AT-URI of the lens that produced it.

```http
GET /xrpc/pub.layers.integration.applyLens?uri=at%3A%2F%2Fdid%3Aplc%3Aalice%2Fat.margin.note%2F3k...
```

Applications that publish the target value must obtain the relevant OAuth permission and write through the user's PDS. Publication is separate from lens application.

## Included cross-app mappings

The [lens manifest](../../../lenses/manifest.json) pairs a source lexicon with one Layers target lexicon. The corresponding source schemas are vendored under `lexicons/foreign/`, and each mapping lives under `lexicons/lenses/<name>/lens.yaml`.

Representative mappings include:

| Source record | Layers projection |
| --- | --- |
| `at.margin.note` | `pub.layers.annotation.annotationLayer` |
| `at.margin.collection` | `pub.layers.resource.collection` |
| `network.cosmik.card` | `pub.layers.resource.entry` |
| `network.cosmik.collectionLink` | `pub.layers.resource.collectionMembership` |
| `pub.leaflet.comment` | `pub.layers.annotation.annotationLayer` |
| `social.grain.photo.exif` | `pub.layers.media.media` |
| `sh.tangled.repo.issue` | `pub.layers.expression.expression` |
| `place.stream.livestream` | `pub.layers.expression.expression` |
| `com.voxport.podcast.episode` | `pub.layers.expression.expression` |
| `at.mapped.trail` | `pub.layers.resource.collection` |

The manifest is the complete registry for the mappings shipped in this repository. A source prefix appearing under `lexicons/foreign/` does not by itself require an appview to subscribe to that prefix.

## Media and external targets in 0.9.0

Version 0.9.0 separates the identity of a medium from the location selected within it:

- A `pub.layers.media.media` record identifies bytes through `blob` or `externalUri`, records technical metadata, and can refer to an acquisition session.
- An annotation layer names one expression and can also name several media records through `mediaRefs` or a synchronized session through `sessionRef`.
- Each annotation carries an anchor. The anchor union supports text spans, token references, token sequences, temporal spans, spatio-temporal regions, page anchors, external targets, bounding boxes, normalized spatial regions, and continuous-signal spans.
- Time, image, video, and signal anchors use `mediaScope` to identify the relevant media record, acquisition session, stream, or track when the expression does not determine it.

Thus annotating externally hosted media does not require an appview to store its bytes. A Layers media record can identify the external resource, and annotations can select the relevant interval, frame, region, or signal range. The older `annotationLayer.target` pattern is not part of the 0.9.0 schema.
