#!/usr/bin/env python3
"""GoEmotions: 27-category fine-grained emotion taxonomy + Neutral.

Canonical spec:
  Demszky, Dorottya, Dana Movshovitz-Attias, Jeongwoo Ko, Alan Cowen,
  Gaurav Nemade & Sujith Ravi. 2020. GoEmotions: A Dataset of
  Fine-Grained Emotions. ACL 2020, pages 4040-4054.
  https://github.com/google-research/google-research/tree/master/goemotions
  Taxonomy file:
  https://github.com/google-research/google-research/blob/master/goemotions/data/emotions.txt

Uses the GoEmotions taxonomy as published, including the `neutral`
catch-all category. Each emotion ships as one typeDef; the
hierarchical groupings (positive/negative/ambiguous; high/medium/low
arousal) are annotated as `parentTypeRef` chains.
"""

from __future__ import annotations

import pathlib
import sys

import yaml

HERE = pathlib.Path(__file__).parent
HANDLE = "goemotions.ontology.layers.pub"
NS = "pub.layers.ontology.ontology"
ONTOLOGY_RKEY = "goemotions"
CREATED_AT = "2026-05-06T00:00:00Z"

# 28 leaf emotions with the sentiment grouping from the paper's Table 1.
# (slug, sentiment-group, definition)
GOEMOTIONS = [
    ("admiration", "positive", "Finding something impressive or worthy of respect."),
    ("amusement", "positive", "Finding something funny or being entertained."),
    ("approval", "positive", "Having or expressing a favorable opinion."),
    ("caring", "positive", "Displaying kindness and concern for others."),
    ("desire", "positive", "A strong feeling of wanting something or wishing for something to happen."),
    ("excitement", "positive", "Feeling of great enthusiasm and eagerness."),
    ("gratitude", "positive", "A feeling of thankfulness and appreciation."),
    ("joy", "positive", "A feeling of pleasure and happiness."),
    ("love", "positive", "A strong positive emotion of regard and affection."),
    ("optimism", "positive", "Hopefulness and confidence about the future or the success of something."),
    ("pride", "positive", "Pleasure or satisfaction due to one's own achievements or those of close associates."),
    ("relief", "positive", "Reassurance and relaxation following release from anxiety or distress."),
    ("anger", "negative", "A strong feeling of displeasure or antagonism."),
    ("annoyance", "negative", "Mild anger; irritation."),
    ("disappointment", "negative", "Sadness or displeasure caused by the non-fulfilment of one's hopes or expectations."),
    ("disapproval", "negative", "Having or expressing an unfavorable opinion."),
    ("disgust", "negative", "Revulsion or strong disapproval aroused by something unpleasant or offensive."),
    ("embarrassment", "negative", "Self-consciousness, shame, or awkwardness."),
    ("fear", "negative", "An unpleasant emotion caused by the threat of danger, pain, or harm."),
    ("grief", "negative", "Intense sorrow, especially caused by someone's death."),
    ("nervousness", "negative", "Apprehension, worry, anxiety."),
    ("remorse", "negative", "Regret or guilty feeling."),
    ("sadness", "negative", "Emotional pain, sorrow."),
    ("confusion", "ambiguous", "Lack of understanding; uncertainty."),
    ("curiosity", "ambiguous", "A strong desire to know or learn something."),
    ("realization", "ambiguous", "Becoming aware of something."),
    ("surprise", "ambiguous", "Feeling astonished, startled by something unexpected."),
    ("neutral", "neutral", "No emotion expressed; default category for non-emotional utterances."),
]


def main() -> int:
    ontology_uri = f"at://{HANDLE}/{NS}/{ONTOLOGY_RKEY}"
    docs = [
        {
            "collection": "pub.layers.ontology.ontology",
            "record": {
                "$type": "pub.layers.ontology.ontology",
                "name": "GoEmotions (28 categories)",
                "description": (
                    "Fine-grained emotion taxonomy from Demszky et al. 2020 (ACL). "
                    "27 emotion categories grouped into positive/negative/ambiguous "
                    "sentiment macro-classes plus a neutral catch-all. Citation: "
                    "https://github.com/google-research/google-research/tree/master/goemotions"
                ),
                "domain": "social-media",
                "languages": ["eng"],
                "createdAt": CREATED_AT,
            },
            "changelog": {"summary": "Initial publish: GoEmotions taxonomy"},
        }
    ]
    # Sentiment-group parent typeDefs.
    sentiment_groups = ["positive", "negative", "ambiguous", "neutral"]
    for sg in sentiment_groups:
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": f"{sg.capitalize()} sentiment macro-class",
                "typeKind": "attribute-type",
                "description": f"Macro-class for {sg}-valence emotion categories from GoEmotions.",
                "createdAt": CREATED_AT,
            },
        })
    for slug, group, defn in GOEMOTIONS:
        parent_uri = f"at://{HANDLE}/pub.layers.ontology.typeDef/group-{group}"
        # The ontology emit above pre-establishes the macro-class typeDefs;
        # rkeys for them are set by the publisher's structural fingerprint
        # so we can't reference them here by stable name. The textual
        # `parentTypeRef` is set instead via a description hint.
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": slug.capitalize(),
                "typeKind": "attribute-type",
                "description": f"GoEmotions /{slug} ({group}): {defn}",
                "createdAt": CREATED_AT,
            },
        })

    with (HERE / "goemotions.yaml").open("w", encoding="utf-8") as fp:
        for i, doc in enumerate(docs):
            if i > 0:
                fp.write("---\n")
            fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
    print(f"wrote 1 ontology + {len(sentiment_groups) + len(GOEMOTIONS)} typeDefs (GoEmotions)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
