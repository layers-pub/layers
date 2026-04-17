#!/usr/bin/env node
// Breaking-change gate.
//
// Parses every Layers lexicon via @panproto/core, validates it against the
// ATProto protocol, and compares each schema to the committed baseline under
// layers/codegen/baseline/. Fails (exit 1) on any breaking change.
//
// Produce / refresh the baseline with `--write`. CI invokes without flags.

import { Panproto } from '@panproto/core';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LEX_DIR = join(ROOT, 'lexicons', 'pub', 'layers');
const BASELINE_DIR = join(__dirname, 'baseline');

const WRITE = process.argv.includes('--write');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.json')) out.push(p);
  }
  return out;
}

function isRecordLexicon(lex) {
  return lex?.defs?.main?.type === 'record';
}

function canonicalBaseline(lex) {
  // A stable, panproto-consumable snapshot of the record shape. Limited to
  // the fields that drive storage + validation so formatting/cosmetic edits
  // to the lexicon do not trip the gate.
  const rec = lex.defs.main.record;
  return {
    id: lex.id,
    required: [...(rec.required ?? [])].sort(),
    properties: Object.fromEntries(
      Object.entries(rec.properties ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, def]) => [
          name,
          {
            type: def.type,
            format: def.format ?? null,
            maxLength: def.maxLength ?? null,
            minLength: def.minLength ?? null,
            maximum: def.maximum ?? null,
            minimum: def.minimum ?? null,
            knownValues: Array.isArray(def.knownValues) ? [...def.knownValues].sort() : null,
            items: def.items
              ? { type: def.items.type, ref: def.items.ref ?? null }
              : null,
            ref: def.ref ?? null,
          },
        ]),
    ),
  };
}

function classifyDiff(oldB, newB) {
  const breaking = [];
  const compatible = [];

  const oldRequired = new Set(oldB.required);
  const newRequired = new Set(newB.required);
  for (const name of newRequired) {
    if (!oldRequired.has(name)) breaking.push(`new required field: ${name}`);
  }

  const oldProps = oldB.properties;
  const newProps = newB.properties;
  for (const name of Object.keys(oldProps)) {
    const o = oldProps[name];
    const n = newProps[name];
    if (!n) {
      if (oldRequired.has(name)) breaking.push(`removed required field: ${name}`);
      else compatible.push(`removed optional field: ${name}`);
      continue;
    }
    if (o.type !== n.type) breaking.push(`field ${name}: type ${o.type} -> ${n.type}`);
    if (o.format !== n.format)
      breaking.push(`field ${name}: format ${o.format ?? 'none'} -> ${n.format ?? 'none'}`);
    if (o.maxLength != null && n.maxLength != null && n.maxLength < o.maxLength)
      breaking.push(`field ${name}: tightened maxLength ${o.maxLength} -> ${n.maxLength}`);
    if (o.minLength != null && n.minLength != null && n.minLength > o.minLength)
      breaking.push(`field ${name}: tightened minLength ${o.minLength} -> ${n.minLength}`);
    if (o.maximum != null && n.maximum != null && n.maximum < o.maximum)
      breaking.push(`field ${name}: tightened maximum ${o.maximum} -> ${n.maximum}`);
    if (o.minimum != null && n.minimum != null && n.minimum > o.minimum)
      breaking.push(`field ${name}: tightened minimum ${o.minimum} -> ${n.minimum}`);
    if (
      o.knownValues &&
      n.knownValues &&
      o.knownValues.some((v) => !n.knownValues.includes(v))
    ) {
      breaking.push(`field ${name}: removed knownValues`);
    }
    if ((o.ref ?? '') !== (n.ref ?? ''))
      breaking.push(`field ${name}: ref ${o.ref ?? 'none'} -> ${n.ref ?? 'none'}`);
  }
  for (const name of Object.keys(newProps)) {
    if (!(name in oldProps)) compatible.push(`new field: ${name}`);
  }
  return { breaking, compatible };
}

async function main() {
  const panproto = await Panproto.init();
  const files = walk(LEX_DIR);
  const records = [];
  for (const f of files) {
    const lex = JSON.parse(readFileSync(f, 'utf8'));
    if (!isRecordLexicon(lex)) continue;
    // Validate every lexicon against panproto's ATProto protocol.
    panproto.parseLexicon(lex);
    records.push(lex);
  }

  mkdirSync(BASELINE_DIR, { recursive: true });

  let breakingCount = 0;
  for (const lex of records) {
    const baselinePath = join(BASELINE_DIR, `${lex.id}.json`);
    const current = canonicalBaseline(lex);

    if (WRITE) {
      writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n');
      continue;
    }

    if (!existsSync(baselinePath)) {
      console.error(
        `  ✗ no baseline for ${lex.id}. Refresh with \`node ${relative(ROOT, __dirname)}/check-breaking.mjs --write\`.`,
      );
      breakingCount++;
      continue;
    }
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    const { breaking, compatible } = classifyDiff(baseline, current);
    if (breaking.length > 0) {
      console.error(`  ✗ ${lex.id}`);
      for (const msg of breaking) console.error(`      breaking: ${msg}`);
      for (const msg of compatible) console.error(`      compatible: ${msg}`);
      breakingCount += breaking.length;
    }
  }

  if (WRITE) {
    console.log(`  wrote ${records.length} baseline snapshots -> ${relative(ROOT, BASELINE_DIR)}/`);
    return;
  }

  if (breakingCount > 0) {
    console.error(`\n${breakingCount} breaking change(s) detected.`);
    console.error(
      'Accept the change deliberately by bumping the lexicon id + rerunning with --write.',
    );
    process.exit(1);
  }
  console.log(`  ${records.length} lexicons pass the breaking-change gate`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
