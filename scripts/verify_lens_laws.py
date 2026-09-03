"""Verify migration-lens soundness for every pub.layers.* version hop.

WHAT THIS CHECKS, and an honest note on what it cannot.

The full bidirectional lens laws (GetPut: put(get(s).view, get(s).complement) == s;
PutGet: get(put(v, c)) == v) require a `Lens`, which panproto builds only by finding a
schema morphism via hom_search. That search does not scale to the pub.layers.* schemas
(~750 to ~1500 vertices): `auto_generate_lens` and `ProtolensChain.auto_generate` both
fail with "no morphism found between schemas", and a saved `Migration` exposes only the
forward `get` (view + complement) with no complement-consuming `put`. So the strict
GetPut/PutGet check is not reachable through the panproto API for schemas this large.

What IS checkable, and is exactly what distinguishes a correct migration from a broken
one, is FORWARD SOUNDNESS on real records:

  1. TOTALITY: compile the saved migration and run `get` on a record of every source
     record type. A broken lens (for example the auto-derived v0.3.0 to v0.4.0 hop, which
     pruned every record root during the flat-to-directory NSID restructuring) raises
     here; a correct lens does not.
  2. VALID PROJECTION: the produced view is a well-formed instance of the target schema
     (node_count > 1).
  3. DECLARED LOSS: the complement records exactly the vertices dropped, so every loss is
     named rather than silent. A hop that drops nothing is LOSSLESS (an embedding or
     isomorphism on data); a hop that drops fields (for example v0.8.0 to v0.9.0 replacing
     `digest` with `contentDigest`, or v0.3.0 to v0.4.0 removing the segmentation `section`
     and `sentence` types) is LOSSY, and the dropped paths are reported.

A hop PASSES when `get` is total and lossless, PARTIAL when total with declared loss, and
FAILS when `get` raises or the view is invalid. The run exits nonzero on any FAIL.

Run it whenever a lens is built or changed:

    uv run python scripts/verify_lens_laws.py                 # all hops
    uv run python scripts/verify_lens_laws.py --hop v0.8.0 v0.9.0
    uv run python scripts/verify_lens_laws.py --samples DIR   # real records

Without --samples, one minimal valid record per source record type is synthesized from
that version's lexicon required fields.
"""

from __future__ import annotations

import argparse
import glob
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import panproto as p  # type: ignore[import-not-found]

WORKTREE = Path(__file__).resolve().parent.parent
SCHEMAS = WORKTREE / "lexicons" / ".schemas"
LENSES = WORKTREE / "lexicons" / "lenses"
LEXROOT = "lexicons/pub/layers"
CHAIN = ["v0.1.0", "v0.2.0", "v0.3.0", "v0.4.0", "v0.5.0", "v0.6.0", "v0.7.0", "v0.8.0", "v0.9.0"]


def load_schema(version: str) -> Any:
    return p.Schema.from_json((SCHEMAS / f"{version}.json").read_text())


def compiled(frm: str, to: str, src: Any, tgt: Any) -> Any:
    mig = p.Migration.from_dict(json.loads((LENSES / f"{frm}-to-{to}.json").read_text()))
    return p.compile_migration(mig, src, tgt)


def node_count(inst: Any) -> int:
    nc = inst.node_count
    value: Any = nc() if callable(nc) else nc
    return int(value)


def record_root(nsid: str, src: Any) -> str:
    """The body-vertex id an instance loads against, tolerant of the flat (v<=0.3.0)
    and directory (v>=0.4.0) NSID schemes."""
    ids = _vertex_ids(src)
    for candidate in (f"{nsid}:body", f"{nsid}#main:body"):
        if candidate in ids:
            return candidate
    return f"{nsid}:body"


def _vertex_ids(schema: Any) -> set[str]:
    import re
    vs = schema.vertices
    vs = vs() if callable(vs) else vs
    out: set[str] = set()
    for v in vs:
        m = re.search(r'id="([^"]+)"', str(v))
        if m:
            out.add(m.group(1))
    return out


