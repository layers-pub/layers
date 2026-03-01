# Universal Decompositional Semantics

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>Universal Decompositional Semantics</dd>
<dt>Origin</dt>
<dd><a href="https://decomp.io">Decompositional Semantics Initiative</a></dd>
<dt>Specification</dt>
<dd><a href="https://github.com/decompositional-semantics-initiative/decomp">github.com/decompositional-semantics-initiative/decomp</a></dd>
<dt>Key Reference</dt>
<dd><a href="https://aclanthology.org/2020.lrec-1.699/">White et al. 2020</a></dd>
</dl>
</div>

## Overview

Decomp is a toolkit for working with the Universal Decompositional Semantics (UDS) dataset. UDS represents sentence meaning as directed acyclic graphs (DAGs) with real-valued semantic property annotations layered over Universal Dependencies syntactic parses. The dataset includes annotations for semantic proto-roles, factuality, genericity, time, entity type, and event structure, collected via crowdsourced scalar judgments.

UDS graphs have three layers: a syntactic layer (UD dependency trees), a semantic layer (PredPatt-derived predicate-argument structures), and an interface layer linking them. Annotations are real-valued rather than categorical, with both per-annotator (raw) and aggregated (normalized) representations.

## Type-by-Type Mapping

### Corpus and Document Model

| Decomp/UDS Concept | Layers Equivalent | Notes |
|---|---|---|
| `UDSCorpus` | `pub.layers.resource.collection` + `pub.layers.expression.expression` records | A UDS corpus is a versioned collection of sentence analyses. The collection record holds corpus metadata (name, version, license); each sentence's source text is an expression. |
| Document (within corpus) | `pub.layers.expression.expression` | Source text for a sentence or document. |
| Corpus split (train/dev/test) | `pub.layers.resource.collection` per split, or `collection.features` | Each split can be a separate collection, or splits can be tracked as features on a parent collection. |

### Syntactic Layer

| Decomp/UDS Concept | Layers Equivalent | Notes |
|---|---|---|
| UD dependency tree | `annotationLayer(kind="graph", subkind="dependency")` | The underlying Universal Dependencies parse. Each token-to-token dependency becomes an `annotation` with `headIndex` and `label` (the dependency relation). |
| Syntax node (`ewt-train-12-syntax-3`) | `pub.layers.expression.expression` (kind: `token`) | Tokens with position indices, surface forms, lemmas. |
| Root node (`ewt-train-12-root-0`) | `annotation` with sentinel `headIndex` | The root of the dependency tree, as in standard UD representation. |
| Node attributes (form, lemma, POS, feats) | `annotationLayer(kind="token-tag", subkind="pos")`, `annotationLayer(kind="token-tag", subkind="lemma")`, etc. | Standard token-level annotation layers, same as the [CoNLL](./conll) mapping. |

### Semantic Layer

| Decomp/UDS Concept | Layers Equivalent | Notes |
|---|---|---|
| Predicate nodes | `annotationLayer(kind="span", subkind="predicate")` | PredPatt-extracted predicates. Each predicate is an annotation anchored to its head token(s). `features.frompredpatt` indicates whether it was automatically extracted. |
| Argument nodes | `pub.layers.annotation.defs#annotation` referenced via `argumentRef` | Arguments linked to their predicate annotations via `argumentRef` with role information. |
| Predicate-argument edges | `annotation.arguments[]` as `argumentRef` | Each predicate annotation lists its arguments. The `argumentRef.role` field captures the argument position. |
| Performative nodes (speaker, addressee, utterance root) | `pub.layers.persona.persona` + annotation with `features.performative = true` | The automatically added speaker and addressee nodes map to persona records. The root performative predicate is an annotation with a feature marking it as performative. |
| Clausal subordination edges | `argumentRef` where the target is another predicate annotation | Arguments that point to predicates (embedded clauses) are represented as `argumentRef` entries whose target resolves to a predicate annotation. |

### Interface Layer (Syntax-Semantics Linking)

