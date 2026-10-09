// tests/engine.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getToll } from '../js/engine.js';

const toll = (tunnelId, vehicleId, dayType, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return getToll({ tunnelId, vehicleId, dayType, minutes: h * 60 + m });
};

test('west harbour crossing (private car) weekday transition on the minute', () => {
  assert.equal(toll('whc', 'car', 'weekday', '07:30').amount, 22);
  assert.equal(toll('whc', 'car', 'weekday', '07:31').amount, 22);
  assert.equal(toll('whc', 'car', 'weekday', '08:06').amount, 58);
  assert.equal(toll('whc', 'car', 'weekday', '08:07').amount, 58);
  assert.equal(toll('whc', 'car', 'weekday', '08:08').amount, 60);
  assert.equal(toll('whc', 'car', 'weekday', '19:37').amount, 22);
  assert.equal(toll('whc', 'car', 'weekday', '19:38').amount, 20);
});

test('cross-harbour weekend steps are irregular and match the gazetted table', () => {
  assert.equal(toll('cht', 'car', 'weekend', '10:11').amount, 21);
  assert.equal(toll('cht', 'car', 'weekend', '10:12').amount, 21);
  assert.equal(toll('cht', 'car', 'weekend', '10:13').amount, 23);
  assert.equal(toll('cht', 'car', 'weekend', '10:14').amount, 23);
  assert.equal(toll('cht', 'car', 'weekend', '10:15').amount, 25);
  assert.equal(toll('cht', 'car', 'weekend', '19:15').amount, 23);
  assert.equal(toll('cht', 'car', 'weekend', '19:17').amount, 21);
  assert.equal(toll('cht', 'car', 'weekend', '19:19').amount, 20);
});

test('motorcycle fractional rates round cleanly', () => {
  assert.equal(toll('cht', 'moto', 'weekday', '17:30').amount, 16);
  assert.equal(toll('cht', 'moto', 'weekday', '19:16').amount, 8.8);
  assert.equal(toll('whc', 'moto', 'weekday', '07:30').amount, 8.8);
  assert.equal(toll('tlt', 'moto', 'weekday', '07:15').amount, 7.6);
  assert.equal(toll('tlt', 'moto', 'weekday', '19:25').amount, 7.6);
});

test('cross-harbour boundary minutes', () => {
  assert.equal(toll('cht', 'car', 'weekday', '07:47').amount, 38);
  assert.equal(toll('cht', 'car', 'weekday', '07:48').amount, 40);
  assert.equal(toll('cht', 'car', 'weekday', '10:22').amount, 32);
  assert.equal(toll('cht', 'car', 'weekday', '10:23').amount, 30);
});

test('tai lam tunnel weekday and weekend', () => {
  assert.equal(toll('tlt', 'car', 'weekday', '07:15').amount, 19);
  assert.equal(toll('tlt', 'car', 'weekday', '07:40').amount, 43);
  assert.equal(toll('tlt', 'car', 'weekday', '07:41').amount, 45);
  assert.equal(toll('tlt', 'car', 'weekday', '19:25').amount, 19);
  assert.equal(toll('tlt', 'car', 'weekday', '19:26').amount, 18);
  assert.equal(toll('tlt', 'car', 'weekend', '12:00').amount, 18);
});

test('fixed-rate vehicles are flat all day', () => {
  assert.deepEqual(toll('cht', 'taxi', 'weekday', '08:00'), { amount: 25, periodType: 'flat' });
  assert.equal(toll('cht', 'other', 'weekday', '22:00').amount, 50);
  assert.equal(toll('tlt', 'taxi', 'weekend', '03:00').amount, 28);
  assert.equal(toll('tlt', 'other', 'weekend', '03:00').amount, 43);
});

test('every vehicle class is charged the same on a flat-rate tunnel', () => {
  for (const tunnelId of ['abt', 'smt', 'lrt', 'stg']) {
    for (const vehicleId of ['car', 'moto', 'taxi', 'other']) {
      assert.equal(
        getToll({ tunnelId, vehicleId, dayType: 'weekday', minutes: 720 }).amount,
        8,
        `${tunnelId} / ${vehicleId}`,
      );
    }
  }
});

