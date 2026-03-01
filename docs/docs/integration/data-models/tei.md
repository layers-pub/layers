# TEI

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>TEI: Text Encoding Initiative XML encoding standard</dd>
<dt>Origin</dt>
<dd>TEI Consortium</dd>
<dt>Specification</dt>
<dd>TEI P5 Guidelines</dd>
<dt>Key Reference</dt>
<dd><a href="https://tei-c.org/guidelines/">tei-c.org/guidelines</a></dd>
</dl>
</div>

## Overview

TEI is an XML-based standard for encoding literary and linguistic texts. It provides extremely rich document structure modeling (divisions, paragraphs, lines, speakers, stage directions), critical apparatus for manuscript traditions, metadata headers, and both inline and stand-off annotation. TEI is the dominant format in digital humanities and historical linguistics.

## Type-by-Type Mapping

### Document Structure

| TEI Element | Layers Equivalent | Notes |
|---|---|---|
| `<TEI>` | `pub.layers.expression.expression` (record) | Root document container. TEI's `@xml:id` maps to the record's AT-URI. |
| `<teiHeader>` | `pub.layers.expression.expression` metadata fields + `features` | TEI header metadata (fileDesc, encodingDesc, profileDesc, revisionDesc) maps to expression-level fields and features. |
| `<text>` | `pub.layers.expression.text` | Primary textual content. |
| `<body>` | Implicit in `pub.layers.expression.expression` hierarchy via `parentRef` | The body structure is captured by the expression hierarchy: divisions, paragraphs, and sentences are nested expressions with `parentRef` chains. Tokenization is handled separately via `pub.layers.segmentation.segmentation`. |
| `<div>` (division) | `pub.layers.expression.expression` (kind: `section`) | Nested divisions map to sections with `kind` discriminating division types (chapter, part, act, scene, etc.). TEI's nested `<div>` structure is flattened into sections with parent-child relationships tracked via features or section ordering. |
| `<p>` (paragraph) | `pub.layers.expression.expression` (kind: `section`) with `subkind="paragraph"` | Paragraph-level sections. |
| `<s>` (sentence) | `pub.layers.expression.expression` (kind: `sentence`) | Sentence segmentation. |
| `<w>` (word) | `pub.layers.expression.expression` (kind: `token`) | Word-level tokenization. TEI's `@lemma`, `@pos`, `@msd` attributes map to separate annotation layers. |
| `<c>` (character) | `pub.layers.expression.expression` (kind: `token`) in a `tokenization(kind="character")` | Character-level tokenization. |
| `<pc>` (punctuation) | `pub.layers.expression.expression` (kind: `token`) with feature `isPunctuation=true` | Punctuation characters as tokens. |

### Speaker and Dialogue

| TEI Element | Layers Equivalent | Notes |
|---|---|---|
| `<sp>` (speech) | `pub.layers.expression.expression` (kind: `section`) with `subkind="turn"` + `speaker` | Dialogue turns with speaker identification. |
| `<speaker>` | `expression.speaker` | Speaker identifier. |
| `<stage>` (stage direction) | `pub.layers.expression.expression` (kind: `section`) with `subkind` set via `subkindUri` (e.g., `"stage-direction"`) | Stage directions as community-defined section kinds. |
| `<lg>` (line group) | `pub.layers.expression.expression` (kind: `section`) with subkind via `subkindUri` (e.g., `"stanza"`) | Poetic stanzas. |
| `<l>` (verse line) | `pub.layers.expression.expression` (kind: `section`) with subkind via `subkindUri` (e.g., `"verse-line"`) | Individual verse lines. |

### Linguistic Annotation

