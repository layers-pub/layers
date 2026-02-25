---
sidebar_position: 5
---

# Lexicon Overview

Layers consists of 13 lexicons organized into core pipeline layers, parallel tracks, and integration layers.

## Lexicon Directory

| Lexicon | ID | Purpose |
|---------|----|---------|
| [Definitions](./lexicons/defs.md) | `pub.layers.defs` | Core primitives: objectRef, anchor, constraint, agentRef, annotationMetadata, knowledgeRef, featureMap, alignmentLink |
| [Expression](./lexicons/expression.md) | `pub.layers.expression` | Any linguistic unit (document, paragraph, sentence, word, morpheme) with recursive nesting |
| [Segmentation](./lexicons/segmentation.md) | `pub.layers.segmentation` | Tokenization, chunking, segmentation boundaries, span indices |
| [Annotation](./lexicons/annotation.md) | `pub.layers.annotation` | Linguistic labels and categories (POS, NER, SRL, discourse, etc.) |
| [Ontology](./lexicons/ontology.md) | `pub.layers.ontology` | Label definitions, linguistic categories, theory/framework records |
| [Corpus](./lexicons/corpus.md) | `pub.layers.corpus` | Corpus metadata, membership, and statistics |
| [Resource](./lexicons/resource.md) | `pub.layers.resource` | Lexical entries, collections, stimulus templates, fillings, and template compositions |
| [Judgment](./lexicons/judgment.md) | `pub.layers.judgment` | Human judgments, model predictions, confidence, disagreement, experiment design |
| [Alignment](./lexicons/alignment.md) | `pub.layers.alignment` | Cross-record linking, token correspondence, equivalence |
| [Graph](./lexicons/graph.md) | `pub.layers.graph` | Generic typed property graph for knowledge representation and cross-referencing |
| [Persona](./lexicons/persona.md) | `pub.layers.persona` | Agent personas, theoretical frameworks, backgrounds |
| [Media](./lexicons/media.md) | `pub.layers.media` | Audio, video, image, and paged document references |
| [Eprint](./lexicons/eprint.md) | `pub.layers.eprint` | Eprint linkage, data provenance, scholarly metadata, reproducibility |

## Lexicon Organization

### Core Pipeline

The **pipeline layers** build incrementally, each depending on primitives and the layer before:

```
pub.layers.defs (Primitives)
    ↓
pub.layers.expression (Linguistic Units)
    ↓
pub.layers.segmentation (Tokenization)
    ↓
pub.layers.annotation (Labels)
```

Expressions are recursive: a document contains paragraphs, which contain sentences, which contain words. Each expression can reference its parent via `parentRef`, and segmentation records define the ordered decomposition of a parent expression into child expressions. Structure types (section, sentence, word, morpheme, etc.) are expression `kind` values, not a separate lexicon.

### Parallel Tracks

These lexicons support the pipeline but do not depend on each other in strict order:

- **pub.layers.ontology**: Authority records for labels and categories (supports annotation)
- **pub.layers.corpus**: Corpus metadata, membership, and statistics (organizes expressions)
- **pub.layers.resource**: Lexical entries, collections, stimulus templates, and fillings (supports experiments)
- **pub.layers.judgment**: Human and model judgments, experiment design (supports annotation and alignment)
- **pub.layers.alignment**: Cross-record correspondence (integrates across layers)

### Integration Layers

These lexicons connect Layers to the ATProto ecosystem:

- **pub.layers.graph**: Generic typed property graph with nodes, edges, and edge sets for representing knowledge, cross-document relations, and arbitrary typed relationships
- **pub.layers.persona**: Agent personas and theoretical frameworks for annotator/model attribution
- **pub.layers.media**: Audio, video, image, and paged document references
- **pub.layers.eprint**: Eprint linkage, data provenance, reproducibility information, and scholarly metadata

## Dependency Graph

