"""Lens: UDS sentence graph → Layers seed records.

Inputs: one UDSSplit (`UDS_ATTRIBUTE_LAYERS` recap: factuality, time,
wordsense, genericity, protoroles, event_structure).

Outputs (per sentence + one corpus per split):

* `pub.layers.corpus.corpus`         on `ewt.eng.uds.corpus.layers.pub`
* `pub.layers.corpus.membership`     on `ewt.eng.uds.corpus.layers.pub`
* `pub.layers.expression.expression` on `ewt.eng.uds.expression.layers.pub`
* `pub.layers.segmentation.segmentation` on `ewt.eng.uds.segmentation.layers.pub`
* `pub.layers.annotation.annotationLayer` (one per UDS attribute layer)
                                     on `ewt.eng.uds.annotation.layers.pub`
* `pub.layers.graph.graphEdge` (semantic-domain edges only)
                                     on `ewt.eng.uds.graph.layers.pub`
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any

from .. import SeedRecord, dx
from .theory import UDSSentenceGraph, UDSSplit, UDS_ATTRIBUTE_LAYERS

LANGUAGE = "eng"

H_CORPUS = "ewt.eng.uds.corpus.layers.pub"
H_EXPR = "ewt.eng.uds.expression.layers.pub"
H_SEG = "ewt.eng.uds.segmentation.layers.pub"
H_ANN = "ewt.eng.uds.annotation.layers.pub"
H_GRAPH = "ewt.eng.uds.graph.layers.pub"


def _at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


def _serialise_attrs(attrs: Any) -> str:
    """UDS layer attributes are nested {value, confidence} dicts.
    Compact-JSON them for the predicate `value` field; consumers
    parse on display."""
    return json.dumps(attrs, sort_keys=True, separators=(",", ":"))


class UDSToLayers(dx.Mapping[UDSSplit, list]):
    """didactic Mapping: UDS split → list[SeedRecord]. The codomain
    type parameter is the loose `list` rather than `list[SeedRecord]`
    because didactic's runtime requires a Model-shaped type for now."""

    def forward(self, split: UDSSplit) -> list:
        return list(_project_split(split))


def _project_split(split: UDSSplit) -> Iterator[SeedRecord]:
    """Project one UDSSplit (train/dev/test) into Layers seed records."""
    corpus_rkey = f"uds-ewt-{split.name}"
    corpus_uri = _at_uri(H_CORPUS, "pub.layers.corpus.corpus", corpus_rkey)
    yield SeedRecord(
        handle=H_CORPUS,
        kind="corpora",
        collection="pub.layers.corpus.corpus",
        body={
            "name": f"UDS 2.0 / UD-EWT — {split.name}",
            "description": (
                f"Universal Decompositional Semantics 2.0 (normalized) over the "
                f"UD English Web Treebank, {split.name} split. Six UDS attribute "
                f"layers (factuality, time, wordsense, genericity, protoroles, "
                f"event_structure) over UD syntax. License: CC BY-SA 4.0. "
                f"Citation: White et al. 2020 LREC. http://decomp.io"
            ),
            "languages": [LANGUAGE],
            "license": "CC-BY-SA-4.0",
        },
        summary=f"Initial publish: UDS 2.0 / UD-EWT {split.name}",
    )

    for sentence_id, graph in split.data.items():
        yield from _project_sentence(sentence_id, graph, split.name, corpus_uri)


