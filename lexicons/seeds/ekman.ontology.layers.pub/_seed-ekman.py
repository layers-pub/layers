#!/usr/bin/env python3
"""Ekman's six basic emotions.

Canonical spec:
  Ekman, Paul. 1992. An argument for basic emotions. Cognition &
  Emotion 6(3-4):169-200.
  Ekman, Paul & Wallace V. Friesen. 1971. Constants across cultures
  in the face and emotion. Journal of Personality and Social Psychology
  17(2):124-129.

The six basic emotions identified through cross-cultural facial-
expression studies. Used widely in computer-vision affect-recognition
work and as a coarse-grained alternative to Plutchik 8 / GoEmotions.
"""

from __future__ import annotations

import pathlib
import sys

import yaml

HERE = pathlib.Path(__file__).parent
HANDLE = "ekman.ontology.layers.pub"
NS = "pub.layers.ontology.ontology"
ONTOLOGY_RKEY = "ekman-basic"
CREATED_AT = "2026-05-06T00:00:00Z"

EKMAN = [
    ("anger", "Anger", "Hostility in response to perceived injustice or violation."),
    ("disgust", "Disgust", "Revulsion to offensive stimuli."),
    ("fear", "Fear", "Response to perceived threat or danger."),
    ("happiness", "Happiness", "Positive emotional state of pleasure or contentment. (Ekman's original `joy`.)"),
    ("sadness", "Sadness", "Sorrow, grief, or loss."),
    ("surprise", "Surprise", "Brief response to the unexpected."),
]


def main() -> int:
    ontology_uri = f"at://{HANDLE}/{NS}/{ONTOLOGY_RKEY}"
    docs = [
        {
            "collection": "pub.layers.ontology.ontology",
            "record": {
                "$type": "pub.layers.ontology.ontology",
                "name": "Ekman basic emotions (6)",
                "description": (
                    "Ekman's six basic emotions (Ekman 1992; Ekman & Friesen 1971). "
                    "Cross-culturally universal facial-expression categories. Used "
                    "as the canonical coarse-grained emotion taxonomy in affect "
                    "computing."
                ),
                "domain": "general",
                "languages": ["eng"],
                "createdAt": CREATED_AT,
            },
            "changelog": {"summary": "Initial publish: Ekman 6"},
        }
    ]
    for slug, name, defn in EKMAN:
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": name,
                "typeKind": "attribute-type",
                "description": defn,
                "createdAt": CREATED_AT,
            },
        })

    with (HERE / "ekman.yaml").open("w", encoding="utf-8") as fp:
        for i, doc in enumerate(docs):
            if i > 0:
                fp.write("---\n")
            fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
    print(f"wrote 1 ontology + {len(EKMAN)} typeDefs (Ekman)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
