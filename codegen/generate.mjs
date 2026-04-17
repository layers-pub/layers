#!/usr/bin/env node
// Layers codegen: lexicon JSON -> everything every consumer in the appview needs.
//
// Driven by @panproto/core v0.32 for lexicon parsing. Emits:
//
//   src/types/{slug}.ts
//     The per-record zod schema + Record/Row/View types + toXxxView plus every
//     ParamsSchema / auxiliary zod helper captured from the legacy hand-written
//     modules via record-configs.json.
//
//   web/lib/generated/views.ts
//     TypeScript view interfaces for the web client.
//
//   web/lib/generated/record-registry.ts
//     Runtime `recordKinds` registry powering the generic record UI.

import { Panproto } from '@panproto/core';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LEX_DIR = join(ROOT, 'lexicons', 'pub', 'layers');
const WEB_OUT_DIR = join(ROOT, 'web', 'lib', 'generated');
const SRC_GEN_DIR = join(ROOT, 'src', 'generated');
const SRC_TYPES_DIR = join(ROOT, 'src', 'types');
const LENSES_DIR = join(ROOT, 'lenses');
const CONFIG_FILE = join(__dirname, 'record-configs.json');

const RECORD_CONFIGS = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));

// Slugs derived from src/types/{slug}.ts don't always match NSID-derived slugs.
// This table maps NSID -> legacy slug (file name under src/types) so we can
// overwrite the right file and import path.
const NSID_TO_LEGACY_SLUG = {
  'pub.layers.alignment.alignment': 'alignment',
  'pub.layers.annotation.annotationLayer': 'annotation-layer',
  'pub.layers.annotation.clusterSet': 'cluster-set',
  'pub.layers.changelog.entry': 'changelog-entry',
  'pub.layers.corpus.corpus': 'corpus',
  'pub.layers.corpus.membership': 'corpus-membership',
  'pub.layers.eprint.dataLink': 'data-link',
  'pub.layers.eprint.eprint': 'eprint',
  'pub.layers.expression.expression': 'expression',
  'pub.layers.graph.graphEdge': 'graph-edge',
  'pub.layers.graph.graphEdgeSet': 'graph-edge-set',
  'pub.layers.graph.graphNode': 'graph-node',
  'pub.layers.judgment.agreementReport': 'agreement-report',
  'pub.layers.judgment.experimentDef': 'experiment-def',
  'pub.layers.judgment.judgmentSet': 'judgment-set',
  'pub.layers.media.media': 'media',
  'pub.layers.ontology.ontology': 'ontology',
  'pub.layers.ontology.typeDef': 'type-def',
  'pub.layers.persona.persona': 'persona',
  'pub.layers.resource.collection': 'resource-collection',
  'pub.layers.resource.collectionMembership': 'collection-membership',
  'pub.layers.resource.entry': 'resource-entry',
  'pub.layers.resource.filling': 'filling',
  'pub.layers.resource.template': 'template',
  'pub.layers.resource.templateComposition': 'template-composition',
  'pub.layers.segmentation.segmentation': 'segmentation',
};

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

