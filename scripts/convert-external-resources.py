#!/usr/bin/env python3
"""Convert glazing-cached PropBank, VerbNet, FrameNet, WordNet to Layers seed YAMLs.

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

Usage:

  python3 layers/scripts/convert-external-resources.py \
      --resource <propbank|verbnet|framenet|wordnet|all> \
      [--input-dir ~/.local/share/glazing/converted] \
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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--resource",
        choices=("propbank", "verbnet", "framenet", "wordnet", "all"),
        default="all",
    )
    parser.add_argument(
        "--input-dir",
        type=pathlib.Path,
        default=pathlib.Path.home() / ".local/share/glazing/converted",
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
        ["propbank", "verbnet", "framenet", "wordnet"]
        if args.resource == "all"
        else [args.resource]
    )
    for r in resources:
        fn = globals()[f"convert_{r}"]
        fn(args.input_dir, args.output_dir, args.limit)

    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
