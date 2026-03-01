# TimeML / ISO-TimeML

<div className="metadata-card">
<dl>
<dt>Model</dt>
<dd>TimeML (ISO-TimeML, ISO 24617-1)</dd>
<dt>Origin</dt>
<dd>TERQAS Workshop (Brandeis University); ISO TC 37/SC 4</dd>
<dt>Specification</dt>
<dd>ISO 24617-1:2012 (ISO-TimeML); TimeML 1.2.1</dd>
<dt>Key Reference</dt>
<dd><a href="https://aaai.org/papers/0005-SS03-07-005-timeml-robust-specification-of-event-and-temporal-expressions-in-text/">Pustejovsky et al. 2003</a></dd>
</dl>
</div>

## Overview

TimeML is the ISO standard markup language for temporal and event expressions in natural language text. It provides four main tag types (TIMEX3, EVENT, SIGNAL, LINK) for annotating temporal expressions, events with temporal attributes, temporal signals/connectives, and temporal/aspectual/subordination relations. TimeBank is the primary annotated corpus.

Layers fully subsumes TimeML through three mechanisms:
1. **Structured temporal annotations.** `temporalExpression`, `temporalEntity`, and `temporalModifier` in `pub.layers.defs` capture all TIMEX3 attributes.
2. **Annotation subkinds.** `temporal-expression`, `temporal-signal`, `situation-mention` discriminate TimeML tag types.
3. **Graph edges.** Allen's 13 interval relations plus aspectual relations as `graphEdge.edgeType` values capture all TLINK and ALINK relations.

## Type-by-Type Mapping

### Temporal Expressions (TIMEX3)

| TimeML Attribute | Layers Equivalent | Notes |
|---|---|---|
| `TIMEX3` tag | `annotation` with `subkind="temporal-expression"` + `temporal` field | The `temporal` field holds a `pub.layers.defs#temporalExpression` |
| `tid` | `annotation.uuid` | Unique identifier |
| `type` (DATE, TIME, DURATION, SET) | `temporalExpression.type` | `DATE` to `date`, `TIME` to `time`, `DURATION` to `duration`, `SET` to `set`. Layers adds `interval` and `relative` |
| `value` | `temporalEntity` fields | ISO 8601 values decomposed: dates/times to `instant`, intervals to `intervalStart`/`intervalEnd`, durations to `duration` |
| `mod` (APPROX, START, MID, END, BEFORE, AFTER, ON_OR_BEFORE, ON_OR_AFTER, LESS_THAN, MORE_THAN) | `temporalModifier.mod` | Direct kebab-case mapping: `APPROX` to `approximate`, `ON_OR_BEFORE` to `on-or-before`, etc. |
| `anchorTimeID` | `temporalExpression.anchorRef` | `objectRef` pointing to another temporal annotation's UUID |
| `temporalFunction` | Presence of `temporalExpression.anchorRef` | If `anchorRef` is populated, the value is computed relative to the anchor |
| `functionInDocument` (CREATION_TIME, PUBLICATION_TIME, EXPIRATION_TIME, MODIFICATION_TIME, RELEASE_TIME, RECEPTION_TIME, NONE) | `temporalExpression.function` | Direct kebab-case mapping |
| `beginPoint` / `endPoint` | `temporalEntity.intervalStart` / `intervalEnd` | Interval bounds |
| `quant` / `freq` (for SET) | `temporalEntity.recurrence` + `temporalEntity.features` | Recurrence pattern as ISO 8601 repeating interval; quantifiers in features |

### Events (EVENT)

| TimeML Attribute | Layers Equivalent | Notes |
|---|---|---|
| `EVENT` tag | `annotation` with `subkind="situation-mention"` | Events are situation mentions in Layers |
| `eid` | `annotation.uuid` | Unique identifier |
| `class` (OCCURRENCE, STATE, REPORTING, PERCEPTION, ASPECTUAL, I_ACTION, I_STATE) | `annotation.label` | The primary label for the situation mention |
| `tense` | `annotation.features` key `tense` | Values: `PAST`, `PRESENT`, `FUTURE`, `INFINITIVE`, `PRESPART`, `PASTPART`, `NONE` |
| `aspect` | `annotation.features` key `aspect` | Values: `PROGRESSIVE`, `PERFECTIVE`, `PERFECTIVE_PROGRESSIVE`, `NONE` |
| `polarity` | `annotation.features` key `polarity` | Values: `POS`, `NEG` |
| `modality` | `annotation.features` key `modality` | Free text modal expression |
| `pos` | `annotation.features` key `pos` | Part of speech |

