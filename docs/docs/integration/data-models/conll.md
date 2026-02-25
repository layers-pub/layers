# CoNLL Formats

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>CoNLL-U, CoNLL-X, CoNLL-2003, CoNLL-2005, CoNLL-2009, CoNLL-2012</dd>
<dt>Origin</dt>
<dd>Conference on Natural Language Learning shared tasks</dd>
<dt>Specification</dt>
<dd><a href="https://universaldependencies.org/format.html">universaldependencies.org/format.html</a></dd>
<dt>Key Reference</dt>
<dd><a href="https://aclanthology.org/2021.cl-2.11/">de Marneffe et al. 2021</a> (UD); various shared task proceedings</dd>
</dl>
</div>

## Overview

CoNLL formats are tab-separated column-based annotation formats widely used in NLP shared tasks. CoNLL-U (Universal Dependencies) is the most widely used variant. Each line represents a token with multiple annotation columns. CoNLL formats are flat, single-file representations optimized for machine learning pipelines.

## CoNLL-U (Universal Dependencies)

### Column Mapping

| CoNLL-U Column | Layers Equivalent | Notes |
|---|---|---|
| `ID` | `pub.layers.expression` token `tokenIndex` | Token position. CoNLL-U uses 1-based; Layers uses 0-based. |
| `FORM` | `pub.layers.expression` token `text` | Surface form. |
| `LEMMA` | `annotationLayer(kind="token-tag", subkind="lemma")` → `annotation.value` | Lemmatization layer. |
| `UPOS` | `annotationLayer(kind="token-tag", subkind="pos")` → `annotation.label` | Universal POS tag. |
| `XPOS` | `annotationLayer(kind="token-tag", subkind="xpos")` → `annotation.label` | Language-specific POS tag. |
| `FEATS` | `annotationLayer(kind="token-tag", subkind="morph")` → `annotation.features` | Morphological features (e.g., `Case=Nom\|Number=Sing`). Each feature key-value pair maps to a `feature` entry. |
| `HEAD` | `annotationLayer(kind="graph", subkind="dependency")` → `annotation.headIndex` | Governor token index. CoNLL-U's `0` (root) maps to `headIndex` absent or a sentinel. |
| `DEPREL` | Same dependency layer → `annotation.label` | Dependency relation label. |
| `DEPS` | `annotationLayer(kind="graph", subkind="enhanced-dependency")` | Enhanced dependencies (multiple heads). Each `head:deprel` pair creates a separate annotation in the enhanced layer. |
| `MISC` | `pub.layers.defs#featureMap` on the token or annotation | Catch-all for `SpaceAfter=No`, `Translit=...`, etc. |

### Special Token Types

| CoNLL-U Feature | Layers Equivalent | Notes |
|---|---|---|
| Multi-word tokens (e.g., `1-2 del`) | `pub.layers.defs#tokenRefSequence` | Multi-word token ranges are represented as a `tokenRefSequence` with `tokenIndexes` covering the component tokens. The surface form and span of the multi-word token are stored in features. |
| Empty nodes (e.g., `2.1`) | `pub.layers.annotation#annotation` with features | Empty nodes in enhanced UD are represented as annotations (not tokens) in the enhanced dependency layer, with `features` indicating they are empty/null nodes. Their position is tracked via decimal indices stored in features. |
| Sentence boundaries | `pub.layers.expression` (kind: `sentence`) + `pub.layers.segmentation` | CoNLL-U blank lines between sentences map to sentence boundaries in the segmentation record. |
| `# text = ...` comment | `pub.layers.expression` sentence `features` or `pub.layers.expression.text` | Sentence-level metadata from comments. |
| `# sent_id = ...` comment | `pub.layers.expression` sentence `uuid` | Sentence identifier. |
| `# newpar` / `# newdoc` | `pub.layers.expression` (kind: `section`) boundaries | Paragraph and document boundaries. |

## CoNLL-2003 (NER)

| CoNLL-2003 Column | Layers Equivalent | Notes |
|---|---|---|
| Word | `token.text` | Surface form. |
| POS tag | `annotationLayer(kind="token-tag", subkind="pos")` | POS tag. |
| Chunk tag | `annotationLayer(kind="token-tag", subkind="chunk")` | IOB chunk tag. |
| NER tag | `annotationLayer(kind="token-tag", subkind="ner")` | IOB NER tag. Can also be converted to `kind="span", subkind="entity-mention"` with token spans. |

## CoNLL-2005 / CoNLL-2009 (SRL)

| CoNLL-200x Column | Layers Equivalent | Notes |
|---|---|---|
| Predicate | `annotationLayer(kind="span", subkind="predicate")` | Predicate identification. |
| Predicate sense | `annotationLayer(kind="span", subkind="frame", formalism="PropBank")` → `annotation.label` | PropBank sense (roleset ID). |
| Argument columns | `annotation.arguments[]` with `argumentRef.role` | Each argument column (ARG0, ARG1, ARGM-TMP, etc.) becomes an `argumentRef` on the frame annotation. |

## CoNLL-2012 (OntoNotes Coreference)

| CoNLL-2012 Feature | Layers Equivalent | Notes |
|---|---|---|
| Coreference column | `pub.layers.annotation#clusterSet` with `kind="coreference"` | Parenthetical coreference notation (e.g., `(12)`, `(12`, `12)`) maps to cluster membership. Each cluster ID becomes a `cluster` with `memberIds` pointing to span annotations. |
| Speaker column | `annotationLayer(kind="token-tag", subkind="speaker")` | Speaker diarization. |
| Named entity spans | `annotationLayer(kind="span", subkind="entity-mention")` | Entity mention spans. |

## Conversion Notes

CoNLL formats are flat, token-per-line representations. Converting to Layers requires:

1. Parse the file into tokens, creating a `tokenization` with `kind="whitespace"` or appropriate strategy
2. Group tokens into sentences (blank-line delimited), creating `sentence` objects
3. Wrap in a `segmentation` record bound to an `expression`
4. For each annotation column, create a separate `annotationLayer` with appropriate `kind`/`subkind`
5. IOB/BILOU tags can remain as token-tags or be converted to span annotations — Layers supports both

The reverse conversion (Layers → CoNLL) selects the appropriate annotation layers and serializes them column-by-column.

