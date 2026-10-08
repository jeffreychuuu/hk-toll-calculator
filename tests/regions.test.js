// tests/regions.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NODES, TUNNEL_EDGES, FREE_EDGES, COMPARE_ROADS, compareGroups,
  categoryForTunnel,
} from '../js/regions.js';


test('the macro graph has the published tunnels as its edges', () => {
  assert.deepEqual(TUNNEL_EDGES.map((edge) => edge.tunnel).sort(),
    ['abt', 'cht', 'ehc', 'lrt', 'smt', 'stg', 'tct', 'tlt', 'whc']);
  for (const edge of TUNNEL_EDGES) {
    assert.ok(NODES.includes(edge.a) && NODES.includes(edge.b), `${edge.tunnel} endpoints`);
  }
});

test('the free corridors are named in three languages and listed once each', () => {
  for (const edge of FREE_EDGES) {
    for (const lang of ['tc', 'sc', 'en']) {
      assert.ok(edge.name[lang] && edge.name[lang].trim().length > 0, `${edge.a}-${edge.b}.${lang}`);
    }
  }
  const names = COMPARE_ROADS.map((road) => road.name.tc);
  assert.equal(new Set(names).size, names.length, 'no duplicate corridors');
  assert.deepEqual(names, ['林錦公路／青山公路', '屯門公路', '大埔道']);
  for (const road of COMPARE_ROADS) assert.equal(typeof road.id, 'string');
  assert.equal(COMPARE_ROADS.find((road) => road.name.tc === '屯門公路').id, 'tmr');
});

test('the corridor categories cover every tolled tunnel', () => {
  const groups = compareGroups();
  assert.deepEqual(groups.map((g) => g.id),
    ['harbour', 'kln-nte', 'kln-ntw', 'nte-ntw', 'island', 'other']);

  const covered = new Set(groups.flatMap((group) => group.tunnels));
  for (const edge of TUNNEL_EDGES) assert.ok(covered.has(edge.tunnel), `${edge.tunnel} is offered`);

  for (const group of groups) {
    assert.ok(group.tunnels.length + group.roads.length >= 1, `${group.id} has options`);
  }
});

test('each category lists only the alternatives for that kind of trip', () => {
  const byId = Object.fromEntries(compareGroups().map((group) => [group.id, group]));

  assert.deepEqual(byId.harbour.tunnels.slice().sort(), ['cht', 'ehc', 'whc']);
  assert.deepEqual(byId.harbour.roads, [], 'there is no free harbour crossing');

  assert.deepEqual(byId['kln-ntw'].tunnels, ['tlt']);
  assert.deepEqual(byId['kln-ntw'].roads.map((road) => road.name.tc), ['屯門公路']);

  assert.deepEqual(byId['nte-ntw'].tunnels, ['smt']);

  // Tai Po Road borders both east Kowloon areas, but is one corridor
  assert.deepEqual(byId['kln-nte'].roads.map((road) => road.name.tc), ['大埔道']);

  // a tunnel off the macro map stands in a corridor of its own
  assert.deepEqual(byId.other.tunnels, ['dbt']);
  assert.deepEqual(byId.other.roads, []);
  assert.equal(categoryForTunnel('dbt'), 'other');
});

test('every tunnel in the graph belongs to exactly one trip category', () => {
  for (const edge of TUNNEL_EDGES) {
    const category = categoryForTunnel(edge.tunnel);
    assert.ok(category, `${edge.tunnel} has a category`);
    const group = compareGroups().find((g) => g.id === category);
    assert.ok(group.tunnels.includes(edge.tunnel), `${edge.tunnel} is listed in ${category}`);
  }
  // Sha Tin Heights / Eagle's Nest / Tai Wai is the Sha Tin to West Kowloon corridor
  assert.equal(categoryForTunnel('stg'), 'kln-nte');
  assert.equal(categoryForTunnel('tlt'), 'kln-ntw');
  assert.equal(categoryForTunnel('cht'), 'harbour');
  // Discovery Bay is off the macro map, so it stands in a corridor of its own
  assert.equal(categoryForTunnel('dbt'), 'other');
});
