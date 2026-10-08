// tests/data.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TUNNELS, FLAT_TOLLS, TVT_FIXED, vehiclesFor, classIdFor, canonicalFor,
  TVT_VEHICLES, FLAT8_VEHICLES, TCT_VEHICLES, DBT_VEHICLES,
} from '../js/data.js';

test('tunnel registry covers all ten paid tunnels', () => {
  assert.deepEqual(
    TUNNELS.map((t) => t.id),
    ['cht', 'ehc', 'whc', 'tlt', 'abt', 'smt', 'lrt', 'stg', 'tct', 'dbt'],
  );
  assert.equal(TUNNELS.find((t) => t.id === 'whc').pricing, 'tvt');
  assert.equal(TUNNELS.find((t) => t.id === 'abt').pricing, 'flat');
});

test('vehicle options depend on the tunnel', () => {
  assert.deepEqual(vehiclesFor('cht'), TVT_VEHICLES);
  assert.deepEqual(vehiclesFor('abt'), FLAT8_VEHICLES);
  assert.deepEqual(vehiclesFor('abt').map((v) => v.id), ['car', 'moto', 'taxi', 'other'],
    'the flat-rate tunnels name the four classes so the vehicle is never guessed');
  assert.deepEqual(vehiclesFor('tct'), TCT_VEHICLES);
  assert.deepEqual(vehiclesFor('dbt'), DBT_VEHICLES);
  assert.throws(() => vehiclesFor('nope'));
});

test('the private car leads every tunnel that names one', () => {
  for (const tunnel of TUNNELS) {
    const ids = vehiclesFor(tunnel.id).map((vehicle) => vehicle.id);
    const car = ids.includes('car') ? 'car' : 'pc';
    if (!ids.includes(car)) continue; // a tunnel with a scheme of its own
    assert.equal(ids[0], car, `${tunnel.id} leads with the private car`);
  }
});

test('flat toll tables hold the published rates', () => {
  assert.equal(FLAT_TOLLS.abt.all, 8);
  assert.equal(FLAT_TOLLS.stg.all, 8);
  assert.equal(FLAT_TOLLS.tct.dbus, 35); // double-deck bus, Tate's Cross
  assert.equal(FLAT_TOLLS.tct.mc, 15); // motorcycle, Tate's Cross
  assert.equal(FLAT_TOLLS.dbt.c6, 250); // heavy goods vehicle, Discovery Bay
  assert.equal(FLAT_TOLLS.dbt.c4, 120); // light goods vehicle, Discovery Bay
});

test('fixed time-varying vehicles carry per-tunnel rates', () => {
  assert.deepEqual(TVT_FIXED.cht, { taxi: 25, other: 50 });
  assert.deepEqual(TVT_FIXED.tlt, { taxi: 28, other: 43 });
});

test('every tunnel and vehicle name exists in all three languages', () => {
  const langs = ['tc', 'sc', 'en'];
  const checkName = (name, id, lang) => {
    assert.equal(typeof name[lang], 'string', `${id}.${lang} missing`);
    assert.ok(name[lang].trim().length > 0, `${id}.${lang} empty`);
  };
  for (const t of TUNNELS) {
    for (const lang of langs) {
      checkName(t.name, t.id, lang);
      checkName(t.group, `${t.id}.group`, lang);
    }
    if (t.note) for (const lang of langs) checkName(t.note, `${t.id}.note`, lang);
  }
  for (const list of [TVT_VEHICLES, FLAT8_VEHICLES, TCT_VEHICLES, DBT_VEHICLES]) {
    for (const v of list) for (const lang of langs) checkName(v.name, v.id, lang);
  }
});

test('the transport department English names are used', () => {
  const byId = Object.fromEntries(TUNNELS.map((t) => [t.id, t.name]));
  assert.equal(byId.tct.en, "Tate's Cairn Tunnel");
  assert.equal(byId.cht.en, 'Cross-Harbour Tunnel (Hung Hom)');
  assert.equal(byId.whc.en, 'Western Harbour Crossing');
  assert.equal(byId.tlt.en, 'Tai Lam Tunnel');
  assert.equal(byId.abt.en, 'Aberdeen Tunnel');
});

test('every tunnel has either a flat table or a fixed table or schedules', () => {
  for (const t of TUNNELS) {
    const ok = t.pricing === 'flat' ? !!FLAT_TOLLS[t.id] : !!TVT_FIXED[t.id];
    assert.ok(ok, `missing toll table for ${t.id}`);
  }
});

test('the canonical vehicle classes map onto each tunnel\'s own taxonomy', () => {
  assert.equal(classIdFor('cht', 'car'), 'car');
  assert.equal(classIdFor('tlt', 'other'), 'other');
  assert.equal(classIdFor('abt', 'car'), 'all');
  assert.equal(classIdFor('smt', 'moto'), 'all');
  assert.equal(classIdFor('tct', 'car'), 'pc');
  assert.equal(classIdFor('tct', 'moto'), 'mc');
  assert.equal(classIdFor('tct', 'other'), 'lgv');

  assert.equal(canonicalFor('cht', 'moto'), 'moto');
  assert.equal(canonicalFor('tct', 'pc'), 'car');
  assert.equal(canonicalFor('tct', 'mc'), 'moto');
  assert.equal(canonicalFor('tct', 'dbus'), 'other');
  assert.equal(canonicalFor('abt', 'car'), 'car', 'a canonical class stays itself');
  assert.equal(canonicalFor('stg', 'moto'), 'moto');
  assert.equal(canonicalFor('abt', 'all'), 'car', 'the legacy all-vehicles id still resolves');
});
