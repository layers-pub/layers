#!/usr/bin/env python3
"""UCCA Foundational Layer (Universal Conceptual Cognitive Annotation).

Canonical spec:
  Abend, Omri & Ari Rappoport. 2013. Universal Conceptual Cognitive
  Annotation (UCCA). ACL 2013, pages 228-238.
  UCCA Foundational Layer guidelines (current version):
  https://github.com/UniversalConceptualCognitiveAnnotation/docs

UCCA's foundational layer defines 12 categorial labels organised into
two structural classes (scene-level vs non-scene-level) plus a
remote/implicit edge attribute. This ontology ships the 12
foundational categories as typeDefs.
"""

from __future__ import annotations

import pathlib
import sys

import yaml

HERE = pathlib.Path(__file__).parent
HANDLE = "ucca.ontology.layers.pub"
NS = "pub.layers.ontology.ontology"
ONTOLOGY_RKEY = "ucca-foundational"
CREATED_AT = "2026-05-06T00:00:00Z"

# UCCA foundational-layer categories (Abend & Rappoport 2013, Table 1).
UCCA = [
    ("P", "Process", "The main relation of a Scene, evolving in time. Typically a verb of dynamic semantics."),
    ("S", "State", "The main relation of a Scene that holds without evolution. Typically a stative predicate."),
    ("A", "Participant", "An entity (or non-entity) that participates in a Scene; semantic argument."),
    ("D", "Adverbial", "A property modifying the main relation of a Scene (manner, temporal, locative)."),
    ("T", "Time", "A temporal description not directly serving as a Scene argument."),
    ("C", "Center", "The semantic head of a non-Scene unit; dominant element of a phrase."),
    ("E", "Elaborator", "A non-Scene element modifying a Center (typically attributive adjectives, possessives, determiners)."),
    ("N", "Connector", "A connective relating multiple Centers (and, or)."),
    ("L", "Linker", "A unit linking parallel Scenes at the discourse level (because, although)."),
    ("H", "Parallel scene", "A Scene that is part of a larger discourse-level unit."),
    ("F", "Function", "A unit with no semantic content of its own; e.g. infinitival to, copulas without aspectual content."),
    ("G", "Ground", "Speaker/hearer-anchored element that situates the utterance (vocatives, ground elements)."),
    ("R", "Relator", "A relational element that connects a Center to its dependents (prepositions, possessive markers)."),
    ("U", "Punctuation", "Punctuation marks."),
]


def main() -> int:
    ontology_uri = f"at://{HANDLE}/{NS}/{ONTOLOGY_RKEY}"
    docs = [
        {
            "collection": "pub.layers.ontology.ontology",
            "record": {
                "$type": "pub.layers.ontology.ontology",
                "name": "UCCA Foundational Layer",
                "description": (
                    "Universal Conceptual Cognitive Annotation foundational-layer "
                    "categorial labels (Abend & Rappoport 2013). Cross-lingual, "
                    "semantics-first decomposition organised around Scenes "
                    "(Process/State + Participants + Adverbials) and non-Scene "
                    "units (Center + Elaborator + Connector). Reference: "
                    "https://github.com/UniversalConceptualCognitiveAnnotation/docs"
                ),
                "domain": "general",
                "languages": [],
                "createdAt": CREATED_AT,
            },
            "changelog": {"summary": "Initial publish: UCCA foundational layer"},
        }
    ]
    for code, name, defn in UCCA:
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": f"{name} ({code})",
                "typeKind": "relation-type",
                "description": f"UCCA category {code}: {defn}",
                "createdAt": CREATED_AT,
            },
        })

    with (HERE / "ucca.yaml").open("w", encoding="utf-8") as fp:
        for i, doc in enumerate(docs):
            if i > 0:
                fp.write("---\n")
            fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
    print(f"wrote 1 ontology + {len(UCCA)} typeDefs (UCCA)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
