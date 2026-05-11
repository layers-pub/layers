"""Theory of UDS 2.0 (Universal Decompositional Semantics).

Source spec:
  decomp toolkit: github.com/decompositional-semantics-initiative/decomp
  UDS 2.0 dataset bundled at decomp/data/2.0/normalized/sentence/.
  License: CC BY-SA 4.0 (decomp/data/LICENSE).
  Citation: White, Aaron Steven et al. 2020. The Universal
    Decompositional Semantics Dataset and Decomp Toolkit. LREC 2020,
    pages 5698-5707.

UDS sentences are NetworkX-style directed multigraphs with two
domains of nodes: `syntax` (UD tokens) and `semantics` (predicates +
arguments). Inter-domain edges link semantic nodes back to their
syntactic head via `frompredpatt`. Each sentence carries six
attribute layers (factuality, time, wordsense, genericity,
protoroles, event_structure) attached to relevant nodes.

This theory captures the *normalized* JSON dump shape (the format
emitted by `python -m decomp.semantics.uds.UDSCorpus.dump_jsonld`).
Field names match the on-disk JSON; field types capture only what
the lens reads.
"""

from __future__ import annotations

from typing import Literal

from didactic.types._typing import JsonObject, JsonValue

import didactic.api as dx

# UDS attribute-layer names that ride on individual nodes/edges.
# Drawn from `UDSAnnotationType` in decomp/semantics/uds/__init__.py
# and from the metadata key set in the normalized JSON bundles.
UDS_ATTRIBUTE_LAYERS: tuple[str, ...] = (
    "factuality",
    "time",
    "wordsense",
    "genericity",
    "protoroles",
    "event_structure",
)

# Three structural domains a UDS node/edge can sit in. Per
# decomp's data-model docs (decomp/docs/source/data/*.rst):
#   syntax     — UD-EWT token + root nodes; UD dependency edges.
#   semantics  — PredPatt predicate + argument nodes; predicate→
#                argument dependency edges + clausal-subordination
#                head edges.
#   interface  — instance edges from semantics nodes to their
#                head/nonhead syntax nodes.
#   root       — the per-sentence root node carries domain="root"
#                AND type="root" (see syntactic-graphs.rst).
NodeDomain = Literal["syntax", "semantics", "root"]
EdgeDomain = Literal["syntax", "semantics", "interface"]

# Node `type` discriminators decomp's NetworkX dump uses.
# Syntax: `token` (regular UD token), `root` (the special root node).
# Semantics: `predicate`, `argument`.
NodeType = Literal["token", "root", "predicate", "argument"]

# Edge `type` discriminators. `dependency` covers UD syntactic
# deprels and predicate→argument links; `head`/`nonhead` cover
# instance edges (semantics → syntax) and clausal subordination
# (argument → predicate).
EdgeType = Literal["dependency", "head", "nonhead"]


class UDSNode(dx.Model, extra="ignore"):
    """One node in a UDS sentence graph.
    All three domains share this shape; the `domain` discriminator
    distinguishes them. Syntax nodes carry UD `form` / `lemma` /
    `upos` / `xpos` / `position` attributes; semantics nodes carry
    `frompredpatt` plus the optional UDS-attribute layers.
    """

    id: str = dx.field(description="Globally-unique node identifier (e.g. `ewt-dev-1-syntax-3`, `ewt-dev-1-semantics-pred-2`, `ewt-dev-1-root-0`).")
    domain: NodeDomain
    type: NodeType | None = None
    position: int | None = dx.field(default=None, description="1-indexed token position for syntax-domain nodes; 0 for the root node.")
    form: str | None = None
    lemma: str | None = None
    upos: str | None = None
    xpos: str | None = None
    frompredpatt: bool | None = None
    factuality: JsonObject | None = None
    time: JsonObject | None = None
    wordsense: JsonObject | None = None
    genericity: JsonObject | None = None
    event_structure: JsonObject | None = None
    protoroles: JsonObject | None = None


class UDSEdge(dx.Model, extra="ignore"):
    """One edge in a UDS sentence graph.
    decomp serialises adjacency as
    `[ [edge, edge, ...], [edge, ...], ... ]`, keyed by source-node
    *list-index* into `nodes`. Each inner edge dict carries the
    target-node *string identifier* in `id` (it is the node's
    `id`, not a list index), the edge's `domain` and `type`,
    and the optional UD `deprel` for syntax dependencies plus
    `frompredpatt` for semantics-domain edges.
    """

    id: str = dx.field(description="String identifier of the target node (matches a `UDSNode.id`).")
    domain: EdgeDomain
    type: EdgeType
    deprel: str | None = dx.field(default=None, description="UD dependency relation, set on syntax-domain dependency edges.")
    frompredpatt: bool | None = None
    factuality: JsonObject | None = None
    time: JsonObject | None = None
    wordsense: JsonObject | None = None
    genericity: JsonObject | None = None
    event_structure: JsonObject | None = None
    protoroles: JsonObject | None = None



