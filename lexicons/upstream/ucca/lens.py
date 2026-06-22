"""Lens: UCCA passage → Layers seed records.

Inputs: one UCCABundle (one UCCA distribution: English-Wiki,
English-20K, French-20K, German-20K, etc.).

Outputs:

* `pub.layers.corpus.corpus`         on `<distribution>.<lang>.ucca.corpus.layers.pub`
* `pub.layers.corpus.membership`     on `<distribution>.<lang>.ucca.corpus.layers.pub`
* `pub.layers.expression.expression` on `<distribution>.<lang>.ucca.expression.layers.pub`
* `pub.layers.segmentation.segmentation` on `<distribution>.<lang>.ucca.segmentation.layers.pub`
* `pub.layers.annotation.annotationLayer` (graph kind, foundational layer)
                                     on `<distribution>.<lang>.ucca.annotation.layers.pub`
* `pub.layers.graph.graphNode`/`graphEdge` (one per UCCA unit / edge)
                                     on `<distribution>.<lang>.ucca.graph.layers.pub`

Distribution slug examples: `english-wiki`, `english-20k`,
`french-20k`, `german-20k`. Each is a community-distinct artefact
under the per-language test of the registry policy → its own leaf.
"""

from __future__ import annotations

from collections.abc import Iterator

from .. import SeedRecord, dx
from .theory import UCCABundle, UCCAPassage


def _at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


class UCCAToLayers(dx.Mapping[UCCABundle, list]):
    """didactic Mapping: UCCA distribution bundle → list[SeedRecord]."""

    def forward(self, bundle: UCCABundle) -> list:
        return list(_project_bundle(bundle))


def _project_bundle(bundle: UCCABundle) -> Iterator[SeedRecord]:
    slug = bundle.name
    lang = bundle.language
    h_corpus = f"{slug}.{lang}.ucca.corpus.layers.pub"
    h_expr = f"{slug}.{lang}.ucca.expression.layers.pub"
    h_seg = f"{slug}.{lang}.ucca.segmentation.layers.pub"
    h_ann = f"{slug}.{lang}.ucca.annotation.layers.pub"
    h_graph = f"{slug}.{lang}.ucca.graph.layers.pub"

    corpus_rkey = slug
    corpus_uri = _at_uri(h_corpus, "pub.layers.corpus.corpus", corpus_rkey)
    yield SeedRecord(
        handle=h_corpus,
        kind="corpus",
        collection="pub.layers.corpus.corpus",
        body={
            "name": f"UCCA — {slug} ({lang})",
            "description": (
                f"UCCA Foundational-Layer annotated corpus, distribution `{slug}` "
                f"({lang}). Categories per Abend & Rappoport 2013. License: "
                f"{bundle.license}. Citation: {bundle.citation}"
            ),
            "languages": [lang],
            "license": bundle.license,
        },
        summary=f"Initial publish: UCCA {slug} ({lang})",
    )

    for passage in bundle.passages:
        yield from _project_passage(
            passage, slug, lang, h_corpus, h_expr, h_seg, h_ann, h_graph, corpus_uri,
        )


def _project_passage(
    passage: UCCAPassage,
    slug: str,
    lang: str,
    h_corpus: str,
    h_expr: str,
    h_seg: str,
    h_ann: str,
    h_graph: str,
    corpus_uri: str,
) -> Iterator[SeedRecord]:
    expr_rkey = f"ucca-{passage.id}".replace(".", "-")
    expr_uri = _at_uri(h_expr, "pub.layers.expression.expression", expr_rkey)
    yield SeedRecord(
        handle=h_expr,
        kind="expressions",
        collection="pub.layers.expression.expression",
        body={
            "id": passage.id,
            "kind": "section" if len(passage.text.split(".")) > 4 else "sentence",
            "text": passage.text,
            "languages": [lang],
        },
    )

    if passage.terminals:
        tokens = []
        offset = 0
        for t in passage.terminals:
            size = len(t.text.encode("utf-8"))
            tokens.append({
                "text": t.text,
                "textSpan": {"byteStart": offset, "byteEnd": offset + size},
            })
            offset += size + 1
        seg_rkey = f"ucca-seg-{passage.id}".replace(".", "-")
        seg_uri = _at_uri(h_seg, "pub.layers.segmentation.segmentation", seg_rkey)
        yield SeedRecord(
            handle=h_seg,
            kind="segmentations",
            collection="pub.layers.segmentation.segmentation",
            body={
                "expression": expr_uri,
                "tokenizations": [{"kind": "whitespace", "tokens": tokens}],
                "languages": [lang],
            },
        )

    # One graph node per UCCA unit (foundational-layer non-terminal).
    for unit in passage.units:
        node_rkey = f"ucca-{passage.id}-{unit.id}".replace(".", "-")
        yield SeedRecord(
            handle=h_graph,
            kind="nodes",
            collection="pub.layers.graph.graphNode",
            body={
                "nodeType": "concept",
                "properties": {
                    "entries": [
                        {"key": "ucca_layer", "value": str(unit.layer)},
                        {"key": "ucca_passage", "value": passage.id},
                        {"key": "ucca_unit", "value": unit.id},
                        {"key": "ucca_implicit", "value": str(unit.is_implicit)},
                        {"key": "ucca_remote", "value": str(unit.is_remote)},
                    ]
                },
            },
        )

    # One graph edge per UCCA categorial edge.
    for edge in passage.edges:
        src_rkey = f"ucca-{passage.id}-{edge.parent_id}".replace(".", "-")
        tgt_rkey = f"ucca-{passage.id}-{edge.child_id}".replace(".", "-")
        yield SeedRecord(
            handle=h_graph,
            kind="edges",
            collection="pub.layers.graph.graphEdge",
            body={
                "source": {"recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", src_rkey)},
                "target": {"recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", tgt_rkey)},
                "edgeType": "see-also",
                "label": edge.category,
                "properties": {
                    "entries": [
                        {"key": "ucca_implicit", "value": str(edge.is_implicit)},
                        {"key": "ucca_remote", "value": str(edge.is_remote)},
                        {"key": "ucca_distribution", "value": slug},
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
            "subkind": "ucca-foundational",
            "formalism": "ucca-foundational-layer",
            "annotations": [
                {
                    "anchor": {"$type": "pub.layers.defs#documentAnchor"},
                    "label": "ucca",
                    "value": passage.id,
                }
            ],
            "languages": [lang],
        },
    )

    yield SeedRecord(
        handle=h_corpus,
        kind="memberships",
        collection="pub.layers.corpus.membership",
        body={"corpus": corpus_uri, "expression": expr_uri},
    )


__all__ = ["UCCAToLayers"]

project = UCCAToLayers()
