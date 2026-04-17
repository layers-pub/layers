#!/usr/bin/env node
// One-shot migration: parses the hand-written RecordTypeConfig + ES document
// mapper in every per-record file and emits declarative `extensions.storage`
// blocks into each lens JSON. After this runs, the lens specs are the single
// source of truth for what a record's row/doc/node/edges look like, and the
// per-record imperative files can be deleted.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPO_DIR = join(ROOT, 'src', 'storage', 'postgresql');
const MAPPER_DIR = join(ROOT, 'src', 'storage', 'elasticsearch', 'document-mappers');
const LENSES_DIR = join(ROOT, 'lenses');

// ---------------------------------------------------------------------------
// Small expression DSL.
//
//   { kind: 'uri' | 'did' | 'rkey' | 'now' | 'record-json' }
//   { kind: 'field', path: string, nullable?: boolean }
//   { kind: 'count', path: string }
//   { kind: 'length-of-json', path: string }
//   { kind: 'literal', value: unknown }
//
// The evaluator in GenericRepository understands these shapes; no runtime
// expression parsing is needed.

function parseExpression(src) {
  const s = src.trim().replace(/,$/, '').trim();
  if (s === 'uri') return { kind: 'uri' };
  if (s === 'did') return { kind: 'did' };
  if (s === 'rkey') return { kind: 'rkey' };
  if (s === 'new Date()') return { kind: 'now' };
  if (s === 'JSON.stringify(record)') return { kind: 'record-json' };
  // literal null
  if (s === 'null') return { kind: 'literal', value: null };
  // record.foo
  let m = /^record\.([a-zA-Z0-9_]+)$/.exec(s);
  if (m) return { kind: 'field', path: m[1] };
  // record.foo ?? null
  m = /^record\.([a-zA-Z0-9_]+)\s*\?\?\s*null$/.exec(s);
  if (m) return { kind: 'field', path: m[1], nullable: true };
  // record.foo ?? <literal>
  m = /^record\.([a-zA-Z0-9_]+)\s*\?\?\s*(.+)$/.exec(s);
  if (m) {
    const inner = parseExpression(m[2]);
    return { kind: 'field-or', path: m[1], fallback: inner };
  }
  // record.foo.length
  m = /^record\.([a-zA-Z0-9_]+)\.length$/.exec(s);
  if (m) return { kind: 'count', path: m[1] };
  // Array.isArray(record.foo) ? record.foo.length : null
  m = /^Array\.isArray\(record\.([a-zA-Z0-9_]+)\)\s*\?\s*record\.\1\.length\s*:\s*null$/.exec(s);
  if (m) return { kind: 'count', path: m[1], nullable: true };
  // Nested record access like (record.design?.type as string) ?? null
  m = /^record\.([a-zA-Z0-9_]+)\?\.([a-zA-Z0-9_]+)(?:\s+as\s+[a-zA-Z0-9_]+)?\s*\?\?\s*null$/.exec(s);
  if (m) return { kind: 'field-chain', path: [m[1], m[2]], nullable: true };
  // String(record.foo) / JSON.stringify(record.foo) fallbacks
  m = /^JSON\.stringify\(record\.([a-zA-Z0-9_]+)\)$/.exec(s);
  if (m) return { kind: 'json-stringify-field', path: m[1] };
  return { kind: 'raw', src: s };
}

// ---------------------------------------------------------------------------
// Repository parser.

function extractRepoConfig(src) {
  // Grab the header scalars.
  const scalar = (name) => {
    const re = new RegExp(String.raw`${name}:\s*['"]([^'"]+)['"]`);
    const m = src.match(re);
    return m?.[1];
  };
  const collection = scalar('collection');
  const table = scalar('table');
  const esIndex = scalar('esIndex');
  const neo4jLabel = scalar('neo4jLabel');
  const resourceName = scalar('resourceName');

  const extractRow = parseReturnBlock(src, /extractRow\([^)]*\)\s*\{\s*return\s*\{([\s\S]*?)\n\s*\};/);
  const extractNodeProps = parseReturnBlock(
    src,
    /extractNodeProps\([^)]*\)\s*\{\s*return\s*\{([\s\S]*?)\n\s*\};/,
  );

  return {
    collection,
    table,
    esIndex,
    neo4jLabel,
    resourceName,
    columns: extractRow,
    nodeProps: extractNodeProps,
    edges: parseEdges(src),
  };
}

function parseReturnBlock(src, re) {
  const m = src.match(re);
  if (!m) return {};
  const body = m[1];
  const out = {};
  for (const line of body.split('\n')) {
    const t = line.trim().replace(/,$/, '').trim();
    if (!t) continue;
    const mm = /^([a-zA-Z0-9_]+):\s*(.+)$/s.exec(t);
    if (!mm) continue;
    out[mm[1]] = parseExpression(mm[2]);
  }
  return out;
}