class UDSSentenceGraph(dx.Model, extra="ignore"):
    """One sentence-level UDS graph in NetworkX-dump form.
    See `decomp/semantics/uds/UDSSentenceGraph.to_dict()` for the
    canonical emission and `_normalized.json` files for samples.
    """

    directed: bool = True
    multigraph: bool = True
    graph: tuple[JsonValue, ...] = dx.field(default_factory=tuple)
    nodes: tuple[UDSNode, ...]
    adjacency: tuple[tuple[UDSEdge, ...], ...] = dx.field(default_factory=tuple)


class UDSSplit(dx.Model, extra="ignore"):
    """One split (train/dev/test) of UDS over the UD-EWT bundle."""
    name: Literal["train", "dev", "test"]
    metadata: JsonObject = dx.field(default_factory=dict)
    data: dict[str, UDSSentenceGraph] = dx.field(default_factory=dict)


# ---------------------------------------------------------------------
# Raw UDS (per-annotator) shape
#
# Normalized UDS aggregates each (sentence, entity, property) tuple
# into a single `{value, confidence}` pair (decomp's
# `UDSAnnotation.normalize`). Raw UDS keeps every annotator's
# response. `decomp/data/2.0/raw/{sentence,document}/annotations/
# <phenomenon>.json` is the on-disk form.
#
# Wire shape (per phenomenon file):
#
#     {
#       "metadata": {
#         "<phenomenon>": {
#           "<property>": {
#             "value":      {"datatype": "int", "categories": [...], "ordered": bool},
#             "confidence": {"datatype": "int", "categories": [...], "ordered": bool},
#             "annotators": ["<phenomenon>-annotator-0", ...]
#           },
#           ...
#         }
#       },
#       "data": {
#         "<sentence-id>": {
#           "<entity-key>": {
#             "<phenomenon>": {
#               "<property>": {
#                 "value":      {"<annotator-id>": <int>, ...},
#                 "confidence": {"<annotator-id>": <int>, ...}
#               },
#               ...
#             }
#           },
#           ...
#         },
#         ...
#       }
#     }
#
# `<entity-key>` is either a single node id (for node-borne
# phenomena like factuality) or `<src>%%<tgt>` (for edge-borne
# phenomena like protoroles). The doc-level files use
# document/sentence ids in the same shape.
# ---------------------------------------------------------------------


# Raw-UDS sentence-level layers, drawn from decomp/data/2.0/raw/
# sentence/annotations/*.json. Mirrors the normalized layer set
# except that decomp ships event_structure as two separate raw
# files (distributivity + natural_parts) that get fused when
# normalized.
UDS_RAW_SENTENCE_LAYERS: tuple[str, ...] = (
    "factuality",
    "genericity",
    "wordsense",
    "time",
    "event_structure_distributivity",
    "event_structure_natural_parts",
    "protoroles",
)

# Raw-UDS document-level layers under decomp/data/2.0/raw/document/.
UDS_RAW_DOCUMENT_LAYERS: tuple[str, ...] = (
    "time",
    "event_structure_mereology",
)


class UDSRawLayer(dx.Model, extra="ignore"):
    """One raw-UDS phenomenon file (e.g. factuality.json).

    `data` keys are sentence ids (or document ids for doc-level
    layers). Each value maps `<entity-key>` (a node id, or a
    `<src>%%<tgt>` edge key) to a property → annotator map.
    """

    name: Literal[
        "factuality",
        "genericity",
        "wordsense",
        "time",
        "event_structure_distributivity",
        "event_structure_natural_parts",
        "protoroles",
        "event_structure_mereology",
    ] = dx.field(description="UDS phenomenon name; matches the source filename stem.")
    scope: Literal["sentence", "document"] = "sentence"
    metadata: JsonObject = dx.field(default_factory=dict)
    data: dict[str, JsonObject] = dx.field(
        default_factory=dict,
        description="Sentence-or-document id → entity-key → property-and-annotator nested dict.",
    )


class UDSRawDataset(dx.Model, extra="ignore"):
    """A bundle of raw-UDS phenomenon files, sentence + document scope."""

    layers: tuple[UDSRawLayer, ...] = dx.field(default_factory=tuple)


__all__ = [
    "UDSNode",
    "UDSEdge",
    "UDSSentenceGraph",
    "UDSSplit",
    "UDSRawLayer",
    "UDSRawDataset",
    "UDS_ATTRIBUTE_LAYERS",
    "UDS_RAW_SENTENCE_LAYERS",
    "UDS_RAW_DOCUMENT_LAYERS",
    "NodeDomain",
    "EdgeDomain",
    "NodeType",
    "EdgeType",
]
