import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Lexicons } from '@atproto/lexicon';

const root = 'lexicons/pub/layers';

function lexiconFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? lexiconFiles(path)
      : entry.name.endsWith('.json')
        ? [path]
        : [];
  });
}

const lexicons = new Lexicons(
  lexiconFiles(root).map((path) => JSON.parse(readFileSync(path, 'utf8'))),
);
const item = {
  recordRef:
    'at://did:plc:example/pub.layers.expression.expression/stimulus-1',
};

for (const continuousValue of [
  { coefficient: 0, scale: 0 },
  { coefficient: 73, scale: 2 },
  { coefficient: 1, scale: 0 },
  { coefficient: -125, scale: 2 },
  { coefficient: 125, scale: 1 },
]) {
  const judgment = { item, continuousValue };
  const roundTripped = JSON.parse(JSON.stringify(judgment));
  const result = lexicons.validate(
    'pub.layers.judgment.defs#judgment',
    roundTripped,
  );
  assert.equal(result.success, true, result.error?.message);
  assert.deepEqual(result.value, judgment);
}

for (const continuousValue of [
  null,
  '',
  {},
  { coefficient: 'NaN', scale: 0 },
  { coefficient: Number.NaN, scale: 0 },
  { coefficient: Number.POSITIVE_INFINITY, scale: 0 },
  { coefficient: Number.NEGATIVE_INFINITY, scale: 0 },
  { coefficient: 0.73, scale: 0 },
  { coefficient: 73, scale: -2 },
  { coefficient: 73 },
  { scale: 2 },
]) {
  const result = lexicons.validate('pub.layers.judgment.defs#judgment', {
    item,
    continuousValue,
  });
  assert.equal(result.success, false, JSON.stringify(continuousValue));
}

const integerScalar = lexicons.validate(
  'pub.layers.judgment.defs#judgment',
  { item, scalarValue: 5 },
);
assert.equal(integerScalar.success, true, integerScalar.error?.message);
const decimalScalar = lexicons.validate(
  'pub.layers.judgment.defs#judgment',
  { item, scalarValue: 0.73 },
);
assert.equal(decimalScalar.success, false);

const experiment = lexicons.getDefOrThrow(
  'pub.layers.judgment.experimentDef#main',
  ['record'],
);
assert.ok(
  experiment.record.properties.taskType.knownValues.includes('continuous'),
);

console.log('Continuous judgment validation passed.');
