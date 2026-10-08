// tests/regions.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, regionById, planCrossing } from '../js/regions.js';

test('every region is well formed and named in three languages', () => {
  assert.ok(REGIONS.length >= 18, 'a usable spread of districts');
  const ids = new Set();
  for (const region of REGIONS) {
    assert.ok(!ids.has(region.id), `duplicate id ${region.id}`);
    ids.add(region.id);
    assert.ok(['island', 'kowloon', 'nt'].includes(region.side), `${region.id} side`);
    assert.ok(['west', 'central', 'east'].includes(region.zone), `${region.id} zone`);
    for (const lang of ['tc', 'sc', 'en']) {
      assert.equal(typeof region.name[lang], 'string', `${region.id}.${lang}`);
      assert.ok(region.name[lang].trim().length > 0, `${region.id}.${lang} empty`);
    }
  }
  assert.equal(regionById('nope'), undefined);
  assert.equal(regionById('nt-tuenmun').side, 'nt');
});

test('crossing the harbour ranks the western pair when an end is in the west', () => {
  assert.deepEqual(planCrossing({ fromId: 'nt-tuenmun', toId: 'hki-central' }), {
    crossesHarbour: true,
    reason: 'west',
    tiers: [['whc', 'cht'], ['ehc']],
  });
});

test('central to central is the red tunnel', () => {
  assert.deepEqual(planCrossing({ fromId: 'kln-tst', toId: 'hki-central' }), {
    crossesHarbour: true,
    reason: 'central',
    tiers: [['cht'], ['whc', 'ehc']],
  });
});

test('an eastern pair ranks the eastern crossing alone', () => {
  assert.deepEqual(planCrossing({ fromId: 'kln-kwuntong', toId: 'hki-taikoo' }), {
    crossesHarbour: true,
    reason: 'east',
    tiers: [['ehc'], ['cht'], ['whc']],
  });
});

test('east to central splits the top tier', () => {
  assert.deepEqual(planCrossing({ fromId: 'nt-shatin', toId: 'hki-wanchai' }), {
    crossesHarbour: true,
    reason: 'east',
    tiers: [['cht', 'ehc'], ['whc']],
  });
});

test('a long west-to-east crossing leaves all three plausible', () => {
  const plan = planCrossing({ fromId: 'nt-tungchung', toId: 'hki-chaiwan' });
  assert.equal(plan.crossesHarbour, true);
  assert.deepEqual(plan.tiers, [['whc', 'cht', 'ehc']]);
});

test('trips that stay on one side of the harbour need no crossing', () => {
  for (const [fromId, toId] of [
    ['kln-mk', 'kln-kwuntong'],   // Kowloon to Kowloon
    ['nt-taipo', 'nt-tsuenwan'],  // New Territories to New Territories
    ['hki-west', 'hki-chaiwan'],  // Island to Island
  ]) {
    assert.deepEqual(planCrossing({ fromId, toId }), { crossesHarbour: false, reason: null, tiers: [] });
  }
});

test('an incomplete or unknown selection is handled without throwing', () => {
  for (const pair of [{ fromId: '', toId: 'hki-central' }, { fromId: 'nope', toId: 'hki-central' }, {}]) {
    assert.deepEqual(planCrossing(pair), { crossesHarbour: false, reason: null, tiers: [] });
  }
});
