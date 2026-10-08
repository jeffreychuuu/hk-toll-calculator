// tests/holidays.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLIDAYS, HOLIDAY_YEARS, isPublicHoliday, defaultDayType, toDateKey } from '../js/holidays.js';

test('gazetted holidays are present for all three years', () => {
  assert.deepEqual(HOLIDAY_YEARS, [2025, 2026, 2027]);
  assert.ok(HOLIDAYS.has('2025-05-05')); // Buddha's Birthday 2025
  assert.ok(HOLIDAYS.has('2026-02-17')); // Lunar New Year Day 1 2026
  assert.ok(HOLIDAYS.has('2026-04-06')); // day following Ching Ming (substituted) 2026
  assert.ok(HOLIDAYS.has('2026-04-07')); // day following Easter Monday 2026
  assert.ok(HOLIDAYS.has('2027-05-13')); // Buddha's Birthday 2027
  assert.ok(HOLIDAYS.has('2027-12-27')); // first weekday after Christmas 2027
});

test('ordinary weekday is not a holiday', () => {
  assert.equal(isPublicHoliday(new Date(2026, 9, 8)), false); // Thu 2026-10-08
  assert.equal(toDateKey(new Date(2026, 9, 8)), '2026-10-08');
});

test('day type: weekday stays weekday, Sunday and holidays become weekend', () => {
  assert.equal(defaultDayType(new Date(2026, 9, 8)).dayType, 'weekday'); // Thursday
  assert.equal(defaultDayType(new Date(2026, 9, 11)).dayType, 'weekend'); // Sunday
  assert.equal(defaultDayType(new Date(2026, 1, 17)).dayType, 'weekend'); // Tue, Lunar New Year
  assert.equal(defaultDayType(new Date(2026, 3, 4)).dayType, 'weekend'); // Sat, day after Good Friday
});

test('dates outside the embedded range are flagged as stale', () => {
  assert.equal(defaultDayType(new Date(2024, 0, 1)).dataCurrent, false);
  assert.equal(defaultDayType(new Date(2026, 0, 1)).dataCurrent, true);
});
