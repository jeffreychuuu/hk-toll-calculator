// tests/regions.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGIONS, NODES, TUNNEL_EDGES, FREE_EDGES, COMPARE_ROADS, regionById, planRoutes, compareGroups,
  categoryForTunnel,
} from '../js/regions.js';

const sets = (routes) => routes.map((route) => route.tunnels.slice().sort().join('+'));

test('the eighteen districts are well formed, named three ways and mapped to nodes', () => {
  assert.equal(REGIONS.length, 18, 'the 18 District Council districts');
  const ids = new Set();
  for (const region of REGIONS) {
    assert.ok(!ids.has(region.id), `duplicate id ${region.id}`);
    ids.add(region.id);
    assert.ok(['island', 'kowloon', 'nt'].includes(region.area), `${region.id} area`);
    assert.ok(Array.isArray(region.nodes) && region.nodes.length >= 1, `${region.id} nodes`);
    for (const node of region.nodes) assert.ok(NODES.includes(node), `${region.id} node ${node}`);
    for (const lang of ['tc', 'sc', 'en']) {
      assert.equal(typeof region.name[lang], 'string', `${region.id}.${lang}`);
      assert.ok(region.name[lang].trim().length > 0, `${region.id}.${lang} empty`);
    }
  }
  assert.equal(regionById('nope'), undefined);
  assert.equal(regionById('hki-wc').name.tc, '灣仔區');
  assert.equal(regionById('kln-wts').area, 'kowloon');
});

test('four districts straddle two areas so both crossing directions are offered', () => {
  assert.deepEqual(regionById('hki-cw').nodes, ['isw', 'isc']);
  assert.deepEqual(regionById('kln-wts').nodes, ['klc', 'kle']);
  assert.deepEqual(regionById('kln-kc').nodes, ['klc', 'kle']);
  assert.deepEqual(regionById('nt-sk').nodes, ['kle', 'nte']);
});

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
  assert.ok(names.includes('屯門公路'));
  assert.ok(names.includes('大埔道'));
  assert.ok(names.includes('龍翔道'));
  for (const road of COMPARE_ROADS) assert.equal(typeof road.id, 'string');
  assert.equal(COMPARE_ROADS.find((road) => road.name.tc === '屯門公路').id, 'tmr');
});

test('a route carries the roads and tunnels in the order you drive them', () => {
  // Sha Tin to Tsuen Wan: the free route is the Lam Kam road, the tolled one is Shing Mun
  const free = planRoutes({ fromId: 'nt-st', toId: 'nt-tw' }).routes.find((r) => r.tunnels.length === 0);
  assert.deepEqual(free.roads.map((road) => road.tc), ['林錦公路／青山公路']);

  // Sha Tin to Wan Chai via Tai Po Road: road first, then the crossing
  const viaRoad = planRoutes({ fromId: 'nt-st', toId: 'hki-wc' }).routes
    .find((r) => r.roads.length > 0 && r.tunnels.join() === 'cht');
  assert.deepEqual(viaRoad.roads.map((road) => road.tc), ['大埔道']);
});

test('a cross-harbour trip offers both the tunnel approach and the free one', () => {
  const { crossesHarbour, routes } = planRoutes({ fromId: 'nt-st', toId: 'hki-wc' });
  assert.equal(crossesHarbour, true);

  const found = sets(routes);
  assert.ok(found.includes('cht'), 'free roads then the red tunnel');
  assert.ok(found.includes('cht+lrt'), 'Lion Rock then the red tunnel');
  assert.ok(found.includes('ehc'), 'free roads then the eastern crossing');
  assert.ok(found.includes('ehc+tct'), "Tate's Cairn then the eastern crossing");

  for (const route of routes) {
    assert.ok(route.tunnels.some((id) => ['cht', 'ehc', 'whc'].includes(id)),
      'a harbour trip always uses a harbour crossing');
  }
});

