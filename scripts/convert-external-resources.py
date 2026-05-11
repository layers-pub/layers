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
from collections.abc import Iterable, Iterator
from typing import Any

# Make the repo's `lexicons/upstream/` Python package importable so
# the convert_* functions can route through the panproto-lens-shaped
# theory + lens modules instead of hand-rolling projection here.
_REPO_LAYERS = pathlib.Path(__file__).resolve().parent.parent
if str(_REPO_LAYERS) not in sys.path:
    sys.path.insert(0, str(_REPO_LAYERS))

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


def _drain_seed_records(
    records: Iterable[Any],
    output_dir: pathlib.Path,
    label: str,
) -> dict[tuple[str, str], int]:
    """Stream `SeedRecord` objects from a didactic lens into the
    on-disk YAML sink.

    Each record carries `(handle, kind, collection, body, summary)`.
    We bucket by `(handle, kind)` and reuse `StreamWriter` so the
    output mirrors the rest of this script's emission shape.
    """
    writers: dict[tuple[str, str], StreamWriter] = {}
    counts: dict[tuple[str, str], int] = {}
    for record in records:
        handle = record.handle
        kind = record.kind
        key = (handle, kind)
        writer = writers.get(key)
        if writer is None:
            writer = StreamWriter(output_dir, handle, kind)
            writers[key] = writer
        writer.emit(record.collection, dict(record.body), record.summary or None)
        counts[key] = counts.get(key, 0) + 1
    for writer in writers.values():
        writer.close()
    summary = ", ".join(
        f"{n} {handle}:{kind}" for (handle, kind), n in sorted(counts.items())
    )
    print(f"  {label}: {summary or 'no records emitted'}")
    return counts


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

    Routes through the didactic theory + lens at
    `lexicons/upstream/uds/`. The lens is a hand-authored
    `dx.Mapping[UDSSplit, list[SeedRecord]]`, faithful to the
    decomp data-model docs (`decomp/docs/source/data/*.rst`).
    Provenance:

      decomp toolkit: github.com/decompositional-semantics-initiative/decomp
      UDS 2.0 dataset: bundled at decomp/data/2.0/normalized/
      License: CC BY-SA 4.0 (per decomp/data/LICENSE)
      Citation: White, Aaron Steven et al. 2020. The Universal
        Decompositional Semantics Dataset and Decomp Toolkit. LREC.
    """
    bundle_dir = decomp_dir / "decomp" / "data" / "2.0" / "normalized" / "sentence"
    if not bundle_dir.exists():
        print(f"  uds: skipping (no decomp bundle at {bundle_dir})")
        return

    from lexicons.upstream.uds.theory import UDSSplit
    from lexicons.upstream.uds.lens import UDSToLayers

    splits = [
        ("train", "uds-ewt-sentences-train-normalized.json"),
        ("dev", "uds-ewt-sentences-dev-normalized.json"),
        ("test", "uds-ewt-sentences-test-normalized.json"),
    ]
    lens = UDSToLayers()
    n_processed = 0
    all_records: list[Any] = []
    for split_name, fname in splits:
        path = bundle_dir / fname
        if not path.exists():
            print(f"  uds: skipping {split_name} ({path} not found)")
            continue
        with path.open("r", encoding="utf-8") as fp:
            raw = json.load(fp)
        data = raw.get("data", {})
        if limit is not None:
            remaining = max(0, limit - n_processed)
            data = dict(list(data.items())[:remaining])
            n_processed += len(data)
        split = UDSSplit(name=split_name, metadata=raw.get("metadata", {}), data=data)
        all_records.extend(lens.forward(split))
        if limit is not None and n_processed >= limit:
            break

    _drain_seed_records(all_records, output_dir, "uds")

    # Raw UDS (per-annotator) lives alongside normalized in the
    # decomp release. When present, route every phenomenon file
    # through `UDSRawToLayers` so each (sentence, phenomenon)
    # tuple emits a `subkind=<name>-raw` annotation layer in
    # parallel to the normalized aggregate. Both forms share the
    # same handles + expression refs; consumers filter by
    # `formalism` to pick which view they want.
    raw_root = decomp_dir / "decomp" / "data" / "2.0" / "raw"
    if raw_root.exists():
        from lexicons.upstream.uds.theory import (
            UDSRawDataset,
            UDSRawLayer,
            UDS_RAW_SENTENCE_LAYERS,
            UDS_RAW_DOCUMENT_LAYERS,
        )
        from lexicons.upstream.uds.lens_raw import UDSRawToLayers

        layers: list[UDSRawLayer] = []
        for scope_dir, scope_layers in (
            ("sentence", UDS_RAW_SENTENCE_LAYERS),
            ("document", UDS_RAW_DOCUMENT_LAYERS),
        ):
            ann_dir = raw_root / scope_dir / "annotations"
            if not ann_dir.exists():
                continue
            for name in scope_layers:
                p = ann_dir / f"{name}.json"
                if not p.exists():
                    print(f"  uds-raw: skipping {scope_dir}/{name} ({p} not found)")
                    continue
                with p.open("r", encoding="utf-8") as fp:
                    raw_blob = json.load(fp)
                data = raw_blob.get("data", {})
                if limit is not None:
                    data = dict(list(data.items())[:limit])
                layers.append(UDSRawLayer(
                    name=name,  # type: ignore[arg-type]
                    scope=scope_dir,  # type: ignore[arg-type]
                    metadata=raw_blob.get("metadata", {}),
                    data=data,
                ))
        if layers:
            dataset = UDSRawDataset(layers=tuple(layers))
            _drain_seed_records(UDSRawToLayers().forward(dataset), output_dir, "uds-raw")
        else:
            print("  uds-raw: no raw layer files found under data/2.0/raw")
    else:
        print(f"  uds-raw: skipping (no raw bundle at {raw_root})")


# ---------------------------------------------------------------------
# CHILDES conversion (TalkBank child-language corpora)
# ---------------------------------------------------------------------


def convert_childes(
    childes_dir: pathlib.Path,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """Convert CHILDES CHAT-format corpora into Layers via the
    didactic theory + lens at `lexicons/upstream/childes/`.

    `--childes-dir` points at a `<lang-iso639-3>/<corpus>/` tree of
    CHAT files plus per-corpus `0met.cdc` metadata. Each corpus
    directory becomes one `CHILDESCorpus` instance fed to the lens;
    the lens emits per-corpus seed records on the
    `<corpus>.<lang>.childes.<namespace>.layers.pub` family.

    The pylangacq parser turns each `.cha` file into a `CHATSession`;
    per-corpus license is read from `0met.cdc` and gated against
    `_license_compatible` before invoking the lens.
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

    from lexicons.upstream.childes.theory import (
        CHATSession,
        CHATToken,
        CHATUtterance,
        CHILDESCorpus,
    )
    from lexicons.upstream.childes.lens import CHILDESToLayers

    lens = CHILDESToLayers()
    n_processed = 0
    skipped_license = 0
    all_records: list[Any] = []

    for lang_dir in sorted(p for p in childes_dir.iterdir() if p.is_dir()):
        lang = lang_dir.name  # ISO 639-3 by convention
        for corpus_dir in sorted(p for p in lang_dir.iterdir() if p.is_dir()):
            license_text = _read_childes_license(corpus_dir)
            if not _license_compatible(license_text):
                skipped_license += 1
                continue
            sessions: list[CHATSession] = []
            participants_global: dict[str, str] = {}
            for cha_path in sorted(corpus_dir.glob("**/*.cha")):
                if limit is not None and n_processed >= limit:
                    break
                try:
                    reader = pylangacq.read_chat(str(cha_path))
                except Exception as exc:  # pylangacq raises a variety of parse errors
                    print(f"  childes: skip {cha_path.name} ({exc})")
                    continue
                # pylangacq exposes utterances + per-utterance tokens.
                utt_objs = reader.utterances()
                tokens_per_utt = reader.tokens(by_files=False, by_utterances=True)
                participants = {
                    code: info.get("name", code)
                    for code, info in (reader.headers() or {}).get("Participants", {}).items()
                } if hasattr(reader, "headers") else {}
                participants_global.update(participants)
                utterances: list[CHATUtterance] = []
                for utt_idx, utt in enumerate(utt_objs):
                    if limit is not None and n_processed >= limit:
                        break
                    n_processed += 1
                    text = utt.tiers.get("CHAT", "") if hasattr(utt, "tiers") else str(utt)
                    speaker = getattr(utt, "participant", None) or "UNK"
                    raw_tokens = tokens_per_utt[utt_idx] if utt_idx < len(tokens_per_utt) else []
                    chat_tokens: list[CHATToken] = []
                    if isinstance(raw_tokens, list):
                        for tok in raw_tokens:
                            word = tok if isinstance(tok, str) else getattr(tok, "word", str(tok))
                            chat_tokens.append(CHATToken(word=word))
                    utterances.append(CHATUtterance(
                        participant=speaker,
                        text=text,
                        tokens=tuple(chat_tokens),
                        tiers=dict(getattr(utt, "tiers", {}) or {}),
                    ))
                sessions.append(CHATSession(
                    path=str(cha_path.relative_to(childes_dir)),
                    languages=(lang,),
                    participants=participants,
                    utterances=tuple(utterances),
                    headers={},
                ))
            if not sessions:
                continue
            corpus = CHILDESCorpus(
                name=corpus_dir.name,
                language=lang,
                license=license_text or "TalkBank-Ground-Rules",
                sessions=tuple(sessions),
                metadata={},
            )
            all_records.extend(lens.forward(corpus))
            if limit is not None and n_processed >= limit:
                break
        if limit is not None and n_processed >= limit:
            break

    if skipped_license:
        print(f"  childes: skipped {skipped_license} corpora on license gate")
    _drain_seed_records(all_records, output_dir, "childes")


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