function camelToTitle(s) {
  return s
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// ---------------------------------------------------------------------------
// Record-level zod schema generator (driven by the lexicon).

function zodForLexField(def, indent = '') {
  if (!def) return 'z.unknown()';
  let expr;
  switch (def.type) {
    case 'string': {
      const parts = ['z.string()'];
      if (Array.isArray(def.knownValues) && def.knownValues.length > 0) {
        // Lexicons treat knownValues as guidance, not an enum; keep permissive.
      }
      if (typeof def.maxLength === 'number') parts.push(`.max(${def.maxLength})`);
      if (typeof def.minLength === 'number') parts.push(`.min(${def.minLength})`);
      expr = parts.join('');
      break;
    }
    case 'integer':
      expr = 'z.number().int()';
      if (typeof def.minimum === 'number') expr += `.min(${def.minimum})`;
      if (typeof def.maximum === 'number') expr += `.max(${def.maximum})`;
      break;
    case 'float':
      expr = 'z.number()';
      break;
    case 'boolean':
      expr = 'z.boolean()';
      break;
    case 'blob':
      expr = 'z.unknown()';
      break;
    case 'ref': {
      // ATProto refs resolve either to a record (stored as at-uri string) or to
      // a local object definition under #... in the same lexicon. Accept both.
      const isLocalObjectRef = typeof def.ref === 'string' && def.ref.includes('#');
      expr = isLocalObjectRef
        ? 'z.union([z.string(), z.record(z.string(), z.unknown())])'
        : 'z.string()';
      break;
    }
    case 'array': {
      const inner = zodForLexField(def.items, indent + '  ');
      expr = `z.array(${inner})`;
      if (typeof def.maxLength === 'number') expr += `.max(${def.maxLength})`;
      if (typeof def.minLength === 'number') expr += `.min(${def.minLength})`;
      break;
    }
    case 'union':
      expr = 'z.unknown()';
      break;
    case 'object':
      if (def.properties) {
        const required = new Set(def.required ?? []);
        const entries = Object.entries(def.properties).map(([k, v]) => {
          const field = zodForLexField(v, indent + '  ');
          const suffix = required.has(k) ? '' : '.optional()';
          return `${indent}  ${JSON.stringify(k)}: ${field}${suffix},`;
        });
        expr = `z.object({\n${entries.join('\n')}\n${indent}})`;
      } else {
        expr = 'z.record(z.string(), z.unknown())';
      }
      break;
    case 'bytes':
      expr = 'z.unknown()';
      break;
    case 'cid-link':
      expr = 'z.string()';
      break;
    case 'unknown':
    default:
      expr = 'z.unknown()';
      break;
  }
  return expr;
}

// ---------------------------------------------------------------------------
// View-type generator for the frontend package.

function tsTypeForLexField(def) {
  if (!def) return 'unknown';
  switch (def.type) {
    case 'string':
      if (Array.isArray(def.knownValues) && def.knownValues.length > 0) {
        return def.knownValues.map((v) => JSON.stringify(v)).join(' | ');
      }
      return 'string';
    case 'integer':
    case 'float':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'blob':
      return 'BlobRef';
    case 'ref':
      return 'string';
    case 'array': {
      const inner = tsTypeForLexField(def.items);
      return `Array<${inner}>`;
    }
    case 'union':
      return 'unknown';
    case 'object':
      if (def.properties) {
        const required = new Set(def.required ?? []);
        const entries = Object.entries(def.properties).map(([k, v]) => {
          const opt = required.has(k) ? '' : '?';
          return `  ${JSON.stringify(k)}${opt}: ${tsTypeForLexField(v)};`;
        });
        return `{\n${entries.join('\n')}\n}`;
      }
      return 'Record<string, unknown>';
    case 'bytes':
      return 'Uint8Array';
    case 'cid-link':
      return 'string';
    case 'unknown':
    default:
      return 'unknown';
  }
}

function viewName(nsid) {
  const last = nsid.split('.').pop();
  return last.charAt(0).toUpperCase() + last.slice(1) + 'View';
}

function pascalKind(nsid) {
  const last = nsid.split('.').pop();
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function slugKind(nsid) {
  const parts = nsid.split('.');
  const tail = parts.slice(2);
  if (tail.length === 2 && tail[0] === tail[1].toLowerCase()) return tail[1];
  return tail.join('-');
}

function fieldKind(def) {
  if (!def) return 'unknown';
  if (def.type === 'array') return 'array';
  if (def.type === 'ref' || (def.type === 'string' && def.format === 'at-uri')) return 'ref';
  if (def.type === 'blob') return 'blob';
  if (def.type === 'string' && Array.isArray(def.knownValues)) return 'enum';
  if (def.type === 'string' && def.format === 'datetime') return 'datetime';
  if (def.type === 'string') return 'string';
  if (def.type === 'integer' || def.type === 'float') return 'number';
  if (def.type === 'boolean') return 'boolean';
  if (def.type === 'union') return 'union';
  if (def.type === 'object') return 'object';
  return def.type ?? 'unknown';
}

// Discover list/get endpoints for each record by scanning every query lexicon
// in the corpus for output schemas that reference the record NSID.
function discoverEndpoints(allLexicons, recordNsids) {
  const recordSet = new Set(recordNsids);
  const listByNsid = new Map();
  const getByNsid = new Map();

  function normalizeRef(ref) {
    return ref.split('#')[0];
  }

  function findRecordRef(node, lex, seen = new Set()) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'ref' && typeof node.ref === 'string') {
      const head = normalizeRef(node.ref);
      const frag = node.ref.includes('#') ? node.ref.split('#')[1] : null;
      if (head && recordSet.has(head)) return head;
      // Local ref like `#recordView` -> resolve in current lexicon.
      if ((head === '' || head === lex.id) && frag && !seen.has(frag)) {
        seen.add(frag);
        const local = lex.defs?.[frag];
        if (local) {
          const hit = findRecordRef(local, lex, seen);
          if (hit) return hit;
        }
      }
    }
    if (node.type === 'array') return findRecordRef(node.items, lex, seen);
    if (node.properties) {
      for (const v of Object.values(node.properties)) {
        const hit = findRecordRef(v, lex, seen);
        if (hit) return hit;
      }
    }
    if (node.schema) return findRecordRef(node.schema, lex, seen);
    if (node.output?.schema) return findRecordRef(node.output.schema, lex, seen);
    if (node.record) return findRecordRef(node.record, lex, seen);
    return null;
  }

  const listCandidates = new Map(); // record -> array of { tail, nsid }
  const getCandidates = new Map();

  for (const lex of allLexicons) {
    const main = lex?.defs?.main;
    if (main?.type !== 'query') continue;
    const target = findRecordRef(main, lex) ?? findRecordRef(main.output, lex);
    if (!target) continue;
    const tail = lex.id.split('.').pop() ?? '';
    const entry = { tail, nsid: lex.id };
    if (tail.startsWith('list')) {
      if (!listCandidates.has(target)) listCandidates.set(target, []);
      listCandidates.get(target).push(entry);
    } else if (tail.startsWith('get')) {
      if (!getCandidates.has(target)) getCandidates.set(target, []);
      getCandidates.get(target).push(entry);
    }
  }

  // Prefer canonical `list<Plural>` / `get<Name>` over filtered variants
  // (e.g. `listByCollection`, `searchByRepo`). Rank by name simplicity.
  const canonicalListRe = /^list[A-Z][a-zA-Z]*$/;
  const canonicalGetRe = /^get[A-Z][a-zA-Z]*$/;

  for (const [target, entries] of listCandidates) {
    entries.sort((a, b) => {
      const aCanon = canonicalListRe.test(a.tail) ? 0 : 1;
      const bCanon = canonicalListRe.test(b.tail) ? 0 : 1;
      if (aCanon !== bCanon) return aCanon - bCanon;
      return a.tail.length - b.tail.length;
    });
    listByNsid.set(target, entries[0].nsid);
  }
  for (const [target, entries] of getCandidates) {
    entries.sort((a, b) => {
      const aCanon = canonicalGetRe.test(a.tail) ? 0 : 1;
      const bCanon = canonicalGetRe.test(b.tail) ? 0 : 1;
      if (aCanon !== bCanon) return aCanon - bCanon;
      return a.tail.length - b.tail.length;
    });
    getByNsid.set(target, entries[0].nsid);
  }

  return { listByNsid, getByNsid };
}

