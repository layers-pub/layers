---
sidebar_label: Chive
sidebar_position: 3
---

# Chive

<div className="metadata-card">
<dl>
<dt>Application</dt>
<dd><a href="https://chive.pub">Chive</a></dd>
<dt>Origin</dt>
<dd><a href="https://chive.pub">chive.pub</a></dd>
<dt>Namespace</dt>
<dd><code>pub.chive.*</code></dd>
<dt>Repository</dt>
<dd><a href="https://github.com/chive-pub/chive">github.com/chive-pub/chive</a></dd>
</dl>
</div>

## Overview

Chive (chive.pub) is a decentralized eprint service built on ATProto. It hosts scholarly publications as ATProto records, with full metadata (authors, abstract, venue, DOI).

## Integration Pattern

Layers provides two integration points for Chive:

- `pub.layers.eprint.eprint` connects Layers data (corpora, annotation layers, model outputs) to specific Chive eprints by identifier or AT-URI, and `pub.layers.eprint.dataLink` records reproducibility metadata (code URI, commit hash, random seed) for the data an eprint produced. (Chive-specific eprint linking previously in `pub.layers.chive#eprintDataLink` has been absorbed into the general-purpose `pub.layers.eprint` namespace.)
- `pub.layers.graph.graphEdge` connects individual Layers objects (annotations, expressions) to Chive knowledge graph nodes via edges with types like `grounding`, `instance-of`, or `denotes`.

Expressions can also reference eprints directly via `eprintRef`:

```json
{
  "$type": "pub.layers.expression.expression",
  "id": "doc-1",
  "kind": "document",
  "createdAt": "2026-01-01T00:00:00Z",
  "text": "...",
  "eprintRef": "at://did:plc:author/pub.chive.eprint/abc123"
}
```

The `pub.layers.eprint` namespace handles both Chive-specific and general-purpose eprint linking for identifiers such as DOI, arXiv, ACL Anthology, Semantic Scholar, and PubMed.

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.eprint.eprint` | Links corpus/annotation data to eprints (including Chive eprints) by AT-URI, DOI, arXiv ID, or other identifiers |
| `pub.layers.graph.graphEdge` | Links a Layers object to a Chive knowledge graph node (via `target.knowledgeRef` with `source="chive.pub"`) |
| `pub.layers.expression.expression` (field `eprintRef`) | Direct AT-URI reference from an expression to an eprint |

## Discovery

The appview indexes `expression.eprintRef` and `graphEdge` target references. Queries like "find all annotation data linked to this paper" resolve by looking up the eprint's AT-URI across all indexed Layers records. Knowledge graph links to Chive nodes are discoverable by indexing `graphEdge` targets with `knowledgeRef.source="chive.pub"`.