function parseEdges(src) {
  const edges = [];
  // `extractEdges(...) { ... return edges; }` — scan body for the common
  // patterns: single-ref `edges.push({ from: uri, to: record.X, type: 'T' })`
  // and array-ref `for (const ref of record.X) { edges.push({... type: 'T' }) }`.
  const re = /extractEdges\([^)]*\)\s*\{([\s\S]*?)\n\s*\}\s*,\s*\n/;
  const m = src.match(re);
  if (!m) return edges;
  const body = m[1];

  // single-ref pattern inside `if (record.X)` or top-level
  const single = /edges\.push\(\{\s*from:\s*uri,\s*to:\s*record\.([a-zA-Z0-9_]+),\s*type:\s*['"]([^'"]+)['"]\s*\}\)/g;
  for (let mm; (mm = single.exec(body)) !== null; ) {
    edges.push({ type: mm[2], targetPath: mm[1], nullable: true });
  }

  // array-ref pattern: `for (const ref of record.X) { edges.push({..., to: ref, type: 'T'}) }`
  const array =
    /for\s*\(\s*const\s+(\w+)\s+of\s+record\.([a-zA-Z0-9_]+)\s*\)\s*\{\s*edges\.push\(\{\s*from:\s*uri,\s*to:\s*\1,\s*type:\s*['"]([^'"]+)['"]\s*\}\);?\s*\}/g;
  for (let mm; (mm = array.exec(body)) !== null; ) {
    edges.push({ type: mm[3], targetPath: mm[2], each: true, nullable: true });
  }

  return edges;
}

// ---------------------------------------------------------------------------
// ES document-mapper parser.

