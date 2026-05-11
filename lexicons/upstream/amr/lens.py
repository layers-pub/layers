"""Lens: AMR graph → Layers seed records.

Inputs: one AMRBundle (PENMAN-parsed AMR release).

Outputs (per AMR sentence):

* `pub.layers.expression.expression`     on `<release>.eng.amr.expression.layers.pub`
* `pub.layers.annotation.annotationLayer` (graph kind) on `<release>.eng.amr.annotation.layers.pub`
* `pub.layers.graph.graphNode` (one per AMR concept node) on `<release>.eng.amr.graph.layers.pub`
* `pub.layers.graph.graphEdge` (one per labelled edge) on `<release>.eng.amr.graph.layers.pub`
* `pub.layers.corpus.corpus` + `pub.layers.corpus.membership` on `<release>.eng.amr.corpus.layers.pub`

The `<release>` leaf encodes the LDC release tag (`1.0`, `2.0`,
`3.0`) so future releases sit alongside earlier ones without
renaming sibling accounts. AMR is English-only as released by ISI,
so the language tier is fixed `eng`.

Note on licensing: AMR releases ship under the LDC User Agreement,
which restricts redistribution. This lens emits the projection
unconditionally; the converter caller is responsible for ensuring
the operator has the right to publish to a registry PDS.

Cross-references: any AMR concept matching the PropBank-frameset
pattern `<lemma>.<NN>` (e.g. `give-01`, `believe-02`) emits a
`same-as` graphEdge from the AMR concept node onto the corresponding
PropBank `roleset-<id>` typeDef on `propbank.ontology.layers.pub`,
landing on the shared `semlink.graph.layers.pub` cross-reference
account. This wires AMR concepts into the same PropBank roleset
inventory the SemLink converter populates, so a query for "all
records mentioning `give-01`" surfaces both PropBank lemmas and
AMR sentences uniformly.
"""

from __future__ import annotations

import re
from collections.abc import Iterator

from .. import SeedRecord, dx
from .theory import AMRBundle, AMRGraph

LANGUAGE = "eng"

# AMR PENMAN concepts serialise PropBank rolesets with a hyphen
# separator (`want-01`, `give-01`), where the upstream PropBank
# release stores the same roleset with a period (`want.01`).
# The regex matches the AMR form so the lens recognises framesets
# in PENMAN-serialised AMR; `_propbank_rkey_for` projects back to
# the canonical period-form rkey when emitting cross-reference
# edges to the PropBank account.
PROPBANK_FRAMESET_RE = re.compile(r"^([a-z][a-z0-9_]*)-([0-9]{2,})$")


def _propbank_rkey_for(amr_concept: str) -> str:
    """Project an AMR concept like `want-01` to the PropBank typeDef
    rkey used on `propbank.ontology.layers.pub`. The PropBank
    converter (`convert_propbank` in
    `scripts/convert-external-resources.py`) emits rolesets with rkey
    `roleset-{lemma}-{NN}` (dashes, never dots — DNS-safe), so the
    AMR → PropBank target must match that form exactly.
    """
    m = PROPBANK_FRAMESET_RE.match(amr_concept)
    assert m is not None
    return f"roleset-{m.group(1)}-{m.group(2)}"
PROPBANK_HANDLE = "propbank.ontology.layers.pub"
PROPBANK_COLLECTION = "pub.layers.ontology.typeDef"
SEMLINK_HANDLE = "semlink.graph.layers.pub"


def _release_slug(release: str) -> str:
    """LDC release tag → DNS-safe leaf segment (`1-0`, `2-0`, `3-0`)."""
    return release.replace("amr-", "").replace(".", "-")


def _at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


class AMRToLayers(dx.Mapping[AMRBundle, list]):
    """didactic Mapping: AMR release bundle → list[SeedRecord]."""

    def forward(self, bundle: AMRBundle) -> list:
        return list(_project_bundle(bundle))


def _project_bundle(bundle: AMRBundle) -> Iterator[SeedRecord]:
    rel = _release_slug(bundle.release)
    h_corpus = f"{rel}.eng.amr.corpus.layers.pub"
    h_expr = f"{rel}.eng.amr.expression.layers.pub"
    h_ann = f"{rel}.eng.amr.annotation.layers.pub"
    h_graph = f"{rel}.eng.amr.graph.layers.pub"

    corpus_rkey = f"amr-{rel}"
    corpus_uri = _at_uri(h_corpus, "pub.layers.corpus.corpus", corpus_rkey)
    yield SeedRecord(
        handle=h_corpus,
        kind="corpus",
        collection="pub.layers.corpus.corpus",
        body={
            "name": f"AMR {bundle.release} (English)",
            "description": (
                f"Abstract Meaning Representation, LDC release {bundle.release}. "
                f"Citation: {bundle.citation}. Banarescu et al. 2013 LAW. "
                f"License: {bundle.license}"
            ),
            "languages": [LANGUAGE],
            "license": bundle.license,
        },
        summary=f"Initial publish: AMR {bundle.release}",
    )

    for graph in bundle.graphs:
        yield from _project_graph(graph, bundle.release, corpus_uri,
                                  h_corpus, h_expr, h_ann, h_graph)