// ---------------------------------------------------------------------------
// src/types/{slug}.ts emitter.

function emitTypesModule(lex, config) {
  const base = config.typeBase;
  const recordType = `${base}Record`;
  const rowType = `${base}Row`;
  const viewType = `${base}View`;
  const toViewFn = `to${base}View`;
  const recordSchema = `${base.charAt(0).toLowerCase() + base.slice(1)}RecordSchema`;

  const body = lex.defs.main.record ?? {};
  const properties = body.properties ?? {};
  const required = new Set(body.required ?? []);

  const entries = Object.entries(properties).map(([k, v]) => {
    const expr = zodForLexField(v, '  ');
    const suffix = required.has(k) ? '' : '.optional()';
    return `  ${JSON.stringify(k)}: ${expr}${suffix},`;
  });

  const schemaSrc = `const ${recordSchema} = z.object({\n${entries.join('\n')}\n});`;

  const rowFields = config.rowFields.length
    ? config.rowFields
    : [
        { name: 'uri', type: 'string' },
        { name: 'did', type: 'string' },
        { name: 'rkey', type: 'string' },
        { name: 'indexed_at', type: 'Date' },
        { name: 'record', type: recordType },
      ];
  const viewFields = config.viewFields.length
    ? config.viewFields
    : rowFields.map((f) => ({
        name: f.name === 'indexed_at' ? 'indexedAt' : f.name,
        type: f.name === 'indexed_at' ? 'string' : f.type,
      }));

  const rowSrc = `interface ${rowType} {\n${rowFields
    .map((f) => `  readonly ${f.name}: ${f.type};`)
    .join('\n')}\n}`;

  const viewSrc = `interface ${viewType} {\n${viewFields
    .map((f) => `  readonly ${f.name}: ${f.type};`)
    .join('\n')}\n}`;

  const mapping = config.viewMapping;
  const toViewSrc = `function ${toViewFn}(row: ${rowType}): ${viewType} {\n  return {\n${viewFields
    .map((f) => `    ${f.name}: ${mapping[f.name] ?? `row.${f.name}`},`)
    .join('\n')}\n  };\n}`;

  const exports = [
    recordSchema,
    ...config.otherNames,
    ...config.paramsNames,
    toViewFn,
  ];
  const typeExports = [recordType, rowType, viewType];

  return `// Generated by layers/codegen/generate.mjs — do not edit by hand.
// Driven by @panproto/core and layers/codegen/record-configs.json.
// Source lexicon: ${lex.id}

import { z } from 'zod';

${config.auxBlocks.filter((b) => !b.includes(`${recordSchema} =`)).join('\n\n')}

${schemaSrc}

type ${recordType} = z.infer<typeof ${recordSchema}>;

${rowSrc}

${viewSrc}

${toViewSrc}

export {
  ${exports.join(',\n  ')},
};
export type { ${typeExports.join(', ')} };
`;
}