### Signals (SIGNAL)

| TimeML Attribute | Layers Equivalent | Notes |
|---|---|---|
| `SIGNAL` tag | `annotation` with `subkind="temporal-signal"` | Temporal connectives and prepositions ("before", "during", "since") |
| `sid` | `annotation.uuid` | Unique identifier |
| Text content | `annotation.text` | The signal text |

### Temporal Links (TLINK)

| TimeML Attribute | Layers Equivalent | Notes |
|---|---|---|
| `TLINK` | `pub.layers.graph.graphEdge` | A directed temporal relation between two annotations |
| `lid` | graphEdge record rkey | Unique identifier |
| `relType` | `graphEdge.edgeType` | See relation mapping below |
| `timeID` / `eventInstanceID` (source) | `graphEdge.source` | `objectRef` to source annotation |
| `relatedToTime` / `relatedToEventInstance` (target) | `graphEdge.target` | `objectRef` to target annotation |
| `signalID` | `graphEdge.label` or `graphEdge.properties` | Reference to the signal annotation |

**Relation mapping:**

| TimeML relType | Layers edgeType |
|---|---|
| `BEFORE` | `before` |
| `AFTER` | `after` |
| `IBEFORE` (immediately before) | `meets` |
| `IAFTER` (immediately after) | `met-by` |
| `INCLUDES` | `contains` |
| `IS_INCLUDED` | `during` |
| `BEGINS` | `starts` |
| `BEGUN_BY` | `started-by` |
| `ENDS` | `finishes` |
| `ENDED_BY` | `finished-by` |
| `SIMULTANEOUS` | `simultaneous` |
| `IDENTITY` | `equals` |
| `DURING` | `during` |
| `DURING_INV` | `contains` |
| `OVERLAP` | `overlaps` |
| `OVERLAPPED_BY` | `overlapped-by` |

### Aspectual Links (ALINK)

| TimeML Attribute | Layers Equivalent | Notes |
|---|---|---|
| `ALINK` | `pub.layers.graph.graphEdge` | Aspectual relation between events |
| `relType` | `graphEdge.edgeType` | `INITIATES` to `initiates`, `CULMINATES` to `culminates`, `TERMINATES` to `terminates`, `CONTINUES` to `continues`, `REINITIATES` to `reinitiates` |
| `eventInstanceID` | `graphEdge.source` | Source event |
| `relatedToEventInstance` | `graphEdge.target` | Target event |
| `signalID` | `graphEdge.label` or `graphEdge.properties` | Signal reference |

### Subordination Links (SLINK)

| TimeML Attribute | Layers Equivalent | Notes |
|---|---|---|
| `SLINK` | `pub.layers.graph.graphEdge` with `edgeType="discourse"` | Subordination is a discourse relation |
| `relType` (MODAL, EVIDENTIAL, NEG_EVIDENTIAL, FACTIVE, COUNTER_FACTIVE, CONDITIONAL) | `graphEdge.label` | The specific subordination type as the edge label |
| `eventInstanceID` | `graphEdge.source` | Subordinating event |
| `subordinatedEventInstance` | `graphEdge.target` | Subordinated event |

## Conversion Notes

A TimeML-annotated document can be converted to Layers records as follows:

1. Create a `pub.layers.expression.expression` record with `kind="document"` from the source text
2. For each `TIMEX3`, create an annotation in an `annotationLayer` with `kind="span"`, `subkind="temporal-expression"`, `formalism="timeml"`. Populate the `temporal` field with a `temporalExpression` containing the normalized value, modifier, anchor, and function
3. For each `EVENT`, create an annotation in an `annotationLayer` with `kind="span"`, `subkind="situation-mention"`, `formalism="timeml"`. Store `class` in `label`; `tense`, `aspect`, `polarity`, `modality` in `features`
4. For each `SIGNAL`, create an annotation in an `annotationLayer` with `kind="span"`, `subkind="temporal-signal"`, `formalism="timeml"`
5. For each `TLINK`, create a `graphEdge` with the mapped Allen relation as `edgeType`
6. For each `ALINK`, create a `graphEdge` with the mapped aspectual relation as `edgeType`
7. For each `SLINK`, create a `graphEdge` with `edgeType="discourse"` and the subordination type as `label`

All TimeML IDs (tid, eid, sid, lid) map to Layers UUIDs. Cross-references use `objectRef` with `localId` (same record) or `recordRef` + `objectId` (cross-record).

