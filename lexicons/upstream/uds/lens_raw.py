"""Lens: raw UDS dataset → Layers seed records.

Normalized UDS aggregates per-(entity, property) annotations
into a single (value, confidence) pair. Raw UDS keeps every
annotator's response, which is the form psycholinguistic
re-analyses need. This lens emits one
`pub.layers.annotation.annotationLayer` per (sentence,
phenomenon) tuple, carrying every annotator's `(value, confidence)`
in the annotation's `value` (compact JSON) and `features` (a
flat list of `(annotator, property, kind, score)` tuples).

Records share the same handles as the normalized lens
(`ewt.eng.uds.*.layers.pub`) so the raw and normalized views
co-publish to the same registry accounts. The `subkind` /
`formalism` carry a `-raw` suffix so consumers can filter:

* `subkind = factuality-raw`, `formalism = uds-factuality-raw`
* `subkind = protoroles-raw`,  `formalism = uds-protoroles-raw`
* …

For document-level phenomena (time, event_structure_mereology
under `data/2.0/raw/document/`), records anchor on a
document-level expression (`<doc-id>`) on
`ewt.eng.uds.expression.layers.pub`. The lens assumes such an
expression exists — the normalized lens publishes one
expression per sentence, and document-level expressions are a
future addition. Until then, doc-level raw records pin to the
sentence expression named in the raw `data` key.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any

from .. import SeedRecord, dx
from .theory import UDSRawDataset, UDSRawLayer

LANGUAGE = "eng"

H_EXPR = "ewt.eng.uds.expression.layers.pub"
H_ANN = "ewt.eng.uds.annotation.layers.pub"


def _at_uri(handle: str, collection: str, rkey: str) -> str:
    return f"at://{handle}/{collection}/{rkey}"


def _serialise(payload: Any) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def _head_token_idx(node_id: str) -> int:
    """Semantics node IDs encode the head token's 1-indexed
    position as the trailing segment (`ewt-dev-1-semantics-pred-4`
    → token 4). Return the 0-indexed offset, or 0 when the tail
    isn't an integer (e.g. `arg-speaker`, `pred-root`)."""
    tail = node_id.rsplit("-", 1)[-1]
    try:
        return max(0, int(tail) - 1)
    except ValueError:
        return 0


def _entity_anchor(entity_key: str, seg_uri: str) -> dict[str, Any]:
    """Build an anchor for an entity-key. Node keys
    (`<sentence>-semantics-pred-4`) anchor on the head token;
    edge keys (`<src>%%<tgt>`) anchor on the target node's head
    token (the argument whose role we're scoring)."""
    if "%%" in entity_key:
        _src, tgt = entity_key.split("%%", 1)
        token = _head_token_idx(tgt)
    else:
        token = _head_token_idx(entity_key)
    return {
        "$type": "pub.layers.defs#tokenRef",
        "segmentation": seg_uri,
        "tokenization": 0,
        "token": token,
    }


class UDSRawToLayers(dx.Mapping[UDSRawDataset, list]):
    """didactic Mapping: raw UDS dataset → list[SeedRecord]."""

    def forward(self, dataset: UDSRawDataset) -> list:
        return list(_project_dataset(dataset))


def _project_dataset(dataset: UDSRawDataset) -> Iterator[SeedRecord]:
    for layer in dataset.layers:
        yield from _project_layer(layer)


def _project_layer(layer: UDSRawLayer) -> Iterator[SeedRecord]:
    suffix = "-raw" if layer.scope == "sentence" else "-raw-doc"
    subkind = f"{layer.name}{suffix}"
    formalism = f"uds-{layer.name}{suffix}"

    # Pre-extract the declared property + annotator inventory
    # from the layer metadata; surface it as features on every
    # emitted annotation so downstream consumers don't need to
    # re-derive the schema from the per-annotator payload.
    schema = (layer.metadata or {}).get(layer.name, {})
    declared_props = sorted(schema.keys()) if isinstance(schema, dict) else []

    for sentence_id, entities in layer.data.items():
        expr_rkey = f"uds-{sentence_id}"
        expr_uri = _at_uri(H_EXPR, "pub.layers.expression.expression", expr_rkey)
        seg_rkey = f"uds-seg-{sentence_id}"
        seg_uri = _at_uri(H_EXPR.replace(".expression.", ".segmentation."),
                          "pub.layers.segmentation.segmentation", seg_rkey)
        if not isinstance(entities, dict):
            continue
        anns: list[dict[str, Any]] = []
        for entity_key, phenomenon_payload in entities.items():
            if not isinstance(phenomenon_payload, dict):
                continue
            payload = phenomenon_payload.get(layer.name)
            if not isinstance(payload, dict):
                continue
            annotators = _annotator_set(payload)
            anns.append({
                "anchor": _entity_anchor(entity_key, seg_uri),
                "label": layer.name,
                "value": _serialise(payload),
                "features": {
                    "entries": [
                        {"key": "uds_entity", "value": entity_key},
                        {"key": "uds_entity_kind",
                         "value": "edge" if "%%" in entity_key else "node"},
                        {"key": "uds_annotator_count", "value": str(len(annotators))},
                        *([{"key": "uds_property", "value": p}
                           for p in declared_props]),
                    ]
                },
            })
        if not anns:
            continue
        yield SeedRecord(
            handle=H_ANN,
            kind="layers-raw",
            collection="pub.layers.annotation.annotationLayer",
            body={
                "expression": expr_uri,
                "kind": "token-tag",
                "subkind": subkind,
                "formalism": formalism,
                "annotations": anns,
                "languages": [LANGUAGE],
                "metadata": {
                    "entries": [
                        {"key": "uds_layer_name", "value": layer.name},
                        {"key": "uds_layer_scope", "value": layer.scope},
                    ]
                },
            },
        )


def _annotator_set(payload: dict[str, Any]) -> set[str]:
    """Collect the union of annotator ids across every property
    in one entity-key's payload. Used purely for the feature
    `uds_annotator_count`."""
    annotators: set[str] = set()
    for prop_block in payload.values():
        if not isinstance(prop_block, dict):
            continue
        for kind_block in prop_block.values():
            if isinstance(kind_block, dict):
                annotators.update(kind_block.keys())
    return annotators


__all__ = ["UDSRawToLayers"]


project = UDSRawToLayers()
