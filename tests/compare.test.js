// tests/compare.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCrossHarbourComparison } from '../js/engine.js';
import { CROSS_HARBOUR_IDS } from '../js/data.js';

const at = (minutes) => {
  const [h, m] = minutes.split(':').map(Number);
  return h * 60 + m;
};
const compare = (vehicleId, dayType, hhmm) =>
  getCrossHarbourComparison({ vehicleId, dayType, minutes: at(hhmm) });

test('the cross-harbour set is exactly the three harbour crossings', () => {
  assert.deepEqual(CROSS_HARBOUR_IDS, ['cht', 'ehc', 'whc']);
});

test('every option carries a tunnel id and an amount', () => {
  const result = compare('car', 'weekday', '12:00');
  assert.equal(result.options.length, 3);
  for (const option of result.options) {
    assert.ok(CROSS_HARBOUR_IDS.includes(option.tunnelId));
    assert.equal(typeof option.amount, 'number');
  }
});

test('a weekday peak: the red and eastern crossings beat the western one', () => {
  const result = compare('car', 'weekday', '09:00');
  assert.equal(result.amount, 40);
  assert.deepEqual(result.cheapest, ['cht', 'ehc']);
  assert.equal(result.options.find((o) => o.tunnelId === 'whc').amount, 60);
});

test('the western crossing is still on its ramp while the others are already at peak', () => {
  const result = compare('car', 'weekday', '08:00'); // western ramp: 20 + 2 + 2*15
  assert.deepEqual(result.cheapest, ['cht', 'ehc']);
  assert.equal(result.options.find((o) => o.tunnelId === 'whc').amount, 52);
});

test('the western crossing peak starts a minute later', () => {
  assert.deepEqual(compare('car', 'weekday', '08:08').cheapest, ['cht', 'ehc']);
});

test('a weekday normal window is a three-way tie', () => {
  const result = compare('car', 'weekday', '12:00');
  assert.equal(result.amount, 30);
  assert.equal(result.cheapest.length, 3);
});

test('the weekend is a three-way tie', () => {
  const result = compare('car', 'weekend', '12:00');
  assert.equal(result.amount, 25);
  assert.equal(result.cheapest.length, 3);
});

test('motorcycles follow the same pattern at 40%', () => {
  const peak = compare('moto', 'weekday', '08:00');
  assert.equal(peak.amount, 16);
  assert.deepEqual(peak.cheapest, ['cht', 'ehc']);

  assert.equal(compare('moto', 'weekday', '12:00').amount, 12);
});

test('flat vehicle classes tie across all three at every hour', () => {
  for (const vehicleId of ['taxi', 'other']) {
    for (const hhmm of ['08:00', '12:00', '23:00']) {
      const result = compare(vehicleId, 'weekday', hhmm);
      assert.equal(result.cheapest.length, 3, `${vehicleId} at ${hhmm}`);
    }
  }
  assert.equal(compare('taxi', 'weekday', '08:00').amount, 25);
  assert.equal(compare('other', 'weekday', '08:00').amount, 50);
});
