# W3C Web Annotation Data Model

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>W3C Web Annotation Data Model</dd>
<dt>Origin</dt>
<dd>W3C Web Annotation Working Group</dd>
<dt>Specification</dt>
<dd>W3C Recommendation (23 February 2017)</dd>
<dt>Key Reference</dt>
<dd><a href="https://www.w3.org/TR/annotation-model/">w3.org/TR/annotation-model</a></dd>
</dl>
</div>

## Overview

The W3C Web Annotation Data Model is the standard for annotating web resources. It defines a target-body-motivation architecture where annotations select parts of resources (targets) and associate them with descriptive content (bodies). The model defines a set of selector types for identifying regions within resources (see the Selector Types table below). The at.margin (Semble/Cosmik) ATProto lexicons implement this model on ATProto.

## Core Architecture Mapping

### Annotation Structure

| W3C Concept | Layers Equivalent | Notes |
|---|---|---|
| `Annotation` | `pub.layers.annotation.defs#annotation` | A single annotation. W3C's `id` → annotation UUID / AT-URI. |
| `Target` | `annotation.anchor` | What the annotation is about: the selected region of a resource. |
| `Body` | `annotation.label`, `annotation.value`, `annotation.features`, `annotation.arguments` | The content of the annotation. Layers distributes body content across typed fields rather than using a generic body object. |
| `Motivation` | `annotationLayer.kind` + `annotationLayer.subkind` | Why the annotation was created. W3C motivations (commenting, highlighting, tagging, describing, etc.) map to Layers kind/subkind discriminators. |
| `Creator` | `pub.layers.defs#annotationMetadata.agent` (agentRef.did / ATProto record DID) | The agent (human or software) that created the annotation. ATProto-native agents are identified via agentRef.did. |
| `Generator` | `pub.layers.defs#annotationMetadata.tool` | The software that generated the serialization. Distinct from creator (agent) per the W3C model. |
| `Created`/`Modified` | `annotationMetadata.timestamp` + `createdAt` | Timestamps. |

### W3C Motivations → Layers Kind/Subkind

| W3C Motivation | Layers Mapping | Notes |
|---|---|---|
| `oa:commenting` | `kind="span", subkind="comment"` | Free-text commentary. |
| `oa:highlighting` | `kind="span", subkind="highlight"` | Visual highlighting. |
| `oa:tagging` | `kind="token-tag"` or `kind="span"` | Label assignment. |
| `oa:describing` | `kind="span"` with `annotation.value` | Descriptive annotation. |
| `oa:classifying` | `kind="span"` with `annotation.ontologyTypeRef` | Ontology-based classification. |
| `oa:identifying` | `kind="span", subkind="entity-mention"` with `knowledgeRefs` | Entity identification/linking. |
| `oa:linking` | `pub.layers.graph.graphEdge` | Linking to related resources. |
| `oa:bookmarking` | `kind="span", subkind="bookmark"` | Bookmarking. |
| `oa:editing` | `kind="span", subkind="correction"` | Suggested edits. |
| `oa:questioning` | `kind="span"` with custom `subkind` | Questioning content. |
| `oa:replying` | Not a core Layers annotation type; handled via ATProto social graph (reply records) | Replies are social interactions, not linguistic annotations. |
| `oa:moderating` | Appview-level functionality | Content moderation. |
| `oa:assessing` | `pub.layers.judgment.judgmentSet` | Quality/acceptability assessment. |

### Selector Types

Layers includes W3C-compatible selectors in `pub.layers.defs`:

| W3C Selector | Layers Equivalent | Notes |
|---|---|---|
| `TextQuoteSelector` | `pub.layers.defs#textQuoteSelector` | Select by quoting text. `exact` → exact match; `prefix`/`suffix` → context. Direct mapping. |
| `TextPositionSelector` | `pub.layers.defs#textPositionSelector` | Select by UTF-8 byte offsets. W3C `start`/`end` → `byteStart`/`byteEnd`. The import pipeline converts character offsets to byte offsets at import time. |
| `FragmentSelector` | `pub.layers.defs#fragmentSelector` | Select by URI fragment. `value` → fragment identifier; `conformsTo` → fragment spec URI. Direct mapping. |
| `CssSelector` | `pub.layers.defs#featureMap` (annotation `features`) | CSS selector string. Not representable on `externalTarget`, whose `selector` union accepts only `textQuoteSelector`/`textPositionSelector`/`fragmentSelector`. Store CSS selectors in the annotation's `features` map. |
| `XPathSelector` | `pub.layers.defs#featureMap` (annotation `features`) | XPath expression. Not representable on `externalTarget`; store in the annotation's `features` map. |
| `DataPositionSelector` | `pub.layers.defs#span` | UTF-8 byte offset selection. |
| `SvgSelector` | `pub.layers.defs#boundingBox` or features | SVG-based spatial selection. Layers uses `boundingBox` for rectangular regions; arbitrary SVG shapes go in features. |
| `RangeSelector` | Composite of two selectors | Start/end defined by two separate selectors. Representable by combining two anchor fields. |
| `FragmentSelector` (Media Fragments URI, e.g. `#t=10,20`) | `pub.layers.defs#temporalSpan` | W3C time selection uses a FragmentSelector whose `conformsTo` references the Media Fragments URI spec (http://www.w3.org/TR/media-frags/). Maps to `temporalSpan.start`/`temporalSpan.ending` in milliseconds. |

### Target Types

| W3C Target | Layers Equivalent | Notes |
|---|---|---|
| External resource (URL) | `pub.layers.defs#externalTarget` | Annotation of a web resource. `source` → URL; `selector` → W3C selector. |
| Specific resource (URL + selector) | `externalTarget` + `textQuoteSelector`/`textPositionSelector`/`fragmentSelector` | Pinpointed region of a web resource. |
| Internal resource | `annotation.anchor` (textSpan, tokenRef, etc.) | Annotation of Layers-managed content. |
| Composite target | Multiple anchor fields in the polymorphic `anchor` object | Annotations with multiple target components. |

### Body Types

| W3C Body | Layers Equivalent | Notes |
|---|---|---|
| `TextualBody` | `annotation.value` | Plain text body. |
| `SpecificResource` (embedded content) | `annotation.features` | Structured body content. |
| `Choice` (alternative bodies) | Multiple annotations with different values | Alternative interpretations represented as separate annotations. |
| Tag body | `annotation.label` | Tag/label value. |
| External resource body | `annotation.knowledgeRefs` | Link to external resource as body content. |

## at.margin (Semble) Interoperability

The at.margin ATProto lexicons implement W3C Web Annotation on ATProto. Layers's W3C selector types are structurally compatible:

| at.margin Record | Layers Equivalent | Integration Pattern |
|---|---|---|
| `at.margin.annotation` | `pub.layers.annotation.annotationLayer` | Layers expressions with `sourceUrl` co-locate with at.margin annotations on the same URL. |
| `at.margin.highlight` | `annotationLayer(kind="span", subkind="highlight")` | Highlighting. |
| `at.margin.bookmark` | `annotationLayer(kind="span", subkind="bookmark")` | Bookmarking. |
| `at.margin.collection` | `pub.layers.corpus.corpus` | Collections of annotations. |
| `at.margin.reply` | ATProto social graph | Not a Layers annotation type. |
| `at.margin.like` | ATProto social graph | Not a Layers annotation type. |

The lairs.pub appview discovers at.margin annotations by consuming the ATProto firehose and indexing records that share `sourceUrl` values with Layers expressions. No bridge records are needed. This follows standard ATProto cross-app discovery patterns.

