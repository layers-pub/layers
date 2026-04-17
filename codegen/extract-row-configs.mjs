#!/usr/bin/env node
// One-shot migration helper: scans hand-written src/types/*.ts and captures
// everything that cannot be derived from lexicons — PG row columns, view shape,
// row→view mapping, filter/params zod schemas, auxiliary zod helpers.
//
// Run once. The output (record-configs.json) is committed and becomes the
// single source of truth the generator consumes alongside the lexicons.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_TYPES = join(__dirname, '..', 'src', 'types');
const OUT_FILE = join(__dirname, 'record-configs.json');

const SKIP = new Set(['errors', 'result', 'index', 'cross-reference']);

function parseBlock(src, header) {
  const re = new RegExp(String.raw`interface ${header} \{([\s\S]*?)\n\}`);
  const m = src.match(re);
  if (!m) return null;
  const body = m[1];
  const fields = [];
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('/')) continue;
    const fm = /^readonly ([a-zA-Z0-9_]+): (.+?);?$/.exec(t);
    if (!fm) continue;
    fields.push({ name: fm[1], type: fm[2].replace(/;$/, '') });
  }
  return fields;
}

function parseViewMapping(src, fnName) {
  const re = new RegExp(String.raw`function ${fnName}\(row: [A-Za-z]+Row\)[\s\S]*?\{\s*return \{([\s\S]*?)\n\s*\};\s*\n\}`);
  const m = src.match(re);
  if (!m) return {};
  const body = m[1];
  const mapping = {};
  for (const line of body.split('\n')) {
    const t = line.trim().replace(/,$/, '');
    const mm = /^([a-zA-Z0-9_]+):\s*(.+)$/.exec(t);
    if (!mm) continue;
    mapping[mm[1]] = mm[2];
  }
  return mapping;
}

function extractTopLevelConstBlocks(src) {
  const results = [];
  // Match `const NAME = ...;` including multi-line object/array bodies with balanced braces.
  let i = 0;
  while (i < src.length) {
    const idx = src.indexOf('\nconst ', i - 1);
    if (idx === -1) break;
    const nameStart = idx + '\nconst '.length;
    const nameMatch = /^([a-zA-Z0-9_]+)\s*=\s*/.exec(src.slice(nameStart));
    if (!nameMatch) {
      i = nameStart + 1;
      continue;
    }
    const name = nameMatch[1];
    const valueStart = nameStart + nameMatch[0].length;
    const end = scanExpressionEnd(src, valueStart);
    if (end === -1) break;
    const body = src.slice(idx + 1, end + 1); // include trailing ;
    results.push({ name, body });
    i = end + 1;
  }
  return results;
}

function scanExpressionEnd(src, start) {
  let depth = 0;
  let inStr = null;
  for (let j = start; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (c === '\\') {
        j++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ';' && depth === 0) return j;
  }
  return -1;
}

const configs = {};

for (const name of readdirSync(SRC_TYPES)) {
  if (!name.endsWith('.ts')) continue;
  const slug = name.replace(/\.ts$/, '');
  if (SKIP.has(slug)) continue;
  const src = readFileSync(join(SRC_TYPES, name), 'utf8');
  const interfaceMatch = src.match(/interface ([A-Za-z]+)Row \{/);
  if (!interfaceMatch) continue;
  const base = interfaceMatch[1];

  const rowFields = parseBlock(src, `${base}Row`) ?? [];
  const viewFields = parseBlock(src, `${base}View`) ?? [];
  const viewMapping = parseViewMapping(src, `to${base}View`);

  // Capture every top-level `const` block except the record schema itself
  // (we regenerate that from the lexicon). Keep them in the order they appear.
  const consts = extractTopLevelConstBlocks(src);
  const extraConsts = consts.filter((c) => !/^[a-z][a-zA-Z]*RecordSchema$/.test(c.name));
  const paramsNames = extraConsts
    .filter((c) => /ParamsSchema$/.test(c.name))
    .map((c) => c.name);
  const otherNames = extraConsts
    .filter((c) => !/ParamsSchema$/.test(c.name))
    .map((c) => c.name);

  configs[slug] = {
    typeBase: base,
    rowFields,
    viewFields,
    viewMapping,
    paramsNames,
    otherNames,
    auxBlocks: extraConsts.map((c) => c.body),
  };
}

writeFileSync(OUT_FILE, JSON.stringify(configs, null, 2));
console.log(`wrote ${Object.keys(configs).length} record configs -> ${OUT_FILE}`);
