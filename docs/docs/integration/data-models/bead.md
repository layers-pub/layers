# bead

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>bead</dd>
<dt>Origin</dt>
<dd>University of Rochester FACTS.lab</dd>
<dt>Specification</dt>
<dd><a href="https://github.com/factslab/bead">github.com/factslab/bead</a></dd>
<dt>Key Reference</dt>
<dd><a href="https://factslab.io/bead">factslab.io/bead</a></dd>
</dl>
</div>

## Overview

bead provides four core capabilities: (1) a unified interface abstraction over syntactic and semantic frame ontology resources (PropBank, FrameNet, VerbNet, etc.), (2) a template system for constructing experimental stimuli with typed slot constraints, (3) a framework for deploying and analyzing large-scale linguistic judgment experiments, and (4) active learning workflows for efficient annotation. The companion glazing package provides unified Pydantic models for FrameNet, PropBank, VerbNet, and WordNet with cross-reference resolution.

## Component 1: Unified Frame Ontology Interface

### bead's Approach

bead defines abstract interfaces that unify heterogeneous frame ontology resources:

- **Frame**: An event/situation template with named role slots (e.g., PropBank's `buy.01`, FrameNet's `Commerce_buy`)
- **Role/Argument Slot**: A participant slot in a frame (e.g., `ARG0`/`Buyer`, `ARG1`/`Goods`)
- **Type Constraints**: Restrictions on what can fill a role slot
- **Inheritance**: Frame hierarchies (FrameNet's frame relations, VerbNet's verb class tree)

### Layers Mapping

| bead Concept | Layers Equivalent | Notes |
|---|---|---|
| Frame ontology resource | `pub.layers.ontology.ontology` (record) | A named, versioned ontology with `domain`, `personaRef`, and `knowledgeRefs`. The `domainUri` field allows community-defined domains. |
| Frame definition | `pub.layers.ontology.typeDef` with `typeKind="situation-type"` | bead's unified frame interface maps to Layers's `typeDef` with `typeKind` set to `situation-type`. The `allowedRoles` array contains `roleSlot` references. |
| Event type | `pub.layers.ontology.typeDef` with `typeKind="situation-type"` | bead treats events as a subtype of frames. Layers's `typeKindUri` allows community extension. |
| Role/argument slot | `pub.layers.ontology.defs#roleSlot` | `roleName` → role label (ARG0, Agent, Theme); `fillerTypeRefs` → type constraints; `required` → obligatoriness; `constraints` → declarative selectional restrictions via `pub.layers.defs#constraint`. |
| Entity type | `pub.layers.ontology.typeDef` with `typeKind="entity-type"` | Filler type definitions for role constraints. |
| Type hierarchy | `typeDef.parentTypeRef` | Recursive parent reference enables arbitrary inheritance depth. |
| Knowledge base link | `typeDef.knowledgeRefs[]` | Links to FrameNet, PropBank, VerbNet, Wikidata via `pub.layers.defs#knowledgeRef`. The `sourceUri` field allows community-defined knowledge bases. |

### Frame Annotation (Instance Level)

| bead Concept | Layers Equivalent | Notes |
|---|---|---|
| Frame instance (SRL) | `pub.layers.annotation.annotationLayer` with `kind="span"`, `subkind="frame"` | Frame instances annotated in text. `annotation.label` holds the frame name; `annotation.ontologyTypeRef` points to the `typeDef`. |
| Role filler | `pub.layers.annotation.defs#argumentRef` | `argumentRef.role` is the role label; `argumentRef.annotationId` points to the filler span annotation. |
| PropBank-style SRL | `formalism="PropBank"` on the annotationLayer | `annotation.label` = roleset ID (e.g., `buy.01`); arguments use ARG0, ARG1, etc. |
| FrameNet-style SRL | `formalism="FrameNet"` on the annotationLayer | `annotation.label` = frame name; arguments use frame element names. |
| VerbNet-style | `formalism="VerbNet"` on the annotationLayer | `annotation.label` = verb class; arguments use thematic role names. |

