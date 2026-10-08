// tests/regions.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, NODES, TUNNEL_EDGES, regionById, planRoutes } from '../js/regions.js';

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
    ['abt', 'cht', 'ehc', 'lrt', 'smt', 'tct', 'tlt', 'whc']);
  for (const edge of TUNNEL_EDGES) {
    assert.ok(NODES.includes(edge.a) && NODES.includes(edge.b), `${edge.tunnel} endpoints`);
  }
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
  assert.deepEqual(sets(routes), ['abt']);
});

test('the new territories to the island offers big-lam and free approaches', () => {
  const found = sets(planRoutes({ fromId: 'nt-tm', toId: 'hki-cw' }).routes);
  assert.ok(found.includes('tlt+whc'), 'Tai Lam then the western crossing');
  assert.ok(found.includes('whc'), 'free roads then the western crossing');
  assert.ok(found.includes('cht+tlt'), 'Tai Lam then across Kowloon to the red tunnel');
});

test('routes are deduplicated and bounded', () => {
  const pairs = [['nt-st', 'hki-wc'], ['nt-tm', 'hki-cw'], ['kln-kt', 'hki-cw'], ['nt-sk', 'hki-cw']];
  for (const [fromId, toId] of pairs) {
    const routes = planRoutes({ fromId, toId }).routes;
    const unique = new Set(sets(routes));
    assert.equal(unique.size, routes.length, `duplicate tunnel sets for ${fromId}->${toId}`);
    assert.ok(routes.length <= 12, `too many routes for ${fromId}->${toId}: ${routes.length}`);
    for (const route of routes) assert.ok(route.tunnels.length <= 2, 'at most two tunnels per route');
  }
});

test('an incomplete selection yields no routes', () => {
  for (const pair of [{ fromId: '', toId: 'hki-wc' }, { fromId: 'nope', toId: 'hki-wc' }, {}]) {
    assert.deepEqual(planRoutes(pair), { crossesHarbour: false, routes: [] });
  }
});
