# ELAN and Praat

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>EUDICO Linguistic Annotator (ELAN) and Praat</dd>
<dt>Origin</dt>
<dd>Max Planck Institute for Psycholinguistics (ELAN); University of Amsterdam (Praat)</dd>
<dt>Specification</dt>
<dd>ELAN Annotation Format (EAF XML); Praat TextGrid format</dd>
<dt>Key Reference</dt>
<dd><a href="https://aclanthology.org/L06-1082/">Wittenburg et al. 2006</a> (ELAN); <a href="https://www.praat.org">Boersma & Weenink</a> (Praat)</dd>
</dl>
</div>

## Overview

ELAN and Praat are the two most widely used tools for time-aligned linguistic annotation. ELAN provides a multi-tier annotation model for transcription, gesture coding, sign language analysis, and multimodal annotation. Praat specializes in acoustic phonetic analysis with interval and point tiers. Both use temporal anchoring as their primary mechanism.

## ELAN (EAF)

### Tier Architecture

| ELAN Concept | Layers Equivalent | Notes |
|---|---|---|
| **Annotation Document** (`.eaf` file) | `pub.layers.expression` + `pub.layers.media` + annotation layers | The EAF file is a collection of tiers over a media file. In Layers, the media file is a `media` record, the document context is an `expression`, and each tier is an `annotationLayer`. |
| **Tier** | `pub.layers.annotation#annotationLayer` with `kind="tier"` | Each ELAN tier maps to an annotation layer with `kind="tier"`. The `subkind` (via `subkindUri`) can specify the tier's semantic type (e.g., `"transcription"`, `"gesture"`, `"translation"`). |
| **Tier @LINGUISTIC_TYPE_REF** | `annotationLayer.ontologyRef` or `subkindUri` | ELAN's linguistic types (symbolic association, time subdivision, included in, etc.) define how tiers relate to each other. |
| **Tier @PARENT_REF** | `annotationLayer.parentLayerRef` | ELAN's parent-child tier relationships map directly to `parentLayerRef`. |
| **Tier @PARTICIPANT** | `annotationLayer.metadata.personaRef` or `features.participant` | Speaker/participant association. |
| **Controlled Vocabulary** | `pub.layers.ontology` | ELAN's controlled vocabularies map to Layers ontology `typeDef` entries. |

### Annotation Types

| ELAN Annotation Type | Layers Equivalent | Notes |
|---|---|---|
| **ALIGNABLE_ANNOTATION** | `annotation` with `anchor.temporalSpan` | Time-aligned annotations with start/end time slots. `TIME_SLOT_REF1`/`TIME_SLOT_REF2` → `temporalSpan.start`/`temporalSpan.ending`. |
| **REF_ANNOTATION** | `annotation` with `anchor.tokenRef` or parent reference | Annotations that reference parent tier annotations rather than time directly. Represented via features linking to the parent annotation's UUID. |
| **Time slots** (`TIME_ORDER`) | Converted to millisecond values in `temporalSpan` | ELAN uses indirected time slot IDs. Layers uses direct millisecond values. |
| **Annotation value** | `annotation.value` or `annotation.label` | The text content of the annotation. |

### ELAN Linguistic Types

| ELAN Linguistic Type | Layers Representation | Notes |
|---|---|---|
| **Time_Subdivision** | Child `annotationLayer` with `parentLayerRef`, each annotation has its own `temporalSpan` | Subdivides parent annotation's time interval. |
| **Symbolic_Subdivision** | Child `annotationLayer` with `parentLayerRef`, annotations indexed by position | Subdivides parent without independent time alignment. |
| **Symbolic_Association** | Child `annotationLayer` with `parentLayerRef`, 1:1 annotation mapping | One annotation per parent annotation (e.g., translation of each utterance). |
| **Included_In** | Child `annotationLayer` with `parentLayerRef`, annotations within parent time bounds | Annotations contained within parent's time interval. |

### ELAN Metadata

