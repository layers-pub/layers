"""Lens: PMB document → Layers seed records.

Inputs: one PMBBundle (one (release, language, tier) tuple).

Outputs:

* `pub.layers.corpus.corpus`         on `<release>-<tier>.<lang>.pmb.corpus.layers.pub`
* `pub.layers.corpus.membership`     on `<release>-<tier>.<lang>.pmb.corpus.layers.pub`
* `pub.layers.expression.expression` (one per document)
                                     on `<release>-<tier>.<lang>.pmb.expression.layers.pub`
* `pub.layers.segmentation.segmentation` (PMB token tier)
                                     on `<release>-<tier>.<lang>.pmb.segmentation.layers.pub`
* `pub.layers.annotation.annotationLayer` (graph kind, DRS overlay)
                                     on `<release>-<tier>.<lang>.pmb.annotation.layers.pub`
* `pub.layers.graph.graphNode` (one per DRS box / referent)
                                     on `<release>-<tier>.<lang>.pmb.graph.layers.pub`
* `pub.layers.graph.graphEdge` (one per DRS clause)
                                     on `<release>-<tier>.<lang>.pmb.graph.layers.pub`
* `pub.layers.graph.graphEdge` cross-reference: PMB Concept-clauses
  carrying WordNet sense-keys ↔ WordNet sense entries on
  `pwn.eng.wordnet.resource.layers.pub` (English-only, since PMB
  Concepts in non-English documents reference different sense
  inventories). Cross-reference edges land on `semlink.graph.layers.pub`.

Three orthogonal release-axis dimensions feed the leaf:
  - PMB release (4.0.0, 5.0.0, …)
  - tier (gold / silver / bronze)
  - language (eng, nld, deu, ita)

The leaf folds release+tier into one segment (`5-0-0-gold`,
`4-0-0-silver`, …) so each (release, tier) is its own citable
artefact while the language tier sits one level deeper, in line
with the per-language policy.
"""

from __future__ import annotations

from collections.abc import Iterator

from .. import SeedRecord, dx
from .theory import PMBBundle, PMBDocument

WORDNET_SENSE_HANDLE = "pwn.eng.wordnet.resource.layers.pub"
WORDNET_SENSE_COLLECTION = "pub.layers.resource.entry"
SEMLINK_HANDLE = "semlink.graph.layers.pub"


def _release_slug(release: str, tier: str) -> str:
    return f"{release.replace('.', '-')}-{tier}"


def _at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


class PMBToLayers(dx.Mapping[PMBBundle, list]):
    """didactic Mapping: PMB release/language/tier bundle → list[SeedRecord]."""

    def forward(self, bundle: PMBBundle) -> list:
        return list(_project_bundle(bundle))


def _project_bundle(bundle: PMBBundle) -> Iterator[SeedRecord]:
    rt = _release_slug(bundle.release, bundle.tier)
    lang = bundle.language
    h_corpus = f"{rt}.{lang}.pmb.corpus.layers.pub"
    h_expr = f"{rt}.{lang}.pmb.expression.layers.pub"
    h_seg = f"{rt}.{lang}.pmb.segmentation.layers.pub"
    h_ann = f"{rt}.{lang}.pmb.annotation.layers.pub"
    h_graph = f"{rt}.{lang}.pmb.graph.layers.pub"

    corpus_rkey = f"pmb-{rt}-{lang}"
    corpus_uri = _at_uri(h_corpus, "pub.layers.corpus.corpus", corpus_rkey)
    yield SeedRecord(
        handle=h_corpus,
        kind="corpus",
        collection="pub.layers.corpus.corpus",
        body={
            "name": f"PMB {bundle.release} {bundle.tier} ({lang})",
            "description": (
                f"Parallel Meaning Bank, release {bundle.release}, "
                f"tier {bundle.tier}, language {lang}. License: "
                f"{bundle.license}. Citation: {bundle.citation}. "
                f"Spec: https://pmb.let.rug.nl/clf-spec.php"
            ),
            "languages": [lang],
            "license": bundle.license,
        },
        summary=f"Initial publish: PMB {bundle.release} {bundle.tier} ({lang})",
    )

    for doc in bundle.documents:
        yield from _project_document(doc, bundle, rt, lang,
                                     h_corpus, h_expr, h_seg, h_ann, h_graph,
                                     corpus_uri)