| TEI Element | Layers Equivalent | Notes |
|---|---|---|
| `<w @lemma>` | `annotationLayer(kind="token-tag", subkind="lemma")` | Lemmatization. |
| `<w @pos>` | `annotationLayer(kind="token-tag", subkind="pos")` | POS tagging. |
| `<w @msd>` | `annotationLayer(kind="token-tag", subkind="morph")` | Morphosyntactic description. |
| `<phr>` (phrase) | `annotationLayer(kind="span")` with appropriate `subkind` | Phrase-level annotation. |
| `<cl>` (clause) | `annotationLayer(kind="span", subkind="discourse-unit")` | Clause annotation. |
| `<name>` / `<persName>` / `<placeName>` / `<orgName>` | `annotationLayer(kind="span", subkind="entity-mention")` | Named entity spans. TEI's entity type (`persName` vs `placeName`) maps to `annotation.label`. |
| `<rs>` (referring string) | `annotationLayer(kind="span", subkind="entity-mention")` | Referring expressions with `@type` → `annotation.label`. |
| `<date>` / `<time>` | `annotationLayer(kind="span", subkind="temporal-expression")` | Temporal expressions with `@when` → `annotation.value` (normalized form). |

### Critical Apparatus and Manuscript Traditions

| TEI Element | Layers Equivalent | Notes |
|---|---|---|
| `<app>` (apparatus entry) | `annotationLayer(kind="span")` with `subkind` via `subkindUri` (e.g., `"apparatus-entry"`) | Variant readings. Each `<rdg>` (reading) is an annotation with the variant text in `value` and witness in `features`. |
| `<rdg>` (reading) | `pub.layers.annotation.defs#annotation` | Individual manuscript readings. `@wit` (witness sigla) → `features`. |
| `<lem>` (lemma/preferred reading) | `annotation` with feature `isLemma=true` | The preferred reading among variants. |
| `<note>` (editorial note) | `annotationLayer(kind="span", subkind="comment")` | Notes and commentary. |
| `<gap>` / `<unclear>` / `<supplied>` | `annotationLayer(kind="span")` with custom `subkind` | Transcription uncertainty markers. |
| `<choice>` / `<sic>` / `<corr>` | `annotationLayer(kind="span", subkind="error")` + `annotationLayer(kind="span", subkind="correction")` with `parentLayerRef` | Error/correction pairs linked by `parentLayerRef`. |
| `<abbr>` / `<expan>` | Similar error/correction pattern | Abbreviation/expansion pairs. |

### Metadata and Bibliography

| TEI Element | Layers Equivalent | Notes |
|---|---|---|
| `<fileDesc>` | `pub.layers.expression.expression` fields + `features` | File description metadata. |
| `<sourceDesc>` | `pub.layers.expression.sourceUrl` + `sourceRef` | Source document references. |
| `<bibl>` / `<biblStruct>` | `pub.layers.eprint.eprint` | Bibliographic references link to eprint records. |
| `<respStmt>` | `pub.layers.defs#annotationMetadata` | Responsibility statements map to annotation metadata. |
| `<encodingDesc>` | `pub.layers.ontology.ontology` + annotation layer metadata | Encoding description (tagset declarations, etc.) maps to ontology definitions. |
| `<taxonomy>` / `<category>` | `pub.layers.ontology.typeDef` hierarchy | Classification taxonomies. |
| `<particDesc>` / `<person>` | `pub.layers.persona.persona` or `features` | Participant descriptions in spoken text corpora. |

### Stand-Off Annotation (TEI)

TEI supports stand-off annotation via `@xml:id` references and `<spanGrp>`/`<span>` elements, which map directly to Layers's stand-off architecture:

| TEI Stand-Off Element | Layers Equivalent | Notes |
|---|---|---|
| `<spanGrp>` | `pub.layers.annotation.annotationLayer` | Group of stand-off spans. |
| `<span @from @to>` | `pub.layers.annotation.defs#annotation` with `anchor.textSpan` | Stand-off span with character offsets. |
| `<link>` / `<linkGrp>` | `pub.layers.graph.graphEdge` | Typed links between elements. |
| `<interp>` / `<interpGrp>` | `pub.layers.annotation.annotationLayer` | Interpretive annotation groups. |

