---
sidebar_label: at.margin
sidebar_position: 3
---

# at.margin

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd><a href="https://margin.at">at.margin</a></dd>
<dt>Origin</dt>
<dd><a href="https://margin.at">margin.at</a></dd>
<dt>Namespace</dt>
<dd><code>at.margin.*</code></dd>
<dt>Repository</dt>
<dd><a href="https://tangled.org/margin.at/margin">tangled.org/margin.at/margin</a></dd>
</dl>
</div>

## Overview

at.margin is a web annotation layer built on ATProto that lets users write comments and highlights on any URL on the internet. It includes a browser extension and a web app, and uses ATProto lexicon schemas for annotations, bookmarks, highlights, likes, and replies.

## Integration Pattern

Layers' `externalTarget` and W3C selectors (`textQuoteSelector`, `textPositionSelector`, `fragmentSelector`) are structurally compatible with at.margin's annotation targets. An `expression` record can set `sourceUrl` to the same URL an at.margin annotation targets, allowing the appview to discover co-located annotations.

```json
{
  "$type": "pub.layers.expression.expression",
  "sourceUrl": "https://example.com/article",
  "text": "...",
  "metadata": { ... }
}
```

An at.margin annotation targeting the same URL can be correlated by the appview through the shared `sourceUrl`.

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.expression.expression` | `sourceUrl` matches the at.margin target URL |
| `pub.layers.defs#externalTarget` | References the same external resource |
| `pub.layers.defs#textQuoteSelector` | W3C-compatible text selection |
| `pub.layers.defs#textPositionSelector` | W3C-compatible offset selection |
| `pub.layers.defs#fragmentSelector` | W3C-compatible fragment selection |

## Discovery

The appview indexes `expression.sourceUrl` values. When a user queries for annotations on a given URL, the appview returns both Layers annotations and discovers at.margin annotations targeting the same URL through the firehose.
