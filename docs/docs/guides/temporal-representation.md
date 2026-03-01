---
sidebar_label: "Temporal Representation"
---

# Temporal Representation

Layers provides composable temporal primitives that fully subsume TimeML/ISO-TimeML, W3C OWL-Time, Allen's Interval Algebra, and ISO 8601. This guide documents the temporal type system and maps each standard to Layers equivalents.

## Two Kinds of Time

Layers distinguishes **media time** from **semantic time**:

- **Media time** (`temporalSpan`): *where* in an audio/video recording an annotation occurs. Expressed as millisecond offsets. Used for anchoring annotations to media: "this word is at 3:45–3:47 in the recording."

- **Semantic time** (`temporalExpression`): *what time* a linguistic expression refers to. Expressed as ISO 8601 values with granularity, calendar, modifiers, and document function. Used for temporal annotation: "this expression refers to March 2024."

Media time lives on [anchors](../foundations/primitives.md#anchor) (`pub.layers.defs#anchor.temporalSpan`). Semantic time lives on [annotations](../lexicons/annotation.md) (`pub.layers.annotation.defs#annotation.temporal`). They are independent: a temporal expression annotation at 3:45 in a recording might refer to "next Tuesday."

## Temporal Primitives

Three composable objects in [`pub.layers.defs`](../lexicons/defs.md):

### temporalEntity

The normalized temporal value. Consumers dispatch on which fields are populated:

| Pattern | Fields | Example |
|---------|--------|---------|
| Point in time | `instant` | `"2024-03-15"` |
| Bounded interval | `intervalStart` + `intervalEnd` | `"2024-01-01"` to `"2024-12-31"` |
| Start + duration | `intervalStart` + `duration` | `"2024-03-15"` + `"P7D"` |
| Pure duration | `duration` | `"PT2H30M"` |
| Uncertain bounds | `earliest` + `latest` | `"2024-03-01"` to `"2024-03-31"` |
| Repeating pattern | `recurrence` | `"R/P1W"` (weekly) |

All datetime strings use ISO 8601. Granularity (`year`, `month`, `day`, etc.) specifies the precision of the value. Calendar (`gregorian`, `hijri`, `hebrew`, etc.) specifies the temporal reference system.

### temporalModifier

Qualitative modification: `approximate`, `early`, `mid`, `late`, `start`, `end`, `before`, `after`, `on-or-before`, `on-or-after`, `less-than`, `more-than`.

### temporalExpression

The complete temporal annotation, packaging:
- **type**: `date`, `time`, `duration`, `set`, `interval`, `relative`
- **value**: ref to `temporalEntity`
- **modifier**: ref to `temporalModifier`
- **anchorRef**: what this expression is relative to (e.g., document creation time)
- **function**: the role this time plays in the document (`creation-time`, `publication-time`, etc.)

## Temporal Relations

Temporal relations between annotations use [`pub.layers.graph.graphEdge`](../lexicons/graph.md) with Allen's 13 interval relations as `edgeType` values:

| Relation | Inverse | Meaning |
|----------|---------|---------|
| `before` | `after` | A ends before B starts (gap between) |
| `meets` | `met-by` | A ends exactly when B starts |
| `overlaps` | `overlapped-by` | A starts first, they share some time, B ends last |
| `starts` | `started-by` | A and B start together, A ends first |
| `during` | `contains` | A is entirely within B |
| `finishes` | `finished-by` | A and B end together, A starts later |
| `equals` | `equals` | A and B have identical start and end |

Additional temporal edge types: `simultaneous` (TimeML extension, looser than `equals`).

Aspectual edge types (TimeML ALINK): `initiates`, `culminates`, `terminates`, `continues`, `reinitiates`.

The `label` field on a temporal graphEdge can carry the linguistic signal/connective that triggered the relation (e.g., "before", "since", "during"). Signal annotations themselves use `subkind="temporal-signal"` on annotation layers.

## Composability Examples

**Simple date annotation:**
```json
{
  "subkind": "temporal-expression",
  "label": "DATE",
  "text": "March 15, 2024",
  "temporal": {
    "type": "date",
    "value": {
      "instant": "2024-03-15",
      "granularity": "day"
    }
  }
}
```

**Vague duration:**
```json
{
  "temporal": {
    "type": "duration",
    "value": { "duration": "PT3H" },
    "modifier": { "mod": "approximate" }
  }
}
```

**Weekly recurrence ("every Tuesday"):**
```json
{
  "temporal": {
    "type": "set",
    "value": { "recurrence": "R/P1W" }
  }
}
```

**Relative time ("3 days ago"):**
```json
{
  "temporal": {
    "type": "relative",
    "value": { "duration": "P3D" },
    "modifier": { "mod": "before" },
    "anchorRef": { "localId": "dct-annotation-uuid" }
  }
}
```

**Document creation time:**
```json
{
  "temporal": {
    "type": "date",
    "value": { "instant": "2024-01-15" },
    "function": "creation-time"
  }
}
```

**Uncertain month ("sometime in March"):**
```json
{
  "temporal": {
    "type": "date",
    "value": {
      "earliest": "2024-03-01",
      "latest": "2024-03-31",
      "granularity": "month"
    }
  }
}
```

**Non-Gregorian calendar ("Ramadan 1445 AH"):**
```json
{
  "temporal": {
    "type": "interval",
    "value": {
      "intervalStart": "2024-03-11",
      "intervalEnd": "2024-04-09",
      "calendar": "hijri"
    }
  }
}
```

**Temporal relation (graphEdge):**
```json
{
  "source": { "recordRef": "at://did:plc:.../pub.layers.annotation.annotationLayer/...", "objectId": "timex-1-uuid" },
  "target": { "recordRef": "at://did:plc:.../pub.layers.annotation.annotationLayer/...", "objectId": "timex-2-uuid" },
  "edgeType": "before",
  "label": "before",
  "confidence": 950
}
```

---

## Standards Mapping

### TimeML / ISO-TimeML (ISO 24617-1)

TimeML is the ISO standard for temporal and event annotation. Layers fully subsumes TimeML through structured temporal primitives and graph edges.

| TimeML Element | Layers Equivalent | Notes |
|---|---|---|
| `TIMEX3` | `annotation` with `subkind="temporal-expression"` + `temporal` field | All TIMEX3 attributes mapped to structured fields |
| `TIMEX3.type` (DATE, TIME, DURATION, SET) | `temporalExpression.type` | `DATE` to `date`, `TIME` to `time`, `DURATION` to `duration`, `SET` to `set` |
| `TIMEX3.value` | `temporalEntity` fields | ISO 8601 values decomposed into `instant`, `intervalStart`, `intervalEnd`, `duration` |
| `TIMEX3.mod` (APPROX, START, MID, END, BEFORE, AFTER) | `temporalModifier.mod` | `APPROX` to `approximate`, `START` to `start`, `MID` to `mid`, `END` to `end`, `BEFORE` to `before`, `AFTER` to `after` |
| `TIMEX3.anchorTimeID` | `temporalExpression.anchorRef` | `objectRef` pointing to another temporal annotation |
| `TIMEX3.temporalFunction` | `temporalExpression.anchorRef` presence | If `anchorRef` is populated, the value is computed relative to it |
| `TIMEX3.functionInDocument` | `temporalExpression.function` | `CREATION_TIME` to `creation-time`, `PUBLICATION_TIME` to `publication-time`, etc. |
| `EVENT` (temporal attributes) | `annotation.features` | TimeML event attributes (`tense`, `aspect`, `polarity`, `modality`, `class`) map to feature keys on situation-mention annotations |
| `SIGNAL` | `annotation` with `subkind="temporal-signal"` | Temporal connectives and prepositions ("before", "during", "since") |
| `TLINK` | `graphEdge` with Allen `edgeType` | TimeML `relType` maps to Allen relation edge types. `BEFORE` to `before`, `AFTER` to `after`, `INCLUDES` to `contains`, `IS_INCLUDED` to `during`, `SIMULTANEOUS` to `simultaneous`, `IDENTITY` to `equals`, `BEGINS` to `starts`, `ENDS` to `finishes`, `BEGUN_BY` to `started-by`, `ENDED_BY` to `finished-by` |
| `TLINK.signalID` | `graphEdge.label` or `graphEdge.properties` | The linguistic signal triggering the temporal relation |
| `ALINK` | `graphEdge` with aspectual `edgeType` | `INITIATES` to `initiates`, `CULMINATES` to `culminates`, `TERMINATES` to `terminates`, `CONTINUES` to `continues`, `REINITIATES` to `reinitiates` |
| `SLINK` | `graphEdge` with `edgeType="discourse"` + `label` | Subordination links (modal, evidential, factive, conditional) are discourse relations |

**Completeness:** Full subsumption. Every TimeML element and attribute has a direct mapping.

### W3C OWL-Time

OWL-Time is the W3C ontology for temporal concepts. Layers maps its class hierarchy to the polymorphic `temporalEntity` type.

| OWL-Time Concept | Layers Equivalent | Notes |
|---|---|---|
| `TemporalEntity` | `temporalEntity` | Polymorphic: dispatch on populated fields |
| `Instant` | `temporalEntity.instant` | Single ISO 8601 datetime string |
| `Interval` / `ProperInterval` | `temporalEntity.intervalStart` + `intervalEnd` | Bounded interval with distinct start/end |
| `hasBeginning` | `temporalEntity.intervalStart` | Interval start bound |
| `hasEnd` | `temporalEntity.intervalEnd` | Interval end bound |
| `Duration` | `temporalEntity.duration` | ISO 8601 duration string |
| `hasTemporalDuration` | `temporalEntity.duration` | Duration of an interval |
| `DateTimeDescription` | `temporalEntity` + `granularity` + `calendar` | Calendar-aware temporal description |
| `GeneralDateTimeDescription` | `temporalEntity` + `calendarUri` | Arbitrary temporal reference system |
| `unitType` | `temporalEntity.granularity` | Temporal precision unit |
| `hasTRS` (Temporal Reference System) | `temporalEntity.calendar` / `calendarUri` | Calendar system identification |
| `DayOfWeek`, `MonthOfYear` | `temporalEntity.features` | Encode as feature keys when needed |
| `TemporalAggregate` | Multiple `temporalEntity` refs or `clusterSet` | Group temporal entities via clustering |
| Allen interval relations (`before`, `after`, etc.) | `graphEdge.edgeType` | All 13 as first-class edge types |
| `hasInside` (Instant in Interval) | `graphEdge` with `edgeType="during"` | Instant during an interval |

**Completeness:** Full subsumption. Every OWL-Time class and property has a mapping. The Layers representation is more compact (polymorphic object vs. class hierarchy) but equally expressive.

### Allen's Interval Algebra

Allen's interval algebra defines 13 mutually exclusive relations between two time intervals. All 13 are first-class `graphEdge.edgeType` values in Layers.

| # | Relation | Inverse | Visual | Definition |
|---|----------|---------|--------|------------|
| 1 | `before` | `after` | `AAA BBB` | A ends before B starts |
| 2 | `after` | `before` | `BBB AAA` | A starts after B ends |
| 3 | `meets` | `met-by` | `AAABBB` | A ends exactly when B starts |
| 4 | `met-by` | `meets` | `BBBAAA` | A starts exactly when B ends |
| 5 | `overlaps` | `overlapped-by` | `AAA___`/`___BBB` | A starts first, overlap, B ends last |
| 6 | `overlapped-by` | `overlaps` | `___AAA`/`BBB___` | B starts first, overlap, A ends last |
| 7 | `starts` | `started-by` | `AA____`/`BBBBB` | Same start, A ends first |
| 8 | `started-by` | `starts` | `AAAAA`/`BB____` | Same start, B ends first |
| 9 | `during` | `contains` | `_AAA_`/`BBBBB` | A entirely within B |
| 10 | `contains` | `during` | `AAAAA`/`_BBB_` | B entirely within A |
| 11 | `finishes` | `finished-by` | `____AA`/`BBBBB` | Same end, A starts later |
| 12 | `finished-by` | `finishes` | `AAAAA`/`____BB` | Same end, B starts later |
| 13 | `equals` | `equals` | `AAAAA`/`BBBBB` | Identical start and end |

**Inverse convention:** `before(A,B)` is equivalent to `after(B,A)`. Both are valid; use whichever is natural for the annotation direction.

**Point algebra:** For instants (zero-duration intervals), only three Allen relations apply: `before`, `after`, `equals`.

**Constraint composition:** Allen's composition table (what can be inferred from combining two relations) is an application-level concern, not encoded in the schema. Libraries like `allen-algebra` can compute transitive closure over Layers graph edges.

### ISO 8601

All temporal string values in Layers use ISO 8601 format.

| ISO 8601 Concept | Layers Field | Example |
|---|---|---|
| Date | `temporalEntity.instant` | `2024-03-15` |
| Date and time | `temporalEntity.instant` | `2024-03-15T14:30:00Z` |
| Date with timezone | `temporalEntity.instant` | `2024-03-15T14:30:00+09:00` |
| Year only | `temporalEntity.instant` + `granularity="year"` | `2024` |
| Year-month | `temporalEntity.instant` + `granularity="month"` | `2024-03` |
| Week date | `temporalEntity.instant` | `2024-W12-3` |
| Ordinal date | `temporalEntity.instant` | `2024-075` |
| Duration | `temporalEntity.duration` | `P3Y2M10D`, `PT2H30M`, `P1W` |
| Interval (start/end) | `intervalStart` + `intervalEnd` | Two ISO 8601 datetime strings |
| Interval (start/duration) | `intervalStart` + `duration` | Start + ISO 8601 duration |
| Interval (duration/end) | `duration` + `intervalEnd` | ISO 8601 duration + end |
| Repeating interval | `temporalEntity.recurrence` | `R5/P1D` (5 daily), `R/P1W` (weekly unbounded) |

### ELAN / Timeline-Based Annotation

ELAN and similar multimedia annotation tools use timeline-based representation with time-aligned tiers.

| ELAN Concept | Layers Equivalent | Notes |
|---|---|---|
| Timeline | `temporalSpan` on `anchor` | Media time in milliseconds |
| Time-aligned tier | `annotationLayer` with temporal anchors | Each annotation has `anchor.temporalSpan` |
| Symbolic tier (dependent) | `annotationLayer` with `parentLayerRef` | References parent time-aligned tier |
| Time slot | Implicit in `temporalSpan.start` / `temporalSpan.ending` | Millisecond precision |
| Controlled vocabulary | `ontologyRef` on `annotationLayer` | Points to ontology defining the label set |
| Forced alignment | `pub.layers.alignment.alignment` with `kind="audio-to-text"` | Alignment between audio and text segments |

## See Also

- [Primitives](../foundations/primitives.md): temporalExpression, temporalEntity, temporalModifier definitions
- [Spatial Representation](./spatial-representation.md): the parallel spatial type system
- [Multimodal Annotation](./multimodal-annotation.md): temporal anchoring in audio and video
- [Knowledge Grounding](./knowledge-grounding.md): temporal relations as graph edges
- [Defs](../lexicons/defs.md): full type definitions for temporal primitives
- [Graph](../lexicons/graph.md): Allen's Interval Algebra edge types
- [Annotation](../lexicons/annotation.md): the `temporal` field on annotations
- [TimeML Integration](../integration/data-models/timeml.md): detailed TimeML mapping
