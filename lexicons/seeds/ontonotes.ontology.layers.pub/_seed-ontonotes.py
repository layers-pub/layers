#!/usr/bin/env python3
"""Author OntoNotes 5.0 NER ontology + 18 entity-type typeDefs."""

import pathlib
import yaml

HERE = pathlib.Path(__file__).parent

# OntoNotes 5.0 named-entity types (Pradhan et al. 2013; LDC2013T19).
# Definitions taken from the OntoNotes 5.0 annotation guidelines.
ONTONOTES_NER = [
    ("PERSON", "Person", "People, including fictional."),
    ("NORP", "Nationality / religious / political group", "Nationalities, religious or political groups (e.g. Catholic, Republican)."),
    ("FAC", "Facility", "Buildings, airports, highways, bridges, etc."),
    ("ORG", "Organization", "Companies, agencies, institutions, sports teams."),
    ("GPE", "Geo-political entity", "Countries, cities, states, including the people associated with them as a polity."),
    ("LOC", "Location", "Non-GPE locations: mountain ranges, bodies of water, etc."),
    ("PRODUCT", "Product", "Vehicles, weapons, foods, etc. (not services)."),
    ("EVENT", "Event", "Named hurricanes, battles, wars, sports events."),
    ("WORK_OF_ART", "Work of art", "Titles of books, songs, films, etc."),
    ("LAW", "Law", "Named documents made into laws."),
    ("LANGUAGE", "Language", "Any named natural or constructed language."),
    ("DATE", "Date", "Absolute or relative dates or periods."),
    ("TIME", "Time", "Times smaller than a day."),
    ("PERCENT", "Percent", "Percentage, including %."),
    ("MONEY", "Money", "Monetary values, including unit."),
    ("QUANTITY", "Quantity", "Measurements, as of weight or distance."),
    ("ORDINAL", "Ordinal", "First, second, third, etc."),
    ("CARDINAL", "Cardinal", "Numerals not falling under another type."),
]

HANDLE = "ontonotes.ontology.layers.pub"
NS = "pub.layers.ontology.ontology"
ONTOLOGY_RKEY = "ontonotes-ner"

ontology_uri = f"at://{HANDLE}/{NS}/{ONTOLOGY_RKEY}"

ontology_doc = {
    "collection": "pub.layers.ontology.ontology",
    "record": {
        "$type": "pub.layers.ontology.ontology",
        "name": "OntoNotes 5.0 named-entity types",
        "description": (
            "Eighteen-class named-entity inventory from OntoNotes 5.0 (Pradhan et al. 2013; LDC2013T19). "
            "Field-default for English NER systems trained on multi-genre newswire-plus-broadcast data. "
            "Often paired with a coarser CoNLL-2003 four-class projection for comparability across systems."
        ),
        "domain": "news",
        "createdAt": "2026-05-06T00:00:00Z",
    },
    "changelog": {"summary": "Initial publish: OntoNotes 5.0 NER ontology"},
}
(HERE / f"{ONTOLOGY_RKEY}.ontology.yaml").write_text(yaml.safe_dump(ontology_doc, sort_keys=False, allow_unicode=True))

for code, name, desc in ONTONOTES_NER:
    doc = {
        "collection": "pub.layers.ontology.typeDef",
        "record": {
            "$type": "pub.layers.ontology.typeDef",
            "ontologyRef": ontology_uri,
            "name": name,
            "typeKind": "entity-type",
            "description": f"{code}: {desc}",
            "createdAt": "2026-05-06T00:00:00Z",
        },
        "changelog": {"summary": f"Initial publish: OntoNotes {code}"},
    }
    rkey = f"ontonotes-{code.lower().replace('_', '-')}"
    (HERE / f"{rkey}.typedef.yaml").write_text(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))

print(f"wrote 1 ontology + {len(ONTONOTES_NER)} typeDefs")