| ELAN Feature | Layers Equivalent | Notes |
|---|---|---|
| Media descriptors | `pub.layers.media` record | Audio/video file references. ELAN's `MEDIA_DESCRIPTOR` → `media.externalUri` or `media.blob`. Audio metadata (`sampleRate`, `channels`, `bitDepth`, `codec`, `speakerCount`) is stored as first-class fields. `transcriptRef` links to the expression containing the transcript; `segmentationRef` links to its segmentation. |
| Linked files | `pub.layers.expression.features` or `sourceRef` | Additional linked resources. |
| Author/date | `pub.layers.defs#annotationMetadata` | Creation metadata. |
| License | `pub.layers.corpus.license` (at corpus level) | Licensing information. |

## Praat TextGrid

### TextGrid Structure

| Praat Concept | Layers Equivalent | Notes |
|---|---|---|
| **TextGrid** (file) | `pub.layers.expression` + `pub.layers.media` + annotation layers | A TextGrid is a collection of tiers over a sound file. |
| **IntervalTier** | `pub.layers.annotation#annotationLayer` with `kind="tier"` | Each interval tier is an annotation layer. Intervals map to annotations with `anchor.temporalSpan`. |
| **PointTier** (TextTier) | `pub.layers.annotation#annotationLayer` with `kind="tier"` | Point tiers have annotations with a single time point. Represented as `temporalSpan` where `start == ending`, or via features storing the point time. |
| **Interval** | `pub.layers.annotation#annotation` with `anchor.temporalSpan` | `xmin`/`xmax` → `temporalSpan.start`/`temporalSpan.ending` (converted from seconds to milliseconds). `text` → `annotation.value`. |
| **Point** | `pub.layers.annotation#annotation` with `anchor.temporalSpan` | `time` → `temporalSpan.start` (with `ending` = `start`). `mark` → `annotation.value`. |

### Common Praat Tier Types

| Praat Tier Usage | Layers Representation | Notes |
|---|---|---|
| Phoneme tier | `annotationLayer(kind="tier", subkind="phonetic")` | IPA segments with time boundaries. |
| Word tier | `annotationLayer(kind="tier")` + `pub.layers.expression` tokenization | Word-level intervals can also populate a tokenization. |
| Syllable tier | `annotationLayer(kind="tier")` with custom `subkind` | Syllable boundaries. |
| ToBI tone tier | `annotationLayer(kind="tier", subkind="tobi")` or `annotationLayer(kind="token-tag", subkind="tobi")` | Intonation annotations. |
| Break index tier | `annotationLayer(kind="tier")` with custom `subkind` | Prosodic break indices. |
| Pitch/formant tiers | `annotationLayer(kind="tier")` with acoustic values in `features` | Acoustic measurements. |

### Praat ↔ ELAN Correspondence

Both ELAN and Praat tiers map to the same Layers representation (`annotationLayer` with `kind="tier"`), making it straightforward to combine annotations from both tools on the same expression.

## Interlinear Glossing in ELAN

ELAN is commonly used for interlinear glossed text in language documentation. The standard tier structure maps to Layers as:

| ELAN IGT Tier | Layers Equivalent | Notes |
|---|---|---|
| Transcription tier (utterance) | `annotationLayer(kind="tier")` for utterance text + `tokenization(kind="whitespace")` for words | Time-aligned transcription. |
| Morpheme break tier | `tokenization(kind="morphological")` | Morpheme-level tokenization (child of word tokenization via `pub.layers.alignment`). |
| Gloss tier | `annotationLayer(kind="token-tag", subkind="gloss")` on morphological tokenization | Leipzig-style glosses on morphemes. |
| POS tier | `annotationLayer(kind="token-tag", subkind="pos")` | Part-of-speech tags. |
| Free translation tier | `pub.layers.alignment(kind="parallel-text")` or annotation layer | Sentence-level translation. |

The word-to-morpheme correspondence uses `pub.layers.alignment(kind="interlinear", subkind="word-to-morpheme")`.

