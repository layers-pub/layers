import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Lexicons } from '@atproto/lexicon';

const LEXICON_DIR = './lexicons/pub/layers';
const files = readdirSync(LEXICON_DIR).filter(f => f.endsWith('.json')).sort();

console.log(`Found ${files.length} lexicon files\n`);

// Phase 1: Parse JSON and validate each doc against the lexiconDoc zod schema
const docs = [];
let parseErrors = 0;

for (const file of files) {
  const path = join(LEXICON_DIR, file);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  docs.push({ file, doc: raw });
}

// Phase 2: Add all to Lexicons registry (validates cross-references between lexicons)
const lexicons = new Lexicons();
let addErrors = 0;

for (const { file, doc } of docs) {
  try {
    lexicons.add(doc);
    console.log(`  ✓ ${doc.id}`);
  } catch (e) {
    addErrors++;
    console.error(`  ✗ ${file} (${doc.id}):`);
    console.error(`    ${e.message}`);
  }
}

// Phase 3: Verify all cross-references resolve
console.log(`\n--- Checking cross-references ---\n`);
let refErrors = 0;

for (const { file, doc } of docs) {
  for (const [defName, def] of Object.entries(doc.defs)) {
    const uri = defName === 'main' ? doc.id : `${doc.id}#${defName}`;
    const resolved = lexicons.getDef(uri);
    if (!resolved) {
      console.error(`  ✗ Could not resolve def: ${uri}`);
      refErrors++;
    }
  }
}

// Walk all ref fields to check they resolve
function findRefs(obj, path, docId) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => findRefs(item, `${path}[${i}]`, docId));
    return;
  }
  if (obj.type === 'ref' && obj.ref) {
    const refUri = obj.ref.startsWith('#') ? `${docId}${obj.ref}` : obj.ref;
    try {
      const resolved = lexicons.getDef(refUri);
      if (!resolved) {
        console.error(`  ✗ Unresolved ref: ${obj.ref} at ${path}`);
        refErrors++;
      }
    } catch (e) {
      console.error(`  ✗ Error resolving ref ${obj.ref} at ${path}: ${e.message}`);
      refErrors++;
    }
  }
  for (const [key, val] of Object.entries(obj)) {
    findRefs(val, `${path}.${key}`, docId);
  }
}

for (const { file, doc } of docs) {
  for (const [defName, def] of Object.entries(doc.defs)) {
    findRefs(def, `${doc.id}#${defName}`, doc.id);
  }
}

if (refErrors === 0) {
  console.log(`  ✓ All cross-references resolve`);
}

// Summary
const totalErrors = addErrors + refErrors;
console.log(`\n--- Summary ---`);
console.log(`  Files: ${files.length}`);
console.log(`  Lexicon validation errors: ${addErrors}`);
console.log(`  Cross-reference errors: ${refErrors}`);

if (totalErrors > 0) {
  console.log(`\n  ${totalErrors} error(s) found.`);
  process.exit(1);
} else {
  console.log(`\n  All lexicons valid!`);
}