def _project_sentence(
    sentence_id: str,
    graph: UDSSentenceGraph,
    split_name: str,
    corpus_uri: str,
) -> Iterator[SeedRecord]:
    syntax_nodes = [
        n
        for n in graph.nodes
        if n.domain == "syntax" and n.type == "token" and n.form is not None
    ]
    syntax_nodes.sort(key=lambda n: (n.position or 0))
    if not syntax_nodes:
        return

    text = " ".join(n.form or "" for n in syntax_nodes)
    expr_rkey = f"uds-{sentence_id}"
    expr_uri = _at_uri(H_EXPR, "pub.layers.expression.expression", expr_rkey)

    yield SeedRecord(
        handle=H_EXPR,
        kind="expressions",
        collection="pub.layers.expression.expression",
        body={
            "id": sentence_id,
            "kind": "sentence",
            "text": text,
            "languages": [LANGUAGE],
        },
    )

    tokens: list[dict[str, Any]] = []
    offset = 0
    for n in syntax_nodes:
        form = n.form or ""
        size = len(form.encode("utf-8"))
        tokens.append({"text": form, "byteStart": offset, "byteEnd": offset + size})
        offset += size + 1
    seg_rkey = f"uds-seg-{sentence_id}"
    seg_uri = _at_uri(H_SEG, "pub.layers.segmentation.segmentation", seg_rkey)
    yield SeedRecord(
        handle=H_SEG,
        kind="segmentations",
        collection="pub.layers.segmentation.segmentation",
        body={
            "expression": expr_uri,
            "tokenizations": [{"tokenizer": "ud-syntax", "tokens": tokens}],
            "languages": [LANGUAGE],
        },
    )

    # Map a node id to a 0-indexed token offset within the
    # syntax-only sentence (used as a fallback anchor when an
    # attribute layer rides on a semantics node — the head
    # syntactic token is the most informative anchor we have).
    token_index: dict[str, int] = {}
    for idx, n in enumerate(syntax_nodes):
        token_index[n.id] = idx

    def _anchor_for_semantics_node(node_id: str) -> dict[str, Any]:
        # Semantics node IDs encode their head token's 1-indexed
        # position as the trailing segment, e.g.
        # `ewt-dev-1-semantics-pred-4` → token 4. The wordsense
        # / genericity / event_structure / time / factuality
        # phenomena attach to the predicate or argument; the
        # head token is the natural span anchor.
        tail = node_id.rsplit("-", 1)[-1]
        try:
            head_pos = int(tail)
        except ValueError:
            head_pos = 0
        return {
            "$type": "pub.layers.defs#tokenRef",
            "segmentation": seg_uri,
            "tokenization": 0,
            "token": max(0, head_pos - 1),
        }

    # UDS attribute layers ride on either semantics nodes
    # (factuality, time, wordsense, genericity, event_structure)
    # or on predicate→argument edges (protoroles). Walk both and
    # accumulate annotations per layer.
    layer_anns: dict[str, list[dict[str, Any]]] = {
        layer: [] for layer in UDS_ATTRIBUTE_LAYERS
    }
    for n in graph.nodes:
        for layer in UDS_ATTRIBUTE_LAYERS:
            attrs = getattr(n, layer, None)
            if not attrs:
                continue
            layer_anns[layer].append({
                "anchor": _anchor_for_semantics_node(n.id),
                "predicate": layer,
                "value": _serialise_attrs(attrs),
            })

    nodes_by_index = list(graph.nodes)
    nodes_by_id = {n.id: n for n in nodes_by_index}

    for src_idx, edges in enumerate(graph.adjacency):
        if src_idx >= len(nodes_by_index):
            continue
        src = nodes_by_index[src_idx]
        for edge in edges:
            for layer in UDS_ATTRIBUTE_LAYERS:
                attrs = getattr(edge, layer, None)
                if not attrs:
                    continue
                # Edge-borne layers (chiefly protoroles) anchor
                # on the *target* node — the argument whose role
                # the layer scores.
                layer_anns[layer].append({
                    "anchor": _anchor_for_semantics_node(edge.id),
                    "predicate": layer,
                    "value": _serialise_attrs(attrs),
                    "properties": {
                        "entries": [
                            {"key": "uds_edge_source", "value": src.id},
                            {"key": "uds_edge_target", "value": edge.id},
                        ],
                    },
                })

    for layer, anns in layer_anns.items():
        if not anns:
            continue
        yield SeedRecord(
            handle=H_ANN,
            kind="layers",
            collection="pub.layers.annotation.annotationLayer",
            body={
                "expression": expr_uri,
                "kind": "token-tag",
                "subkind": layer,
                "formalism": f"uds-{layer}",
                "annotations": anns,
                "languages": [LANGUAGE],
            },
        )

    # Predicate→argument and clausal-subordination edges in the
    # semantics domain, plus the interface edges that link
    # semantics nodes back to their syntactic heads. Surface all
    # of them as graphEdge records so consumers can reconstruct
    # the full UDS digraph.
    for src_idx, edges in enumerate(graph.adjacency):
        if src_idx >= len(nodes_by_index):
            continue
        src = nodes_by_index[src_idx]
        if src.domain == "syntax":
            # Skip pure UD syntactic edges; the segmentation +
            # the UD treebank publish path covers those.
            continue
        for edge in edges:
            tgt = nodes_by_id.get(edge.id)
            if tgt is None:
                continue
            yield SeedRecord(
                handle=H_GRAPH,
                kind="edges",
                collection="pub.layers.graph.graphEdge",
                body={
                    "source": {"recordRef": expr_uri, "objectId": src.id},
                    "target": {"recordRef": expr_uri, "objectId": tgt.id},
                    "edgeType": "see-also",
                    "label": f"{edge.domain}:{edge.type}",
                    "properties": {
                        "entries": [
                            {"key": "uds_split", "value": split_name},
                            {"key": "uds_sentence", "value": sentence_id},
                            {"key": "uds_edge_domain", "value": edge.domain},
                            {"key": "uds_edge_type", "value": edge.type},
                            *([{"key": "ud_deprel", "value": edge.deprel}]
                              if edge.deprel else []),
                        ],
                    },
                },
            )

    yield SeedRecord(
        handle=H_CORPUS,
        kind="memberships",
        collection="pub.layers.corpus.membership",
        body={"corpus": corpus_uri, "expression": expr_uri},
    )


__all__ = ["UDSToLayers"]


# Module-level instance for converter convenience.
project = UDSToLayers()
