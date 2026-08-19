# Upstream theories and projection mappings

The modules under `lexicons/upstream/` describe established linguistic data formats and their projection into Layers records. They are supporting conversion definitions, not `pub.layers.*` lexicons and not a packaged command-line converter.

Each source directory contains two parts:

- `theory.py` models the upstream format with typed `didactic.api.Model` classes.
- `lens.py` maps a theory instance to one or more `SeedRecord` values.

The split keeps source parsing separate from Layers record construction. A theory follows the source format's own structure, while its mapping decides which Layers collections to emit and how to preserve source references.

## Source theories

Theory models describe the upstream object rather than the Layers target. AMR retains its graph organization, CHILDES retains CHAT utterances, and UDS retains its node and edge structure. Model construction therefore provides a typed boundary before projection begins.

```python
import didactic.api as dx


class UDSNode(dx.Model, extra="ignore"):
    id: str
    domain: NodeDomain
    type: NodeType | None = None
```

Models use `extra="ignore"` when a mapping intentionally consumes only part of a larger source object. Nested models use their bare Python type with didactic 0.7 and later.

## Projection mappings

Each mapping returns `SeedRecord` instances:

```python
from collections.abc import Iterator

from .. import SeedRecord, dx
from .theory import SourceRoot


class SourceToLayers(dx.Mapping[SourceRoot, list]):
    """Project one source object into Layers seed records."""

    def forward(self, source: SourceRoot) -> list:
        return list(_project(source))


def _project(source: SourceRoot) -> Iterator[SeedRecord]:
    yield SeedRecord(
        handle="example.eng.layers.pub",
        kind="expressions",
        collection="pub.layers.expression.expression",
        body={},
        summary="Imported source expression",
    )


project = SourceToLayers()
```

`SeedRecord`, defined in `lexicons/upstream/__init__.py`, has five fields:

| Field | Meaning |
| --- | --- |
| `handle` | PDS account handle that will host the record |
| `kind` | Output stream name, such as `expressions` |
| `collection` | Target record NSID |
| `body` | Record body before `$type` and `createdAt` are added |
| `summary` | Optional operator-facing description of the projected record |

One source object can produce several target record types. A UDS sentence, for instance, may produce an expression, a segmentation, annotation layers, graph records, and collection membership. This one-to-many fanout differs from the cross-app lens registry, where each manifest entry maps one source NSID to one target NSID.

## Included sources

| Source | Theory | Mapping |
| --- | --- | --- |
| UDS 2.0 | `uds/theory.py` | `uds/lens.py`, `uds/lens_raw.py` |
| CHILDES | `childes/theory.py` | `childes/lens.py` |
| AMR | `amr/theory.py` | `amr/lens.py` |
| UCCA | `ucca/theory.py` | `ucca/lens.py` |
| PMB | `pmb/theory.py` | `pmb/lens.py` |
| UMR | `umr/theory.py` | `umr/lens.py` |

The presence of a theory and mapping does not imply that this repository ships the upstream corpus, a release-specific parser, or redistribution rights for the source data. Operators must obtain each source from its publisher and follow its license.

## Add another source

1. Cite the source specification in `lexicons/upstream/<name>/theory.py`.
2. Model every source field the projection reads.
3. Add `lexicons/upstream/<name>/lens.py` and emit `SeedRecord` values for the target Layers collections.
4. Test the mapping against a licensed local copy of the source data.
5. Validate every emitted record against the target `pub.layers.*` lexicon before publication.
