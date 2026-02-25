# brat (standoff annotation)

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>brat</dd>
<dt>Origin</dt>
<dd>Tsujii Laboratory, University of Tokyo</dd>
<dt>Specification</dt>
<dd>brat standoff format (<code>.ann</code> files)</dd>
<dt>Key Reference</dt>
<dd><a href="https://aclanthology.org/E12-2021/">Stenetorp et al. 2012</a></dd>
</dl>
</div>

## Overview

brat is a web-based annotation tool that uses a simple standoff annotation format. Annotations are stored in `.ann` files separate from the source text (`.txt` files). The format defines five annotation types: text-bound annotations (T), events (E), attributes (A), relations (R), and equivalences (*). brat's format is widely used in biomedical NLP shared tasks (BioNLP-ST, GENIA, etc.).

## Type-by-Type Mapping

### Text-Bound Annotations (T)

Format: `T{id}\t{type} {start} {end}\t{text}`

| brat Feature | Layers Equivalent | Notes |
|---|---|---|
| T-annotation | `pub.layers.annotation#annotation` with `anchor.textSpan` | A labeled span of text. `{type}` → `annotation.label`; `{start}/{end}` → `anchor.textSpan.start`/`anchor.textSpan.ending`. |
| Discontinuous spans | `anchor.tokenRefSequence` with non-contiguous indices | brat represents discontinuous spans as `{start1} {end1};{start2} {end2}`. Layers uses `tokenRefSequence` with non-contiguous `tokenIndexes`, or multiple character spans in features. |
| Entity annotations | `annotationLayer(kind="span", subkind="entity-mention")` | Named entities, gene mentions, chemical names, etc. |
| Trigger annotations | `annotationLayer(kind="span", subkind="event-mention")` | Event triggers (the text that evokes an event). |

### Events (E)

Format: `E{id}\t{type}:{trigger} {role1}:{arg1} {role2}:{arg2}...`

| brat Feature | Layers Equivalent | Notes |
|---|---|---|
| Event | `pub.layers.annotation#annotation` with `kind="span"`, `subkind="event-mention"` or `subkind="frame"` | Event instance with trigger span and argument roles. |
| Event type | `annotation.label` | Event type (e.g., `Phosphorylation`, `Binding`, `Gene_expression`). |
| Event trigger | `annotation.anchor` | The text span that triggers/evokes the event. |
| Event arguments | `annotation.arguments[]` as `argumentRef` | `{role}:{arg}` pairs map to `argumentRef.role` and `argumentRef.annotationId`. |
| Nested events | `argumentRef` pointing to another event annotation | brat allows events as arguments to other events. Layers's `argumentRef` can reference any annotation by UUID, supporting arbitrary nesting. |

### Attributes (A)

Format: `A{id}\t{type} {target} {value}`

| brat Feature | Layers Equivalent | Notes |
|---|---|---|
| Binary attribute | `annotation.features` on the target annotation | `{type}` → feature key; presence → feature value `"true"`. |
| Multi-valued attribute | `annotation.features` on the target annotation | `{type}` → feature key; `{value}` → feature value. |
| Negation | `features.negation = "true"` | Common attribute in biomedical annotation. |
| Speculation | `features.speculation = "true"` | Hedging/uncertainty. |

### Relations (R)

Format: `R{id}\t{type} Arg1:{arg1} Arg2:{arg2}`

| brat Feature | Layers Equivalent | Notes |
|---|---|---|
| Binary relation | `pub.layers.annotation#annotation` with `kind="relation"` | Typed relation between two annotations. `{type}` → `annotation.label`; `Arg1`/`Arg2` → `annotation.arguments`. |
| Directed relation | `argumentRef` with `role="source"` / `role="target"` | brat relations are directed (Arg1 → Arg2). |
| Undirected relation | `argumentRef` with `role="arg1"` / `role="arg2"` | Symmetric relations. |
| Cross-sentence relations | Supported natively | Layers annotations can reference any annotation within the expression by UUID. |

### Equivalences (*)

Format: `*\t{type} {id1} {id2} ...`

| brat Feature | Layers Equivalent | Notes |
|---|---|---|
| Equivalence set | `pub.layers.annotation#clusterSet` | Groups of equivalent annotations (coreference, etc.). `{type}` → `clusterSet.kind`; `{id1} {id2}...` → `cluster.memberIds`. |

### Normalization (N)

Format: `N{id}\t{type} {target} {ref_db}:{ref_id}\t{text}`

| brat Feature | Layers Equivalent | Notes |
|---|---|---|
| Normalization | `annotation.knowledgeRefs` | Links annotations to external databases. `{ref_db}` → `knowledgeRef.source`; `{ref_id}` → `knowledgeRef.identifier`. Used for gene/protein database links (UniProt, NCBI Gene, etc.). |

### Notes (#)

Format: `#{id}\t{type} {target}\t{text}`

| brat Feature | Layers Equivalent | Notes |
|---|---|---|
| Annotator note | `annotation.features.note` or separate `annotationLayer(kind="span", subkind="comment")` | Free-text annotator comments on specific annotations. |

### brat Configuration

| brat Config | Layers Equivalent | Notes |
|---|---|---|
| `annotation.conf` (entity/event/relation type definitions) | `pub.layers.ontology` | Type definitions with constraints. |
| `visual.conf` (display settings) | Appview rendering configuration | Not part of the data model; handled by the lairs.pub appview. |
| `tools.conf` (tool integration) | Appview pipeline configuration | Not part of the data model. |
| `kb_shortcuts.conf` | UI configuration | Not part of the data model. |

## Conversion Notes

A brat `.ann` file converts to Layers records as follows:

1. The `.txt` file becomes a `pub.layers.expression` record
2. T-annotations become annotations in appropriate layers (entity-mention, event-mention, etc.), grouped by type
3. E-annotations become annotations with `kind="span"` and `arguments` referencing trigger and argument annotations
4. A-annotations become features on their target annotations
5. R-annotations become annotations in a relation layer or `pub.layers.graph#graphEdgeEntry` entries
6. \*-annotations become `clusterSet` records
7. N-annotations become `knowledgeRef` entries on their target annotations

