#!/usr/bin/env python3
"""Plutchik's wheel of emotions (8 basic emotions, 4 opposing pairs).

Canonical spec:
  Plutchik, Robert. 1980. A general psychoevolutionary theory of emotion.
  In Theories of Emotion (Plutchik & Kellerman eds.), Academic Press.
  Plutchik, Robert. 2001. The nature of emotions: Human emotions have
  deep evolutionary roots. American Scientist 89(4):344-350.

Plutchik's eight primary emotions are arranged on a wheel in four
opposing pairs:
    joy ↔ sadness
    trust ↔ disgust
    fear ↔ anger
    surprise ↔ anticipation

Each primary has three intensity gradations and combines with its
neighbours into eight dyads. This ontology ships only the eight
primaries; intensity gradations and dyads can be modelled as
graphEdges from typeDef-to-typeDef in user-authored extensions.
"""

from __future__ import annotations

import pathlib
import sys

import yaml

HERE = pathlib.Path(__file__).parent
HANDLE = "plutchik.ontology.layers.pub"
NS = "pub.layers.ontology.ontology"
ONTOLOGY_RKEY = "plutchik-primary"
CREATED_AT = "2026-05-06T00:00:00Z"

PLUTCHIK = [
    ("joy", "Joy", "Positive valence, high arousal: pleasure, happiness."),
    ("trust", "Trust", "Positive valence, low arousal: acceptance, confidence in another."),
    ("fear", "Fear", "Negative valence, high arousal: response to perceived threat."),
    ("surprise", "Surprise", "Neutral valence, high arousal: response to the unexpected."),
    ("sadness", "Sadness", "Negative valence, low arousal: sorrow, grief."),
    ("disgust", "Disgust", "Negative valence, moderate arousal: rejection, repulsion."),
    ("anger", "Anger", "Negative valence, high arousal: hostility in response to perceived violation."),
    ("anticipation", "Anticipation", "Positive valence, moderate arousal: looking forward to."),
]

# Opposing pairs encoded as a constant; consumers can read them when
# emitting their own typeDef-to-typeDef antonym graphEdges.
OPPOSITES = {
    "joy": "sadness",
    "trust": "disgust",
    "fear": "anger",
    "surprise": "anticipation",
}


def main() -> int:
    ontology_uri = f"at://{HANDLE}/{NS}/{ONTOLOGY_RKEY}"
    docs = [
        {
            "collection": "pub.layers.ontology.ontology",
            "record": {
                "$type": "pub.layers.ontology.ontology",
                "name": "Plutchik primary emotions (8)",
                "description": (
                    "The eight primary emotions of Plutchik's psychoevolutionary "
                    "wheel (Plutchik 1980, 2001). Arranged in four opposing pairs: "
                    "joy↔sadness, trust↔disgust, fear↔anger, surprise↔anticipation. "
                    "Often used as a coarse-grained alternative to GoEmotions for "
                    "psychological-model-aligned annotation."
                ),
                "domain": "general",
                "languages": ["eng"],
                "createdAt": CREATED_AT,
            },
            "changelog": {"summary": "Initial publish: Plutchik primary emotions"},
        }
    ]
    for slug, name, defn in PLUTCHIK:
        opposite = OPPOSITES.get(slug) or {v: k for k, v in OPPOSITES.items()}.get(slug, "")
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": name,
                "typeKind": "attribute-type",
                "description": f"{defn} Plutchik wheel opposite: {opposite}.",
                "createdAt": CREATED_AT,
            },
        })

    with (HERE / "plutchik.yaml").open("w", encoding="utf-8") as fp:
        for i, doc in enumerate(docs):
            if i > 0:
                fp.write("---\n")
            fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
    print(f"wrote 1 ontology + {len(PLUTCHIK)} typeDefs (Plutchik)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