// ---------------------------------------------------------------------------
// web/lib/generated emitters (unchanged from the simpler first pass).

async function emitWebPackage(lexicons, allLexicons) {
  const recordNsids = lexicons.map(({ lex }) => lex.id);
  const { listByNsid, getByNsid } = discoverEndpoints(allLexicons, recordNsids);
  const lexiconByNsid = new Map(allLexicons.map((l) => [l.id, l]));

  function extractParamsShape(nsid) {
    if (!nsid) return null;
    const lex = lexiconByNsid.get(nsid);
    const params = lex?.defs?.main?.parameters;
    if (!params) return null;
    const required = new Set(params.required ?? []);
    const entries = Object.entries(params.properties ?? {}).map(([name, def]) => ({
      name,
      required: required.has(name),
      type: def.type === 'integer' || def.type === 'float' ? 'number' : 'string',
      format: def.format ?? null,
      description: def.description ?? null,
      enumValues: Array.isArray(def.knownValues) ? def.knownValues : null,
      default: def.default ?? null,
    }));
    return entries;
  }

  const viewInterfaces = [
    '// Generated by layers/codegen/generate.mjs — do not edit by hand.',
    '// Driven by @panproto/core. Companion to src/types/*.ts.',
    '',
    "import type { BlobRef } from '@atproto/api';",
    '',
  ];

  const records = [];

  for (const { lex } of lexicons) {
    const body = lex.defs.main.record ?? {};
    const properties = body.properties ?? {};
    const required = new Set(body.required ?? []);

    const vname = viewName(lex.id);
    const slug = slugKind(lex.id);
    const title = camelToTitle(pascalKind(lex.id));

    const tsFields = Object.entries(properties).map(([name, def]) => {
      const tsType = tsTypeForLexField(def);
      const isReq = required.has(name);
      return `  ${JSON.stringify(name)}${isReq ? '' : '?'}: ${tsType};`;
    });

    viewInterfaces.push(`/** View type for ${lex.id}. ${(body.description ?? '').trim()} */`);
    viewInterfaces.push(`export interface ${vname} {`);
    viewInterfaces.push(`  uri: string;`);
    viewInterfaces.push(`  cid: string;`);
    viewInterfaces.push(`  did: string;`);
    viewInterfaces.push(`  rkey: string;`);
    viewInterfaces.push(`  indexedAt: string;`);
    viewInterfaces.push(...tsFields);
    viewInterfaces.push(`}\n`);

    const fieldMetas = [];
    for (const [name, def] of Object.entries(properties)) {
      fieldMetas.push({
        name,
        label: camelToTitle(name),
        kind: fieldKind(def),
        required: required.has(name),
        description: def.description ?? null,
        format: def.format ?? null,
        enumValues: Array.isArray(def.knownValues) ? def.knownValues : null,
        itemKind: def.type === 'array' ? fieldKind(def.items) : null,
        itemRefTarget:
          def.type === 'array' && def.items?.type === 'ref' ? def.items.ref ?? null : null,
        refTarget: def.type === 'ref' ? def.ref ?? null : null,
      });
    }

    records.push({
      nsid: lex.id,
      slug,
      title,
      description: body.description ?? lex.description ?? '',
      fields: fieldMetas,
      primaryKey: 'uri',
      viewType: vname,
      listEndpoint: listByNsid.get(lex.id) ?? null,
      getEndpoint: getByNsid.get(lex.id) ?? null,
      listParams: extractParamsShape(listByNsid.get(lex.id)) ?? [],
    });
  }

  records.sort((a, b) => a.nsid.localeCompare(b.nsid));

  mkdirSync(WEB_OUT_DIR, { recursive: true });
  writeFileSync(join(WEB_OUT_DIR, 'views.ts'), viewInterfaces.join('\n'));

  const registry = `// Generated by layers/codegen/generate.mjs — do not edit by hand.
// Driven by @panproto/core. Built from ${records.length} record lexicons under
// layers/lexicons/pub/layers/.

export type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'enum'
  | 'ref'
  | 'blob'
  | 'array'
  | 'object'
  | 'union'
  | 'unknown';

export interface FieldMeta {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly required: boolean;
  readonly description: string | null;
  readonly format: string | null;
  readonly enumValues: readonly string[] | null;
  readonly itemKind: FieldKind | null;
  readonly itemRefTarget: string | null;
  readonly refTarget: string | null;
}

export interface ParamMeta {
  readonly name: string;
  readonly required: boolean;
  readonly type: 'string' | 'number';
  readonly format: string | null;
  readonly description: string | null;
  readonly enumValues: readonly string[] | null;
  readonly default: string | number | null;
}

export interface RecordKindMeta {
  readonly nsid: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly FieldMeta[];
  readonly primaryKey: 'uri';
  readonly viewType: string;
  readonly listEndpoint: string | null;
  readonly getEndpoint: string | null;
  readonly listParams: readonly ParamMeta[];
}

export const recordKinds: Readonly<Record<string, RecordKindMeta>> = Object.freeze(
  ${JSON.stringify(Object.fromEntries(records.map((r) => [r.slug, r])), null, 2)} as Readonly<Record<string, RecordKindMeta>>,
);

export const recordKindList: readonly RecordKindMeta[] = Object.freeze(
  Object.values(recordKinds),
);

export function getRecordKindBySlug(slug: string): RecordKindMeta | undefined {
  return recordKinds[slug];
}

export function getRecordKindByNsid(nsid: string): RecordKindMeta | undefined {
  return recordKindList.find((k) => k.nsid === nsid);
}

export function resolveKindFromUri(uri: string): RecordKindMeta | undefined {
  const m = /^at:\\/\\/[^/]+\\/([^/]+)\\//.exec(uri);
  if (!m) return undefined;
  return getRecordKindByNsid(m[1]);
}
`;

  writeFileSync(join(WEB_OUT_DIR, 'record-registry.ts'), registry);

  return records.length;
}