### Unified Access Pattern

bead provides a single interface that abstracts over PropBank, FrameNet, and VerbNet. In Layers, this unification is achieved by:

1. All frame ontologies use the same `pub.layers.ontology.ontology` record structure (`typeDef` + `roleSlot`)
2. The `formalism` field on `annotationLayer` identifies which tradition the annotation follows
3. The `ontologyRef` field links to the specific ontology definition
4. `knowledgeRefs` on `typeDef` cross-link equivalent frames across resources (e.g., PropBank's `buy.01` linked to FrameNet's `Commerce_buy` via Wikidata or direct URI)

### glazing (Unified Frame Inventory)

The glazing companion package provides unified Pydantic models for FrameNet 1.7, PropBank 3.4, VerbNet 3.4, and WordNet 3.1 with cross-reference resolution.

| glazing Concept | Layers Equivalent | Notes |
|---|---|---|
| FrameNet Frame | `pub.layers.ontology.typeDef` with `typeKind="situation-type"` + `knowledgeRefs` source `"framenet"` | Frame definition with roles, frame elements, relations. |
| FrameNet LexicalUnit | `pub.layers.resource.entry` with `knowledgeRefs` source `"framenet"` | Lexical unit within a frame. |
| PropBank Roleset | `pub.layers.ontology.typeDef` with `typeKind="situation-type"` + `knowledgeRefs` source `"propbank"` | PropBank predicate-argument structure. |
| VerbNet VerbClass | `pub.layers.ontology.typeDef` with hierarchy via `parentTypeRef` + `knowledgeRefs` source `"verbnet"` | VerbNet class with inheritance. |
| WordNet Synset | `pub.layers.resource.entry` with `knowledgeRefs` source `"wordnet"` | WordNet sense/synset reference. |
| Frame inventory (e.g., FrameNet 1.7) | `pub.layers.resource.collection` with `kind="frame-inventory"` and `version="1.7"` | A versioned collection of frame definitions. |
| Cross-resource mapping | `knowledgeRefs` arrays + `pub.layers.graph.graphEdge` | Multiple `knowledgeRefs` on a single `typeDef` cross-link equivalent items across resources. |

## Component 2: Template and Stimulus Construction

### bead's Approach

bead provides a rich system for constructing experimental stimuli:

- **Template**: A text pattern with named `{variable}` slots, per-slot constraints, cross-slot constraints, and a language tag
- **Slot**: A named variable position with a constraint expression (DSL), required flag, default value, and reference to a lexicon of allowed fillers
- **Constraint**: A DSL expression that can operate at slot level (`self.pos == "VERB"`), template level (`subject.features.number == verb.features.number`), or cross-template level
- **LexicalItem**: A vocabulary entry with lemma, form, language, and features (POS, morphology, frequency, etc.)
- **Lexicon**: A named collection of LexicalItems
- **FilledTemplate**: A template with all slots mapped to specific fillers, plus the rendered text and filling strategy
- **Filling strategies**: Exhaustive, Random, Stratified, MLM (masked language model), CSP (constraint satisfaction), Mixed
- **Item**: A constructed stimulus with labeled spans, span relations, and optionally model outputs
- **ItemTemplate**: An experimental item structure with judgment type, task type, and element definitions

### Layers Mapping