test('a two-area district offers both directions from one selection', () => {
  // Wong Tai Sin straddles central and east Kowloon
  const found = sets(planRoutes({ fromId: 'kln-wts', toId: 'hki-wc' }).routes);
  assert.ok(found.includes('cht'), 'the red tunnel');
  assert.ok(found.includes('ehc'), 'and the eastern crossing');

  // Central and Western straddles west and central on the island
  const toShaTin = sets(planRoutes({ fromId: 'hki-cw', toId: 'nt-st' }).routes);
  assert.ok(toShaTin.some((key) => key.includes('whc')), 'the western crossing');
  assert.ok(toShaTin.some((key) => key.includes('cht')), 'and the red tunnel');
});

test('an in-between tunnel appears on its own corridor', () => {
  // Sha Tin to Tsuen Wan is the Shing Mun Tunnels corridor, and the free road
  assert.ok(sets(planRoutes({ fromId: 'nt-st', toId: 'nt-tw' }).routes).includes('smt'));
  assert.ok(sets(planRoutes({ fromId: 'nt-st', toId: 'nt-tw' }).routes).includes(''));
});

test('a trip that needs no tunnel reports the free route', () => {
  const { crossesHarbour, routes } = planRoutes({ fromId: 'kln-ytm', toId: 'kln-kt' });
  assert.equal(crossesHarbour, false);
  assert.deepEqual(sets(routes), ['']);
});

test('an island-to-island trip only uses island tunnels', () => {
  const { crossesHarbour, routes } = planRoutes({ fromId: 'hki-cw', toId: 'hki-south' });
  assert.equal(crossesHarbour, false);
  assert.deepEqual([...new Set(sets(routes))], ['abt'], 'Aberdeen Tunnel only');
  for (const route of routes) assert.deepEqual(route.tunnels, ['abt']);
});

test('the new territories to the island offers big-lam and free approaches', () => {
  const found = sets(planRoutes({ fromId: 'nt-tm', toId: 'hki-cw' }).routes);
  assert.ok(found.includes('tlt+whc'), 'Tai Lam then the western crossing');
  assert.ok(found.includes('whc'), 'free roads then the western crossing');
  assert.ok(found.includes('cht+tlt'), 'Tai Lam then across Kowloon to the red tunnel');
});

test('routes are deduplicated and bounded', () => {
  const key = (route) =>
    route.tunnels.slice().sort().join('+') + '|' + route.roads.map((road) => road.en).sort().join('+');
  const pairs = [['nt-st', 'hki-wc'], ['nt-tm', 'hki-cw'], ['kln-kt', 'hki-cw'], ['nt-sk', 'hki-cw']];
  for (const [fromId, toId] of pairs) {
    const routes = planRoutes({ fromId, toId }).routes;
    const unique = new Set(routes.map(key));
    assert.equal(unique.size, routes.length, `duplicate routes for ${fromId}->${toId}`);
    assert.ok(routes.length <= 24, `too many routes for ${fromId}->${toId}: ${routes.length}`);
    for (const route of routes) assert.ok(route.tunnels.length <= 2, 'at most two tunnels per route');
  }
});

test('an incomplete selection yields no routes', () => {
  for (const pair of [{ fromId: '', toId: 'hki-wc' }, { fromId: 'nope', toId: 'hki-wc' }, {}]) {
    assert.deepEqual(planRoutes(pair), { crossesHarbour: false, routes: [] });
  }
});

test('the corridor categories cover every tolled tunnel', () => {
  const groups = compareGroups();
  assert.deepEqual(groups.map((g) => g.id),
    ['harbour', 'kln-nte', 'kln-ntw', 'nte-ntw', 'island', 'kowloon']);

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
  assert.deepEqual(byId['kln-nte'].roads.map((road) => road.name.tc), ['大埔道', '龍翔道']);
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
  // Discovery Bay is not part of the macro map at all
  assert.equal(categoryForTunnel('dbt'), undefined);
});