# ---------------------------------------------------------------------
# AMR / UCCA / PMB / UMR conversion
#
# Each of these resources has a hand-authored didactic theory + lens
# at `lexicons/upstream/<name>/`. The theory faithfully encodes the
# upstream community's published data model; the lens is the
# Mapping that emits Layers SeedRecords. The *parser* from each
# resource's on-disk file format (PENMAN for AMR, XML for UCCA,
# CLF/sbn for PMB, formatted-text for UMR) into the typed bundle
# is the open piece — those parsers consume LDC release tarballs
# whose access requires LDC credentials. Operators with the
# release tarball plug in a parser that returns the typed bundle
# and the lens handles the rest.
# ---------------------------------------------------------------------


def convert_amr(
    amr_dir: pathlib.Path | None,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """Convert AMR (1.0 / 2.0 / 3.0) into Layers via the lens at
    `lexicons/upstream/amr/`. PENMAN parsing reads `.txt` AMR files
    in the LDC release format; PropBank frameset concepts surface
    as `same-as` cross-reference edges on `semlink.graph.layers.pub`.
    """
    if amr_dir is None or not amr_dir.exists():
        print("  amr: skipping (pass --amr-dir <LDC release tree> to convert)")
        return

    try:
        import penman  # type: ignore[import-not-found]
    except ImportError:
        print("  amr: skipping — install `penman` to enable AMR conversion: pip install penman")
        return

    from lexicons.upstream.amr.theory import AMRBundle, AMREdge, AMRGraph, AMRNode
    from lexicons.upstream.amr.lens import AMRToLayers, PROPBANK_FRAMESET_RE

    release_marker = amr_dir / "release.txt"
    release = release_marker.read_text(encoding="utf-8").strip() if release_marker.exists() else "amr-3.0"
    graphs: list[AMRGraph] = []
    n = 0
    for txt in sorted(amr_dir.glob("**/*.txt")):
        for graph in penman.iterdecode(txt.read_text(encoding="utf-8")):
            if limit is not None and n >= limit:
                break
            n += 1
            nodes = [
                AMRNode(
                    variable=v,
                    concept=str(c),
                    is_constant=False,
                    is_frameset=bool(PROPBANK_FRAMESET_RE.match(str(c))),
                )
                for v, _, c in graph.instances()
            ]
            edges = [
                AMREdge(source_variable=src, role=role, target_variable=tgt)
                for src, role, tgt in graph.edges()
            ]
            edges += [
                AMREdge(source_variable=src, role=role, target_constant=str(tgt))
                for src, role, tgt in graph.attributes()
            ]
            graphs.append(AMRGraph(
                id=str(graph.metadata.get("id", f"amr-{n}")),
                snt=graph.metadata.get("snt", ""),
                nodes=tuple(nodes),
                edges=tuple(edges),
                root_variable=graph.top,
                metadata=dict(graph.metadata),
            ))
        if limit is not None and n >= limit:
            break

    bundle = AMRBundle(
        release=release,  # type: ignore[arg-type]
        citation="Banarescu et al. 2013. Abstract Meaning Representation for Sembanking. LAW 7.",
        graphs=tuple(graphs),
    )
    _drain_seed_records(AMRToLayers().forward(bundle), output_dir, "amr")


def convert_ucca(
    ucca_dir: pathlib.Path | None,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """Convert UCCA passages into Layers via the lens at
    `lexicons/upstream/ucca/`. UCCA distributes XML passages
    organised by distribution (english-wiki, english-20k, french-20k,
    german-20k); the lens handles per-distribution handle splaying.
    """
    if ucca_dir is None or not ucca_dir.exists():
        print("  ucca: skipping (pass --ucca-dir <UCCA release tree> to convert)")
        return
    print(
        "  ucca: lens ready at lexicons/upstream/ucca/lens.py; XML "
        "parser → UCCABundle is the operator-side piece. Implement "
        "the parser and feed UCCABundle to UCCAToLayers().forward(...) "
        "to emit seeds."
    )


def convert_pmb(
    pmb_dir: pathlib.Path | None,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """Convert PMB (Parallel Meaning Bank) into Layers via the lens
    at `lexicons/upstream/pmb/`. PMB distributes per-tier (gold /
    silver / bronze) per-language CLF (clausal-form DRS) files;
    English Concept-clauses linked to WordNet senses surface as
    cross-references on `semlink.graph.layers.pub`.
    """
    if pmb_dir is None or not pmb_dir.exists():
        print("  pmb: skipping (pass --pmb-dir <PMB release tree> to convert)")
        return
    print(
        "  pmb: lens ready at lexicons/upstream/pmb/lens.py; CLF "
        "parser → PMBBundle is the operator-side piece. Implement "
        "the parser (one document = one .sbn or .clf file) and feed "
        "PMBBundle to PMBToLayers().forward(...) to emit seeds."
    )


def convert_umr(
    umr_dir: pathlib.Path | None,
    output_dir: pathlib.Path,
    limit: int | None,
) -> None:
    """Convert UMR (Uniform Meaning Representation) into Layers via
    the lens at `lexicons/upstream/umr/`. UMR distributes per-language
    sentence-and-document files; English bundles' frameset concepts
    surface as `same-as` cross-references to PropBank, mirroring AMR.
    """
    if umr_dir is None or not umr_dir.exists():
        print("  umr: skipping (pass --umr-dir <UMR release tree> to convert)")
        return
    print(
        "  umr: lens ready at lexicons/upstream/umr/lens.py; UMR "
        "release-format parser → UMRBundle is the operator-side "
        "piece. Implement the parser and feed UMRBundle to "
        "UMRToLayers().forward(...) to emit seeds."
    )


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
            "amr",
            "ucca",
            "pmb",
            "umr",
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
        "--amr-dir",
        type=pathlib.Path,
        default=None,
        help="Path to an LDC AMR release tree (LDC2014T12 / LDC2017T10 / LDC2020T02). Required for the amr resource.",
    )
    parser.add_argument(
        "--ucca-dir",
        type=pathlib.Path,
        default=None,
        help="Path to a UCCA release tree (english-wiki / english-20k / french-20k / german-20k). Required for the ucca resource.",
    )
    parser.add_argument(
        "--pmb-dir",
        type=pathlib.Path,
        default=None,
        help="Path to a PMB (Parallel Meaning Bank) release tree organised by language + tier. Required for the pmb resource.",
    )
    parser.add_argument(
        "--umr-dir",
        type=pathlib.Path,
        default=None,
        help="Path to a UMR (Uniform Meaning Representation) release tree. Required for the umr resource.",
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
        [
            "propbank", "verbnet", "framenet", "wordnet", "semlink",
            "uds", "childes", "amr", "ucca", "pmb", "umr",
        ]
        if args.resource == "all"
        else [args.resource]
    )
    operator_dirs = {
        "uds": args.decomp_dir,
        "childes": args.childes_dir,
        "amr": args.amr_dir,
        "ucca": args.ucca_dir,
        "pmb": args.pmb_dir,
        "umr": args.umr_dir,
    }
    for r in resources:
        fn = globals()[f"convert_{r}"]
        if r in operator_dirs:
            fn(operator_dirs[r], args.output_dir, args.limit)
        else:
            fn(args.input_dir, args.output_dir, args.limit)

    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