| bead Concept | Layers Equivalent | Notes |
|---|---|---|
| Template | `pub.layers.resource.template` | Text with `{slotName}` placeholders. `slots[]` contains slot definitions. `constraints[]` holds cross-slot constraints. `experimentRef` links to the experiment. |
| Slot | `pub.layers.resource.defs#slot` | `name` → slot name; `required` → obligatoriness; `defaultValue` → default filler; `collectionRef` → lexicon of allowed fillers; `ontologyTypeRef` → type constraint; `constraints[]` → slot-level constraint expressions. |
| Constraint (slot-level) | `pub.layers.defs#constraint` with `scope="slot"` | `expression` holds the DSL string (e.g., `self.pos == "VERB"`); `expressionFormat` identifies the DSL (e.g., `"python-expr"`). |
| Constraint (template-level) | `pub.layers.defs#constraint` with `scope="template"` | `expression` holds cross-slot constraints (e.g., `subject.features.number == verb.features.number`); `context` lists the slot names involved. |
| Constraint (cross-template) | `pub.layers.defs#constraint` with `scope="cross-template"` | For constraints spanning multiple templates in a multi-template experiment design. |
| LexicalItem | `pub.layers.resource.entry` | `lemma` → citation form; `form` → surface form; `language` → BCP-47 tag; `features` → POS, morphology, frequency, register, etc.; `ontologyTypeRef` → type classification. |
| Lexicon | `pub.layers.resource.collection` with `kind="lexicon"` | Named collection of entries. `language`, `version`, `ontologyRef` provide metadata. |
| Lexicon membership | `pub.layers.resource.collectionMembership` | Links an entry to a collection with optional ordering. Many-to-many: an entry can belong to multiple lexicons. |
| FilledTemplate | `pub.layers.resource.filling` | `templateRef` → the template; `slotFillings[]` → slot-to-filler mappings; `renderedText` → the result; `strategy` → filling strategy; `expressionRef` → materialized text for annotation. |
| SlotFilling | `pub.layers.resource.defs#slotFilling` | `slotName` → which slot; `entryRef` → AT-URI of the entry filling this slot; `literalValue` → literal string override; `renderedForm` → surface form after inflection. |
| Filling strategy | `filling.strategy` / `filling.strategyUri` | URI+slug pattern. `knownValues`: `exhaustive`, `random`, `stratified`, `mlm`, `csp`, `mixed`, `manual`, `custom`. Strategy parameters go in `features`. |
| Item (constructed stimulus) | `pub.layers.expression.expression` + `pub.layers.resource.filling` | The filling's `renderedText` becomes an expression's `text`. The `expressionRef` on the filling links them. Annotations on the expression represent labeled spans. |
| Item spans | `pub.layers.annotation.annotationLayer` on the expression | Labeled spans on the materialized stimulus text. |
| Item span relations | `pub.layers.annotation.defs#argumentRef` or `pub.layers.graph.graphEdge` | Directed typed relations between spans, using the standard annotation argument mechanism or graph edges. |
| ItemTemplate | `pub.layers.resource.template` + `pub.layers.judgment.experimentDef` | The structural template (text, slots) lives in `resource.template`; experiment-level metadata (`measureType`, `taskType`, `presentation`, `recordingMethods`, guidelines, labels, scale) lives in `experimentDef`. The `experimentRef` on template links them. bead's three orthogonal dimensions (judgment type, task type, presentation spec) map directly to `experimentDef.measureType`, `experimentDef.taskType`, and `experimentDef.presentation`. |
| Model outputs on items | `pub.layers.annotation.annotationLayer` with `metadata.tool` = model name | Model predictions stored as annotation layers on the materialized expression, with provenance tracking. |

### Template-to-Experiment Pipeline

bead's stimulus construction pipeline maps to Layers as a chain of AT-URI references:

1. **Define lexicons**: Create `resource.collection` records with `kind="lexicon"`, populate via `resource.entry` + `resource.collectionMembership`
2. **Define templates**: Create `resource.template` records with `{slotName}` text, slot definitions referencing collections, and constraints
3. **Generate fillings**: Create `resource.filling` records with slot-to-filler mappings, rendered text, and filling strategy
4. **Materialize items**: Create `expression` records from rendered text; set `filling.expressionRef` to link back
5. **Annotate items**: Create `annotation.annotationLayer` records on the expressions (labeled spans, span relations)
6. **Run experiment**: Create `judgment.experimentDef` with `templateRefs` pointing to the templates and `collectionRefs` to the filler pools
7. **Collect judgments**: Annotators create `judgment.judgmentSet` records; each `judgment` has `itemRef` → expression and `fillingRef` → filling
8. **Analyze**: `judgment.agreementReport` summarizes inter-annotator agreement