```mermaid
graph TD
    DEFS["<b>pub.layers.defs</b><br/>Primitives"]

    EXPR["<b>pub.layers.expression</b><br/>Linguistic Units"]
    SEG["<b>pub.layers.segmentation</b><br/>Tokenization"]
    ANN["<b>pub.layers.annotation</b><br/>Linguistic Labels"]

    CORPUS["<b>pub.layers.corpus</b><br/>Corpus Metadata"]
    RESOURCE["<b>pub.layers.resource</b><br/>Lexical Resources & Templates"]
    ONTO["<b>pub.layers.ontology</b><br/>Label Definitions"]
    JUDGE["<b>pub.layers.judgment</b><br/>Judgments & Experiments"]
    ALIGN["<b>pub.layers.alignment</b><br/>Cross-Record Linking"]

    GRAPH["<b>pub.layers.graph</b><br/>Typed Property Graph"]
    PERSONA["<b>pub.layers.persona</b><br/>Agent Personas"]
    MEDIA["<b>pub.layers.media</b><br/>Media References"]
    EPRINT["<b>pub.layers.eprint</b><br/>Eprint & Data Provenance"]

    DEFS --> EXPR
    DEFS --> SEG
    DEFS --> ANN
    DEFS --> CORPUS
    DEFS --> RESOURCE
    DEFS --> ONTO
    DEFS --> JUDGE
    DEFS --> ALIGN

    EXPR --> SEG
    SEG --> ANN

    ONTO --> ANN
    CORPUS --> EXPR
    JUDGE --> ANN
    ALIGN --> ANN

    DEFS --> GRAPH
    DEFS --> PERSONA
    DEFS --> MEDIA
    DEFS --> EPRINT

    GRAPH --> ONTO
    PERSONA --> ANN
    MEDIA --> EXPR
    EPRINT --> CORPUS

    classDef pipeline fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef parallel fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef integration fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef primitives fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px

    class DEFS primitives
    class EXPR,SEG,ANN pipeline
    class CORPUS,RESOURCE,ONTO,JUDGE,ALIGN parallel
    class GRAPH,PERSONA,MEDIA,EPRINT integration
```

## Pipeline Layers

### pub.layers.defs (Primitives)

Foundation for all other lexicons. Defines abstract, composable primitives:

- `objectRef`: cross-referencing mechanism
- `anchor`: polymorphic attachment points
- `constraint`: DSL-agnostic expressions
- `agentRef`: agent identity
- `annotationMetadata`: provenance tracking (including `dependencies` for provenance chains)
- `knowledgeRef`: external KB references (ATProto-native, external, or user-specific)
- `featureMap`: open-ended extensibility
- `alignmentLink`: sequence correspondence

**Depends on**: Nothing (foundational)

**Used by**: All other lexicons

**File**: `schemas/defs.json`

### pub.layers.expression (Linguistic Units)

Any linguistic unit, from a single morpheme to a full document, with recursive nesting:

- Source data (text, audio, video, image, paged documents)
- Recursive nesting via `parentRef` (document → paragraph → sentence → word → morpheme)
- Multimodal anchoring to parent expressions
- Language identification and multilingual support
- Links to eprints and knowledge bases

**Depends on**: `pub.layers.defs`

**Used by**: All downstream layers

**File**: `schemas/expression.json`

### pub.layers.segmentation (Tokenization & Chunking)

Defines how a parent expression is broken into child expressions:

- Ordered decomposition of expressions into sub-expressions
- Tokenization strategies (whitespace, BPE, morphological, etc.)
- Index-based access for efficient token retrieval

**Depends on**: `pub.layers.defs`, `pub.layers.expression`

**Used by**: `pub.layers.annotation`

**File**: `schemas/segmentation.json`

### pub.layers.annotation (Linguistic Annotations)

Labels, categories, semantic roles, discourse relations:

- Abstract annotation record type (discriminated by kind/subkind)
- Anchoring (to tokens, text spans, temporal regions, etc.)
- Flexible tagging: POS, NER, SRL, sentiment, discourse, relations, coreference, document-level tags
- K-best alternatives via `rank` and `alternativesRef`
- Cluster sets for coreference and cross-document clustering
- Metadata: confidence, provenance, source

**Depends on**: `pub.layers.defs`, `pub.layers.expression`, `pub.layers.segmentation`, `pub.layers.ontology`, `pub.layers.judgment`, `pub.layers.persona`

**Used by**: `pub.layers.alignment`, integration layers

**File**: `schemas/annotation.json`

## Parallel Support Layers

### pub.layers.ontology (Label Definitions)

Authority records for linguistic categories, tag sets, frameworks:

- Label definitions (POS tagsets, NER schemes, SRL frames)
- Theoretical framework definitions (generative syntax, construction grammar, etc.)
- Relation type properties (symmetric, transitive, reflexive, inverse, domain, range)
- Linked data to external KBs (Wikidata, WordNet, FrameNet, etc.)
- Authority records with versioning

**Depends on**: `pub.layers.defs`

**Used by**: `pub.layers.annotation`, `pub.layers.graph`

**File**: `schemas/ontology.json`

### pub.layers.corpus (Corpus Metadata)

