# NIF (NLP Interchange Format)

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>NLP Interchange Format (NIF)</dd>
<dt>Origin</dt>
<dd>AKSW, University of Leipzig</dd>
<dt>Specification</dt>
<dd>NIF 2.0 Core Ontology</dd>
<dt>Key Reference</dt>
<dd><a href="https://link.springer.com/chapter/10.1007/978-3-642-41338-4_7">Hellmann et al. 2013</a></dd>
</dl>
</div>

## Overview

NIF is an RDF/Linked Data-based format for representing NLP annotations as web resources. Every string in a document gets a URI based on its character offsets, making annotations dereferenceable web resources. NIF uses OWL/RDF ontologies for type definitions and integrates with the Linked Data ecosystem (DBpedia, Wikidata, etc.).

## Type-by-Type Mapping

### Core NIF Ontology

| NIF Class/Property | Layers Equivalent | Notes |
|---|---|---|
| `nif:Context` | `pub.layers.expression` | The document/text being annotated. NIF's `nif:isString` → `expression.text`. |
| `nif:String` (base class) | `pub.layers.annotation#annotation` | Any annotated substring. NIF identifies strings by URI (offset-based); Layers uses UUID + character span anchoring. |
| `nif:RFC5147String` / `nif:OffsetBasedString` | `pub.layers.defs#span` | Character offset-based string identification. NIF's `nif:beginIndex`/`nif:endIndex` → `span.start`/`span.ending`. |
| `nif:Word` | `pub.layers.expression` (kind: `token`) | Word-level string. |
| `nif:Sentence` | `pub.layers.expression` (kind: `sentence`) | Sentence-level string. |
| `nif:Phrase` | `pub.layers.annotation#annotation` with `kind="span"` | Phrase/constituent annotation. |
| `nif:Title` / `nif:Paragraph` | `pub.layers.expression` (kind: `section`) | Document structure elements. |

### NIF Annotation Properties

| NIF Property | Layers Equivalent | Notes |
|---|---|---|
| `nif:anchorOf` | `token.text` or derived from `expression.text` + offsets | The surface string. |
| `nif:beginIndex` / `nif:endIndex` | `anchor.textSpan.start` / `anchor.textSpan.ending` | Character offsets (0-based, exclusive end). |
| `nif:referenceContext` | Annotation layer's `expression` reference | The document context. |
| `nif:posTag` | `annotationLayer(kind="token-tag", subkind="pos")` → `annotation.label` | POS tag. |
| `nif:lemma` | `annotationLayer(kind="token-tag", subkind="lemma")` → `annotation.value` | Lemma. |
| `nif:stem` | `annotationLayer(kind="token-tag")` → `annotation.value` with custom subkind | Stem form. |
| `nif:oliaLink` | `annotation.ontologyTypeRef` or `annotation.knowledgeRefs` | Link to OLiA (Ontologies of Linguistic Annotation) category. |
| `nif:dependency` | `annotationLayer(kind="graph", subkind="dependency")` | Dependency relation. |
| `nif:sentimentValue` | `annotationLayer(kind="span", subkind="sentiment")` → `annotation.features.sentimentValue` | Sentiment score. |
| `nif:topic` | `annotation.label` or `features.topic` | Topic classification. |

### NIF Linked Data Integration

| NIF Feature | Layers Equivalent | Notes |
|---|---|---|
| `itsrdf:taIdentRef` (entity linking) | `annotation.knowledgeRefs` with `source="wikidata"` or `source="dbpedia"` | Entity linking to Linked Data resources. NIF's DBpedia/Wikidata URIs → Layers `knowledgeRef.uri` + `knowledgeRef.identifier`. |
| `itsrdf:taClassRef` | `annotation.ontologyTypeRef` + `knowledgeRefs` | Entity type from an ontology. |
| `itsrdf:taConfidence` | `annotation.confidence` | Entity linking confidence (scaled 0-10000). |
| OLiA ontology references | `annotationLayer.ontologyRef` or `annotation.knowledgeRefs` | Links to the Ontologies of Linguistic Annotation for tagset normalization. |
| `nif:sourceUrl` | `pub.layers.expression.sourceUrl` | Source document URL. |

### NIF Provenance

| NIF Feature | Layers Equivalent | Notes |
|---|---|---|
| `nif:broaderContext` | `annotationLayer.parentLayerRef` or expression hierarchy | Context nesting. |
| `prov:wasGeneratedBy` (PROV-O) | `pub.layers.defs#annotationMetadata.tool` | Provenance tracking. |
| `prov:wasAttributedTo` | `annotationMetadata.personaRef` or `annotationMetadata.tool` | Attribution. |
| `dcterms:created` | `annotationMetadata.timestamp` | Creation time. |

### URI Scheme Comparison

NIF's key innovation is URI-based identification of text strings:

```
# NIF URI for characters 0-5 of document:
http://example.org/doc1#char=0,5

# Layers equivalent:
{
  "anchor": {
    "textSpan": { "start": 0, "ending": 5 }
  }
}
```

NIF uses HTTP URIs, making every annotation a dereferenceable web resource. Layers uses AT-URIs (`at://did:plc:xxx/pub.layers.annotation/tid`), which serve the same purpose in the ATProto ecosystem — every annotation is a dereferenceable resource via its AT-URI.

