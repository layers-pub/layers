#!/usr/bin/env python3
"""Penn Treebank POS tagset (English, 36 tags).

Canonical spec:
  Marcus, Mitchell P., Beatrice Santorini & Mary Ann Marcinkiewicz. 1993.
  Building a Large Annotated Corpus of English: The Penn Treebank.
  Computational Linguistics 19(2):313-330.

Tagset reference:
  Santorini, Beatrice. 1990. Part-of-Speech Tagging Guidelines for the
  Penn Treebank Project (3rd Revision, 2nd Printing). University of
  Pennsylvania, Department of Computer and Information Science Technical
  Report MS-CIS-90-47.
  https://catalog.ldc.upenn.edu/docs/LDC95T7/cl93.html

The 36-tag inventory is the de-facto English baseline for tagger
training; HMM, perceptron, and BERT taggers all default to this set.
This script is the source of truth for the registry's PTB ontology
seeding; edits to the YAML outputs will be overwritten on regen.
"""

from __future__ import annotations

import pathlib
import sys

import yaml

HERE = pathlib.Path(__file__).parent
HANDLE = "ptb-pos.ontology.layers.pub"
NS = "pub.layers.ontology.ontology"
ONTOLOGY_RKEY = "ptb-pos"
CREATED_AT = "2026-05-06T00:00:00Z"

# (tag, name, description)
# Definitions distilled from Santorini (1990) §A.
PTB_TAGS = [
    ("CC", "Coordinating conjunction", "and, but, or, nor."),
    ("CD", "Cardinal number", "Numerical quantities expressed as digits or words."),
    ("DT", "Determiner", "Articles (a, the), demonstratives (this, those), and indefinite determiners (every, no)."),
    ("EX", "Existential there", "The existential `there` as in 'there is/are'."),
    ("FW", "Foreign word", "Word from a language other than English appearing in the text."),
    ("IN", "Preposition or subordinating conjunction", "Includes prepositions (of, in) and subordinating conjunctions (because, although, while)."),
    ("JJ", "Adjective", "Hot, cold, blue."),
    ("JJR", "Adjective, comparative", "Hotter, colder, bluer."),
    ("JJS", "Adjective, superlative", "Hottest, coldest, bluest."),
    ("LS", "List item marker", "Markers introducing items in a numbered or bulleted list."),
    ("MD", "Modal", "can, could, will, would, may, might, must, shall, should."),
    ("NN", "Noun, singular or mass", "dog, water, idea."),
    ("NNS", "Noun, plural", "dogs, ideas."),
    ("NNP", "Proper noun, singular", "John, London, IBM."),
    ("NNPS", "Proper noun, plural", "Johns, Londons, IBMs."),
    ("PDT", "Predeterminer", "all, both, half, when occurring before a determiner (all the books)."),
    ("POS", "Possessive ending", "'s as in 'John's book'."),
    ("PRP", "Personal pronoun", "I, you, he, she, it, we, they."),
    ("PRP$", "Possessive pronoun", "my, your, his, her, its, our, their."),
    ("RB", "Adverb", "quickly, very, never."),
    ("RBR", "Adverb, comparative", "faster, sooner."),
    ("RBS", "Adverb, superlative", "fastest, soonest."),
    ("RP", "Particle", "Particles in phrasal verbs (give up, take off)."),
    ("SYM", "Symbol", "Mathematical or scientific symbols (=, +, %)."),
    ("TO", "to", "Infinitival to and the preposition to."),
    ("UH", "Interjection", "oh, well, ah."),
    ("VB", "Verb, base form", "go, write, eat."),
    ("VBD", "Verb, past tense", "went, wrote, ate."),
    ("VBG", "Verb, gerund or present participle", "going, writing, eating."),
    ("VBN", "Verb, past participle", "gone, written, eaten."),
    ("VBP", "Verb, non-3rd person singular present", "go, write, eat (with I/you/we/they)."),
    ("VBZ", "Verb, 3rd person singular present", "goes, writes, eats."),
    ("WDT", "Wh-determiner", "which, what (as determiners)."),
    ("WP", "Wh-pronoun", "who, whom, what (as pronouns)."),
    ("WP$", "Possessive wh-pronoun", "whose."),
    ("WRB", "Wh-adverb", "where, when, why, how."),
]


def at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


def main() -> int:
    ontology_uri = at_uri(HANDLE, NS, ONTOLOGY_RKEY)
    docs = []
    docs.append({
        "collection": "pub.layers.ontology.ontology",
        "record": {
            "$type": "pub.layers.ontology.ontology",
            "name": "Penn Treebank POS tagset (English, 36 tags)",
            "description": (
                "Penn Treebank POS tagset for English from Santorini (1990) and "
                "Marcus, Santorini & Marcinkiewicz (1993). De-facto baseline for "
                "English POS tagging; consumed by the WSJ corpus, Brown corpus "
                "PTB-style retags, and the bulk of contemporary tagger evaluation. "
                "Citation: https://catalog.ldc.upenn.edu/docs/LDC95T7/cl93.html"
            ),
            "domain": "general",
            "languages": ["eng"],
            "createdAt": CREATED_AT,
        },
        "changelog": {"summary": "Initial publish: PTB POS tagset"},
    })
    for code, name, desc in PTB_TAGS:
        rkey = f"ptb-{code.lower().replace('$', '-poss')}"
        docs.append({
            "collection": "pub.layers.ontology.typeDef",
            "record": {
                "$type": "pub.layers.ontology.typeDef",
                "ontologyRef": ontology_uri,
                "name": name,
                "typeKind": "attribute-type",
                "description": f"PTB POS tag {code}: {desc}",
                "createdAt": CREATED_AT,
            },
        })

    with (HERE / "ptb-pos.yaml").open("w", encoding="utf-8") as fp:
        for i, doc in enumerate(docs):
            if i > 0:
                fp.write("---\n")
            fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
    print(f"wrote 1 ontology + {len(PTB_TAGS)} typeDefs (PTB POS)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
