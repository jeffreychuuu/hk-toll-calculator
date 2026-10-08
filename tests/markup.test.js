// tests/markup.test.js
// The stub DOM in the app tests cannot notice when the markup drops an element
// the script still reaches for — the page then dies at runtime. This asserts
// the contract directly against the files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('every element the app reaches for exists in the markup', () => {
  const referenced = [...new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]))];
  const present = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));

  assert.ok(referenced.length > 20, 'the pattern found the references');
  const missing = referenced.filter((id) => !present.has(id));
  assert.deepEqual(missing, [], `index.html is missing: ${missing.join(', ')}`);
});

test('the app tests stub every element the app reaches for', () => {
  const suite = readFileSync(new URL('./app.test.js', import.meta.url), 'utf8');
  const stubBlock = suite.slice(suite.indexOf('for (const id of ['), suite.indexOf(']) elements.set'));
  const referenced = [...new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]))];
  const missing = referenced.filter((id) => !stubBlock.includes(`'${id}'`));
  assert.deepEqual(missing, [], `the stub is missing: ${missing.join(', ')}`);
});
