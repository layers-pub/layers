---
sidebar_label: Leaflet
sidebar_position: 5
---

# Leaflet (standard.site)

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd><a href="https://leaflet.pub">Leaflet</a></dd>
<dt>Origin</dt>
<dd><a href="https://hyperlink.academy">Hyperlink Academy</a></dd>
<dt>Namespace</dt>
<dd>`site.standard.*`, `pub.leaflet.*`</dd>
<dt>Repository</dt>
<dd><a href="https://github.com/hyperlink-academy/leaflet">github.com/hyperlink-academy/leaflet</a></dd>
</dl>
</div>

## Overview

Leaflet is a blogging platform built on ATProto (standard.site). Blog posts are stored as ATProto records in user PDSes.

## Integration Pattern

An `expression` record sets `sourceRef` to the AT-URI of a Leaflet post. The appview indexes the reference and can surface annotations alongside the original content.

```json
{
  "$type": "pub.layers.expression",
  "sourceRef": "at://did:plc:author/site.standard.post/abc123",
  "text": "...",
  "kind": "article"
}
```

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.expression` | `sourceRef` points to `site.standard.*` AT-URI |
| `pub.layers.segmentation` | Tokenization of the post text |
| `pub.layers.annotation#annotationLayer` | Linguistic annotation layers over the post |

## Discovery

The appview indexes `expression.sourceRef`. Annotations on Leaflet posts are discoverable by querying for the post's AT-URI.