test('flat tunnels and per-class tables', () => {
  assert.deepEqual(toll('abt', 'all', 'weekday', '12:00'), { amount: 8, periodType: 'flat' });
  assert.equal(toll('tct', 'dbus', 'weekday', '12:00').amount, 35);
  assert.equal(toll('tct', 'mc', 'weekend', '00:00').amount, 15);
});

test('extreme minutes resolve without error', () => {
  assert.equal(toll('whc', 'car', 'weekday', '00:00').amount, 20);
  assert.equal(toll('whc', 'car', 'weekday', '23:59').amount, 20);
});

test('unknown tunnels and vehicles are rejected', () => {
  assert.throws(() => getToll({ tunnelId: 'nope', vehicleId: 'car', dayType: 'weekday', minutes: 0 }));
  assert.throws(() => getToll({ tunnelId: 'tct', vehicleId: 'bogus', dayType: 'weekday', minutes: 0 }));
});

// --- Task 5: day segments and next transition ---
import { getDaySegments, getNextTransition } from '../js/engine.js';

test('day segments tile the whole day', () => {
  const segs = getDaySegments({ tunnelId: 'whc', vehicleId: 'car', dayType: 'weekday' });
  assert.equal(segs[0].startMin, 0);
  assert.equal(segs[segs.length - 1].endMin, 1439);
  for (let i = 1; i < segs.length; i += 1) {
    assert.equal(segs[i].startMin, segs[i - 1].endMin + 1);
  }
});

test('transition segment exposes first and last step amounts', () => {
  const segs = getDaySegments({ tunnelId: 'whc', vehicleId: 'car', dayType: 'weekday' });
  const ramp = segs.find((s) => s.startMin === 450);
  assert.equal(ramp.periodType, 'transition');
  assert.equal(ramp.firstAmount, 22);
  assert.equal(ramp.lastAmount, 58);
});

test('flat combinations collapse to a single all-day segment', () => {
  assert.deepEqual(getDaySegments({ tunnelId: 'cht', vehicleId: 'taxi', dayType: 'weekday' }), [
    { startMin: 0, endMin: 1439, periodType: 'flat', firstAmount: 25, lastAmount: 25 },
  ]);
  assert.deepEqual(getDaySegments({ tunnelId: 'abt', vehicleId: 'all', dayType: 'weekday' }), [
    { startMin: 0, endMin: 1439, periodType: 'flat', firstAmount: 8, lastAmount: 8 },
  ]);
});

test('next transition reports time, period and the amount after the change', () => {
  const next = getNextTransition({ tunnelId: 'whc', vehicleId: 'car', dayType: 'weekday', minutes: 1050 });
  assert.deepEqual(next, { atMin: 1140, periodType: 'transition', amount: 58 });
});

test('next transition is null when the rest of the day is flat', () => {
  assert.equal(getNextTransition({ tunnelId: 'cht', vehicleId: 'taxi', dayType: 'weekday', minutes: 600 }), null);
  assert.equal(getNextTransition({ tunnelId: 'whc', vehicleId: 'car', dayType: 'weekday', minutes: 1439 }), null);
});

// --- tunnel-set pricing (journey routes) ---
import { priceRoute } from '../js/engine.js';

test('a route is priced as the sum of its tunnels', () => {
  const route = (tunnels, hhmm = '12:00', vehicle = 'car', dayType = 'weekday') => {
    const [h, m] = hhmm.split(':').map(Number);
    return priceRoute({ tunnels, vehicle, dayType, minutes: h * 60 + m });
  };
  assert.equal(route([]), 0, 'free roads cost nothing');
  assert.equal(route(['lrt']), 8);
  assert.equal(route(['lrt', 'cht']), 38);
  assert.equal(route(['tlt', 'whc'], '09:00'), 45 + 60);
  assert.equal(route(['tct'], '12:00', 'moto'), 15);
  assert.equal(route(['smt']), 8);
});