// ---------------------------------------------------------------------------
// Main.

async function main() {
  const panproto = await Panproto.init();

  const files = walk(LEX_DIR);
  const allLexicons = [];
  const lexicons = [];
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const lex = JSON.parse(raw);
    if (!lex?.id) continue;
    allLexicons.push(lex);
    if (!isRecordLexicon(lex)) continue;
    try {
      panproto.parseLexicon(lex);
    } catch (e) {
      console.warn(`  ! skip ${lex.id}: ${e.message}`);
      continue;
    }
    lexicons.push({ file, lex });
  }

  // Emit src/types/{slug}.ts — one file per record.
  for (const { lex } of lexicons) {
    const legacy = NSID_TO_LEGACY_SLUG[lex.id];
    if (!legacy) {
      console.warn(`  ! no legacy slug mapping for ${lex.id}`);
      continue;
    }
    const config = RECORD_CONFIGS[legacy];
    if (!config) {
      console.warn(`  ! no record config for ${legacy}`);
      continue;
    }
    const out = emitTypesModule(lex, config);
    writeFileSync(join(SRC_TYPES_DIR, `${legacy}.ts`), out);
  }

  // Emit one identity protolens per record. Preserve any existing
  // `extensions.storage` emitted by extract-storage-specs.mjs — the generator
  // manages only the table-projection metadata.
  mkdirSync(LENSES_DIR, { recursive: true });
  for (const { lex } of lexicons) {
    const legacy = NSID_TO_LEGACY_SLUG[lex.id];
    if (!legacy) continue;
    const config = RECORD_CONFIGS[legacy];
    if (!config) continue;
    const tableName = legacy.replace(/-/g, '_') + 's';
    const lensPath = join(LENSES_DIR, `${lex.id}.lens.json`);
    let existing;
    try {
      existing = JSON.parse(readFileSync(lensPath, 'utf8'));
    } catch {
      existing = null;
    }
    const lensDoc = {
      $type: 'panproto.protolens',
      id: `${lex.id}.db-projection`,
      description: `Lexicon → appview DB projection for ${lex.id}`,
      source: lex.id,
      target: `${lex.id}.view`,
      steps: existing?.steps ?? [],
      extensions: {
        ...(existing?.extensions ?? {}),
        table: {
          name: tableName,
          row_struct: `${config.typeBase}Row`,
          conflict_keys: ['uri'],
          include_rkey: true,
          columns: config.rowFields.map((f) => ({ name: f.name, ts_type: f.type })),
        },
      },
    };
    writeFileSync(lensPath, JSON.stringify(lensDoc, null, 2) + '\n');
  }

  const count = await emitWebPackage(lexicons, allLexicons);

  // Emit a slim backend-side registry so api/app.ts can discover every list/get
  // endpoint without the Next.js-flavored imports the frontend registry uses.
  emitBackendRegistry(lexicons, allLexicons);

  console.log(`  wrote src/types/ (${Object.keys(RECORD_CONFIGS).length} records)`);
  console.log(`  wrote lenses/ (${lexicons.length} protolens specs)`);
  console.log(`  wrote ${count} record kinds -> ${relative(ROOT, WEB_OUT_DIR)}/`);
  console.log(`  wrote backend registry -> ${relative(ROOT, SRC_GEN_DIR)}/`);
}

