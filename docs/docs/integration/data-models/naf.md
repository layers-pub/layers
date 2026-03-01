# NAF

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>NLP Annotation Format (NAF)</dd>
<dt>Origin</dt>
<dd>NewsReader project</dd>
<dt>Specification</dt>
<dd>NAF v3</dd>
<dt>Key Reference</dt>
<dd><a href="https://research.vu.nl/en/publications/naf-and-gaf-linking-linguistic-annotations">Fokkens et al. 2014</a></dd>
</dl>
</div>

## Overview

NAF is a layered stand-off annotation format designed for NLP pipeline interoperability. It organizes annotations into explicitly named layers (text, terms, entities, chunks, dependencies, constituency, SRL, coreference, opinions, temporal expressions, factuality, etc.). NAF was developed as a successor to KAF (Kyoto Annotation Format) and is used in tools like the NewsReader pipeline.

## Layer-by-Layer Mapping

### Text Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<text>` layer | `pub.layers.expression.text` | Raw text. |
| `<wf>` (word form) | `pub.layers.expression.expression` (kind: `token`) | Tokens with character offsets. `@offset` → `token.textSpan.start`; `@length` → derived from text; `@sent` → sentence grouping. |

### Terms Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<terms>` layer | `pub.layers.annotation.annotationLayer(kind="token-tag")` | Term-level annotations. |
| `<term>` | Multiple `annotation` objects across layers | NAF's `<term>` bundles POS, lemma, morphology, and sense into a single element. Layers separates these into distinct annotation layers: `subkind="pos"` for `@pos`, `subkind="lemma"` for `@lemma`, `subkind="morph"` for `@morphofeat`, `subkind="sense"` for `<externalRef>`. |
| `<term @pos>` | `annotationLayer(kind="token-tag", subkind="pos")` | POS tag. |
| `<term @lemma>` | `annotationLayer(kind="token-tag", subkind="lemma")` | Lemma. |
| `<term @morphofeat>` | `annotationLayer(kind="token-tag", subkind="morph")` | Morphological features. |
| `<term><sentiment>` | `annotationLayer(kind="token-tag", subkind="sentiment")` or features | Term-level sentiment. |
| `<span>` (within term) | `annotation.anchor.tokenRefSequence` | Multi-word terms spanning multiple word forms. |

### Entity Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<entities>` layer | `annotationLayer(kind="span", subkind="entity-mention")` | Entity mention layer. |
| `<entity @type>` | `annotation.label` | Entity type (PER, ORG, LOC, etc.). |
| `<references><span>` | `annotation.anchor.tokenRefSequence` | Token references for entity span. |
| `<externalRef>` | `annotation.knowledgeRefs` | Links to DBpedia, Wikipedia, etc. `@resource` → `knowledgeRef.source`; `@reference` → `knowledgeRef.identifier`. |

### Dependency Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<deps>` layer | `annotationLayer(kind="graph", subkind="dependency")` | Dependency parse. |
| `<dep @rfunc>` | `annotation.label` | Dependency relation label. |
| `<dep @from @to>` | `annotation.headIndex` / `annotation.tokenIndex` | Governor and dependent. |

### Constituency Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<constituency>` layer | `annotationLayer(kind="tree", subkind="constituency")` | Constituency parse. |
| `<tree>` | One parse tree per sentence | Tree structure. |
| `<nt @label>` (non-terminal) | `annotation` with `parentId`/`childIds` | Non-terminal node. `@label` → `annotation.label`. |
| `<t>` (terminal) | `annotation` with `tokenIndex` | Terminal node linked to token. |
| `<edge>` | Implicit in `parentId`/`childIds` relationships | Tree edges encoded in parent-child structure. |

### Chunk Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<chunks>` layer | `annotationLayer(kind="token-tag", subkind="chunk")` or `annotationLayer(kind="span")` | Chunking. |
| `<chunk @phrase>` | `annotation.label` | Chunk type (NP, VP, PP, etc.). |

### SRL Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<srl>` layer | `annotationLayer(kind="span", subkind="frame")` | Semantic role labeling. |
| `<predicate>` | `annotation` (frame instance) | `@uri` → `annotation.knowledgeRefs` (PropBank/NomBank). |
| `<role @semRole>` | `argumentRef.role` | Semantic role label (ARG0, ARG1, ARGM-TMP, etc.). |
| `<role><span>` | `argumentRef.annotationId` → span annotation | The span filling the role. |

### Coreference Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<coreferences>` layer | `pub.layers.annotation.clusterSet(kind="coreference")` | Coreference chains. |
| `<coref>` | `cluster` | A coreference chain. `@type` → `cluster.features`. |
| `<span>` (within coref) | `cluster.memberIds` → annotation UUIDs | Mentions in the chain. |

### Opinion Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<opinions>` layer | `annotationLayer(kind="span", subkind="sentiment")` | Opinion/sentiment annotation. |
| `<opinion>` | `annotation` | Opinion instance. |
| `<opinion_holder>` | `argumentRef` with `role="holder"` | The opinion holder. |
| `<opinion_target>` | `argumentRef` with `role="target"` | The opinion target. |
| `<opinion_expression @polarity>` | `annotation.label` (polarity) + `anchor` | The evaluative expression. |

### Temporal Expression Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<timeExpressions>` layer | `annotationLayer(kind="span", subkind="temporal-expression")` | TimeML TIMEX3 expressions. |
| `<timex3 @type @value>` | `annotation.label` (type) + `annotation.value` (normalized) | `@type` → label (DATE, TIME, DURATION, SET); `@value` → normalized value. |

### Factuality Layer

| NAF Element | Layers Equivalent | Notes |
|---|---|---|
| `<factualities>` layer | `annotationLayer(kind="span")` with custom `subkind` via `subkindUri` | Factuality assessment (certain, probable, possible, counterfactual). |
| `<factuality @prediction>` | `annotation.label` | Factuality value. |

### NAF Header and Provenance

| NAF Feature | Layers Equivalent | Notes |
|---|---|---|
| `<nafHeader>` | `pub.layers.expression.expression` metadata + `features` | Document metadata. |
| `<linguisticProcessors>` | `pub.layers.defs#annotationMetadata.tool` per layer | Each layer records its producing tool. |
| `<lp @name @version @timestamp>` | `annotationMetadata` fields | Tool name, version, and timestamp. |
| `<fileDesc>` | Expression fields | File description. |
| `<public>` | Expression `sourceUrl` | Public identifier/URI. |

