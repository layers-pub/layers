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

- `pub.layers.eprint` connects Layers data (corpora, annotation layers, model outputs) to specific Chive eprints, including reproducibility metadata (code URI, commit hash, random seed). (Chive-specific eprint linking previously in `pub.layers.chive#eprintDataLink` has been absorbed into the general-purpose `pub.layers.eprint` lexicon.)
- `pub.layers.graph#graphEdge` connects individual Layers objects (annotations, expressions) to Chive knowledge graph nodes via edges with types like `grounding`, `instance-of`, or `denotes`.

Expressions can also reference eprints directly via `eprintRef`:

```json
{
  "$type": "pub.layers.expression",
  "text": "...",
  "eprintRef": "at://did:plc:author/pub.chive.eprint/abc123"
}
```

The `pub.layers.eprint` lexicon handles both Chive-specific and general-purpose eprint linking for identifiers such as DOI, arXiv, ACL Anthology, Semantic Scholar, and PubMed.

## Layers Types Involved

| Type | Role |
|---|---|
| `pub.layers.eprint` | Links corpus/annotation data to eprints (including Chive eprints) by AT-URI, DOI, arXiv ID, or other identifiers |
| `pub.layers.graph#graphEdge` | Links a Layers object to a Chive knowledge graph node (via `target.knowledgeRef` with `source="chive.pub"`) |
| `pub.layers.expression.eprintRef` | Direct AT-URI reference from expression to eprint |

## Discovery

The appview indexes `expression.eprintRef` and `graphEdge` target references. Queries like "find all annotation data linked to this paper" resolve by looking up the eprint's AT-URI across all indexed Layers records. Knowledge graph links to Chive nodes are discoverable by indexing `graphEdge` targets with `knowledgeRef.source="chive.pub"`.
