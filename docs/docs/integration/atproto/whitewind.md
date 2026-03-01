---
sidebar_label: WhiteWind
sidebar_position: 6
---

# WhiteWind

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd><a href="https://whtwnd.com">WhiteWind</a></dd>
<dt>Origin</dt>
<dd>whtwnd</dd>
<dt>Namespace</dt>
<dd><code>com.whtwnd.*</code></dd>
<dt>Repository</dt>
<dd><a href="https://github.com/whtwnd/whitewind-blog">github.com/whtwnd/whitewind-blog</a></dd>
</dl>
</div>

## Overview

WhiteWind is a blogging platform built on ATProto. Blog entries are stored as ATProto records in user PDSes.

## Integration Pattern

An `expression` record sets `sourceRef` to the AT-URI of a WhiteWind blog entry. The pattern is identical to other ATProto content sources.

```json
{
  "$type": "pub.layers.expression.expression",
  "sourceRef": "at://did:plc:author/com.whtwnd.blog.entry/abc123",
  "text": "...",
  "kind": "article"
}
```

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.expression.expression` | `sourceRef` points to `com.whtwnd.*` AT-URI |
| `pub.layers.segmentation.segmentation` | Tokenization of the blog entry text |
| `pub.layers.annotation.annotationLayer` | Linguistic annotation layers over the entry |

## Discovery

The appview indexes `expression.sourceRef`. Annotations on WhiteWind entries are discoverable by querying for the entry's AT-URI.