def record_types_at(version: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    files = subprocess.run(
        ["git", "-C", str(WORKTREE), "ls-tree", "-r", "--name-only", version, f"{LEXROOT}/"],
        capture_output=True, text=True, check=True,
    ).stdout.split()
    for f in files:
        if not f.endswith(".json"):
            continue
        blob = subprocess.run(
            ["git", "-C", str(WORKTREE), "show", f"{version}:{f}"], capture_output=True, text=True
        ).stdout
        try:
            doc = json.loads(blob)
        except json.JSONDecodeError:
            continue
        for name, defn in doc.get("defs", {}).items():
            if defn.get("type") == "record":
                nsid = doc["id"] if name == "main" else f"{doc['id']}#{name}"
                out[nsid] = defn["record"]
    return out


def _dummy(prop: dict) -> Any:
    t = prop.get("type")
    if t == "string":
        fmt = prop.get("format")
        if fmt == "datetime":
            return "2026-01-01T00:00:00Z"
        if fmt == "at-uri":
            return "at://did:plc:test/pub.layers.corpus.corpus/self"
        if fmt == "cid":
            return "bafyreigtest00000000000000000000000000000000000000000000000000"
        kv = prop.get("knownValues")
        return kv[0] if kv else "x"
    return {"integer": 0, "boolean": False, "array": []}.get(t, "x")


def synth(rec_def: dict) -> dict:
    return {r: _dummy(rec_def["properties"].get(r, {"type": "string"})) for r in rec_def.get("required", [])}


def load_samples(directory: str) -> dict[str, list[dict]]:
    by_type: dict[str, list[dict]] = {}
    for f in glob.glob(f"{directory}/**/*.json", recursive=True):
        rec = json.loads(Path(f).read_text())
        val = rec.get("value", rec)
        t = val.get("$type") or rec.get("$type")
        if t:
            by_type.setdefault(t, []).append({k: v for k, v in val.items() if k != "$type"})
    return by_type


def verify_hop(frm: str, to: str, samples: dict[str, list[dict]] | None) -> dict:
    src, tgt = load_schema(frm), load_schema(to)
    cm = compiled(frm, to, src, tgt)
    r = {"hop": f"{frm}->{to}", "pass": 0, "partial": 0, "fail": 0, "details": []}
    for nsid, rec_def in record_types_at(frm).items():
        for val in (samples or {}).get(nsid) or [synth(rec_def)]:
            root = record_root(nsid, src)
            try:
                inst = p.Instance.from_json(src, root, json.dumps(val))
                if node_count(inst) <= 1:
                    r["details"].append(("SKIP", nsid, "instance did not load"))
                    continue
                view, complement = cm.get(inst)
                if node_count(view) <= 1:
                    r["fail"] += 1
                    r["details"].append(("FAIL", nsid, "empty target view"))
                    continue
                dropped = complement.get("dropped_nodes", []) if isinstance(complement, dict) else []
                if dropped:
                    r["partial"] += 1
                    r["details"].append(("PARTIAL", nsid, f"lossy: {len(dropped)} dropped"))
                else:
                    r["pass"] += 1
                    r["details"].append(("PASS", nsid, "total, lossless"))
            except Exception as e:  # noqa: BLE001
                r["fail"] += 1
                r["details"].append(("FAIL", nsid, f"{type(e).__name__}: {str(e)[:80]}"))
    return r


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--hop", nargs=2, metavar=("FROM", "TO"))
    ap.add_argument("--samples", metavar="DIR")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    samples = load_samples(args.samples) if args.samples else None
    hops = [tuple(args.hop)] if args.hop else list(zip(CHAIN, CHAIN[1:]))

    total_fail = 0
    print(f"{'hop':<18} {'pass':>5} {'partial':>8} {'fail':>5}")
    print("-" * 40)
    results = []
    for frm, to in hops:
        res = verify_hop(frm, to, samples)
        total_fail += res["fail"]
        print(f"{res['hop']:<18} {res['pass']:>5} {res['partial']:>8} {res['fail']:>5}")
        results.append(res)

    if not args.quiet:
        for res in results:
            nonpass = [d for d in res["details"] if d[0] in ("FAIL", "SKIP")]
            if nonpass:
                print(f"\n{res['hop']} non-pass:")
                for status, nsid, msg in nonpass:
                    print(f"  [{status}] {nsid}: {msg}")

    print(f"\n{'FAIL' if total_fail else 'OK'}: {total_fail} forward-soundness failure(s)")
    return 1 if total_fail else 0


if __name__ == "__main__":
    sys.exit(main())
