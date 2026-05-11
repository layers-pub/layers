# Upstream theories + lenses

Each subdirectory under `lexicons/upstream/` corresponds to one
upstream linguistic-data format the registry consumes. The pair
`theory.py` + `lens.py` together replace the implicit
dict-shovelling that earlier converters used, so the projection
from upstream shape to Layers shape is auditable, type-checked, and
reusable.

## The two pieces

### `theory.py` — what the upstream format actually is

`dx.Model` subclasses (from
[didactic](https://github.com/panproto/didactic), the Python
toolkit for panproto theories) that mirror the upstream format's
structure. Every field, every nested record, every enum that the
lens reads has an explicit type. Validation runs at theory
construction: malformed upstream input fails fast at the boundary,
not somewhere inside record emission. Models declare
`extra="ignore"` via the class header so upstream-only fields the
lens does not consume pass through silently.

```python
import didactic.api as dx

class UDSNode(dx.Model, extra="ignore"):
    id: str
    domain: NodeDomain
    type: NodeType | None = None
    # …
```

Nested models are referenced by bare type (didactic v0.7+ bare-
Model field types — no `dx.Embed[T]` wrappers needed).

The theory is intentionally *isomorphic to the source format*, not
to Layers' lexicons. AMR's PENMAN graph, CHILDES's CHAT utterance,
UDS's NetworkX-shaped graph, PMB's DRS box — each gets a faithful
model. Cross-source common fields (e.g. surface text) are not
unified at this layer.

### `lens.py` — how the upstream maps to Layers

A `dx.Mapping[<TheoryRoot>, list]` whose `forward()` returns Layers
`SeedRecord` instances. One theory instance may produce many
records of different collections (one UDS sentence → one
expression + one segmentation + six annotation layers + N graph
edges + one membership). The lens is the *only* place upstream-to-
Layers mapping logic lives; the converter at
`scripts/convert-external-resources.py` is a thin loop that
instantiates the theory, runs the lens, and writes the output.

## Why a didactic Mapping rather than a panproto-lens-dsl blob

panproto-lens-dsl currently supports field-level renames + injects
on a single source/target NSID pair (see
`crates/layers-codegen/src/lenses.rs` and the 36 existing foreign-
NSID lenses). That covers the single-record cases (margin →
annotation, leaflet → expression). It does not cover the one-to-
many record-type fanout these formats need (one AMR graph →
expression + annotation layer + many graphNodes + many
graphEdges + cross-references into PropBank).

Until panproto's DSL grows multi-target primitives, the projection
lives as a `dx.Mapping` in `lens.py`. didactic *is* panproto's
Python toolkit, so the file naming and the Mapping contract are
already the panproto convention; a future revision can swap
individual lenses to compiled `dev.panproto.schema.lens` blobs
without changing the converter API.

## Convention for `lens.py`

```python
from collections.abc import Iterator
from .. import SeedRecord, dx
from .theory import <SourceTheoryRoot>


class <Source>ToLayers(dx.Mapping[<SourceTheoryRoot>, list]):
    """didactic Mapping: one upstream-theory instance → list[SeedRecord]."""

    def forward(self, source: <SourceTheoryRoot>) -> list:
        return list(_project(source))


def _project(source: <SourceTheoryRoot>) -> Iterator[SeedRecord]:
    # yield SeedRecord(handle=…, kind=…, collection=…, body=…, summary=…)
    ...


project = <Source>ToLayers()  # convenience for converter
```

`SeedRecord` (defined in `lexicons/upstream/__init__.py`) carries:

```python
class SeedRecord(dx.Model, extra="ignore"):
    handle: str           # e.g. "ewt.eng.uds.expression.layers.pub"
    kind: str             # batched-file leaf name (e.g. "expressions")
    collection: str       # NSID (e.g. "pub.layers.expression.expression")
    body: JsonObject      # record body (the converter adds $type +
                          # createdAt).
    summary: str | None   # optional changelog summary
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
| UDS 2.0 (normalized) | `uds/theory.py` | `uds/lens.py` | locally testable via `~/Projects/decomp` |
| UDS 2.0 (raw, per-annotator) | `uds/theory.py` (`UDSRawDataset`) | `uds/lens_raw.py` | locally testable via `~/Projects/decomp` `data/2.0/raw/`; emits `subkind=<name>-raw` annotation layers alongside the normalized aggregates |
| CHILDES | `childes/theory.py` | `childes/lens.py` | requires `--childes-dir`; pylangacq parser → `CHILDESCorpus` wired |
| AMR | `amr/theory.py` | `amr/lens.py` | requires `--amr-dir`; PENMAN parser wired; English framesets emit `same-as` edges to `propbank.ontology.layers.pub` via `semlink.graph.layers.pub` |
| UCCA | `ucca/theory.py` | `ucca/lens.py` | requires `--ucca-dir`; XML → `UCCABundle` parser still operator-side |
| PMB | `pmb/theory.py` | `pmb/lens.py` | requires `--pmb-dir`; CLF → `PMBBundle` parser still operator-side; English Concept-clauses emit `same-as` edges to `pwn.eng.wordnet.resource.layers.pub` via `semlink.graph.layers.pub` |
| UMR | `umr/theory.py` | `umr/lens.py` | requires `--umr-dir`; release-format → `UMRBundle` parser still operator-side; English framesets emit `same-as` edges to `propbank.ontology.layers.pub` via `semlink.graph.layers.pub` |