def _project_document(
    doc: PMBDocument,
    bundle: PMBBundle,
    release_tier: str,
    lang: str,
    h_corpus: str,
    h_expr: str,
    h_seg: str,
    h_ann: str,
    h_graph: str,
    corpus_uri: str,
) -> Iterator[SeedRecord]:
    expr_rkey = f"pmb-{doc.id}".replace("/", "-").replace(".", "-")
    expr_uri = _at_uri(h_expr, "pub.layers.expression.expression", expr_rkey)
    yield SeedRecord(
        handle=h_expr,
        kind="expressions",
        collection="pub.layers.expression.expression",
        body={
            "id": doc.id,
            "kind": "document" if len(doc.tokens) > 30 else "sentence",
            "text": doc.raw_text,
            "languages": [lang],
        },
    )
    yield SeedRecord(
        handle=h_corpus,
        kind="memberships",
        collection="pub.layers.corpus.membership",
        body={"corpus": corpus_uri, "expression": expr_uri},
    )

    if doc.tokens:
        tokens = []
        offset = 0
        for t in doc.tokens:
            size = len(t.text.encode("utf-8"))
            tokens.append({"text": t.text, "textSpan": {"byteStart": offset, "byteEnd": offset + size}})
            offset += size + 1
        seg_rkey = f"pmb-seg-{doc.id}".replace("/", "-").replace(".", "-")
        seg_uri = _at_uri(h_seg, "pub.layers.segmentation.segmentation", seg_rkey)
        yield SeedRecord(
            handle=h_seg,
            kind="segmentations",
            collection="pub.layers.segmentation.segmentation",
            body={
                "expression": expr_uri,
                "tokenizations": [{"kind": "custom", "tokens": tokens}],
                "languages": [lang],
            },
        )

    # Each DRS box gets a graphNode; each clause gets an edge.
    boxes_seen: set[str] = set()
    referents_seen: set[str] = set()

    def _box_node(box: str) -> str:
        rkey = f"pmb-{doc.id}-{box}".replace("/", "-").replace(".", "-")
        if box not in boxes_seen:
            boxes_seen.add(box)
        return rkey

    def _ref_node(ref: str) -> str:
        rkey = f"pmb-{doc.id}-{ref}".replace("/", "-").replace(".", "-")
        if ref not in referents_seen:
            referents_seen.add(ref)
        return rkey

    for clause in doc.clauses:
        box_rkey = _box_node(clause.box)
        # Concept clauses link a referent to a WordNet sense; emit a
        # cross-reference into the WordNet resource on English bundles.
        if clause.op == "Concept" and lang == "eng":
            referent = clause.arg1
            sense = clause.arg2 or ""
            ref_rkey = _ref_node(referent)
            wn_rkey = f"sense-{sense}".replace(":", "-").replace("%", "-")
            yield SeedRecord(
                handle=SEMLINK_HANDLE,
                kind="pmb-wordnet",
                collection="pub.layers.graph.graphEdge",
                body={
                    "source": {
                        "recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", ref_rkey)
                    },
                    "target": {
                        "recordRef": _at_uri(WORDNET_SENSE_HANDLE,
                                              WORDNET_SENSE_COLLECTION,
                                              wn_rkey)
                    },
                    "edgeType": "same-as",
                    "label": f"pmb-concept:{sense}",
                    "properties": {
                        "entries": [
                            {"key": "src_resource", "value": "PMB"},
                            {"key": "src_release", "value": bundle.release},
                            {"key": "src_tier", "value": bundle.tier},
                            {"key": "src_kind", "value": "concept-clause"},
                            {"key": "tgt_resource", "value": "WordNet"},
                            {"key": "wn_sense_key", "value": sense},
                        ]
                    },
                    "confidence": 1000,
                },
            )

        # Generic box-clause graphEdge.
        edge_label = clause.op
        if clause.arg2:
            tgt_kind = "ref" if clause.arg2.startswith(("x", "e", "s", "p", "t")) else "box"
            tgt_rkey = (
                _ref_node(clause.arg2) if tgt_kind == "ref" else _box_node(clause.arg2)
            )
            target_ref = {
                "recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", tgt_rkey)
            }
        else:
            tgt_rkey = _ref_node(clause.arg1) if clause.op == "REF" else _box_node(clause.arg1)
            target_ref = {
                "recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", tgt_rkey)
            }
        yield SeedRecord(
            handle=h_graph,
            kind="edges",
            collection="pub.layers.graph.graphEdge",
            body={
                "source": {
                    "recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", box_rkey)
                },
                "target": target_ref,
                "edgeType": "see-also",
                "label": edge_label,
                "properties": {
                    "entries": [
                        {"key": "pmb_release", "value": bundle.release},
                        {"key": "pmb_tier", "value": bundle.tier},
                        {"key": "pmb_doc", "value": doc.id},
                        {"key": "drs_op", "value": clause.op},
                        {"key": "drs_arg1", "value": clause.arg1},
                        *([{"key": "drs_arg2", "value": clause.arg2}] if clause.arg2 else []),
                    ]
                },
            },
        )

    # Emit graphNodes for every box / referent we touched.
    for box in boxes_seen:
        rkey = f"pmb-{doc.id}-{box}".replace("/", "-").replace(".", "-")
        yield SeedRecord(
            handle=h_graph,
            kind="boxes",
            collection="pub.layers.graph.graphNode",
            body={
                "nodeType": "concept",
                "properties": {
                    "entries": [
                        {"key": "pmb_kind", "value": "box"},
                        {"key": "pmb_doc", "value": doc.id},
                        {"key": "pmb_label", "value": box},
                    ]
                },
            },
        )
    for referent in referents_seen:
        rkey = f"pmb-{doc.id}-{referent}".replace("/", "-").replace(".", "-")
        yield SeedRecord(
            handle=h_graph,
            kind="referents",
            collection="pub.layers.graph.graphNode",
            body={
                "nodeType": "entity" if referent.startswith("x") else "concept",
                "properties": {
                    "entries": [
                        {"key": "pmb_kind", "value": "referent"},
                        {"key": "pmb_doc", "value": doc.id},
                        {"key": "pmb_label", "value": referent},
                    ]
                },
            },
        )

    yield SeedRecord(
        handle=h_ann,
        kind="layers",
        collection="pub.layers.annotation.annotationLayer",
        body={
            "expression": expr_uri,
            "kind": "graph",
            "subkind": "drs",
            "formalism": "pmb-clf",
            "annotations": [
                {
                    "anchor": {"$type": "pub.layers.defs#documentAnchor"},
                    "label": "drs",
                    "value": doc.id,
                }
            ],
            "languages": [lang],
        },
    )


__all__ = ["PMBToLayers"]


project = PMBToLayers()
