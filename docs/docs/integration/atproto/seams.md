---
sidebar_label: Seams
sidebar_position: 9
---

# Seams

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd><a href="https://seams.so">Seams</a></dd>
<dt>Origin</dt>
<dd><a href="https://sealight.xyz">Sealight Labs</a></dd>
<dt>Namespace</dt>
<dd><code>community.lexicon.annotation.*</code></dd>
<dt>Repository</dt>
<dd><a href="https://tangled.org/@sealight.xyz/seams.so">tangled.org/@sealight.xyz/seams.so</a></dd>
</dl>
</div>

## Overview

Seams is an open social annotation tool built on ATProto. It provides a browser extension (Chrome and Firefox) and a web proxy that let users highlight text on any web page and attach notes. Annotations are stored as `community.lexicon.annotation.annotation` records in users' PDSes, following the [community lexicon](https://github.com/lexicon-community/lexicon) initiative. Threaded comments on annotations use `pub.leaflet.comment` records.

## Integration Pattern

Seams annotations target web pages by URL and select text spans using W3C-style text quote selectors. Layers expressions can reference the same URLs via `sourceUrl`, allowing the appview to discover co-located annotations across both systems.

```json
{
  "$type": "pub.layers.expression.expression",
  "sourceUrl": "https://example.com/article",
  "text": "...",
  "metadata": { ... }
}
```

A Seams annotation targeting the same URL looks like:

```json
{
  "$type": "community.lexicon.annotation.annotation",
  "target": [{
    "source": "https://example.com/article",
    "selector": [{
      "$type": "community.lexicon.annotation.annotation#textQuoteSelector",
      "exact": "highlighted passage",
      "prefix": "text before ",
      "suffix": " text after",
      "start": 120,
      "end": 140
    }]
  }],
  "body": "User's annotation note",
  "createdAt": "2026-01-15T10:00:00Z"
}
```

Seams' `textQuoteSelector` is structurally compatible with Layers' `pub.layers.defs#textQuoteSelector` (`exact`, `prefix`, `suffix`) and `pub.layers.defs#textPositionSelector` (`start`, `end`). This means text regions identified by Seams annotations and Layers segmentations can be aligned without lossy conversion.

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.expression.expression` | `sourceUrl` matches the Seams annotation target URL |
| `pub.layers.defs#externalTarget` | References the same external web resource |
| `pub.layers.defs#textQuoteSelector` | W3C-compatible text selection, structurally matches Seams selectors |
| `pub.layers.defs#textPositionSelector` | W3C-compatible offset selection (`start`/`end`) |
| `pub.layers.annotation.annotationLayer` | Linguistic annotation layers over the same content |

## Discovery

The appview indexes `expression.sourceUrl` values. When a user queries for annotations on a given URL, the appview returns Layers annotations and discovers Seams annotations targeting the same URL through the ATProto firehose. Because Seams records use a community lexicon namespace rather than a domain-specific one, any ATProto application can read and index `community.lexicon.annotation.annotation` records without depending on a single operator.
