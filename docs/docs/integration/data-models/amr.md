# AMR and Other Semantic Graph Formalisms

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>AMR, UCCA, DRS, EDS/DMRS</dd>
<dt>Origin</dt>
<dd>Various (ISI/USC, Hebrew University, University of Stuttgart, University of Edinburgh)</dd>
<dt>Specification</dt>
<dd><a href="https://amr.isi.edu">amr.isi.edu</a> (AMR); various</dd>
<dt>Key Reference</dt>
<dd><a href="https://aclanthology.org/W13-2322/">Banarescu et al. 2013</a> (AMR); <a href="https://aclanthology.org/P13-1023/">Abend & Rappoport 2013</a> (UCCA); <a href="https://aclanthology.org/E09-1001/">Copestake 2009</a> (EDS/DMRS)</dd>
</dl>
</div>

## Overview

This document covers graph-based semantic representation formalisms that go beyond surface syntax to represent meaning. These formalisms produce labeled, directed graphs where nodes represent concepts/entities/events and edges represent semantic relations. They share the property of abstracting away from surface word order and syntactic structure.

## AMR (Abstract Meaning Representation)

AMR represents sentence meaning as a rooted, directed, labeled graph. Nodes are concepts (often PropBank framesets or AMR-specific concepts); edges are semantic roles (ARG0, ARG1, etc.) and relations (:mod, :location, :time, etc.).

### Structural Mapping

| AMR Concept | Layers Equivalent | Notes |
|---|---|---|
| AMR graph | `pub.layers.annotation#annotationLayer` with `kind="graph"` and `formalism="AMR"` | The entire AMR graph is one annotation layer. |
| Concept node | `pub.layers.annotation#annotation` | Each AMR concept is an annotation with `label` = concept name (e.g., `want-01`, `boy`, `go-02`). `ontologyTypeRef` can point to the PropBank frameset definition. |
| Root node | The annotation with no incoming `headIndex` | Or explicitly marked via features. |
| Named entity | `annotation` with `label` = entity type + features containing `:name` and `:opN` values | AMR represents named entities as type + name structure. |
| Edge (role) | `pub.layers.annotation#argumentRef` | ARG0, ARG1, etc. map to `argumentRef.role`. The child concept maps to `argumentRef.annotationId`. |
| Non-core relations | `argumentRef` with role = `:mod`, `:location`, `:time`, `:manner`, etc. | AMR's non-core relations use the same `argumentRef` mechanism with different role labels. |
| Reentrancy (shared nodes) | Multiple `argumentRef` entries pointing to the same annotation UUID | AMR allows a concept to fill multiple roles. Layers handles this by having multiple `argumentRef` entries with the same `annotationId`. |
| Constants | `annotation.value` | String/number constants (dates, quantities, etc.) stored in `value`. |
| Polarity/negation | `annotation.features.polarity = "-"` | AMR's `:polarity -` maps to features. |
| Alignment to tokens | `annotation.anchor.tokenRefSequence` or `annotation.tokenIndex` | AMR-to-token alignments (ISI aligner output) map to anchoring. |

### AMR-Specific Concepts

| AMR Feature | Layers Representation | Notes |
|---|---|---|
| Multi-sentence AMR | Multiple annotation layers (one per sentence) + `pub.layers.graph#graphEdgeSet` for cross-sentence links | Cross-sentence coreference and relations use graph edge sets. |
| AMR coreference | `pub.layers.annotation#clusterSet` or AMR reentrancy | Within-sentence: reentrancy (shared UUIDs). Cross-sentence: clusterSet. |
| Document-level AMR | `pub.layers.graph#graphEdgeSet` | Relations between sentence-level AMR graphs. |

## UCCA (Universal Conceptual Cognitive Annotation)

UCCA represents semantic structure using a directed acyclic graph (DAG) anchored to token spans. Nodes are categorized by semantic type; edges are labeled with foundational semantic categories.

| UCCA Concept | Layers Equivalent | Notes |
|---|---|---|
| UCCA graph | `annotationLayer(kind="graph")` with `formalism="UCCA"` | DAG representation. |
| Scene (S) | `annotation` with `label="Scene"` and children | Scene-evoking node. |
| Participant (A) | `argumentRef` with `role="A"` (Actor) | Participant argument. |
| Process (P) | `argumentRef` with `role="P"` | Process predicate. |
| State (S) | `argumentRef` with `role="S"` | State predicate. |
| Center (C) / Elaborator (E) | `argumentRef` with appropriate role labels | UCCA edge categories map to argument roles. |
| Remote edges | `argumentRef` with feature `isRemote=true` | UCCA's remote edges (reentrancy) are marked via features. |
| Terminal nodes | `annotation` with `anchor.tokenRefSequence` | Leaf nodes anchored to text. |
| Non-terminal nodes | `annotation` with `childIds` | Internal nodes with children. |

## DRS (Discourse Representation Structures)

DRS provides box-based semantic representations with discourse referents and conditions.

| DRS Concept | Layers Equivalent | Notes |
|---|---|---|
| DRS box | `annotation` with `kind="graph"` and `formalism` via `formalismUri` | A discourse box. Children are conditions and referents. |
| Discourse referent | `annotation` with `label` = variable name | Variables introduced in a box. |
| Condition | `annotation` with `label` = predicate | Predicates over referents. |
| Nested DRS (conditional, negation) | `annotation.childIds` containing sub-box annotations | Box embedding via parent-child structure. |
| Cross-box anaphora | `argumentRef` or `pub.layers.graph#graphEdge` | References across box boundaries. |

## EDS/DMRS (Elementary/Dependency Minimal Recursion Semantics)

EDS and DMRS are graph-based representations derived from HPSG/MRS.

| EDS/DMRS Concept | Layers Equivalent | Notes |
|---|---|---|
| EDS graph | `annotationLayer(kind="graph")` with appropriate `formalism` | Dependency-style semantic graph. |
| Predication node | `annotation` with `label` = predicate symbol | Each predication maps to an annotation. |
| Argument edge | `argumentRef` | `ARG1`, `ARG2`, etc. |
| Quantifier scope | `argumentRef` with `role="RSTR"` / `role="BODY"` | Scope relations. |
| Token alignment | `annotation.anchor.tokenRefSequence` | Character-span-to-node alignment. |

## Semantic Dependency Parsing (SDP)

Formats from the SemEval 2014/2015 shared tasks (DM, PAS, PSD):

| SDP Concept | Layers Equivalent | Notes |
|---|---|---|
| Semantic dependency graph | `annotationLayer(kind="graph")` with appropriate `formalism` | Token-level semantic dependencies. |
| Predicate node | `annotation` with `tokenIndex` + `label` (predicate sense) | Token identified as predicate. |
| Argument edge | `annotation.headIndex` + `annotation.label` | Directed edge with role label. |
| Top node | Annotation with feature `isTop=true` | Graph root. |

