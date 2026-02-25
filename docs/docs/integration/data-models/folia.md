# FoLiA (Format for Linguistic Annotation)

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>Format for Linguistic Annotation (FoLiA)</dd>
<dt>Origin</dt>
<dd>Radboud University</dd>
<dt>Specification</dt>
<dd>FoLiA Documentation v2.5+</dd>
<dt>Key Reference</dt>
<dd><a href="https://clinjournal.org/clinj/article/view/26">van Gompel & Reynaert 2013</a></dd>
</dl>
</div>

## Overview

FoLiA is a rich XML-based format for linguistic annotation developed at Radboud University. It supports both inline and stand-off annotation, alternative/correction layers, provenance tracking, and a wide range of linguistic annotation types. FoLiA aims to be a single format that handles all levels of linguistic annotation in a consistent way.

## Type-by-Type Mapping

### Document Structure

| FoLiA Element | Layers Equivalent | Notes |
|---|---|---|
| `<FoLiA>` (document) | `pub.layers.expression` | Root document. FoLiA's `@xml:id` → AT-URI. |
| `<metadata>` | Expression fields + `features` | Document-level metadata. |
| `<text>` | `pub.layers.expression.text` | Primary text content. |
| `<div>` (division) | `pub.layers.expression` (kind: `section`) | Document divisions. |
| `<p>` (paragraph) | `pub.layers.expression` (kind: `section`) with `subkind="paragraph"` | Paragraph sections. |
| `<s>` (sentence) | `pub.layers.expression` (kind: `sentence`) | Sentence boundaries. |
| `<w>` (word) | `pub.layers.expression` (kind: `token`) | Word tokens. |
| `<morpheme>` | `pub.layers.expression` (kind: `token`) in a `tokenization(kind="morphological")` | Morpheme-level tokens within a word, linked by `pub.layers.alignment`. |

### Annotation Layers

| FoLiA Annotation | Layers Equivalent | Notes |
|---|---|---|
| `<pos>` | `annotationLayer(kind="token-tag", subkind="pos")` | POS tagging. FoLiA's `@class` → `annotation.label`; `@set` → `annotationLayer.labelSet`. |
| `<lemma>` | `annotationLayer(kind="token-tag", subkind="lemma")` | Lemmatization. |
| `<sense>` | `annotationLayer(kind="token-tag", subkind="sense")` | Word sense disambiguation. `@class` → `annotation.label`; `@synset` → `annotation.knowledgeRefs` (WordNet). |
| `<domain>` | `annotationLayer(kind="token-tag")` with custom `subkind` | Domain/register classification. |
| `<lang>` | `annotationLayer(kind="token-tag", subkind="language-id")` | Per-token language identification. |
| `<phonology>` / `<phon>` | `annotationLayer(kind="token-tag", subkind="phonetic")` | Phonetic transcription. |
| `<entity>` | `annotationLayer(kind="span", subkind="entity-mention")` | Named entity spans. FoLiA's `@class` → `annotation.label` (entity type). |
| `<chunking>` / `<chunk>` | `annotationLayer(kind="token-tag", subkind="chunk")` or `annotationLayer(kind="span")` | Chunking. IOB token tags or span annotations. |
| `<dependency>` | `annotationLayer(kind="graph", subkind="dependency")` | Dependency relations. `<dep>` → dependent token; `<hd>` → head token; `@class` → relation label. |
| `<syntax>` | `annotationLayer(kind="tree", subkind="constituency")` | Constituency parse. `<su>` (syntactic unit) → annotation with `parentId`/`childIds`. |
| `<semroles>` | `annotationLayer(kind="span", subkind="frame")` | Semantic role labeling. `<semrole @class>` → `argumentRef.role`. |
| `<coreferences>` | `pub.layers.annotation#clusterSet` with `kind="coreference"` | Coreference chains. |
| `<sentiment>` | `annotationLayer(kind="span", subkind="sentiment")` | Sentiment annotation. |
| `<statement>` | `annotationLayer(kind="span")` with custom `subkind` (e.g., `"attribution"`) | Attribution/statement annotation. |
| `<observation>` | `annotationLayer(kind="span")` with custom `subkind` | Observation annotations. |
| `<timesegment>` | `annotationLayer(kind="tier")` with `anchor.temporalSpan` | Time-aligned segments for speech. |
| `<rawcontent>` | `pub.layers.expression.text` or `features` | Raw/original content before normalization. |

### Corrections and Alternatives

FoLiA has a sophisticated system for representing corrections, alternatives, and suggestions:

| FoLiA Feature | Layers Equivalent | Notes |
|---|---|---|
| `<correction>` | `annotationLayer(kind="span", subkind="correction")` with `parentLayerRef` → error layer | Corrections linked to the original annotation via `parentLayerRef`. The original is in an error layer; the correction in a correction layer. |
| `<original>` (within correction) | The annotation in the error-subkind layer | The original (incorrect) form. |
| `<new>` (within correction) | The annotation in the correction-subkind layer | The corrected form. |
| `<current>` | Active annotation (default layer) | The current/accepted form. |
| `<suggestion>` | Additional annotation with lower confidence | Suggested alternatives stored as annotations with confidence scores. |
| `<alternative>` | Separate `annotationLayer` with same `kind`/`subkind` | Alternative analyses (e.g., two possible POS tags). Each alternative is a separate annotation layer. Multiple layers with the same `kind`/`subkind` on the same expression represent alternatives. |

### Provenance and Sets

| FoLiA Feature | Layers Equivalent | Notes |
|---|---|---|
| `<processor>` | `pub.layers.defs#annotationMetadata.tool` | Tool/annotator identification. |
| `@processor` (on annotations) | `annotationLayer.metadata.tool` | Per-layer tool attribution. |
| `@set` (annotation set) | `annotationLayer.labelSet` or `ontologyRef` | Tagset/label-set identifier. FoLiA sets define valid label values. Layers uses `ontologyRef` for formal type systems and `labelSet` for simpler tag sets. |
| `@class` (annotation value) | `annotation.label` | The annotation value from the set. |
| `@confidence` | `annotation.confidence` | Confidence score (0-10000 scaled from FoLiA's 0.0-1.0). |
| `@datetime` | `annotationMetadata.timestamp` | Creation timestamp. |
| `@n` (ordinal) | `annotation.features.ordinal` or array index | Ordering information. |

### Span Annotation and Grouping

| FoLiA Feature | Layers Equivalent | Notes |
|---|---|---|
| `<wref>` (word reference) | `anchor.tokenRefSequence` | References to words in span annotations. FoLiA's `@id`-based references → Layers token index references. |
| Discontinuous spans | `anchor.tokenRefSequence` with non-contiguous `tokenIndexes` | FoLiA supports discontinuous spans via multiple `<wref>` elements. Layers's `tokenRefSequence` supports the same pattern. |
| `<relation>` | `pub.layers.graph#graphEdge` or `annotation.arguments` | Typed relations between annotation elements. |

