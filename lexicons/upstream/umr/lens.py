"""Lens: UMR document → Layers seed records.

Inputs: one UMRBundle (one (release, language) tuple of UMR
annotations).

Outputs:

* `pub.layers.corpus.corpus`         on `<release>.<lang>.umr.corpus.layers.pub`
* `pub.layers.corpus.membership`     on `<release>.<lang>.umr.corpus.layers.pub`
* `pub.layers.expression.expression` (one per sentence + one per document)
                                     on `<release>.<lang>.umr.expression.layers.pub`
* `pub.layers.annotation.annotationLayer` (sentence-level UMR + document-
  level temporal/modal/coref layers) on `<release>.<lang>.umr.annotation.layers.pub`
* `pub.layers.graph.graphNode`/`graphEdge` (one per UMR concept + one
  per labelled edge + one per document-level relation)
                                     on `<release>.<lang>.umr.graph.layers.pub`
* `pub.layers.graph.graphEdge` (cross-reference: UMR concept ↔ PropBank
  roleset when the concept matches the frameset pattern, **and only
  when the language is English**, since PropBank is English-only)
                                     on `semlink.graph.layers.pub`

UMR concepts that are PropBank framesets in English bundles get the
same cross-reference treatment as AMR. Non-English bundles skip
the PropBank link since PropBank-frames is English-only — future
language-specific PropBank-equivalents (Chinese PropBank, Arabic
PropBank) would extend this lens with parallel `propbank-zh`-style
cross-references.
"""

from __future__ import annotations

import re
from collections.abc import Iterator

from .. import SeedRecord, dx
from .theory import UMRBundle, UMRDocument, UMRSentenceGraph

PROPBANK_FRAMESET_RE = re.compile(r"^([a-z][a-z0-9_-]*)\.([0-9]{2,})$")
PROPBANK_HANDLE = "propbank.ontology.layers.pub"
PROPBANK_COLLECTION = "pub.layers.ontology.typeDef"
SEMLINK_HANDLE = "semlink.graph.layers.pub"

# UMR aspect typeDef account (canonical UMR-aspect ontology lives
# in the small-canon ontologies family if/when published; until
# then UMR aspect labels surface as graphNode properties).
UMR_ASPECT_HANDLE = "umr.ontology.layers.pub"


def _release_slug(release: str) -> str:
    return release.replace(".", "-")


def _at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


class UMRToLayers(dx.Mapping[UMRBundle, list]):
    """didactic Mapping: UMR release/language bundle → list[SeedRecord]."""

    def forward(self, bundle: UMRBundle) -> list:
        return list(_project_bundle(bundle))


def _project_bundle(bundle: UMRBundle) -> Iterator[SeedRecord]:
    rel = _release_slug(bundle.release)
    lang = bundle.language
    h_corpus = f"{rel}.{lang}.umr.corpus.layers.pub"
    h_expr = f"{rel}.{lang}.umr.expression.layers.pub"
    h_ann = f"{rel}.{lang}.umr.annotation.layers.pub"
    h_graph = f"{rel}.{lang}.umr.graph.layers.pub"

    corpus_rkey = f"umr-{rel}-{lang}"
    corpus_uri = _at_uri(h_corpus, "pub.layers.corpus.corpus", corpus_rkey)
    yield SeedRecord(
        handle=h_corpus,
        kind="corpus",
        collection="pub.layers.corpus.corpus",
        body={
            "name": f"UMR {bundle.release} ({lang})",
            "description": (
                f"Uniform Meaning Representation, release {bundle.release}, "
                f"language {lang}. Citation: {bundle.citation}. License: "
                f"{bundle.license}. Spec: Van Gysel et al. 2021 KI; "
                f"https://github.com/umr4nlp/umr-guidelines."
            ),
            "languages": [lang],
            "license": bundle.license,
        },
        summary=f"Initial publish: UMR {bundle.release} ({lang})",
    )

    for document in bundle.documents:
        yield from _project_document(
            document, rel, lang, corpus_uri,
            h_corpus, h_expr, h_ann, h_graph,
        )


def _project_document(
    document: UMRDocument,
    release: str,
    lang: str,
    corpus_uri: str,
    h_corpus: str,
    h_expr: str,
    h_ann: str,
    h_graph: str,
) -> Iterator[SeedRecord]:
    # Document-level expression spans the contiguous sentences.
    doc_text = " ".join(s.snt for s in document.sentences)
    doc_rkey = f"umr-doc-{document.id}".replace(".", "-")
    doc_uri = _at_uri(h_expr, "pub.layers.expression.expression", doc_rkey)
    yield SeedRecord(
        handle=h_expr,
        kind="documents",
        collection="pub.layers.expression.expression",
        body={
            "id": document.id,
            "kind": "document",
            "text": doc_text,
            "languages": [lang],
        },
    )

    # Per-sentence sentence expressions, with parentRef into the
    # document expression for hierarchical navigation.
    for sentence in document.sentences:
        yield from _project_sentence(
            sentence, document, release, lang, doc_uri,
            h_expr, h_ann, h_graph, h_corpus, corpus_uri,
        )

    # Document-level edges — temporal, modal, coref relations
    # between sentence-level subgraph variables.
    for edge in document.document_edges:
        src_node_rkey = f"umr-{edge.source_sentence_id}-{edge.source_variable}".replace(".", "-")
        tgt_node_rkey = f"umr-{edge.target_sentence_id}-{edge.target_variable}".replace(".", "-")
        yield SeedRecord(
            handle=h_graph,
            kind="document-edges",
            collection="pub.layers.graph.graphEdge",
            body={
                "source": {
                    "recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", src_node_rkey),
                },
                "target": {
                    "recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", tgt_node_rkey),
                },
                "edgeType": _edge_type_for_relation(edge.relation_class),
                "label": edge.relation,
                "properties": {
                    "entries": [
                        {"key": "umr_release", "value": release},
                        {"key": "umr_document", "value": document.id},
                        {"key": "umr_relation_class", "value": edge.relation_class},
                        {"key": "umr_relation", "value": edge.relation},
                    ]
                },
            },
        )


