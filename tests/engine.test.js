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

test('flat tunnels and per-class tables', () => {
  assert.deepEqual(toll('abt', 'all', 'weekday', '12:00'), { amount: 8, periodType: 'flat' });
  assert.equal(toll('tct', 'dbus', 'weekday', '12:00').amount, 35);
  assert.equal(toll('tct', 'mc', 'weekend', '00:00').amount, 15);
  assert.equal(toll('dbt', 'c6', 'weekday', '12:00').amount, 250);
});

test('extreme minutes resolve without error', () => {
  assert.equal(toll('whc', 'car', 'weekday', '00:00').amount, 20);
  assert.equal(toll('whc', 'car', 'weekday', '23:59').amount, 20);
});

test('unknown tunnels and vehicles are rejected', () => {
  assert.throws(() => getToll({ tunnelId: 'nope', vehicleId: 'car', dayType: 'weekday', minutes: 0 }));
  assert.throws(() => getToll({ tunnelId: 'tct', vehicleId: 'bogus', dayType: 'weekday', minutes: 0 }));
});
