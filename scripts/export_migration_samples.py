"""Export representative authored and imported records from layers-repo."""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("layers_repo", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    repo = args.layers_repo.resolve()
    sys.path.insert(0, str(repo))
    os.chdir(repo)

    from layers_repo.catalogue import (  # noqa: PLC0415
        discover_accounts,
        discover_sources,
        iter_seed_records,
    )
    from layers_repo.importers.base import run_importer  # noqa: PLC0415

    samples: list[dict[str, object]] = []
    counts: defaultdict[str, int] = defaultdict(int)

    def omit_none(value: object) -> object:
        if isinstance(value, dict):
            return {
                key: omit_none(item)
                for key, item in value.items()
                if item is not None
            }
        if isinstance(value, list):
            return [omit_none(item) for item in value]
        return value

    def collect(records: object, origin: str, limit_per_collection: int = 3) -> None:
        for built in records:
            if counts[built.collection] >= limit_per_collection:
                continue
            record = omit_none(json.loads(built.model.model_dump_json()))
            if not isinstance(record, dict):
                raise TypeError(f"{built.collection} did not serialize to an object")
            record["$type"] = built.collection
            samples.append(
                {
                    "collection": built.collection,
                    "origin": origin,
                    "record": record,
                }
            )
            counts[built.collection] += 1

    accounts = discover_accounts(Path("accounts"))
    collect(iter_seed_records(accounts), "layers-repo authored seed")

    sources = {source.id: source for source in discover_sources(Path("sources"))}
    for source_id in ("acceptability", "veridicality"):
        source = sources.get(source_id)
        if source is None:
            continue
        collect(
            run_importer(source, data_dir=Path("data"), limit=8),
            f"layers-repo importer {source_id}",
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(samples, indent=2, sort_keys=True), encoding="utf-8")
    print(f"exported {len(samples)} records across {len(counts)} collections")


if __name__ == "__main__":
    main()
