"""Upstream-format theories + lenses, panproto-compatible via didactic.

See ./README.md for the convention. Every upstream theory inherits
from `didactic.api.Model` (which IS a panproto theory): structurally
fingerprintable, schema-checked at instantiation, immutable. Every
lens is a `didactic.api.Mapping[<source-theory-root>, tuple[SeedRecord, ...]]`
so it carries panproto compatibility today and rides the eventual
panproto-Lens compilation path tomorrow without API churn.

`SeedRecord` is itself a panproto theory.
"""

from __future__ import annotations

from didactic.types._typing import JsonObject

import didactic.api as dx


class SeedRecord(dx.Model, extra="ignore"):
    """One record produced by a lens.

    The converter writes each SeedRecord into
    `lexicons/seeds/<handle>/<kind>.yaml` as one document of a
    multi-document YAML stream. `$type` and `createdAt` are injected
    at write time by the StreamWriter; lens functions emit only the
    record-shape fields.

    Fields
    ------
    handle:
        PDS account handle that hosts the record. Follows the
        `<record-set>.<namespace>.layers.pub` convention.
    kind:
        Stem of the batched output file (e.g. `expressions` →
        `<handle>/expressions.yaml`). One per (handle, record-type)
        pair so a single account's records group naturally.
    collection:
        NSID of the record's lexicon (e.g.
        `pub.layers.expression.expression`).
    body:
        The record body as a dict. The converter adds `$type` +
        `createdAt`; lenses must not.
    summary:
        Optional human-meaningful summary of what this record means.
        Used for the operator changelog when fingerprints shift.
    """

    handle: str
    kind: str
    collection: str
    body: JsonObject
    summary: str | None = None


__all__ = ["SeedRecord", "dx"]