function parseMapperReturn(src) {
  const m = src.match(/toDocument\([^)]*\)[^{]*\{[\s\S]*?return\s*\{([\s\S]*?)\n\s*\};/);
  if (!m) return {};
  const body = m[1];
  const out = {};
  for (const line of body.split('\n')) {
    const t = line.trim().replace(/,$/, '').trim();
    if (!t) continue;
    const mm = /^([a-zA-Z0-9_]+):\s*(.+)$/s.exec(t);
    if (!mm) continue;
    out[mm[1]] = parseMapperExpression(mm[2]);
  }
  return out;
}

function parseMapperExpression(src) {
  const s = src.trim().replace(/,$/, '').trim();
  // typed.foo — row column passthrough
  let m = /^typed\.([a-zA-Z0-9_]+)$/.exec(s);
  if (m) return { kind: 'row', column: m[1] };
  // record?.foo ?? null / record?.foo ?? <literal>
  m = /^record\?\.([a-zA-Z0-9_]+)\s*\?\?\s*null$/.exec(s);
  if (m) return { kind: 'record-field', path: m[1], nullable: true };
  m = /^record\?\.([a-zA-Z0-9_]+)$/.exec(s);
  if (m) return { kind: 'record-field', path: m[1] };
  // typed.indexed_at instanceof Date ? typed.indexed_at.toISOString() : typed.indexed_at
  if (/typed\.indexed_at.*toISOString/.test(s)) return { kind: 'indexed-at-iso' };
  return { kind: 'raw', src: s };
}

function parseMapperSearchFields(src) {
  // Capture ES search fields from the mapper module header comment or a
  // `const SEARCH_FIELDS = [...]` / `readonly searchFields = [...]`.
  const m = src.match(/searchFields\s*=\s*\[([^\]]+)\]/);
  if (!m) {
    // Fall back to "multi_match on name and description" text in the doc block.
    const doc = src.match(/multi_match on ([^.]+)\./);
    if (!doc) return null;
    const fields = doc[1]
      .split(/,\s*|\band\b/)
      .map((s) => s.trim())
      .filter((s) => /^[a-z][a-zA-Z0-9_]*$/.test(s));
    return fields.length > 0 ? fields : null;
  }
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/['"]/g, ''))
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Map NSID → file stems. Matches the mapping already in generate.mjs.

const NSID_TO_FILE_STEM = {
  'pub.layers.alignment.alignment': { repo: 'alignments', mapper: 'alignment' },
  'pub.layers.annotation.annotationLayer': { repo: 'annotation-layers', mapper: 'annotation-layer' },
  'pub.layers.annotation.clusterSet': { repo: 'cluster-sets', mapper: 'cluster-set' },
  'pub.layers.changelog.entry': { repo: 'changelogs', mapper: 'changelog' },
  'pub.layers.corpus.corpus': { repo: 'corpora', mapper: 'corpus' },
  'pub.layers.corpus.membership': { repo: 'corpus-memberships', mapper: 'corpus-membership' },
  'pub.layers.eprint.dataLink': { repo: 'data-links', mapper: 'data-link' },
  'pub.layers.eprint.eprint': { repo: 'eprints', mapper: 'eprint' },
  'pub.layers.expression.expression': { repo: 'expressions', mapper: 'expression' },
  'pub.layers.graph.graphEdge': { repo: 'graph-edges', mapper: 'graph-edge' },
  'pub.layers.graph.graphEdgeSet': { repo: 'graph-edge-sets', mapper: 'graph-edge-set' },
  'pub.layers.graph.graphNode': { repo: 'graph-nodes', mapper: 'graph-node' },
  'pub.layers.judgment.agreementReport': { repo: 'agreement-reports', mapper: 'agreement-report' },
  'pub.layers.judgment.experimentDef': { repo: 'experiment-defs', mapper: 'experiment-def' },
  'pub.layers.judgment.judgmentSet': { repo: 'judgment-sets', mapper: 'judgment-set' },
  'pub.layers.media.media': { repo: 'media', mapper: 'media' },
  'pub.layers.ontology.ontology': { repo: 'ontologies', mapper: 'ontology' },
  'pub.layers.ontology.typeDef': { repo: 'type-defs', mapper: 'type-def' },
  'pub.layers.persona.persona': { repo: 'personas', mapper: 'persona' },
  'pub.layers.resource.collection': { repo: 'resource-collections', mapper: 'resource-collection' },
  'pub.layers.resource.collectionMembership': {
    repo: 'collection-memberships',
    mapper: 'collection-membership',
  },
  'pub.layers.resource.entry': { repo: 'resource-entries', mapper: 'resource-entry' },
  'pub.layers.resource.filling': { repo: 'fillings', mapper: 'filling' },
  'pub.layers.resource.template': { repo: 'templates', mapper: 'template' },
  'pub.layers.resource.templateComposition': {
    repo: 'template-compositions',
    mapper: 'template-composition',
  },
  'pub.layers.segmentation.segmentation': { repo: 'segmentations', mapper: 'segmentation' },
};

// ---------------------------------------------------------------------------
// Main.

function main() {
  const lensFiles = readdirSync(LENSES_DIR).filter((f) => f.endsWith('.lens.json'));
  let updated = 0;
  for (const lensFile of lensFiles) {
    const lensPath = join(LENSES_DIR, lensFile);
    const lens = JSON.parse(readFileSync(lensPath, 'utf8'));
    const nsid = lens.source;
    const stems = NSID_TO_FILE_STEM[nsid];
    if (!stems) continue;

    const repoPath = join(REPO_DIR, `${stems.repo}-repository.ts`);
    const mapperPath = join(MAPPER_DIR, `${stems.mapper}-mapper.ts`);

    let repoSpec = null;
    try {
      const repoSrc = readFileSync(repoPath, 'utf8');
      repoSpec = extractRepoConfig(repoSrc);
    } catch {
      console.warn(`  ! no repository for ${nsid}`);
    }

    let esSpec = null;
    try {
      const mapperSrc = readFileSync(mapperPath, 'utf8');
      esSpec = {
        fields: parseMapperReturn(mapperSrc),
      };
      const search = parseMapperSearchFields(mapperSrc);
      if (search) esSpec.searchFields = search;
    } catch {
      // expression's mapper lives inline in document-mapper.ts rather than
      // in the per-record directory.
      if (nsid === 'pub.layers.expression.expression') {
        const src = readFileSync(
          join(ROOT, 'src', 'storage', 'elasticsearch', 'document-mapper.ts'),
          'utf8',
        );
        esSpec = { fields: parseMapperReturn(src) };
        const search = parseMapperSearchFields(src);
        if (search) esSpec.searchFields = search;
      } else {
        console.warn(`  ! no mapper for ${nsid}`);
      }
    }

    lens.extensions = lens.extensions ?? {};
    lens.extensions.storage = {
      collection: repoSpec?.collection ?? nsid,
      table: repoSpec?.table ?? null,
      esIndex: repoSpec?.esIndex ?? null,
      neo4jLabel: repoSpec?.neo4jLabel ?? null,
      resourceName: repoSpec?.resourceName ?? null,
      columns: repoSpec?.columns ?? {},
      nodeProps: repoSpec?.nodeProps ?? {},
      edges: repoSpec?.edges ?? [],
      es: esSpec ?? { fields: {} },
    };

    writeFileSync(lensPath, JSON.stringify(lens, null, 2) + '\n');
    updated++;
  }
  console.log(`  wrote extensions.storage to ${updated} lens specs`);
}

main();
