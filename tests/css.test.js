// tests/css.test.js
// The palette is tokens all the way down, and a token defined in terms of
// itself (or a var() with no definition) voids the declaration silently
// instead of failing anything — so assert the definitions here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

test('no custom property is defined in terms of itself', () => {
  const defs = [...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)];
  const cycles = defs.filter(([, name, value]) => value.includes(`var(${name})`));
  assert.deepEqual(cycles.map(([, name]) => name), [], 'self-referential tokens void every use of them');
});

test('every var() names a token the stylesheet defines', () => {
  const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]));
  const missing = [...used].filter((name) => !defined.has(name));
  assert.deepEqual(missing, [], `undefined tokens: ${missing.join(', ')}`);
});
