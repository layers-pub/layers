#!/usr/bin/env python3
"""Author UD POS v1 + v2 + UD relations v2 typeDef seed YAMLs.

Run once to (re)generate the YAMLs in this directory. Subsequent
edits to the YAMLs are the authoritative form; this script is the
one-shot bootstrapper.
"""

import pathlib
import yaml

HERE = pathlib.Path(__file__).parent

# UD v1 POS (16 tags, lumped CONJ).
# Source: https://universaldependencies.org/u/pos/ (v1 archive).
UD_V1_POS = [
    ("ADJ", "Adjective", "Words that typically modify nouns and specify their properties or attributes."),
    ("ADP", "Adposition", "Cover term for prepositions and postpositions."),
    ("ADV", "Adverb", "Words that typically modify verbs for properties such as time, place, direction, or manner."),
    ("AUX", "Auxiliary", "Functional verb accompanying the lexical verb of a clause to express grammatical distinctions."),
    ("CONJ", "Conjunction (lumped coordinating + subordinating)", "UDv1 single CONJ tag covering both coordinating (and, or, but) and subordinating (because, while) conjunctions."),
    ("DET", "Determiner", "Words that modify nouns or noun phrases and express the reference of the NP in context."),
    ("INTJ", "Interjection", "Word that is used most often as an exclamation or part of an exclamation."),
    ("NOUN", "Noun", "Denotes a person, place, thing, animal, or idea."),
    ("NUM", "Numeral", "Word, functioning as a noun, adjective, pronoun, or adverb, that expresses a number."),
    ("PART", "Particle", "Function word associated with another word/phrase to impart meaning, but does not satisfy criteria for adposition, auxiliary, or coordinating conjunction."),
    ("PRON", "Pronoun", "Words that substitute for nouns or noun phrases, whose meaning is recoverable from the context."),
    ("PROPN", "Proper noun", "Noun that is the name of a specific entity. Capitalisation is the strongest signal in English."),
    ("PUNCT", "Punctuation", "Non-alphabetical character used to delimit linguistic units."),
    ("SYM", "Symbol", "Word-like entity that differs from ordinary words by form, function, or both."),
    ("VERB", "Verb", "Word that signals events and actions."),
    ("X", "Other", "Word that cannot be assigned a real POS for some reason (typo, code-switching, etc.)."),
]

# UD v2 POS (17 tags; v1's CONJ split into CCONJ + SCONJ).
UD_V2_POS = [
    ("ADJ", "Adjective", "Words that typically modify nouns and specify their properties or attributes."),
    ("ADP", "Adposition", "Cover term for prepositions and postpositions."),
    ("ADV", "Adverb", "Words that typically modify verbs for time, place, direction, or manner."),
    ("AUX", "Auxiliary", "Functional verb accompanying the lexical verb of a clause to express grammatical distinctions."),
    ("CCONJ", "Coordinating conjunction", "Word that links words or larger constituents without subordinating one to the other (e.g. and, or, but)."),
    ("DET", "Determiner", "Words that modify nouns or noun phrases and express the reference of the NP in context."),
    ("INTJ", "Interjection", "Word that is used most often as an exclamation."),
    ("NOUN", "Noun", "Denotes a person, place, thing, animal, or idea."),
    ("NUM", "Numeral", "Word, functioning as a noun, adjective, pronoun, or adverb, that expresses a number."),
    ("PART", "Particle", "Function word associated with another word/phrase to impart meaning."),
    ("PRON", "Pronoun", "Words that substitute for nouns or noun phrases."),
    ("PROPN", "Proper noun", "Noun that is the name of a specific entity."),
    ("PUNCT", "Punctuation", "Non-alphabetical character used to delimit linguistic units."),
    ("SCONJ", "Subordinating conjunction", "Word that links a finite subordinate clause to its matrix clause (e.g. because, while, that)."),
    ("SYM", "Symbol", "Word-like entity that differs from ordinary words by form, function, or both."),
    ("VERB", "Verb", "Word that signals events and actions."),
    ("X", "Other", "Word that cannot be assigned a real POS for some reason."),
]

