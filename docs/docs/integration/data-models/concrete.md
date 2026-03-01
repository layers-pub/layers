# Concrete

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd><a href="https://hltcoe.github.io/concrete/">Concrete</a></dd>
<dt>Origin</dt>
<dd><a href="https://hltcoe.jhu.edu/">Johns Hopkins University HLTCOE</a></dd>
<dt>Specification</dt>
<dd><a href="https://github.com/hltcoe/concrete">github.com/hltcoe/concrete</a></dd>
<dt>Key Reference</dt>
<dd><a href="https://www.akbc.ws/2014/submissions/akbc2014_submission_18.pdf">Ferraro et al. 2014</a></dd>
</dl>
</div>

## Overview

Concrete is a stand-off annotation data model originally defined via Apache Thrift. It provides a hierarchical document model (Communication → Section → Sentence → Tokenization → Token) with UUID-based cross-referencing and typed annotation layers (EntityMention, SituationMention, TokenTagging, Parse, DependencyParse). Concrete is the primary structural inspiration for Layers's document model.

## Type-by-Type Mapping

### Document Model

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `Communication` | `pub.layers.expression.expression` (record) | Direct mapping. Concrete's Communication maps to a top-level Expression with `kind="document"`. Layers adds `sourceUrl`, `sourceRef`, `eprintRef`, `knowledgeRefs` for ATProto ecosystem integration, and `parentRef`/`anchor` for recursive nesting. Concrete's `id` field maps to the record's rkey; `uuid` maps to the AT-URI. |
| `CommunicationMetadata` | `pub.layers.defs#annotationMetadata` + `pub.layers.defs#featureMap` | Layers separates metadata (tool, timestamp, confidence, persona) from open features. |

### Hierarchical Structure

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `Section` | `pub.layers.expression.expression` with `kind="section"` (or `paragraph`, `chapter`, `turn`, etc.) | Concrete sections map to nested Expressions with `parentRef` pointing to the document Expression and `anchor` specifying character offsets. Layers adds `kindUri` for community-expandable section types and `temporalSpan` for audio/video sections. |
| `Sentence` | `pub.layers.expression.expression` with `kind="sentence"` | Nested Expression with `parentRef` pointing to its section. Layers adds `temporalSpan`. |
| `Tokenization` | `pub.layers.segmentation.segmentation` | Tokenization is represented in the segmentation record, which contains a list of tokens decomposing an expression's text. Each tokenization has an optional `expressionRef` that scopes it to a specific sub-expression (e.g., a sentence-level expression). Layers supports multiple tokenizations per expression and community-expandable tokenization strategies via `kindUri`. |
| `Token` | `pub.layers.expression.expression` with `kind="word"` | Concrete's `Token` has `tokenIndex`, `text`, and `TextSpan`; Layers adds `temporalSpan` for audio-grounded tokens. Tokens are word-level Expressions nested within their sentence. |
| `TextSpan` | `pub.layers.defs#span` | Concrete uses `start`/`ending` (exclusive); Layers uses the same convention. |

### Segmentation and Structural Binding

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `Communication.sectionList` | `pub.layers.expression.expression` records with `parentRef` | In Concrete, the section list is embedded in the Communication. In Layers, structural hierarchy (sections, sentences) is expressed via expression records with `parentRef` pointing to their parent expression and appropriate `kind` values (`section`, `sentence`, etc.). This allows structural decomposition to be contributed by different users in a decentralized context. The segmentation record (`pub.layers.segmentation.segmentation`) is reserved for tokenization only. |

### Token-Level Annotations

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `TokenTagging` | `pub.layers.annotation.annotationLayer` with `kind="token-tag"` | Concrete's `TokenTagging` is a flat list of `TaggedToken` objects. Layers uses `annotationLayer` with `kind="token-tag"` and discriminates by `subkind` (pos, ner, lemma, morph, etc.). The `TaggedToken.tag` field maps to `annotation.label`. |
| `TaggedToken` | `pub.layers.annotation.defs#annotation` | `TaggedToken.tokenIndex` → `annotation.tokenIndex`; `TaggedToken.tag` → `annotation.label`. |

### Entity Annotations

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `EntityMentionSet` | `pub.layers.annotation.annotationLayer` with `kind="span"`, `subkind="entity-mention"` | Direct mapping. Concrete's `EntityMentionSet.mentionList` → `annotationLayer.annotations`. |
| `EntityMention` | `pub.layers.annotation.defs#annotation` | `EntityMention.tokens` → `annotation.anchor.tokenRefSequence`; `EntityMention.entityType` → `annotation.label`; `EntityMention.phraseType` → `annotation.features.phraseType`. |
| `Entity` | `pub.layers.annotation.clusterSet` with `kind="coreference"` | Concrete's `Entity` groups `EntityMention` objects into coreference chains. Layers uses `clusterSet` with `kind="coreference"` and `cluster.memberIds` pointing to annotation UUIDs. The `Entity.canonicalName` maps to `cluster.canonicalLabel`. |
| `EntitySet` | `pub.layers.annotation.clusterSet` | One `clusterSet` per entity resolution output. |

### Situation Annotations

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `SituationMentionSet` | `pub.layers.annotation.annotationLayer` with `kind="span"`, `subkind="situation-mention"` or `subkind="frame"` | Concrete's `SituationMention` is used for situations, frames, and states. Layers discriminates these by `subkind`. |
| `SituationMention` | `pub.layers.annotation.defs#annotation` | `SituationMention.tokens` → `annotation.anchor`; `SituationMention.situationKind` → `annotation.label`. |
| `MentionArgument` | `pub.layers.annotation.defs#argumentRef` | `MentionArgument.role` → `argumentRef.role`; `MentionArgument.entityMentionId` → `argumentRef.annotationId` (same-layer) or `argumentRef.layerRef` + `argumentRef.objectId` (cross-layer). |
| `Situation` | `pub.layers.annotation.clusterSet` with `kind="situation-coreference"` | Concrete's `Situation` groups `SituationMention` objects. Maps to Layers `clusterSet`. |
| `SituationSet` | `pub.layers.annotation.clusterSet` | One `clusterSet` per situation resolution output. |

