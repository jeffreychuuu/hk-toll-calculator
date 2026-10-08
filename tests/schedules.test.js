// tests/schedules.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TVT_SCHEDULES, TUNNELS } from '../js/data.js';

const scheduleOf = (id, dayType) => TVT_SCHEDULES[id][dayType];

test('every time-varying tunnel has weekday and weekend schedules', () => {
  for (const t of TUNNELS.filter((x) => x.pricing === 'tvt')) {
    assert.ok(scheduleOf(t.id, 'weekday').length > 0, `${t.id} weekday`);
    assert.ok(scheduleOf(t.id, 'weekend').length > 0, `${t.id} weekend`);
  }
});

test('schedules tile 00:00–23:59 with no gaps or overlaps', () => {
  for (const t of TUNNELS.filter((x) => x.pricing === 'tvt')) {
    for (const dayType of ['weekday', 'weekend']) {
      const segs = scheduleOf(t.id, dayType);
      assert.equal(segs[0].s, 0, `${t.id}/${dayType} starts at minute 0`);
      assert.equal(segs[segs.length - 1].e, 1439, `${t.id}/${dayType} ends at 23:59`);
      for (let i = 1; i < segs.length; i += 1) {
        assert.equal(segs[i].s, segs[i - 1].e + 1, `${t.id}/${dayType} gap before index ${i}`);
      }
    }
  }
});

test('segment shapes are valid', () => {
  for (const id of ['cht', 'whc', 'tlt']) {
    for (const dayType of ['weekday', 'weekend']) {
      for (const seg of scheduleOf(id, dayType)) {
        assert.ok(seg.s <= seg.e, `${id}/${dayType} s<=e`);
        if (seg.type === 'fixed') {
          assert.equal(typeof seg.car, 'number');
          assert.equal(typeof seg.moto, 'number');
          assert.ok(['non-peak', 'normal', 'peak'].includes(seg.period));
        } else {
          assert.equal(seg.type, 'transition');
          for (const rate of [seg.car, seg.moto]) {
            assert.equal(typeof rate.from, 'number');
            assert.ok([1, -1].includes(rate.dir));
            assert.ok(rate.offset > 0 && rate.step > 0);
          }
        }
      }
    }
  }
});
