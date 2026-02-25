---
sidebar_label: Bluesky
sidebar_position: 4
---

# Bluesky

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd><a href="https://bsky.app">Bluesky</a></dd>
<dt>Origin</dt>
<dd><a href="https://blueskyweb.xyz">Bluesky Social, PBC</a></dd>
<dt>Namespace</dt>
<dd><code>app.bsky.*</code></dd>
<dt>Repository</dt>
<dd><a href="https://github.com/bluesky-social/atproto">github.com/bluesky-social/atproto</a>; <a href="https://github.com/bluesky-social/social-app">github.com/bluesky-social/social-app</a></dd>
</dl>
</div>

## Overview

Bluesky is a decentralized social network built on ATProto. Posts are stored as `app.bsky.feed.post` records in user PDSes.

## Integration Pattern

An `expression` record sets `sourceRef` to the AT-URI of a Bluesky post. Annotation layers created over that expression become linguistic analyses of the post's text.

```json
{
  "$type": "pub.layers.expression",
  "sourceRef": "at://did:plc:alice/app.bsky.feed.post/3k2a5b",
  "text": "the full post text",
  "kind": "social-media"
}
```

Annotation layers (POS tagging, NER, sentiment, discourse analysis, etc.) reference the expression and its segmentation as usual.

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.expression` | `sourceRef` points to `app.bsky.feed.post` AT-URI |
| `pub.layers.segmentation` | Tokenization of the post text |
| `pub.layers.annotation#annotationLayer` | Linguistic annotation layers over the post |

## Discovery

The appview indexes `expression.sourceRef` values. A query for all linguistic annotations of a Bluesky post resolves by looking up the post's AT-URI across indexed expressions.