Corpus records, membership, and statistics:

- Corpus definitions (name, description, license, citation)
- Expression membership (which expressions belong to a corpus)
- Corpus-level statistics and metadata

**Depends on**: `pub.layers.defs`, `pub.layers.expression`

**Used by**: `pub.layers.annotation` (corpus context), `pub.layers.eprint`

**File**: `schemas/corpus.json`

### pub.layers.resource (Lexical Resources & Templates)

Lexical entries, collections, stimulus templates, fillings, and compositions:

- Lexical resource entries (lemma, form, language, MWE components)
- Named collections (lexicons, frame inventories, gazetteers, paradigm tables)
- Parameterized text templates with named variable slots
- Template compositions (sequences and trees of templates)
- Filled templates with rendered text

**Depends on**: `pub.layers.defs`, `pub.layers.expression`

**Used by**: `pub.layers.judgment` (stimulus generation)

**File**: `schemas/resource.json`

### pub.layers.judgment (Judgments & Experiments)

Human judgments, model predictions, experiment design:

- Experiment definitions with task types, guidelines, and design specifications
- List constraints (Latin square, balancing, adjacency rules)
- Judgment sets with behavioral analytics
- Inter-annotator agreement reports

**Depends on**: `pub.layers.defs`

**Used by**: `pub.layers.annotation`, applications for filtering/ranking

**File**: `schemas/judgment.json`

### pub.layers.alignment (Cross-Record Linking)

Linking annotations across records and layers:

- Token alignment (across language pairs, different tokenizations)
- Span correspondence (across different segmentations or annotations)
- Annotation equivalence (same meaning, different labels)
- Alignment confidence and metadata

**Depends on**: `pub.layers.defs`

**Used by**: All layers (enables multi-layer composition)

**File**: `schemas/alignment.json`

## Integration Layers

### pub.layers.graph (Typed Property Graph)

Generic typed property graph for knowledge representation and cross-referencing:

- Standalone graph nodes (entities, concepts, events, states, claims, propositions)
- Typed directed edges between any Layers objects (expressions, annotations, graph nodes, external KB nodes)
- Batch edge sets for efficient bulk operations
- Supports multidigraphs and cycles
- Subsumes cross-document relations, knowledge grounding, expression graphs, and intertextual linking

**Depends on**: `pub.layers.defs`, `pub.layers.ontology`

**Used by**: `pub.layers.annotation` (via knowledgeRef), all layers (via objectRef-based cross-referencing)

**File**: `schemas/graph.json`

### pub.layers.persona (Agent Personas)

Agent personas, theoretical frameworks, methodological backgrounds:

- Persona records (annotator background, theoretical affiliation, expertise)
- Framework records (generative syntax, dependency grammar, UD conventions, etc.)
- Reproducibility metadata

**Depends on**: `pub.layers.defs`

**Used by**: `pub.layers.annotation` (via agentRef.personaRef)

**File**: `schemas/persona.json`

### pub.layers.media (Multimodal References)

Audio, video, image, and paged document references:

- Audio/video file references (codec, sample rate, duration)
- Image file references (resolution, format, color space)
- Paged document references (page count, OCR metadata)
- Media-specific timestamps and spatial coordinates

**Depends on**: `pub.layers.defs`

**Used by**: `pub.layers.expression` (source documents), `pub.layers.segmentation` (temporal/spatial anchors)

**File**: `schemas/media.json`

### pub.layers.eprint (Eprint & Data Provenance)

Eprint linkage, data provenance, reproducibility, and scholarly metadata:

- Eprint links (DOI, arXiv, ACL Anthology, any platform)
- Data links connecting publications to the data they produced (corpora, annotations, model outputs)
- Reproducibility information (code, commit hash, environment, random seed)
- Citation metadata

**Depends on**: `pub.layers.defs`, `pub.layers.corpus`

**Used by**: `pub.layers.expression` (eprintRef), discovery/search

**File**: `schemas/eprint.json`

## See Also

- [Introduction](./introduction.md) for architectural overview
- [Foundations](./foundations.md) for design principles, primitives, and the flexible enum pattern
- [Temporal Representation](./guides/temporal-representation.md) for temporal primitives and standards mapping
- [Spatial Representation](./guides/spatial-representation.md) for spatial primitives and standards mapping
- [Multimodal Annotation](./guides/multimodal-annotation.md) for annotation across text, audio, video, and image
- [Knowledge Grounding](./guides/knowledge-grounding.md) for linking annotations to external knowledge bases
