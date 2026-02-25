---
sidebar_label: Semble
sidebar_position: 2
---

# Semble

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd><a href="https://semble.so">Semble</a></dd>
<dt>Origin</dt>
<dd><a href="https://cosmik.network">Cosmik Network</a></dd>
<dt>Namespace</dt>
<dd><code>network.cosmik.*</code></dd>
<dt>Repository</dt>
<dd><a href="https://github.com/cosmik-network/semble">github.com/cosmik-network/semble</a></dd>
</dl>
</div>

## Overview

Semble is a social knowledge network for researchers built on ATProto by Cosmik Network. It provides bookmarking, organization, and collaborative knowledge curation. Semble runs a firehose subscriber that listens for repository commits on `network.cosmik.*` records and indexes them in its appview.

## Integration Pattern

Semble records live in user PDSes under the `network.cosmik.*` namespace. Layers expressions can reference Semble records via `sourceRef`.

```json
{
  "$type": "pub.layers.expression",
  "sourceRef": "at://did:plc:researcher/network.cosmik.item/abc123",
  "text": "...",
  "kind": "document"
}
```

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.expression` | `sourceRef` points to a Semble record |
| `pub.layers.annotation#annotationLayer` | Linguistic annotation layers over referenced content |

## Discovery

The appview indexes `expression.sourceRef` values. Annotations on content bookmarked through Semble are discoverable by querying for the Semble record's AT-URI.
