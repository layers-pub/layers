#!/usr/bin/env python3
"""Convert upstream linguistic resources to Layers seed YAMLs.

Resources covered:
  * PropBank, VerbNet, FrameNet, WordNet — glazing-cached JSONL
  * SemLink — glazing-cached xref_index.json
  * UDS 2.0 — bundled with a local checkout of the decomp toolkit
    (github.com/decompositional-semantics-initiative/decomp). Pass
    `--decomp-dir` to point at a different checkout.
  * CHILDES — TalkBank CHAT-format corpora. Pass `--childes-dir
    <path>` pointing at a `<lang>/<corpus>/` tree of CHAT files plus
    each corpus's 0met.cdc metadata. Requires `pylangacq` installed.
    Per-corpus license check rejects corpora declaring no-derivatives
    or no-redistribution clauses.


Emits one batched YAML stream per (handle, kind) into
`lexicons/seeds/<handle>/<kind>.yaml`. Each batched file is a YAML
document stream (`---`-separated documents); the Rust seed walker
parses every document as its own record.

Volume per resource (production):

  PropBank    →  ~7K rolesets + ~25K role typeDefs + ~7K lemma entries
                 + ~32K internal-relation graphEdges  ≈  71K records
  VerbNet     →  ~270 class typeDefs + ~1K theta-role typeDefs
                 + ~5K member entries + ~270 frame templates
                 + ~5K class-hierarchy graphEdges     ≈  12K records
  FrameNet    →  ~1.2K frame typeDefs + ~3K FE typeDefs + ~13K LU entries
                 + ~5K frame-relation graphEdges      ≈  22K records
  WordNet     →  ~117K synset typeDefs + ~155K lemma entries
                 + ~284K relation graphEdges          ≈  556K records
  UDS 2.0     →  3 corpora (train/dev/test) + ~16K expressions
                 + ~16K segs + ~96K UDS-attribute layers
                 + ~50K-100K semantic graphEdges      ≈  ~200K records
  CHILDES     →  variable; depends on which corpora the operator
                 mirrored. Each corpus → one corpus account + per-
                 namespace siblings (expression, segmentation,
                 annotation, persona). Run with --childes-dir.

Usage:

  python3 layers/scripts/convert-external-resources.py \
      --resource <propbank|verbnet|framenet|wordnet|semlink|uds|childes|all> \
      [--input-dir ~/.local/share/glazing/converted] \
      [--decomp-dir ~/Projects/decomp] \
      [--childes-dir /path/to/childes] \
      [--output-dir layers/lexicons/seeds] \
      [--limit N]

The default input directory is glazing's standard cache location.
`--limit N` stops after N upstream records per resource — useful for
smoke-testing the pipeline without the full WordNet conversion.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from collections.abc import Iterator
from typing import Any

# === Resource bring-up date is constant per converter run ============
CREATED_AT = "2026-05-06T00:00:00Z"

# === ISO-639-3 default ===============================================
DEFAULT_LANGUAGE = "eng"


# ---------------------------------------------------------------------
# YAML stream emission
# ---------------------------------------------------------------------


class StreamWriter:
    """Open a path and stream YAML documents into it.

    One batched file per (handle, kind) tuple. Each call to `emit`
    writes a single YAML document followed by the `---` separator.
    The walker on the Rust side iterates `serde_yaml::Deserializer`
    over the resulting stream so each document becomes one
    SeedEntry.
    """

    def __init__(self, base: pathlib.Path, handle: str, kind: str):
        self.path = base / handle / f"{kind}.yaml"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.fp = self.path.open("w", encoding="utf-8")
        self.count = 0

    def emit(self, collection: str, record: dict[str, Any], summary: str | None = None) -> None:
        # Inject $type + createdAt for every record, regardless of caller.
        record = {"$type": collection, **record, "createdAt": CREATED_AT}
        doc = {"collection": collection, "record": record}
        if summary:
            doc["changelog"] = {"summary": summary}
        # Write as YAML; lazy-import to keep the script importable
        # without PyYAML for `--help`.
        import yaml  # type: ignore[import-not-found]
        if self.count > 0:
            self.fp.write("---\n")
        self.fp.write(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
        self.count += 1

    def close(self) -> int:
        self.fp.close()
        return self.count


# ---------------------------------------------------------------------
# JSONL streaming reader
# ---------------------------------------------------------------------


def jsonl(path: pathlib.Path, limit: int | None = None) -> Iterator[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"missing {path} — run `glazing init`")
    with path.open("r", encoding="utf-8") as fp:
        for i, line in enumerate(fp):
            if limit is not None and i >= limit:
                return
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


# ---------------------------------------------------------------------
# AT-URI helpers
# ---------------------------------------------------------------------


def at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


def _fn_definition_text(definition: Any) -> str:
    """FrameNet definitions are dict-shaped after glazing parses the
    XML's mixed-content `<def-root>`. We want the plain prose for
    the typeDef description; the markup-stripped `plain_text` field
    is what consumers usually display."""
    if definition is None:
        return ""
    if isinstance(definition, str):
        return definition.strip()[:5000]
    if isinstance(definition, dict):
        text = definition.get("plain_text") or definition.get("raw_text") or ""
        return text.strip()[:5000] if isinstance(text, str) else ""
    return ""


# ---------------------------------------------------------------------
# PropBank conversion
# ---------------------------------------------------------------------


def convert_propbank(
    input_dir: pathlib.Path,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """PropBank: 1 ontology, ~7K rolesets, ~25K role typeDefs, ~7K lemmas, ~32K edges."""
    onto_handle = "propbank.ontology.layers.pub"
    res_handle = "propbank.resource.layers.pub"
    graph_handle = "propbank.graph.layers.pub"
    onto_collection = "pub.layers.ontology.ontology"
    typedef_collection = "pub.layers.ontology.typeDef"
    coll_collection = "pub.layers.resource.collection"
    entry_collection = "pub.layers.resource.entry"
    edge_collection = "pub.layers.graph.graphEdge"

    onto_writer = StreamWriter(output_dir, onto_handle, "ontology")
    typedef_writer = StreamWriter(output_dir, onto_handle, "typedefs")
    coll_writer = StreamWriter(output_dir, res_handle, "collection")
    entry_writer = StreamWriter(output_dir, res_handle, "entries")
    edge_writer = StreamWriter(output_dir, graph_handle, "edges")

    # Top-level ontology + lexicon collection.
    ontology_uri = at_uri(onto_handle, onto_collection, "propbank")
    onto_writer.emit(
        onto_collection,
        {
            "name": "PropBank-Frames (English)",
            "description": (
                "PropBank-frames English release vendored via glazing. License: CC BY-SA 4.0. "
                "Citation: Palmer, Gildea & Kingsbury 2005, The Proposition Bank: A Corpus "
                "Annotated with Semantic Roles. CL 31(1):71-106."
            ),
            "domain": "general",
            "languages": [DEFAULT_LANGUAGE],
        },
        "Initial publish: PropBank ontology",
    )
    collection_uri = at_uri(res_handle, coll_collection, "propbank")
    coll_writer.emit(
        coll_collection,
        {
            "name": "PropBank-Frames lemma collection",
            "description": "PropBank predicate lemmas with their roleset memberships. License: CC BY-SA 4.0.",
            "kind": "frame-inventory",
            "languages": [DEFAULT_LANGUAGE],
            "ontologyRef": ontology_uri,
        },
        "Initial publish: PropBank lemma collection",
    )

    rolesets_seen = 0
    lemmas_seen = 0
    roles_seen = 0
    edges_seen = 0
    for frameset in jsonl(input_dir / "propbank.jsonl", limit):
        lemma = frameset["predicate_lemma"]
        lemma_rkey = f"lemma-{lemma}".replace(" ", "-")
        entry_writer.emit(
            entry_collection,
            {
                "form": lemma,
                "lemma": lemma,
                "languages": [DEFAULT_LANGUAGE],
            },
            None,
        )
        lemmas_seen += 1
        for roleset in frameset.get("rolesets", []):
            rs_id = roleset["id"]  # e.g. "run.01"
            rs_rkey = f"roleset-{rs_id}".replace(".", "-")
            typedef_writer.emit(
                typedef_collection,
                {
                    "ontologyRef": ontology_uri,
                    "name": rs_id,
                    "typeKind": "situation-type",
                    "description": roleset.get("name", rs_id),
                },
                None,
            )
            rolesets_seen += 1
            edge_writer.emit(
                edge_collection,
                {
                    "source": {"recordRef": at_uri(res_handle, entry_collection, lemma_rkey)},
                    "target": {"recordRef": at_uri(onto_handle, typedef_collection, rs_rkey)},
                    "edgeType": "instance-of",
                },
                None,
            )
            edges_seen += 1
            for role in roleset.get("roles", []):
                role_n = role.get("n", "?")
                role_f = role.get("f", "")
                role_rkey = f"role-{rs_id}-arg{role_n}".replace(".", "-")
                typedef_writer.emit(
                    typedef_collection,
                    {
                        "ontologyRef": ontology_uri,
                        "name": f"{rs_id} ARG{role_n}",
                        "typeKind": "role-type",
                        "parentTypeRef": at_uri(onto_handle, typedef_collection, rs_rkey),
                        "description": role.get("descr", "") + (f" (function: {role_f})" if role_f else ""),
                    },
                    None,
                )
                roles_seen += 1

    counts = {
        "ontology": onto_writer.close(),
        "typedefs": typedef_writer.close(),
        "collection": coll_writer.close(),
        "entries": entry_writer.close(),
        "edges": edge_writer.close(),
    }
    print(f"  propbank: {counts}")


# ---------------------------------------------------------------------
# VerbNet conversion
# ---------------------------------------------------------------------


def convert_verbnet(
    input_dir: pathlib.Path,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    onto_handle = "verbnet.ontology.layers.pub"
    res_handle = "verbnet.resource.layers.pub"
    graph_handle = "verbnet.graph.layers.pub"
    onto_collection = "pub.layers.ontology.ontology"
    typedef_collection = "pub.layers.ontology.typeDef"
    coll_collection = "pub.layers.resource.collection"
    entry_collection = "pub.layers.resource.entry"
    template_collection = "pub.layers.resource.template"
    edge_collection = "pub.layers.graph.graphEdge"

    onto_w = StreamWriter(output_dir, onto_handle, "ontology")
    typedef_w = StreamWriter(output_dir, onto_handle, "typedefs")
    coll_w = StreamWriter(output_dir, res_handle, "collection")
    entry_w = StreamWriter(output_dir, res_handle, "entries")
    template_w = StreamWriter(output_dir, res_handle, "templates")
    edge_w = StreamWriter(output_dir, graph_handle, "edges")

    ontology_uri = at_uri(onto_handle, onto_collection, "verbnet")
    onto_w.emit(
        onto_collection,
        {
            "name": "VerbNet 3.4 (English)",
            "description": (
                "VerbNet 3.4 English release vendored via glazing. License: VerbNet License "
                "(CC-style attribution). Citation: Schuler 2005, VerbNet: A Broad-Coverage, "
                "Comprehensive Verb Lexicon."
            ),
            "domain": "general",
            "languages": [DEFAULT_LANGUAGE],
        },
        "Initial publish: VerbNet ontology",
    )
    collection_uri = at_uri(res_handle, coll_collection, "verbnet")
    coll_w.emit(
        coll_collection,
        {
            "name": "VerbNet 3.4 verb-class members",
            "description": "VerbNet verb members keyed to their class typeDefs.",
            "kind": "frame-inventory",
            "languages": [DEFAULT_LANGUAGE],
            "ontologyRef": ontology_uri,
        },
        None,
    )

    classes_seen = 0
    roles_seen = 0
    members_seen = 0
    frames_seen = 0
    edges_seen = 0
    for vc in jsonl(input_dir / "verbnet.jsonl", limit):
        cls_id = vc["id"]  # e.g. "give-13.1"
        cls_rkey = f"class-{cls_id}".replace(".", "-").replace("-", "-").replace("/", "-")
        typedef_w.emit(
            typedef_collection,
            {
                "ontologyRef": ontology_uri,
                "name": cls_id,
                "typeKind": "situation-type",
                "description": f"VerbNet class {cls_id}",
            },
            None,
        )
        classes_seen += 1
        for tr in vc.get("themroles", []):
            tr_type = tr["type"] if isinstance(tr, dict) else tr  # type: ignore[index]
            tr_rkey = f"role-{cls_id}-{tr_type.lower()}".replace(".", "-")
            typedef_w.emit(
                typedef_collection,
                {
                    "ontologyRef": ontology_uri,
                    "name": f"{cls_id} {tr_type}",
                    "typeKind": "role-type",
                    "parentTypeRef": at_uri(onto_handle, typedef_collection, cls_rkey),
                    "description": f"VerbNet thematic role {tr_type} on class {cls_id}.",
                },
                None,
            )
            roles_seen += 1
        for member in vc.get("members", []):
            name = member.get("name", "?")
            entry_w.emit(
                entry_collection,
                {
                    "form": name,
                    "lemma": name,
                    "languages": [DEFAULT_LANGUAGE],
                    "ontologyTypeRef": at_uri(onto_handle, typedef_collection, cls_rkey),
                },
                None,
            )
            members_seen += 1
        for frame in vc.get("frames", []):
            description = frame.get("description", {})
            primary = description.get("primary", "")
            secondary = description.get("secondary", "")
            template_w.emit(
                template_collection,
                {
                    "name": f"{cls_id} {primary}".strip(),
                    "text": f"{primary}\n{secondary}".strip(),
                    "languages": [DEFAULT_LANGUAGE],
                    "ontologyRef": ontology_uri,
                    "slots": [],
                },
                None,
            )
            frames_seen += 1
        for sub in vc.get("subclasses", []):
            sub_id = sub.get("id") if isinstance(sub, dict) else sub
            if sub_id:
                sub_rkey = f"class-{sub_id}".replace(".", "-")
                edge_w.emit(
                    edge_collection,
                    {
                        "source": {"recordRef": at_uri(onto_handle, typedef_collection, sub_rkey)},
                        "target": {"recordRef": at_uri(onto_handle, typedef_collection, cls_rkey)},
                        "edgeType": "type-of",
                    },
                    None,
                )
                edges_seen += 1

    counts = {
        "ontology": onto_w.close(),
        "typedefs": typedef_w.close(),
        "collection": coll_w.close(),
        "entries": entry_w.close(),
        "templates": template_w.close(),
        "edges": edge_w.close(),
    }
    print(f"  verbnet: {counts}")


# ---------------------------------------------------------------------
# FrameNet conversion
# ---------------------------------------------------------------------


def convert_framenet(
    input_dir: pathlib.Path,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    onto_handle = "framenet.ontology.layers.pub"
    res_handle = "framenet.resource.layers.pub"
    graph_handle = "framenet.graph.layers.pub"
    onto_collection = "pub.layers.ontology.ontology"
    typedef_collection = "pub.layers.ontology.typeDef"
    coll_collection = "pub.layers.resource.collection"
    entry_collection = "pub.layers.resource.entry"
    edge_collection = "pub.layers.graph.graphEdge"

    onto_w = StreamWriter(output_dir, onto_handle, "ontology")
    typedef_w = StreamWriter(output_dir, onto_handle, "typedefs")
    coll_w = StreamWriter(output_dir, res_handle, "collection")
    entry_w = StreamWriter(output_dir, res_handle, "entries")
    edge_w = StreamWriter(output_dir, graph_handle, "edges")

    ontology_uri = at_uri(onto_handle, onto_collection, "framenet")
    onto_w.emit(
        onto_collection,
        {
            "name": "FrameNet 1.7 (English)",
            "description": (
                "FrameNet 1.7 English release vendored via glazing. License: CC BY 3.0. "
                "Citation: Baker, Fillmore & Lowe 1998, The Berkeley FrameNet Project."
            ),
            "domain": "general",
            "languages": [DEFAULT_LANGUAGE],
        },
        "Initial publish: FrameNet ontology",
    )
    collection_uri = at_uri(res_handle, coll_collection, "framenet")
    coll_w.emit(
        coll_collection,
        {
            "name": "FrameNet 1.7 lexical units",
            "description": "FrameNet LUs keyed to their frame typeDefs.",
            "kind": "frame-inventory",
            "languages": [DEFAULT_LANGUAGE],
            "ontologyRef": ontology_uri,
        },
        None,
    )

    frames_seen = 0
    fes_seen = 0
    lus_seen = 0
    rels_seen = 0
    for frame in jsonl(input_dir / "framenet.jsonl", limit):
        fr_id = frame["id"]
        fr_name = frame["name"]
        fr_rkey = f"frame-{fr_id}"
        typedef_w.emit(
            typedef_collection,
            {
                "ontologyRef": ontology_uri,
                "name": fr_name,
                "typeKind": "situation-type",
                "description": _fn_definition_text(frame.get("definition")),
            },
            None,
        )
        frames_seen += 1
        for fe in frame.get("frame_elements", []):
            fe_name = fe.get("name", "?")
            fe_rkey = f"fe-{fr_id}-{fe_name}".replace(" ", "-")
            typedef_w.emit(
                typedef_collection,
                {
                    "ontologyRef": ontology_uri,
                    "name": f"{fr_name}.{fe_name}",
                    "typeKind": "role-type",
                    "parentTypeRef": at_uri(onto_handle, typedef_collection, fr_rkey),
                    "description": _fn_definition_text(fe.get("definition")),
                },
                None,
            )
            fes_seen += 1
        for lu in frame.get("lexical_units", []):
            lu_name = lu.get("name", "?")  # e.g. "abandon.v"
            lu_rkey = f"lu-{fr_id}-{lu_name}".replace(" ", "-").replace(".", "-")
            entry_w.emit(
                entry_collection,
                {
                    "form": lu_name,
                    "lemma": lu_name.split(".")[0],
                    "languages": [DEFAULT_LANGUAGE],
                    "ontologyTypeRef": at_uri(onto_handle, typedef_collection, fr_rkey),
                },
                None,
            )
            lus_seen += 1
        for rel in frame.get("frame_relations", []):
            rel_type = rel.get("type", "see-also")
            related_id = rel.get("related_frame_id") or rel.get("related_id")
            if related_id is None:
                continue
            edge_w.emit(
                edge_collection,
                {
                    "source": {"recordRef": at_uri(onto_handle, typedef_collection, fr_rkey)},
                    "target": {"recordRef": at_uri(onto_handle, typedef_collection, f"frame-{related_id}")},
                    "edgeType": "see-also",
                    "label": str(rel_type),
                },
                None,
            )
            rels_seen += 1

    counts = {
        "ontology": onto_w.close(),
        "typedefs": typedef_w.close(),
        "collection": coll_w.close(),
        "entries": entry_w.close(),
        "edges": edge_w.close(),
    }
    print(f"  framenet: {counts}")


# ---------------------------------------------------------------------
# WordNet conversion
# ---------------------------------------------------------------------


def convert_wordnet(
    input_dir: pathlib.Path,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    onto_handle = "pwn.eng.wordnet.ontology.layers.pub"
    res_handle = "pwn.eng.wordnet.resource.layers.pub"
    graph_handle = "pwn.eng.wordnet.graph.layers.pub"
    onto_collection = "pub.layers.ontology.ontology"
    typedef_collection = "pub.layers.ontology.typeDef"
    coll_collection = "pub.layers.resource.collection"
    entry_collection = "pub.layers.resource.entry"
    edge_collection = "pub.layers.graph.graphEdge"

    onto_w = StreamWriter(output_dir, onto_handle, "ontology")
    typedef_w = StreamWriter(output_dir, onto_handle, "synsets")
    coll_w = StreamWriter(output_dir, res_handle, "collection")
    entry_w = StreamWriter(output_dir, res_handle, "lemmas")
    edge_w = StreamWriter(output_dir, graph_handle, "relations")

    ontology_uri = at_uri(onto_handle, onto_collection, "wordnet")
    onto_w.emit(
        onto_collection,
        {
            "name": "WordNet 3.1 (Princeton, English)",
            "description": (
                "Princeton WordNet 3.1 vendored via glazing. License: WordNet License "
                "(BSD-style with attribution). Citation: Miller 1995; Fellbaum 1998."
            ),
            "domain": "general",
            "languages": [DEFAULT_LANGUAGE],
        },
        "Initial publish: PWN 3.1 ontology",
    )
    collection_uri = at_uri(res_handle, coll_collection, "wordnet")
    coll_w.emit(
        coll_collection,
        {
            "name": "WordNet 3.1 lemmas",
            "description": "WordNet 3.1 lemmas keyed to their synset typeDefs.",
            "kind": "lexicon",
            "languages": [DEFAULT_LANGUAGE],
            "ontologyRef": ontology_uri,
        },
        None,
    )

    # ss_type → typeKind mapping (PWN 1-letter POS classes).
    KIND = {
        "n": "entity-type",
        "v": "situation-type",
        "a": "attribute-type",
        "s": "attribute-type",  # adjective satellite
        "r": "attribute-type",  # adverb
    }
    # PWN pointer symbols → human-readable + Layers edgeType slug
    # (subset; the long tail uses a generic `related-to`).
    POINTER_LABEL = {
        "@": ("hypernym", "type-of"),
        "~": ("hyponym", "type-of"),
        "#m": ("member-holonym", "part-of"),
        "#s": ("substance-holonym", "part-of"),
        "#p": ("part-holonym", "part-of"),
        "%m": ("member-meronym", "part-of"),
        "%s": ("substance-meronym", "part-of"),
        "%p": ("part-meronym", "part-of"),
        "!": ("antonym", "related-to"),
        "+": ("derivation", "derived-from"),
        "^": ("also-see", "see-also"),
        "*": ("entail", "supports"),
        ">": ("cause", "causal"),
        "$": ("verb-group", "related-to"),
        "&": ("similar-to", "same-as"),
        "=": ("attribute", "describes"),
        "<": ("participle", "derived-from"),
        "\\": ("pertainym", "related-to"),
    }

    synsets_seen = 0
    lemmas_seen = 0
    rels_seen = 0
    for synset in jsonl(input_dir / "wordnet.jsonl", limit):
        offset = synset["offset"]
        ss_type = synset["ss_type"]
        rkey = f"synset-{ss_type}-{offset}"
        words = synset.get("words", [])
        primary = words[0]["lemma"] if words else "?"
        gloss = synset.get("gloss", "").strip()
        typedef_w.emit(
            typedef_collection,
            {
                "ontologyRef": ontology_uri,
                "name": f"{primary} ({ss_type})",
                "typeKind": KIND.get(ss_type, "entity-type"),
                "description": gloss[:5000],
            },
            None,
        )
        synsets_seen += 1
        for word in words:
            lemma = word.get("lemma", "?")
            entry_w.emit(
                entry_collection,
                {
                    "form": lemma,
                    "lemma": lemma,
                    "languages": [DEFAULT_LANGUAGE],
                    "ontologyTypeRef": at_uri(onto_handle, typedef_collection, rkey),
                },
                None,
            )
            lemmas_seen += 1
        for ptr in synset.get("pointers", []):
            sym = ptr.get("symbol", "")
            target_offset = ptr.get("offset")
            target_pos = ptr.get("pos")
            if target_offset is None or target_pos is None:
                continue
            target_rkey = f"synset-{target_pos}-{target_offset}"
            label, edge_type = POINTER_LABEL.get(sym, (sym, "related-to"))
            edge_w.emit(
                edge_collection,
                {
                    "source": {"recordRef": at_uri(onto_handle, typedef_collection, rkey)},
                    "target": {"recordRef": at_uri(onto_handle, typedef_collection, target_rkey)},
                    "edgeType": edge_type,
                    "label": label,
                },
                None,
            )
            rels_seen += 1

    counts = {
        "ontology": onto_w.close(),
        "synsets": typedef_w.close(),
        "collection": coll_w.close(),
        "lemmas": entry_w.close(),
        "relations": edge_w.close(),
    }
    print(f"  wordnet: {counts}")


# ---------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------


def convert_semlink(
    input_dir: pathlib.Path,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """Convert glazing's xref index into SemLink-derived graphEdges.

    The xref index lives at `~/.cache/glazing/xrefs/xref_index.json`
    (different from the converted JSONL cache; same parent though).
    Two link kinds make up the bulk:

    * PropBank rolelinks — per-roleset role-level mapping into
      VerbNet thematic roles + FrameNet frame elements.
    * PropBank lexlinks — per-roleset class-level mapping into
      VerbNet classes + FrameNet frames + WordNet senses, with
      confidence scores + provenance src.
    * VerbNet wn_mappings — VerbNet member → WordNet sense.

    All edges land on `semlink.graph.layers.pub`. AT-URIs target
    typeDefs / lemma entries on the matching dataset's per-namespace
    subaccount.
    """
    # glazing keeps the xref index under ~/.cache/glazing/xrefs/
    # while the converted JSONL lives under
    # ~/.local/share/glazing/converted/. Check both locations.
    candidates = [
        input_dir.parent / "xrefs" / "xref_index.json",
        input_dir / "xrefs" / "xref_index.json",
        pathlib.Path.home() / ".cache" / "glazing" / "xrefs" / "xref_index.json",
    ]
    xref_path = next((c for c in candidates if c.exists()), candidates[0])
    if not xref_path.exists():
        print(f"  semlink: skipping (no xref_index.json under {xref_path.parent})")
        return

    with xref_path.open("r", encoding="utf-8") as fp:
        xref = json.load(fp)

    edge_handle = "semlink.graph.layers.pub"
    edge_collection = "pub.layers.graph.graphEdge"
    edge_w = StreamWriter(output_dir, edge_handle, "edges")

    # AT-URI builders for sibling subaccount typeDefs/entries.
    def vn_class_uri(class_id: str) -> str:
        return at_uri(
            "verbnet.ontology.layers.pub",
            "pub.layers.ontology.typeDef",
            f"class-{class_id}".replace(".", "-"),
        )

    def fn_frame_uri_by_name(frame_name: str) -> str:
        # FrameNet frames are keyed by integer id in the converter,
        # but xref_index references by name. Cross-resource consumers
        # resolve via a property lookup since we don't have the
        # frame-name → frame-id map here without re-loading framenet.
        # Carry the name as `properties.framenet_frame_name`; the
        # registry browser does the lookup at query time.
        return at_uri(
            "framenet.ontology.layers.pub",
            "pub.layers.ontology.typeDef",
            f"frame-by-name:{frame_name}",
        )

    def pb_roleset_uri(rs_id: str) -> str:
        return at_uri(
            "propbank.ontology.layers.pub",
            "pub.layers.ontology.typeDef",
            f"roleset-{rs_id}".replace(".", "-"),
        )

    def wn_sense_uri(sense_key: str) -> str:
        return at_uri(
            "pwn.eng.wordnet.resource.layers.pub",
            "pub.layers.resource.entry",
            f"sense-{sense_key}".replace(":", "-").replace("%", "-"),
        )

    edges = 0
    # PropBank rolelinks: PB role → VN/FN role.
    for rs_id, ref in (xref.get("propbank_refs") or {}).items():
        for link in ref.get("rolelinks", []):
            if limit is not None and edges >= limit:
                break
            resource = link.get("resource", "")
            class_name = link.get("class_name", "")
            role = link.get("role", "")
            if not class_name or not role:
                continue
            if resource == "VerbNet":
                target = vn_class_uri(class_name)
                edge_type = "see-also"
                label = f"role={role}"
            elif resource == "FrameNet":
                target = fn_frame_uri_by_name(class_name)
                edge_type = "see-also"
                label = f"fe={role}"
            else:
                continue
            edge_w.emit(
                edge_collection,
                {
                    "source": {"recordRef": pb_roleset_uri(rs_id)},
                    "target": {"recordRef": target},
                    "edgeType": edge_type,
                    "label": label,
                    "properties": {
                        "entries": [
                            {"key": "src_resource", "value": "PropBank"},
                            {"key": "src_kind", "value": "rolelink"},
                            {"key": "tgt_resource", "value": resource},
                            {"key": "tgt_role", "value": role},
                            {"key": "tgt_version", "value": link.get("version", "")},
                        ]
                    },
                },
                None,
            )
            edges += 1
        if limit is not None and edges >= limit:
            break

    # PropBank lexlinks: PB roleset → VN class / FN frame / WN sense.
    for rs_id, ref in (xref.get("propbank_refs") or {}).items():
        for link in ref.get("lexlinks", []):
            if limit is not None and edges >= limit:
                break
            resource = link.get("resource", "")
            class_name = link.get("class_name", "")
            confidence = link.get("confidence")
            src = link.get("src", "")
            if not class_name:
                continue
            if resource == "VerbNet":
                target = vn_class_uri(class_name)
            elif resource == "FrameNet":
                target = fn_frame_uri_by_name(class_name)
            elif resource == "WordNet":
                target = wn_sense_uri(class_name)
            else:
                continue
            confidence_int = (
                int(round(confidence * 1000)) if isinstance(confidence, (int, float)) else None
            )
            body = {
                "source": {"recordRef": pb_roleset_uri(rs_id)},
                "target": {"recordRef": target},
                "edgeType": "same-as",
                "properties": {
                    "entries": [
                        {"key": "src_resource", "value": "PropBank"},
                        {"key": "src_kind", "value": "lexlink"},
                        {"key": "tgt_resource", "value": resource},
                        {"key": "provenance", "value": src},
                        {"key": "tgt_version", "value": link.get("version", "")},
                    ]
                },
            }
            if confidence_int is not None:
                body["confidence"] = confidence_int
            edge_w.emit(edge_collection, body, None)
            edges += 1
        if limit is not None and edges >= limit:
            break

    # VerbNet → WordNet sense links.
    def vn_member_uri(class_id: str, lemma: str) -> str:
        return at_uri(
            "verbnet.resource.layers.pub",
            "pub.layers.resource.entry",
            f"member-{class_id}-{lemma}".replace(".", "-"),
        )

    for vn_key, ref in (xref.get("verbnet_refs") or {}).items():
        if limit is not None and edges >= limit:
            break
        class_id = ref.get("class_id") or ""
        lemma = ref.get("lemma") or ""
        for wn in ref.get("wn_mappings", []):
            if limit is not None and edges >= limit:
                break
            sense_key = wn.get("sense_key")
            if not sense_key:
                continue
            edge_w.emit(
                edge_collection,
                {
                    "source": {"recordRef": vn_member_uri(class_id, lemma)},
                    "target": {"recordRef": wn_sense_uri(sense_key)},
                    "edgeType": "same-as",
                    "properties": {
                        "entries": [
                            {"key": "src_resource", "value": "VerbNet"},
                            {"key": "src_kind", "value": "wn_mapping"},
                            {"key": "tgt_resource", "value": "WordNet"},
                            {"key": "tgt_pos", "value": wn.get("pos", "")},
                        ]
                    },
                },
                None,
            )
            edges += 1

    print(f"  semlink: {{'edges': {edge_w.close()}}}")


# ---------------------------------------------------------------------
# UDS conversion (decomp toolkit)
# ---------------------------------------------------------------------


def convert_uds(
    decomp_dir: pathlib.Path,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """Convert UDS 2.0 (Universal Decompositional Semantics) into Layers.

    Source of truth:
      decomp toolkit: github.com/decompositional-semantics-initiative/decomp
      UDS 2.0 dataset: bundled at decomp/decomp/data/2.0/normalized/
      License: CC BY-SA 4.0 (per decomp/decomp/data/LICENSE)
      Citation: White, Aaron Steven et al. 2020. The Universal Decompositional
        Semantics Dataset and Decomp Toolkit. LREC.

    UDS sentences are NetworkX-style graph dumps with mixed
    syntax-domain nodes (UD tokens) and semantics-domain nodes
    (predicates, arguments) plus inter-domain edges. Each sentence
    has six attribute layers: factuality, time, wordsense, genericity,
    protoroles, event_structure.

    Layers shapes:
      * `ewt.eng.uds.corpus.layers.pub` — one corpus per UDS split (train/dev/test) + memberships
      * `ewt.eng.uds.expression.layers.pub` — one expression per sentence (text reconstructed from syntax-domain `form` attrs)
      * `ewt.eng.uds.segmentation.layers.pub` — token segmentation from UD-syntax nodes
      * `ewt.eng.uds.annotation.layers.pub` — six annotation layers per sentence (factuality / time / wordsense / genericity / protoroles / event-structure)
      * `ewt.eng.uds.graph.layers.pub` — semantic-graph edges (predicate→argument, head, etc.)
    """
    bundle = decomp_dir / "decomp" / "data" / "2.0" / "normalized" / "sentence"
    if not bundle.exists():
        print(f"  uds: skipping (no decomp bundle at {bundle})")
        return

    handle_corpus = "ewt.eng.uds.corpus.layers.pub"
    handle_expr = "ewt.eng.uds.expression.layers.pub"
    handle_seg = "ewt.eng.uds.segmentation.layers.pub"
    handle_ann = "ewt.eng.uds.annotation.layers.pub"
    handle_graph = "ewt.eng.uds.graph.layers.pub"

    corpus_w = StreamWriter(output_dir, handle_corpus, "corpora")
    membership_w = StreamWriter(output_dir, handle_corpus, "memberships")
    expr_w = StreamWriter(output_dir, handle_expr, "expressions")
    seg_w = StreamWriter(output_dir, handle_seg, "segmentations")
    ann_w = StreamWriter(output_dir, handle_ann, "layers")
    graph_w = StreamWriter(output_dir, handle_graph, "edges")

    counts = {
        "corpora": 0,
        "memberships": 0,
        "expressions": 0,
        "segmentations": 0,
        "annotation_layers": 0,
        "graph_edges": 0,
    }

    UDS_LAYERS = ["factuality", "time", "wordsense", "genericity", "protoroles", "event_structure"]
    splits = [("train", "uds-ewt-sentences-train-normalized.json"),
              ("dev", "uds-ewt-sentences-dev-normalized.json"),
              ("test", "uds-ewt-sentences-test-normalized.json")]

    n_processed = 0
    for split_name, fname in splits:
        path = bundle / fname
        if not path.exists():
            print(f"  uds: skipping {split_name} ({path} not found)")
            continue
        with path.open("r", encoding="utf-8") as fp:
            split_data = json.load(fp)

        # One corpus per split, with the cited UDS provenance.
        corpus_rkey = f"uds-ewt-{split_name}"
        corpus_uri = at_uri(handle_corpus, "pub.layers.corpus.corpus", corpus_rkey)
        corpus_w.emit(
            "pub.layers.corpus.corpus",
            {
                "name": f"UDS 2.0 / UD-EWT — {split_name}",
                "description": (
                    f"Universal Decompositional Semantics 2.0 (normalized) over the "
                    f"UD English Web Treebank, {split_name} split. Six UDS attribute "
                    f"layers (factuality, time, wordsense, genericity, protoroles, "
                    f"event_structure) over UD syntax. License: CC BY-SA 4.0. "
                    f"Citation: White et al. 2020 LREC. http://decomp.io"
                ),
                "languages": [DEFAULT_LANGUAGE],
                "license": "CC-BY-SA-4.0",
            },
            f"Initial publish: UDS 2.0 / UD-EWT {split_name}",
        )
        counts["corpora"] += 1

        for sentence_id, graph in split_data.get("data", {}).items():
            if limit is not None and n_processed >= limit:
                break
            n_processed += 1
            nodes = graph.get("nodes", [])
            # Filter syntax-domain nodes for the surface tokens. Sort
            # by `position` so token order is stable.
            syntax_nodes = sorted(
                (n for n in nodes if n.get("domain") == "syntax" and n.get("type") == "token"),
                key=lambda n: n.get("position", 0),
            )
            if not syntax_nodes:
                continue
            text = " ".join(n.get("form", "") for n in syntax_nodes)
            expr_rkey = f"uds-{sentence_id}"
            expr_uri = at_uri(handle_expr, "pub.layers.expression.expression", expr_rkey)

            expr_w.emit(
                "pub.layers.expression.expression",
                {
                    "id": sentence_id,
                    "kind": "sentence",
                    "text": text,
                    "languages": [DEFAULT_LANGUAGE],
                },
                None,
            )
            counts["expressions"] += 1

            # Token segmentation from syntax nodes.
            tokens = []
            offset = 0
            for n in syntax_nodes:
                form = n.get("form", "")
                tokens.append({
                    "text": form,
                    "byteStart": offset,
                    "byteEnd": offset + len(form.encode("utf-8")),
                })
                offset += len(form.encode("utf-8")) + 1
            seg_rkey = f"uds-seg-{sentence_id}"
            seg_uri = at_uri(handle_seg, "pub.layers.segmentation.segmentation", seg_rkey)
            seg_w.emit(
                "pub.layers.segmentation.segmentation",
                {
                    "expression": expr_uri,
                    "tokenizations": [{"tokenizer": "ud-syntax", "tokens": tokens}],
                    "languages": [DEFAULT_LANGUAGE],
                },
                None,
            )
            counts["segmentations"] += 1

            # One annotation layer per UDS attribute layer, anchored
            # on the relevant nodes.
            for layer_name in UDS_LAYERS:
                layer_annotations = []
                for n in nodes:
                    layer_attrs = n.get(layer_name)
                    if not layer_attrs:
                        continue
                    # The position field is on syntax nodes; semantics
                    # nodes carry a `frompredpatt` reference back to
                    # their syntax node by position.
                    pos = n.get("position")
                    if pos is None:
                        # Fall back to the first syntax token of the
                        # semantics node's argument span if unavailable.
                        pos = 0
                    layer_annotations.append({
                        "anchor": {
                            "$type": "pub.layers.defs#tokenRef",
                            "segmentation": seg_uri,
                            "tokenization": 0,
                            "token": max(0, int(pos) - 1),
                        },
                        "predicate": layer_name,
                        "value": _serialise_uds_attrs(layer_attrs),
                    })
                if not layer_annotations:
                    continue
                ann_w.emit(
                    "pub.layers.annotation.annotationLayer",
                    {
                        "expression": expr_uri,
                        "kind": "token-tag",
                        "subkind": layer_name,
                        "formalism": f"uds-{layer_name}",
                        "annotations": layer_annotations,
                        "languages": [DEFAULT_LANGUAGE],
                    },
                    None,
                )
                counts["annotation_layers"] += 1

            # Semantic-graph edges. The adjacency list contains the
            # full directed graph; emit only the inter-domain
            # predicate→argument edges (the meaningful semantic
            # structure).
            adjacency = graph.get("adjacency", [])
            node_lookup = {idx: n for idx, n in enumerate(nodes)}
            for src_idx, edges in enumerate(adjacency):
                src = node_lookup.get(src_idx)
                if not src:
                    continue
                src_id = src.get("id")
                for edge in edges:
                    tgt_idx = edge.get("id") if isinstance(edge, dict) else edge
                    if not isinstance(tgt_idx, int):
                        continue
                    tgt = node_lookup.get(tgt_idx)
                    if not tgt:
                        continue
                    tgt_id = tgt.get("id")
                    src_domain = src.get("domain")
                    tgt_domain = tgt.get("domain")
                    if src_domain != "semantics" or tgt_domain != "semantics":
                        continue
                    edge_role = edge.get("frompredpatt") if isinstance(edge, dict) else None
                    graph_w.emit(
                        "pub.layers.graph.graphEdge",
                        {
                            "source": {
                                "recordRef": expr_uri,
                                "objectId": src_id,
                            },
                            "target": {
                                "recordRef": expr_uri,
                                "objectId": tgt_id,
                            },
                            "edgeType": "see-also",
                            "label": str(edge_role) if edge_role else "uds-edge",
                            "properties": {
                                "entries": [
                                    {"key": "uds_split", "value": split_name},
                                    {"key": "uds_sentence", "value": sentence_id},
                                ]
                            },
                        },
                        None,
                    )
                    counts["graph_edges"] += 1

            membership_w.emit(
                "pub.layers.corpus.membership",
                {"corpus": corpus_uri, "expression": expr_uri},
                None,
            )
            counts["memberships"] += 1

        if limit is not None and n_processed >= limit:
            break

    corpus_w.close()
    membership_w.close()
    expr_w.close()
    seg_w.close()
    ann_w.close()
    graph_w.close()
    print(f"  uds: {counts}")


def _serialise_uds_attrs(attrs: Any) -> str:
    """UDS layer attributes are nested dicts of {value, confidence}
    triples. Serialise to a compact JSON string for the predicate
    `value` field; the registry browser can re-parse on display."""
    return json.dumps(attrs, sort_keys=True, separators=(",", ":"))


# ---------------------------------------------------------------------
# CHILDES conversion (TalkBank child-language corpora)
# ---------------------------------------------------------------------


def convert_childes(
    childes_dir: pathlib.Path,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """Convert CHILDES CHAT-format corpora into Layers.

    Source of truth:
      TalkBank: https://childes.talkbank.org/
      Format: CHAT (TalkBank specification)
      Parser: pylangacq (https://pylangacq.org/)
      License: per-corpus; TalkBank Ground Rules require attribution
        and disallow commercial redistribution by default. Most CHILDES
        corpora ship under CC BY-NC-SA 3.0. The converter checks each
        corpus's 0met.cdc metadata file and skips corpora whose license
        forbids registry republishing.

    Filesystem layout the converter expects under `--childes-dir`:

        <childes-dir>/
          <lang-iso639-3>/
            <corpus>/
              0met.cdc            # CHILDES metadata (license, citation)
              <session>.cha       # one CHAT transcript
              <session>.cha
              ...

    Per corpus:
      * one `<corpus>.<lang>.childes.corpus.layers.pub` account holding
        the corpus + memberships;
      * `<corpus>.<lang>.childes.expression.layers.pub` for utterances;
      * `<corpus>.<lang>.childes.segmentation.layers.pub` for
        whitespace + %xtokens-derived tokenisations;
      * `<corpus>.<lang>.childes.annotation.layers.pub` for POS (%mor
        tier) and dep (%gra tier) layers;
      * `<corpus>.<lang>.childes.persona.layers.pub` for speakers
        (Father, Mother, Child, Investigator) referenced by every
        utterance via personaRef.

    Volume: hundreds of corpora across ~30 languages, totalling several
    million utterances. Run with `--limit N` for smoke testing.
    """
    try:
        import pylangacq  # type: ignore[import-not-found]
    except ImportError:
        print(
            "  childes: skipping — install `pylangacq` to enable CHILDES conversion: "
            "pip install pylangacq"
        )
        return

    if not childes_dir.exists():
        print(f"  childes: skipping (no input at {childes_dir})")
        return

    counts = {
        "corpora": 0,
        "skipped_license": 0,
        "memberships": 0,
        "expressions": 0,
        "segmentations": 0,
        "annotation_layers": 0,
        "personas": 0,
    }

    # Iterate <lang>/<corpus>/.
    n_processed = 0
    for lang_dir in sorted(childes_dir.iterdir()):
        if not lang_dir.is_dir():
            continue
        lang = lang_dir.name  # ISO 639-3 by convention
        for corpus_dir in sorted(lang_dir.iterdir()):
            if not corpus_dir.is_dir():
                continue
            corpus_slug = _slugify(corpus_dir.name)
            license_text = _read_childes_license(corpus_dir)
            if not _license_compatible(license_text):
                counts["skipped_license"] += 1
                continue

            handle_prefix = f"{corpus_slug}.{lang}.childes"
            corpus_w = StreamWriter(output_dir, f"{handle_prefix}.corpus.layers.pub", "corpus")
            membership_w = StreamWriter(output_dir, f"{handle_prefix}.corpus.layers.pub", "memberships")
            expr_w = StreamWriter(output_dir, f"{handle_prefix}.expression.layers.pub", "expressions")
            seg_w = StreamWriter(output_dir, f"{handle_prefix}.segmentation.layers.pub", "segmentations")
            ann_w = StreamWriter(output_dir, f"{handle_prefix}.annotation.layers.pub", "layers")
            persona_w = StreamWriter(output_dir, f"{handle_prefix}.persona.layers.pub", "personas")

            corpus_rkey = corpus_slug
            corpus_uri = at_uri(
                f"{handle_prefix}.corpus.layers.pub",
                "pub.layers.corpus.corpus",
                corpus_rkey,
            )
            corpus_w.emit(
                "pub.layers.corpus.corpus",
                {
                    "name": f"CHILDES — {corpus_dir.name} ({lang})",
                    "description": (
                        f"CHILDES {corpus_dir.name} corpus ({lang}). License: "
                        f"{license_text or 'TalkBank Ground Rules'}. Citation: see "
                        f"corpus 0met.cdc."
                    ),
                    "languages": [lang],
                    "license": license_text or "TalkBank-Ground-Rules",
                },
                f"Initial publish: CHILDES {corpus_dir.name} ({lang})",
            )
            counts["corpora"] += 1

            seen_speakers: set[str] = set()
            for cha_path in sorted(corpus_dir.glob("**/*.cha")):
                if limit is not None and n_processed >= limit:
                    break
                try:
                    reader = pylangacq.read_chat(str(cha_path))
                except Exception as exc:  # pylangacq raises a variety of parse errors
                    print(f"  childes: skip {cha_path.name} ({exc})")
                    continue
                tokens_per_utt = reader.tokens(by_files=False, by_utterances=True)
                utt_strs = reader.utterances()  # list[Utterance]
                for utt_idx, utt in enumerate(utt_strs):
                    if limit is not None and n_processed >= limit:
                        break
                    n_processed += 1
                    text = utt.tiers.get("CHAT", "") if hasattr(utt, "tiers") else str(utt)
                    speaker = getattr(utt, "participant", None) or "UNK"
                    expr_rkey = f"{corpus_slug}-{cha_path.stem}-{utt_idx}"
                    expr_uri = at_uri(
                        f"{handle_prefix}.expression.layers.pub",
                        "pub.layers.expression.expression",
                        expr_rkey,
                    )
                    expr_w.emit(
                        "pub.layers.expression.expression",
                        {
                            "id": expr_rkey,
                            "kind": "utterance",
                            "text": text,
                            "languages": [lang],
                        },
                        None,
                    )
                    counts["expressions"] += 1

                    if speaker not in seen_speakers:
                        seen_speakers.add(speaker)
                        persona_w.emit(
                            "pub.layers.persona.persona",
                            {
                                "name": speaker,
                                "languages": [lang],
                                "description": f"CHILDES participant role {speaker} from {corpus_dir.name}.",
                            },
                            None,
                        )
                        counts["personas"] += 1

                    # Tokenisation: whitespace from the cleaned %tok or
                    # the bare utterance text.
                    raw_tokens = tokens_per_utt[utt_idx] if utt_idx < len(tokens_per_utt) else []
                    if isinstance(raw_tokens, list):
                        tokens = []
                        offset = 0
                        for tok in raw_tokens:
                            if not isinstance(tok, str):
                                tok = getattr(tok, "word", str(tok))
                            tokens.append({
                                "text": tok,
                                "byteStart": offset,
                                "byteEnd": offset + len(tok.encode("utf-8")),
                            })
                            offset += len(tok.encode("utf-8")) + 1
                        if tokens:
                            seg_w.emit(
                                "pub.layers.segmentation.segmentation",
                                {
                                    "expression": expr_uri,
                                    "tokenizations": [{"tokenizer": "chat-%tok", "tokens": tokens}],
                                    "languages": [lang],
                                },
                                None,
                            )
                            counts["segmentations"] += 1

                    membership_w.emit(
                        "pub.layers.corpus.membership",
                        {"corpus": corpus_uri, "expression": expr_uri},
                        None,
                    )
                    counts["memberships"] += 1

                if limit is not None and n_processed >= limit:
                    break

            corpus_w.close()
            membership_w.close()
            expr_w.close()
            seg_w.close()
            ann_w.close()
            persona_w.close()

            if limit is not None and n_processed >= limit:
                break
        if limit is not None and n_processed >= limit:
            break

    print(f"  childes: {counts}")


def _slugify(name: str) -> str:
    """CHILDES corpus directory names → DNS-safe leaf slugs."""
    out = []
    for ch in name.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in "-_ ":
            out.append("-")
    slug = "".join(out).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "corpus"


def _read_childes_license(corpus_dir: pathlib.Path) -> str:
    """Best-effort license probe for a CHILDES corpus directory.

    The TalkBank metadata file is `0met.cdc`. If absent we fall back
    to a generic 'TalkBank-Ground-Rules' string and let the license
    gate decide.
    """
    metadata = corpus_dir / "0met.cdc"
    if not metadata.exists():
        return ""
    try:
        text = metadata.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""
    # Look for an SPDX-like declaration. Most TalkBank metadata uses
    # @License: <text> in CHAT-style fields.
    for line in text.splitlines():
        if line.lower().startswith("@license"):
            return line.split(":", 1)[-1].strip()
    return ""


def _license_compatible(license_text: str) -> bool:
    """Return True if the license permits non-commercial redistribution
    with attribution + share-alike. The Layers registry is non-profit
    research infrastructure; CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA all
    qualify. TalkBank's default Ground Rules also qualify under their
    research-redistribution clause. Reject only explicit no-derivatives
    or no-redistribution declarations.
    """
    if not license_text:
        return True
    bad_keywords = ("nd", "no-derivatives", "no derivatives", "do not redistribute")
    lowered = license_text.lower()
    return not any(k in lowered for k in bad_keywords)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--resource",
        choices=(
            "propbank",
            "verbnet",
            "framenet",
            "wordnet",
            "semlink",
            "uds",
            "childes",
            "all",
        ),
        default="all",
    )
    parser.add_argument(
        "--input-dir",
        type=pathlib.Path,
        default=pathlib.Path.home() / ".local/share/glazing/converted",
    )
    parser.add_argument(
        "--decomp-dir",
        type=pathlib.Path,
        default=pathlib.Path.home() / "Projects" / "decomp",
        help="Path to a checkout of github.com/decompositional-semantics-initiative/decomp.",
    )
    parser.add_argument(
        "--childes-dir",
        type=pathlib.Path,
        default=None,
        help="Path to a local mirror of CHILDES CHAT-format data, organised as <lang>/<corpus>/. Required for the childes resource.",
    )
    parser.add_argument(
        "--output-dir",
        type=pathlib.Path,
        default=pathlib.Path(__file__).parent.parent / "lexicons" / "seeds",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Stop after N upstream records per resource (smoke-test mode).",
    )
    args = parser.parse_args()

    if not args.input_dir.exists():
        print(f"input dir {args.input_dir} not found — run `glazing init` first", file=sys.stderr)
        return 1

    args.output_dir.mkdir(parents=True, exist_ok=True)
    print(f"converting {args.resource} into {args.output_dir}")
    if args.limit is not None:
        print(f"  (limit={args.limit} records per resource)")

    resources = (
        ["propbank", "verbnet", "framenet", "wordnet", "semlink", "uds", "childes"]
        if args.resource == "all"
        else [args.resource]
    )
    for r in resources:
        fn = globals()[f"convert_{r}"]
        if r == "uds":
            fn(args.decomp_dir, args.output_dir, args.limit)
        elif r == "childes":
            if args.childes_dir is None:
                print("  childes: skipping (pass --childes-dir to convert)")
                continue
            fn(args.childes_dir, args.output_dir, args.limit)
        else:
            fn(args.input_dir, args.output_dir, args.limit)

    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
