# Upstream theories + lenses

Each subdirectory under `lexicons/upstream/` corresponds to one
upstream linguistic-data format the registry consumes. The pair
`theory.py` + `lens.py` together replace the implicit
dict-shovelling that earlier converters used, so the projection
from upstream shape to Layers shape is auditable, type-checked, and
reusable.

## The two pieces

### `theory.py` — what the upstream format actually is

Pydantic v2 `BaseModel`s that mirror the upstream format's
structure. Every field, every nested record, every enum that the
converter touches has an explicit type. Validation happens when the
converter parses raw upstream data into a theory instance: malformed
input fails fast at the upstream boundary, not somewhere inside the
record-emission code.

The theory is intentionally *isomorphic to the source format*, not
to Layers' lexicons. AMR's PENMAN graph, CHILDES's CHAT utterance,
UDS's NetworkX-shaped graph, PMB's DRS box — each gets a faithful
model. Cross-source common fields (e.g. surface text) are not
unified at this layer.

### `lens.py` — how the upstream maps to Layers

A pure function `project(theory_instance) -> list[SeedRecord]` that
returns Layers seed records. One theory instance may produce many
records of different collections (a UDS sentence becomes one
expression + one segmentation + six annotation layers + N graph
edges). The function is the *only* place the upstream-to-Layers
mapping logic lives; the converter at
`scripts/convert-external-resources.py` is a thin loop that calls
the lens and emits its output.

## Why this is not a panproto-DSL lens

panproto-lens-dsl currently supports field-level renames + injects
on a single source/target pair (see `crates/layers-codegen/src/lenses.rs`
and the 36 existing foreign-NSID lenses). That covers the
single-record cases (margin → annotation, leaflet → expression).
It does not cover the one-to-many record-type fanout these formats
need (one AMR graph → expression + annotation layer + many edges).
Until panproto's DSL grows multi-target primitives, the projection
lives as Python in `lens.py` rather than as a compiled
`dev.panproto.schema.lens` blob.

The interface contract is the same — a typed projection from a
named source theory to typed target records — so the file naming
and structure mirror the panproto convention. A future revision can
swap individual lenses to compiled blobs without changing the
converter API.

## Convention for `lens.py`

```python
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any
from .theory import <SourceTheoryRoot>


@dataclass(frozen=True, slots=True)
class SeedRecord:
    """One record the lens emits, parameterised on its target account."""
    handle: str           # e.g. "ewt.eng.uds.expression.layers.pub"
    kind: str             # batched-file leaf name (e.g. "expressions")
    collection: str       # NSID (e.g. "pub.layers.expression.expression")
    body: dict[str, Any]  # record body (without $type or createdAt; the
                          # converter adds those)
    summary: str | None   # optional changelog summary


def project(source: <SourceTheoryRoot>) -> Iterator[SeedRecord]:
    """Lens from `source` (one upstream-theory instance) to Layers.

    Each yielded SeedRecord is one record on one PDS account. The
    converter writes each to `lexicons/seeds/<handle>/<kind>.yaml`
    as one document in a multi-document YAML stream.
    """
    ...
```

## Adding a new upstream format

1. Read the upstream's published spec.
2. Write `lexicons/upstream/<name>/theory.py` capturing every
   field the lens will read. Cite the spec in the module docstring.
3. Write `lexicons/upstream/<name>/lens.py` projecting theory
   instances → SeedRecords. Cite the target Layers lexicon for
   each record type the lens produces.
4. Add a `convert_<name>` stage to
   `scripts/convert-external-resources.py` that parses raw upstream
   data, instantiates the theory, calls `lens.project`, and writes
   the output via `StreamWriter`.
5. Smoke-test with `--limit N`. Wire into the `--resource all`
   default if upstream data is locally available; otherwise gate
   behind an explicit operator-supplied input directory.

## Sources currently covered

| Source | Theory module | Lens | Smoke status |
|---|---|---|---|
| UDS 2.0 | `uds/theory.py` | `uds/lens.py` | locally testable via `~/Projects/decomp` |
| CHILDES | `childes/theory.py` | `childes/lens.py` | requires `--childes-dir` |
| AMR | `amr/theory.py` | `amr/lens.py` | requires `--amr-dir` |
| UCCA | `ucca/theory.py` | `ucca/lens.py` | requires `--ucca-dir` |
| PMB | `pmb/theory.py` | `pmb/lens.py` | requires `--pmb-dir`; covers gold + silver + bronze across all PMB languages |