Every step is a separate ATProto record linked by AT-URI, enabling full provenance tracing from judgment back through filling to template to lexicon to entry.

## Component 3: Linguistic Judgment Experiment Framework

### bead's Approach

bead provides a structured framework for:

- Defining annotation/judgment tasks with various response types
- Collecting judgments from multiple annotators
- Computing inter-annotator agreement
- Supporting active learning (selecting maximally informative items for annotation)

### Layers Mapping

| bead Concept | Layers Equivalent | Notes |
|---|---|---|
| Experiment definition | `pub.layers.judgment.experimentDef` | Direct mapping. Layers extends bead's orthogonal dimensions with `presentation` and `recordingMethods` (see tables below). `templateRefs` links to stimulus templates; `collectionRefs` links to filler pools. |
| `JudgmentType` | `experimentDef.measureType` | Direct mapping. bead's `JudgmentType` maps to Layers's `measureType`. See measure type table below. |
| `TaskType` | `experimentDef.taskType` | Direct mapping. See task type table below. |
| `PresentationSpec` | `experimentDef.presentation` | bead's `PresentationSpec` maps to Layers's `presentationSpec` object. `PresentationMode` → `method`, `ChunkingSpec.unit` → `chunkingUnit`, `TimingParams.duration_ms` → `timingMs`, `TimingParams.isi_ms` → `isiMs`, `TimingParams.cumulative` → `cumulative`, `TimingParams.mask_char` → `maskChar`. |
| Annotation guidelines | `experimentDef.guidelines` | Free-text guidelines (up to 100K chars). `ontologyRef` links to the formal type system. |
| Scale definition | `experimentDef.scaleMin` / `experimentDef.scaleMax` | For ordinal-scale tasks. |
| Label set | `experimentDef.labels[]` | For categorical and forced-choice tasks. |
| Annotator | `pub.layers.judgment.judgmentSet.agent` | ATProto DID for decentralized identity; fallback string ID for anonymous annotators; `knowledgeRef` for ORCID or model cards. |
| Single judgment | `pub.layers.judgment.defs#judgment` | Response fields: `categoricalValue`, `scalarValue`, `textSpan`, `freeText`. Also `responseTimeMs`, `confidence`, and `fillingRef`. |
| Judgment batch | `pub.layers.judgment.judgmentSet` | Groups judgments from a single annotator for an experiment. |
| Agreement metric | `pub.layers.judgment.agreementReport` | `metric` covers standard measures: Cohen's kappa, Fleiss' kappa, Krippendorff's alpha, percent agreement, correlation, F1. The `metricUri` field allows community-defined metrics. |
| Active learning signal | `judgment.responseTimeMs` + `judgment.confidence` | Response time and confidence scores enable active learning item selection. Additional signals can be stored in `features`. |
| Behavioral analytics | `pub.layers.judgment.defs#judgment.behavioralData` | Mouse movements, keystroke patterns, eye tracking data, and other behavioral signals stored as a `featureMap`. |
| List constraints | `pub.layers.judgment.defs#experimentDesign.listConstraints` | Latin square balancing, no-adjacent-same-condition, balanced frequency, and minimum distance constraints. Each `listConstraint` has `kind`, `targetProperty`, `parameters`, and an optional formal `constraint` expression. |
| Distribution strategy | `pub.layers.judgment.defs#experimentDesign.distributionStrategy` | How items are distributed to annotators: `latin-square`, `random`, `blocked`, `stratified`, or community-defined via `distributionStrategyUri`. |
| Item order | `pub.layers.judgment.defs#experimentDesign.itemOrder` | How items are ordered within a list: `random-order`, `fixed-order`, `blocked`, `adaptive`, or community-defined via `itemOrderUri`. |
| Template sequence | `pub.layers.resource.templateComposition` with `compositionType="sequence"` | bead's `TemplateSequence` (ordered list of templates for multi-part stimuli) maps to a template composition with ordered `templateMember` entries. |
| Template tree | `pub.layers.resource.templateComposition` with `compositionType="tree"` | bead's `TemplateTree` (hierarchical template structures) maps to a template composition where members can reference nested compositions via `compositionRef`. |
| Multi-word expression | `pub.layers.resource.entry.components` + `entry.mweKind` | MWE entries have `components` (array of `mweComponent` with form, lemma, position, isHead) and `mweKind` (compound, phrasal-verb, idiom, etc.). |