def _project_sentence(
    sentence: UMRSentenceGraph,
    document: UMRDocument,
    release: str,
    lang: str,
    doc_uri: str,
    h_expr: str,
    h_ann: str,
    h_graph: str,
    h_corpus: str,
    corpus_uri: str,
) -> Iterator[SeedRecord]:
    expr_rkey = f"umr-{sentence.id}".replace(".", "-")
    expr_uri = _at_uri(h_expr, "pub.layers.expression.expression", expr_rkey)
    yield SeedRecord(
        handle=h_expr,
        kind="sentences",
        collection="pub.layers.expression.expression",
        body={
            "id": sentence.id,
            "kind": "sentence",
            "text": sentence.snt,
            "parentRef": doc_uri,
            "languages": [lang],
        },
    )
    yield SeedRecord(
        handle=h_corpus,
        kind="memberships",
        collection="pub.layers.corpus.membership",
        body={"corpus": corpus_uri, "expression": expr_uri},
    )

    # One graph node per UMR concept; PropBank cross-reference for
    # English bundles whose concepts match the frameset regex.
    for node in sentence.nodes:
        node_rkey = f"umr-{sentence.id}-{node.variable}".replace(".", "-")
        node_uri = _at_uri(h_graph, "pub.layers.graph.graphNode", node_rkey)
        body: dict = {
            "nodeType": "concept",
            "knowledgeRefs": [
                {
                    "source": "umr-concept",
                    "identifier": node.concept,
                    "label": node.concept,
                }
            ],
            "properties": {
                "entries": [
                    {"key": "umr_release", "value": release},
                    {"key": "umr_sentence", "value": sentence.id},
                    {"key": "umr_variable", "value": node.variable},
                    {"key": "umr_is_frameset", "value": str(node.is_frameset)},
                    {"key": "umr_is_constant", "value": str(node.is_constant)},
                    *([{"key": "umr_aspect", "value": node.aspect}] if node.aspect else []),
                    *([{"key": "umr_modal_strength", "value": node.modal_strength}]
                      if node.modal_strength else []),
                ]
            },
        }
        yield SeedRecord(
            handle=h_graph,
            kind="nodes",
            collection="pub.layers.graph.graphNode",
            body=body,
        )

        # PropBank cross-reference is English-only.
        if lang == "eng" and PROPBANK_FRAMESET_RE.match(node.concept):
            pb_rkey = f"roleset-{node.concept}".replace(".", "-")
            pb_uri = _at_uri(PROPBANK_HANDLE, PROPBANK_COLLECTION, pb_rkey)
            yield SeedRecord(
                handle=SEMLINK_HANDLE,
                kind="umr-propbank",
                collection="pub.layers.graph.graphEdge",
                body={
                    "source": {"recordRef": node_uri},
                    "target": {"recordRef": pb_uri},
                    "edgeType": "same-as",
                    "label": f"umr-frameset-of:{node.concept}",
                    "properties": {
                        "entries": [
                            {"key": "src_resource", "value": "UMR"},
                            {"key": "src_release", "value": release},
                            {"key": "src_language", "value": lang},
                            {"key": "src_kind", "value": "concept-frameset"},
                            {"key": "tgt_resource", "value": "PropBank"},
                            {"key": "tgt_kind", "value": "roleset"},
                            {"key": "concept", "value": node.concept},
                        ]
                    },
                    "confidence": 1000,
                },
            )

    for edge in sentence.edges:
        src_rkey = f"umr-{sentence.id}-{edge.source_variable}".replace(".", "-")
        if edge.target_variable is not None:
            tgt_rkey = f"umr-{sentence.id}-{edge.target_variable}".replace(".", "-")
            target_ref = {
                "recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", tgt_rkey)
            }
        else:
            target_ref = {
                "knowledgeRef": {
                    "source": "umr-constant",
                    "identifier": edge.target_constant or "",
                    "label": edge.target_constant or "",
                }
            }
        yield SeedRecord(
            handle=h_graph,
            kind="edges",
            collection="pub.layers.graph.graphEdge",
            body={
                "source": {
                    "recordRef": _at_uri(h_graph, "pub.layers.graph.graphNode", src_rkey)
                },
                "target": target_ref,
                "edgeType": "see-also",
                "label": edge.role,
                "properties": {
                    "entries": [
                        {"key": "umr_release", "value": release},
                        {"key": "umr_sentence", "value": sentence.id},
                        {"key": "umr_role", "value": edge.role},
                    ]
                },
            },
        )

    yield SeedRecord(
        handle=h_ann,
        kind="sentence-layers",
        collection="pub.layers.annotation.annotationLayer",
        body={
            "expression": expr_uri,
            "kind": "graph",
            "subkind": "umr-sentence",
            "formalism": f"umr-{release}",
            "annotations": [
                {
                    "anchor": {"$type": "pub.layers.defs#documentAnchor"},
                    "predicate": "umr-sentence",
                    "value": sentence.id,
                }
            ],
            "languages": [lang],
        },
    )


def _edge_type_for_relation(relation_class: str) -> str:
    """UMR document-level relation classes → Layers graphEdge.edgeType."""
    if relation_class == "temporal":
        return "see-also"
    if relation_class == "modal":
        return "supports"
    if relation_class == "coref":
        return "coreference"
    return "see-also"


__all__ = ["UMRToLayers"]

project = UMRToLayers()
