---
sidebar_label: Bluesky Labels
sidebar_position: 8
---

# Bluesky Labels

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd><a href="https://github.com/bluesky-social/ozone">Ozone</a></dd>
<dt>Origin</dt>
<dd><a href="https://blueskyweb.xyz">Bluesky Social, PBC</a></dd>
<dt>Namespace</dt>
<dd><code>com.atproto.label.*</code></dd>
<dt>Repository</dt>
<dd><a href="https://github.com/bluesky-social/ozone">github.com/bluesky-social/ozone</a></dd>
</dl>
</div>

## Overview

The ATProto labeling system (`com.atproto.label.defs`) provides moderation and quality signals as labels attached to ATProto records or accounts. Labels are used for content moderation, NSFW flagging, and other trust signals.

## Integration Pattern

Label records can reference Layers annotations or expressions by AT-URI. This allows moderation and quality signals to be attached to linguistic annotation data.

```json
{
  "$type": "com.atproto.label.defs#label",
  "uri": "at://did:plc:annotator/pub.layers.annotation.annotationLayer/abc123",
  "val": "quality:gold-standard",
  "cts": "2025-01-15T10:00:00Z"
}
```

In the reverse direction, Layers annotations can reference label records via `knowledgeRefs` or `featureMap` to incorporate moderation signals into annotation metadata.

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.expression` | Can be the target of a label (by AT-URI) |
| `pub.layers.annotation#annotationLayer` | Can be the target of a label |
| `pub.layers.defs#featureMap` | Can store label references as features |

## Discovery

Labels reference Layers records by AT-URI. The appview can query the ATProto label service for labels on any indexed Layers record, and vice versa.