#### bead JudgmentType → Layers measureType

| bead | Layers | Description |
|---|---|---|
| `acceptability` | `acceptability` | Linguistic acceptability, naturalness, grammaticality |
| `inference` | `inference` | Semantic relationship (entailment, neutral, contradiction) |
| `similarity` | `similarity` | Semantic similarity, distance, relatedness |
| `plausibility` | `plausibility` | Likelihood of events or statements |
| `comprehension` | `comprehension` | Understanding or recall of content |
| `preference` | `preference` | Subjective preference between alternatives |
| `extraction` | `extraction` | Extracting structured info (labeled spans) from text |

#### bead TaskType → Layers taskType

| bead | Layers | Description |
|---|---|---|
| `forced_choice` | `forced-choice` | Pick exactly one option (2AFC, NAFC) |
| `multi_select` | `multi-select` | Pick one or more options |
| `ordinal_scale` | `ordinal-scale` | Value on bounded discrete scale (Likert, slider) |
| `magnitude` | `magnitude` | Unbounded numeric value |
| `binary` | `binary` | Yes/no, true/false |
| `categorical` | `categorical` | Pick from unordered categories |
| `free_text` | `free-text` | Open-ended text response |
| `cloze` | `cloze` | Fill-in-the-blank |
| `span_labeling` | `span-labeling` | Select and label text spans |

#### bead PresentationMode → Layers presentationSpec.method

| bead | Layers | Description |
|---|---|---|
| `static` | `whole-sentence` | Entire stimulus displayed at once |
| `self_paced` | `self-paced` | Participant controls advancement |
| `timed_sequence` | `rsvp` | Chunks shown at a fixed rate (RSVP) |

bead's `ChunkingSpec.unit` maps to `presentationSpec.chunkingUnit`, `TimingParams.duration_ms` to `timingMs`, `TimingParams.isi_ms` to `isiMs`, `TimingParams.cumulative` to `cumulative`, and `TimingParams.mask_char` to `maskChar`. Layers extends the known presentation methods beyond bead's three modes to include `auditory`, `visual-world`, `masked-priming`, `cross-modal`, `naturalistic`, `gating`, `maze`, `boundary`, and `moving-window`.

### Experiment Lifecycle

bead's experiment lifecycle maps to Layers records as follows:

1. **Design**: Create `experimentDef` with task type, guidelines, labels/scale, ontology reference, `templateRefs`, and `collectionRefs`
2. **Generate**: Use templates and collections to produce fillings; materialize as communications
3. **Deploy**: The `corpusRef` on `experimentDef` identifies the item pool; `personaRef` identifies the annotator role
4. **Collect**: Each annotator creates a `judgmentSet` record in their own PDS containing their judgments
5. **Analyze**: An `agreementReport` record summarizes inter-annotator agreement across judgment sets
6. **Iterate**: Active learning workflows use response times and confidence scores to select new items; new experiment rounds create new `experimentDef` records

### Decentralized Advantage

In bead, experiments are typically run on centralized platforms. In Layers:

- Annotators own their judgment data in their own PDSes
- Templates, lexicons, and fillings are independently publishable and reusable
- Multiple independent experimenters can create overlapping experiments on the same corpus
- Agreement reports can be computed by any party with access to the judgment sets
- The full provenance chain (judgment → filling → template → lexicon → entry) is traceable via AT-URIs
- Experiments are reproducible because all data is versioned and content-addressed via ATProto