def _project_graph(
    graph: AMRGraph,
    release: str,
    corpus_uri: str,
    h_corpus: str,
    h_expr: str,
    h_ann: str,
    h_graph: str,
) -> Iterator[SeedRecord]:
    expr_rkey = f"amr-{graph.id}".replace(".", "-").replace("/", "-")
    expr_uri = _at_uri(h_expr, "pub.layers.expression.expression", expr_rkey)
    yield SeedRecord(
        handle=h_expr,
        kind="expressions",
        collection="pub.layers.expression.expression",
        body={
            "id": graph.id,
            "kind": "sentence",
            "text": graph.snt,
            "languages": [LANGUAGE],
        },
    )

    yield SeedRecord(
        handle=h_corpus,
        kind="memberships",
        collection="pub.layers.corpus.membership",
        body={"corpus": corpus_uri, "expression": expr_uri},
    )

    # One graph node per AMR concept (via pub.layers.graph.graphNode).
    # When the concept matches the PropBank-frameset pattern, emit an
    # additional same-as edge onto the corresponding PropBank typeDef.
    for node in graph.nodes:
        node_rkey = f"amr-{graph.id}-{node.variable}".replace(".", "-")
        node_uri = _at_uri(h_graph, "pub.layers.graph.graphNode", node_rkey)
        yield SeedRecord(
            handle=h_graph,
            kind="nodes",
            collection="pub.layers.graph.graphNode",
            body={
                "nodeType": "concept",
                "knowledgeRefs": [
                    {
                        "source": "amr-concept",
                        "identifier": node.concept,
                        "label": node.concept,
                    }
                ],
                "properties": {
                    "entries": [
                        {"key": "amr_release", "value": release},
                        {"key": "amr_sentence", "value": graph.id},
                        {"key": "amr_variable", "value": node.variable},
                        {"key": "amr_is_frameset", "value": str(node.is_frameset)},
                        {"key": "amr_is_constant", "value": str(node.is_constant)},
                    ]
                },
            },
        )

        # Cross-reference into PropBank when concept is a frameset.
        if PROPBANK_FRAMESET_RE.match(node.concept):
            pb_uri = _at_uri(
                PROPBANK_HANDLE, PROPBANK_COLLECTION, _propbank_rkey_for(node.concept)
            )
            yield SeedRecord(
                handle=SEMLINK_HANDLE,
                kind="amr-propbank",
                collection="pub.layers.graph.graphEdge",
                body={
                    "source": {"recordRef": node_uri},
                    "target": {"recordRef": pb_uri},
                    "edgeType": "same-as",
                    "label": f"amr-frameset-of:{node.concept}",
                    "properties": {
                        "entries": [
                            {"key": "src_resource", "value": "AMR"},
                            {"key": "src_release", "value": release},
                            {"key": "src_kind", "value": "concept-frameset"},
                            {"key": "tgt_resource", "value": "PropBank"},
                            {"key": "tgt_kind", "value": "roleset"},
                            {"key": "concept", "value": node.concept},
                        ]
                    },
                    "confidence": 1000,
                },
            )

    # One graph edge per labelled AMR role.
    for edge in graph.edges:
        src_rkey = f"amr-{graph.id}-{edge.source_variable}".replace(".", "-")
        if edge.target_variable is not None:
            tgt_rkey = f"amr-{graph.id}-{edge.target_variable}".replace(".", "-")
            target_ref = {"recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", tgt_rkey)}
        else:
            target_ref = {
                "knowledgeRef": {
                    "source": "amr-constant",
                    "identifier": edge.target_constant or "",
                    "label": edge.target_constant or "",
                }
            }
        yield SeedRecord(
            handle=h_graph,
            kind="edges",
            collection="pub.layers.graph.graphEdge",
            body={
                "source": {"recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", src_rkey)},
                "target": target_ref,
                "edgeType": "see-also",
                "label": edge.role,
                "properties": {
                    "entries": [
                        {"key": "amr_release", "value": release},
                        {"key": "amr_sentence", "value": graph.id},
                        {"key": "amr_role", "value": edge.role},
                    ]
                },
            },
        )

    # One annotation layer wrapping the whole graph for fast lookups
    # by sentence (the bag-of-edges view).
    yield SeedRecord(
        handle=h_ann,
        kind="layers",
        collection="pub.layers.annotation.annotationLayer",
        body={
            "expression": expr_uri,
            "kind": "graph",
            "subkind": "amr",
            "formalism": f"amr-{release}",
            "annotations": [
                {
                    "anchor": {"$type": "pub.layers.defs#documentAnchor"},
                    "label": "amr",
                    "value": graph.id,
                }
            ],
            "languages": [LANGUAGE],
            "metadata": {
                "entries": [
                    {"key": "root_variable", "value": graph.root_variable},
                    *[
                        {"key": f"amr_{k}", "value": v}
                        for k, v in graph.metadata.items()
                        if isinstance(v, str)
                    ],
                ]
            },
        },
    )


__all__ = ["AMRToLayers"]

project = AMRToLayers()
