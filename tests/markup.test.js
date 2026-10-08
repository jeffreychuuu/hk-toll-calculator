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

const section = (id) => {
  const start = html.indexOf(`id="${id}"`);
  assert.ok(start !== -1, `#${id} is missing from the markup`);
  return html.slice(start, html.indexOf('</section>', start));
};

test('the day type and the clock live on the chart card', () => {
  const chart = section('chart-card');
  for (const id of ['date-input', 'daytype-select', 'hour-select', 'minute-select',
    'time-slider', 'back-to-now', 'period-badge', 'next-hint']) {
    assert.ok(chart.includes(`id="${id}"`), `#${id} should sit with the 24-hour chart`);
  }

  const result = section('result-card');
  for (const id of ['daytype-select', 'hour-select', 'minute-select', 'vehicle-select', 'period-badge']) {
    assert.ok(!result.includes(`id="${id}"`), `#${id} should have left the result card`);
  }

  const alt = section('alt-card');
  assert.ok(alt.includes('id="vehicle-select"'), 'the vehicle class sits with the comparison');
  assert.ok(alt.includes('id="label-vehicle-class"'), 'under its own 車種 label');
});
