#!/usr/bin/env python3
"""ConceptNet 5 relations (English-language node-level relations).

Canonical spec:
  Speer, Robyn, Joshua Chin & Catherine Havasi. 2017. ConceptNet 5.5:
  An Open Multilingual Graph of General Knowledge. AAAI.
  https://github.com/commonsense/conceptnet5/wiki/Relations

The relations module of ConceptNet 5.5/5.7 lists 34 directed relations
sourced from the upstream wiki page. Definitions reproduced from the
ConceptNet 5 documentation; consumers reference these typeDefs as the
edgeType vocabulary for ConceptNet-style commonsense graphs.
"""

from __future__ import annotations

import pathlib
import sys

import yaml

HERE = pathlib.Path(__file__).parent
HANDLE = "conceptnet.ontology.layers.pub"
NS = "pub.layers.ontology.ontology"
ONTOLOGY_RKEY = "conceptnet-relations"
CREATED_AT = "2026-05-06T00:00:00Z"

# (slug, name, definition)
# Reproduced from https://github.com/commonsense/conceptnet5/wiki/Relations
# (ConceptNet 5.7 release; the 5.5 set differs by adding LocatedNear,
# DistinctFrom, EtymologicallyRelatedTo, EtymologicallyDerivedFrom,
# MannerOf, ExternalURL, ObstructedBy).
CONCEPTNET_RELATIONS = [
    ("RelatedTo", "Related to",
     "The most general relation. The two terms are positively associated; the strongest, most-used relation."),
    ("FormOf", "Form of",
     "A is an inflected form of B; B is the canonical form (lemma) of A."),
    ("IsA", "Is a",
     "A is a subtype or specific instance of B (taxonomic inheritance)."),
    ("PartOf", "Part of",
     "A is a part of B."),
    ("HasA", "Has a",
     "B belongs to A as a part or possession; converse of PartOf."),
    ("UsedFor", "Used for",
     "A is used for B; the typical purpose of A."),
    ("CapableOf", "Capable of",
     "Something that A can typically do."),
    ("AtLocation", "At location",
     "A is a typical location for B."),
    ("Causes", "Causes",
     "A is the cause of B; A typically results in B."),
    ("HasSubevent", "Has subevent",
     "A and B are events; B happens as a sub-event of A."),
    ("HasFirstSubevent", "Has first subevent",
     "B is the typical first sub-event of event A."),
    ("HasLastSubevent", "Has last subevent",
     "B is the typical last sub-event of event A."),
    ("HasPrerequisite", "Has prerequisite",
     "Event A presupposes event B (B happens before A and is necessary for A)."),
    ("HasProperty", "Has property",
     "A has property B; A can be described as B."),
    ("MotivatedByGoal", "Motivated by goal",
     "Someone does A because they want result B."),
    ("ObstructedBy", "Obstructed by",
     "Goal A is prevented by obstacle B."),
    ("Desires", "Desires",
     "A is a conscious entity that typically wants B."),
    ("CreatedBy", "Created by",
     "B is the agent that creates A."),
    ("Synonym", "Synonym",
     "A and B have very similar meanings; closely related to RelatedTo + similar surface form."),
    ("Antonym", "Antonym",
     "A and B are opposites along some salient dimension."),
    ("DistinctFrom", "Distinct from",
     "A and B are different members of the same conceptual category and cannot identify each other."),
    ("DerivedFrom", "Derived from",
     "A is morphologically derived from B (often a stem or root)."),
    ("SymbolOf", "Symbol of",
     "A symbolically represents B; A stands for B (e.g. heart, love)."),
    ("DefinedAs", "Defined as",
     "A and B overlap in meaning; B helps define A."),
    ("MannerOf", "Manner of",
     "A is a specific way of doing B; A is a sub-type of action B."),
    ("LocatedNear", "Located near",
     "A is typically found near B."),
    ("HasContext", "Has context",
     "A is typically used in context B (a domain, jargon, or activity)."),
    ("SimilarTo", "Similar to",
     "A is similar to B in some sense (less restrictive than Synonym)."),
    ("EtymologicallyRelatedTo", "Etymologically related to",
     "A and B share a common etymological origin."),
    ("EtymologicallyDerivedFrom", "Etymologically derived from",
     "A's etymology traces back to B."),
    ("CausesDesire", "Causes desire",
     "A causes a desire for B."),
    ("MadeOf", "Made of",
     "A is constituted out of material B."),
    ("ReceivesAction", "Receives action",
     "B can typically be done to A."),
    ("ExternalURL", "External URL",
     "A links to an external URL B (provenance)."),
]


def main() -> int:
    ontology_uri = f"at://{HANDLE}/{NS}/{ONTOLOGY_RKEY}"
    docs = [
        {
            "collection": "pub.layers.ontology.ontology",
            "record": {
                "$type": "pub.layers.ontology.ontology",
                "name": "ConceptNet 5 relations",
                "description": (
                    "Directed-relation vocabulary of ConceptNet 5.5/5.7 (Speer, Chin & "
                    "Havasi 2017). Used as the edgeType vocabulary for commonsense "
                    "knowledge-graph annotations on Layers. Citation: "
                    "https://github.com/commonsense/conceptnet5/wiki/Relations"
                ),
                "domain": "general",
                "languages": ["eng"],
                "createdAt": CREATED_AT,
            },
            "changelog": {"summary": "Initial publish: ConceptNet 5 relations"},
        }
    ]
    for slug, name, defn in CONCEPTNET_RELATIONS:
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": name,
                "typeKind": "relation-type",
                "description": f"ConceptNet relation /r/{slug}: {defn}",
                "createdAt": CREATED_AT,
            },
        })

    with (HERE / "conceptnet.yaml").open("w", encoding="utf-8") as fp:
        for i, doc in enumerate(docs):
            if i > 0:
                fp.write("---\n")
            fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
    print(f"wrote 1 ontology + {len(CONCEPTNET_RELATIONS)} typeDefs (ConceptNet)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
