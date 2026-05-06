#!/usr/bin/env python3
"""ISO-TimeML temporal-annotation tag inventory.

Canonical spec:
  Pustejovsky, James et al. 2003. TimeML: Robust Specification of
  Event and Temporal Expressions in Text. New Directions in Question
  Answering, AAAI Press.
  ISO 24617-1:2012 Language resource management — Semantic annotation
  framework — Part 1: Time and events (SemAF-Time, ISO-TimeML).
  http://www.timeml.org/

ISO-TimeML defines four primary tag types (TIMEX3, EVENT, SIGNAL,
LINK) with structured attribute inventories, plus three link sub-tags
(TLINK, ALINK, SLINK). This ontology ships only the seven primary
tag types as typeDefs; the attribute vocabulary (TIMEX3 type, EVENT
class, TLINK relType) ships as separate child typeDefs under each.
"""

from __future__ import annotations

import pathlib
import sys

import yaml

HERE = pathlib.Path(__file__).parent
HANDLE = "iso-timeml.ontology.layers.pub"
NS = "pub.layers.ontology.ontology"
ONTOLOGY_RKEY = "iso-timeml"
CREATED_AT = "2026-05-06T00:00:00Z"

# Top-level tag types from ISO-TimeML §6.
TIMEML_TAGS = [
    ("TIMEX3", "Temporal expression",
     "Markable temporal expressions: dates, times, durations, and sets. ISO 24617-1 §6.1."),
    ("EVENT", "Event",
     "Markable expressions denoting events, states, or processes. ISO 24617-1 §6.2."),
    ("SIGNAL", "Signal",
     "Function words that indicate the temporal relation between EVENT/TIMEX3 elements (when, before, while). ISO 24617-1 §6.3."),
    ("TLINK", "Temporal link",
     "Directed link between two EVENT/TIMEX3 elements indicating their temporal relation. Allen-style relations: BEFORE, AFTER, INCLUDES, IS_INCLUDED, DURING, SIMULTANEOUS, IAFTER, IBEFORE, IDENTITY, BEGINS, ENDS, BEGUN_BY, ENDED_BY. ISO 24617-1 §7.1."),
    ("ALINK", "Aspectual link",
     "Aspectual relation between an aspectual EVENT and its argument EVENT (INITIATES, CULMINATES, TERMINATES, CONTINUES, REINITIATES). ISO 24617-1 §7.2."),
    ("SLINK", "Subordination link",
     "Relation between two EVENTs where the first introduces the second's truth value (MODAL, EVIDENTIAL, NEG_EVIDENTIAL, FACTIVE, COUNTER_FACTIVE, CONDITIONAL). ISO 24617-1 §7.3."),
    ("MAKEINSTANCE", "Event instance",
     "Indicates that an EVENT has been instantiated; carries tense, aspect, modality, polarity attributes. (TimeML; not retained in ISO 24617-1's stand-off serialisation.)"),
]

# TIMEX3 type values (ISO 24617-1 §6.1.2).
TIMEX3_TYPES = [
    ("DATE", "Date", "Calendar dates: 'yesterday', '23 May 2026'."),
    ("TIME", "Time", "Times of day: '3 pm', 'noon'."),
    ("DURATION", "Duration", "Time spans: 'two hours', 'a week'."),
    ("SET", "Set", "Recurring or distributive temporal expressions: 'every Tuesday', 'twice a year'."),
]

# EVENT class values (ISO 24617-1 §6.2.2).
EVENT_CLASSES = [
    ("OCCURRENCE", "Occurrence", "Eventualities describing things that happen or occur."),
    ("STATE", "State", "Eventualities describing circumstances that hold."),
    ("REPORTING", "Reporting", "Verbs of communication: say, tell, announce."),
    ("I_ACTION", "Intensional action", "Verbs of intensional action: try, attempt, fail."),
    ("I_STATE", "Intensional state", "Mental-state verbs: believe, want, think."),
    ("ASPECTUAL", "Aspectual", "Aspectual verbs: begin, continue, finish."),
    ("PERCEPTION", "Perception", "Perception verbs: see, hear, watch."),
]


def main() -> int:
    ontology_uri = f"at://{HANDLE}/{NS}/{ONTOLOGY_RKEY}"
    docs = [
        {
            "collection": "pub.layers.ontology.ontology",
            "record": {
                "$type": "pub.layers.ontology.ontology",
                "name": "ISO-TimeML temporal annotation",
                "description": (
                    "Tag inventory of ISO-TimeML (ISO 24617-1:2012; Pustejovsky et "
                    "al. 2003). Used for temporal-relation annotation in TimeBank, "
                    "TempEval shared tasks, and downstream temporal-reasoning work. "
                    "Reference: http://www.timeml.org/"
                ),
                "domain": "general",
                "languages": ["eng"],
                "createdAt": CREATED_AT,
            },
            "changelog": {"summary": "Initial publish: ISO-TimeML"},
        }
    ]
    for code, name, defn in TIMEML_TAGS:
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": name,
                "typeKind": "entity-type" if code in ("TIMEX3", "EVENT", "SIGNAL") else "relation-type",
                "description": f"ISO-TimeML <{code}>: {defn}",
                "createdAt": CREATED_AT,
            },
        })
    # TIMEX3 type sub-typedefs.
    for code, name, defn in TIMEX3_TYPES:
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": f"TIMEX3 type: {name}",
                "typeKind": "attribute-type",
                "description": f"TIMEX3@type=\"{code}\": {defn}",
                "createdAt": CREATED_AT,
            },
        })
    # EVENT class sub-typedefs.
    for code, name, defn in EVENT_CLASSES:
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": f"EVENT class: {name}",
                "typeKind": "attribute-type",
                "description": f"EVENT@class=\"{code}\": {defn}",
                "createdAt": CREATED_AT,
            },
        })

    with (HERE / "iso-timeml.yaml").open("w", encoding="utf-8") as fp:
        for i, doc in enumerate(docs):
            if i > 0:
                fp.write("---\n")
            fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
    print(f"wrote 1 ontology + {len(TIMEML_TAGS) + len(TIMEX3_TYPES) + len(EVENT_CLASSES)} typeDefs (ISO-TimeML)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