| Decomp/UDS Concept | Layers Equivalent | Notes |
|---|---|---|
| Instance edges (head) | `pub.layers.alignment.alignment` with `kind="layer-to-layer"` | Each semantic node's primary link to its syntactic head token. The alignment record maps between the dependency annotation layer and the predicate-argument layer. |
| Instance edges (nonhead) | Additional alignment links | Secondary links from a semantic node to non-head tokens in its syntactic span. |

### Document-Level Graphs

| Decomp/UDS Concept | Layers Equivalent | Notes |
|---|---|---|
| `UDSDocumentGraph` | Cross-expression `pub.layers.graph.graphEdgeSet` | Document-level graphs connect nodes from different sentence graphs. Relations between predicates or arguments across sentences become `graphEdgeEntry` entries. |
| Document-level edge annotations (temporal, event containment) | `graphEdgeEntry.features` | Temporal relation attributes (`rel-start1`, `rel-start2`, `rel-end1`, `rel-end2`) and event containment attributes (`pred1_contains_pred2`, `pred2_contains_pred1`) map to features on the graph edge entry. |

### Semantic Property Annotations

| Decomp/UDS Concept | Layers Equivalent | Notes |
|---|---|---|
| Real-valued node attributes (factuality, genericity, time, entity type, event structure) | `annotation.features` | Each UDS property becomes a `feature` entry: `key` = property name (e.g., `"factual"`, `"arg-particular"`, `"dur-hours"`), `value` = normalized score, `confidence` = annotator confidence. |
| Semantic proto-role attributes (edge-level) | `argumentRef` features or `annotation.features` on the argument annotation | Proto-role properties (volition, awareness, sentience, etc.) are features on the argument reference or the argument annotation itself. |
| Raw annotations (per-annotator) | `pub.layers.judgment.judgmentSet` + `pub.layers.judgment.defs#judgment` | Individual annotator responses. Each annotator's scalar rating for a property is a `judgment` record with `scalarValue` and `confidence`. |
| Normalized annotations (aggregated) | `annotation.features` with aggregation metadata in `annotationMetadata` | Aggregated scores stored as features on the annotation. The `annotationMetadata.tool` field records the normalization method. |

### Experiment Structure

| Decomp/UDS Concept | Layers Equivalent | Notes |
|---|---|---|
| Annotation protocol (property definitions, scale) | `pub.layers.judgment.experimentDef` | Each UDS property protocol (e.g., proto-role elicitation) maps to an experiment definition with `measureType` (e.g., `"inference"` for proto-roles), `taskType="ordinal-scale"`, `scaleMin`/`scaleMax`, and guidelines. |
| Annotator responses per property | `pub.layers.judgment.judgmentSet` | Raw responses grouped by annotator. |
| Inter-annotator agreement | `pub.layers.judgment.agreementReport` | Agreement statistics (Krippendorff's alpha, correlation) for each property. |

## Conversion Notes

A UDS corpus converts to Layers records as follows:

1. Create a `pub.layers.resource.collection` for the corpus with version and license metadata
2. For each sentence, create a `pub.layers.expression.expression` record with the source text
3. Create a `pub.layers.segmentation.segmentation` record with the tokenization from the UD parse, with `expressionRef` pointing to the sentence expression
4. Create an `annotationLayer(kind="graph", subkind="dependency")` from the UD dependency tree
5. Create an `annotationLayer(kind="span", subkind="predicate")` from the PredPatt predicate-argument extraction, with `argumentRef` entries linking predicates to arguments
6. Create `pub.layers.alignment.alignment` records linking UD tokens to semantic nodes (interface edges)
7. For each UDS property type (proto-roles, factuality, etc.), populate `features` on the relevant annotations with normalized scores
8. For raw annotator data, create `pub.layers.judgment.experimentDef` records per property protocol and `judgmentSet` records per annotator
9. For document-level relations, create `pub.layers.graph.graphEdgeSet` records with `graphEdgeEntry` entries spanning sentence boundaries