### Syntactic Annotations

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `Parse` | `pub.layers.annotation.annotationLayer` with `kind="tree"`, `subkind="constituency"` | Concrete's `Parse` is a tree of `Constituent` objects. Layers represents each constituent as an `annotation` with `parentId`/`childIds`/`tokenIndex`. |
| `Constituent` | `pub.layers.annotation.defs#annotation` | `Constituent.tag` → `annotation.label`; `Constituent.childList` → `annotation.childIds`; `Constituent.headChildIndex` distinguished via features. |
| `DependencyParse` | `pub.layers.annotation.annotationLayer` with `kind="graph"`, `subkind="dependency"` | Direct mapping. Each `Dependency` becomes an `annotation`. |
| `Dependency` | `pub.layers.annotation.defs#annotation` | `Dependency.dep` → `annotation.tokenIndex`; `Dependency.gov` → `annotation.headIndex`; `Dependency.edgeType` → `annotation.label`. |

### Metadata and Provenance

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `AnnotationMetadata` | `pub.layers.defs#annotationMetadata` | Direct mapping. `tool` → `tool`; `timestamp` → `timestamp`; `confidence` → `confidence`. Layers adds `personaRef` for annotator persona, `digest` for content hashing, and `dependencies` for provenance chains. |
| `TheoryDependencies` | `pub.layers.defs#annotationMetadata.dependencies` | Concrete's `TheoryDependencies` tracks which upstream analyses an annotation depends on. Layers uses the `dependencies` array on `annotationMetadata`, containing `objectRef` references to upstream records. |
| `kBest` | `pub.layers.annotation.annotationLayer.rank` + `alternativesRef` | Concrete supports k-best lists for parse trees and other analyses. Layers models this with `rank` (1 = best) and `alternativesRef` (points to the top-ranked layer) on `annotationLayer`. Each alternative is a separate layer record. |
| `CommunicationTagging` | `pub.layers.annotation.annotationLayer` with `kind="document-tag"` | Concrete's document-level tagging maps to an annotation layer with `kind="document-tag"` on the expression. |
| `LanguageIdentification` | `pub.layers.expression.languages` + `pub.layers.annotation.annotationLayer` with `subkind="language-id"` | Concrete's document-level language ID maps to `expression.language` (primary) and `expression.languages` (additional). Per-span language identification uses an annotation layer with `subkind="language-id"`. |

### Cross-Document Features

| Concrete Type | Layers Equivalent | Notes |
|---|---|---|
| `CommunicationSet` | `pub.layers.annotation.clusterSet` with `expressionRefs` + `corpusRef` | Concrete's cross-document entity and event clustering uses `CommunicationSet` to define the document scope. Layers uses `clusterSet` with optional `expression` (single-document) or `expressionRefs`/`corpusRef` (cross-document). |

### Features Not in Concrete (Layers Extensions)

Layers extends Concrete's model in several dimensions that Concrete does not address:

- **Recursive expressions**: Documents, paragraphs, sentences, words, and morphemes are all expressions with recursive nesting via `parentRef`. Concrete has a fixed hierarchy.
- **Multimodal anchoring**: `temporalSpan`, `spatioTemporalAnchor`, `pageAnchor`, `boundingBox`. Concrete is primarily text-oriented.
- **W3C selectors**: `textQuoteSelector`, `textPositionSelector`, `fragmentSelector` for web annotation interoperability.
- **Knowledge graph integration**: `knowledgeRef`, `pub.layers.graph` (generic typed property graph). Concrete has no built-in knowledge base references.
- **Alignment records**: `pub.layers.alignment.alignment`. Concrete has no parallel text or interlinear glossing support.
- **Ontology definitions**: `pub.layers.ontology.ontology`. Concrete relies on external tagset definitions.
- **Judgment experiments**: `pub.layers.judgment`. Concrete has no annotation experiment framework.
- **Community-expandable enums**: URI+slug dual-field pattern. Concrete uses fixed enum types.
- **Decentralized ownership**: ATProto records live in user PDSes. Concrete assumes centralized storage.

## Conversion Notes

A Concrete Communication can be converted to Layers records as follows:

1. Create a `pub.layers.expression.expression` record with `kind="document"` from the Communication's text, id, and metadata
2. Create `pub.layers.expression.expression` records for each Section (`kind="section"`), Sentence (`kind="sentence"`), and Token (`kind="word"`) with `parentRef` chains
3. Create a `pub.layers.segmentation.segmentation` record for each tokenization, with an optional `expressionRef` scoping it to a specific sub-expression (e.g., a sentence)
4. For each `TokenTagging`, create an `annotationLayer` with `kind="token-tag"` and appropriate `subkind`
5. For each `EntityMentionSet`, create an `annotationLayer` with `kind="span"`, `subkind="entity-mention"`
6. For each `EntitySet`, create a `clusterSet` with `kind="coreference"`
7. For each `SituationMentionSet`, create an `annotationLayer` with `kind="span"` and appropriate `subkind`
8. For each `Parse`, create an `annotationLayer` with `kind="tree"`, `subkind="constituency"`
9. For each `DependencyParse`, create an `annotationLayer` with `kind="graph"`, `subkind="dependency"`

All UUID references are preserved. Character offsets (TextSpan) transfer directly.