function emitBackendRegistry(lexicons, allLexicons) {
  const recordNsids = lexicons.map(({ lex }) => lex.id);
  const { listByNsid, getByNsid } = discoverEndpoints(allLexicons, recordNsids);
  const lexiconByNsid = new Map(allLexicons.map((l) => [l.id, l]));

  const entries = lexicons
    .map(({ lex }) => {
      const slug = slugKind(lex.id);
      const legacy = NSID_TO_LEGACY_SLUG[lex.id];
      const listNsid = listByNsid.get(lex.id);
      const getNsid = getByNsid.get(lex.id);
      const listLex = listNsid ? lexiconByNsid.get(listNsid) : undefined;
      const listParams = listLex?.defs?.main?.parameters?.properties ?? {};
      const listRequired = new Set(listLex?.defs?.main?.parameters?.required ?? []);
      const paramShape = Object.entries(listParams).map(([name, def]) => ({
        name,
        required: listRequired.has(name),
        type: def.type === 'integer' || def.type === 'float' ? 'number' : 'string',
      }));
      return {
        slug,
        legacy,
        nsid: lex.id,
        listEndpoint: listNsid ?? null,
        getEndpoint: getNsid ?? null,
        listParams: paramShape,
      };
    })
    .sort((a, b) => a.nsid.localeCompare(b.nsid));

  const recordSchemaImports = entries
    .filter((e) => e.legacy)
    .map(
      (e) =>
        `import { ${camel(e.legacy) + 'RecordSchema'} } from '../types/${e.legacy}.js';`,
    )
    .join('\n');

  const schemaByNsid = entries
    .filter((e) => e.legacy)
    .map((e) => `  '${e.nsid}': ${camel(e.legacy) + 'RecordSchema'},`)
    .join('\n');

  const tsBody = `// Generated by layers/codegen/generate.mjs — do not edit by hand.
// Backend registry of record kinds. Pairs with the lens specs under
// layers/lenses/ and the typed record schemas under src/types/.

${recordSchemaImports}
import type { ZodType } from 'zod';

export interface BackendParamMeta {
  readonly name: string;
  readonly required: boolean;
  readonly type: 'string' | 'number';
}

export interface BackendRecordKind {
  readonly slug: string;
  readonly nsid: string;
  readonly listEndpoint: string | null;
  readonly getEndpoint: string | null;
  readonly listParams: readonly BackendParamMeta[];
}

export const backendRecordKinds: readonly BackendRecordKind[] = Object.freeze(${JSON.stringify(
    entries.map((e) => ({
      slug: e.slug,
      nsid: e.nsid,
      listEndpoint: e.listEndpoint,
      getEndpoint: e.getEndpoint,
      listParams: e.listParams,
    })),
    null,
    2,
  )} as const);

export const recordSchemasByNsid: Readonly<Record<string, ZodType>> = {
${schemaByNsid}
};
`;

  mkdirSync(SRC_GEN_DIR, { recursive: true });
  writeFileSync(join(SRC_GEN_DIR, 'record-registry.ts'), tsBody);
}

function camel(kebab) {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