# UD v2 universal dependency relations (37).
UD_V2_REL = [
    ("nsubj", "Nominal subject"),
    ("obj", "Object"),
    ("iobj", "Indirect object"),
    ("csubj", "Clausal subject"),
    ("ccomp", "Clausal complement"),
    ("xcomp", "Open clausal complement"),
    ("obl", "Oblique nominal"),
    ("vocative", "Vocative"),
    ("expl", "Expletive"),
    ("dislocated", "Dislocated element"),
    ("advcl", "Adverbial clause modifier"),
    ("advmod", "Adverbial modifier"),
    ("discourse", "Discourse element"),
    ("aux", "Auxiliary"),
    ("cop", "Copula"),
    ("mark", "Marker"),
    ("nmod", "Nominal modifier"),
    ("appos", "Appositional modifier"),
    ("nummod", "Numeric modifier"),
    ("acl", "Clausal modifier of noun"),
    ("amod", "Adjectival modifier"),
    ("det", "Determiner"),
    ("clf", "Classifier"),
    ("case", "Case marking"),
    ("conj", "Conjunct"),
    ("cc", "Coordinating conjunction"),
    ("fixed", "Fixed multi-word expression"),
    ("flat", "Flat multi-word expression"),
    ("compound", "Compound"),
    ("list", "List"),
    ("parataxis", "Parataxis"),
    ("orphan", "Orphan"),
    ("goeswith", "Goes-with (split-word)"),
    ("reparandum", "Overridden disfluency"),
    ("punct", "Punctuation"),
    ("root", "Root"),
    ("dep", "Unspecified dependency"),
]

ONTOLOGY_RECORDS = {
    "ud-pos-v1": {
        "name": "Universal Dependencies POS v1",
        "description": "Sixteen-tag universal POS inventory from the UD v1 release (Nivre et al. 2016). Notably collapses coordinating and subordinating conjunctions under a single CONJ tag.",
        "domain": "general",
    },
    "ud-pos-v2": {
        "name": "Universal Dependencies POS v2",
        "description": "Seventeen-tag universal POS inventory from the UD v2 release (Nivre et al. 2020). v2 splits v1's CONJ into CCONJ (coordinating) and SCONJ (subordinating).",
        "domain": "general",
    },
    "ud-rel-v2": {
        "name": "Universal Dependencies syntactic relations v2",
        "description": "Thirty-seven universal dependency relations from UD v2. Cross-language; language-specific subtypes (nsubj:pass, obl:agent, etc.) are documented in the language-specific UD treebanks rather than this universal inventory.",
        "domain": "general",
    },
}


def write_ontology(rkey, body):
    """Emit one ontology record YAML."""
    path = HERE / f"{rkey}.ontology.yaml"
    doc = {
        "collection": "pub.layers.ontology.ontology",
        "record": {"$type": "pub.layers.ontology.ontology", **body, "createdAt": "2026-05-06T00:00:00Z"},
        "changelog": {"summary": f"Initial publish: {body['name']}"},
    }
    path.write_text(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))


def write_typedef(rkey, ontology_uri, body):
    """Emit one typeDef YAML."""
    path = HERE / f"{rkey}.typedef.yaml"
    doc = {
        "collection": "pub.layers.ontology.typeDef",
        "record": {
            "$type": "pub.layers.ontology.typeDef",
            "ontologyRef": ontology_uri,
            **body,
            "createdAt": "2026-05-06T00:00:00Z",
        },
        "changelog": {"summary": f"Initial publish: {body['name']}"},
    }
    path.write_text(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))


def main():
    HANDLE = "ud.ontology.layers.pub"
    NS = "pub.layers.ontology.ontology"

    for ont_rkey, ont_body in ONTOLOGY_RECORDS.items():
        write_ontology(ont_rkey, ont_body)

    # POS v1 typeDefs.
    v1_uri = f"at://{HANDLE}/{NS}/ud-pos-v1"
    for code, name, desc in UD_V1_POS:
        write_typedef(
            f"ud-pos-v1-{code.lower()}",
            v1_uri,
            {"name": name, "typeKind": "attribute-type", "description": f"UD v1 POS: {code}. {desc}"},
        )

    # POS v2 typeDefs.
    v2_uri = f"at://{HANDLE}/{NS}/ud-pos-v2"
    for code, name, desc in UD_V2_POS:
        write_typedef(
            f"ud-pos-v2-{code.lower()}",
            v2_uri,
            {"name": name, "typeKind": "attribute-type", "description": f"UD v2 POS: {code}. {desc}"},
        )

    # Relation v2 typeDefs.
    rel_uri = f"at://{HANDLE}/{NS}/ud-rel-v2"
    for code, name in UD_V2_REL:
        write_typedef(
            f"ud-rel-v2-{code.replace(':', '-')}",
            rel_uri,
            {"name": name, "typeKind": "relation-type", "description": f"UD v2 syntactic relation: {code}. {name}."},
        )

    print(f"wrote {len(ONTOLOGY_RECORDS)} ontologies + {len(UD_V1_POS) + len(UD_V2_POS) + len(UD_V2_REL)} typeDefs")


if __name__ == "__main__":
    main()
