// tests/app.test.js
// Drives js/app.js under a stub DOM so the UI wiring is testable without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const RealDate = Date;
let fakeNowMs = new RealDate(2026, 9, 8, 7, 29).getTime(); // Thu 2026-10-08 07:29 (not a holiday)
class FakeDate extends RealDate {
  constructor(...args) {
    if (args.length) return new RealDate(...args);
    super(fakeNowMs);
  }
  static now() { return fakeNowMs; }
}
globalThis.Date = FakeDate;

const daytypeButtons = ['weekday', 'weekend'].map((dt) => ({
  dataset: { daytype: dt }, ariaPressed: null,
  setAttribute(k, v) { if (k === 'aria-pressed') this.ariaPressed = v; },
  addEventListener() {}, closest() { return this; },
}));

const elements = new Map();
function mk(id) {
  return {
    id, _innerHTML: '', textContent: '', hidden: false, className: '', value: '', style: {},
    _handlers: {},
    addEventListener(t, h) { this._handlers[t] = h; },
    setAttribute() {},
    querySelectorAll(sel) { return sel === 'button' ? daytypeButtons : []; },
    closest() { return null; },
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = v; },
    get selectedOptions() {
      const all = [...this._innerHTML.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)];
      const hit = all.find((o) => o[1] === this.value) || all[0] || ['', '', ''];
      return [{ textContent: hit[2] }];
    },
  };
}
for (const id of ['result-title', 'result-subtitle', 'period-badge', 'price-amount', 'next-hint',
  'now-time', 'chart-bar', 'chart-marker', 'legend', 'tunnel-select', 'vehicle-select',
  'daytype-toggle', 'time-input', 'time-slider', 'holiday-notice']) elements.set(id, mk(id));

globalThis.document = { getElementById: (id) => elements.get(id) };
let intervalCb = null;
globalThis.setInterval = (fn) => { intervalCb = fn; return 1; };

const $ = (id) => elements.get(id);
const fire = (id, type) => {
  const handler = $(id)._handlers[type];
  assert.ok(handler, `#${id} has a ${type} handler`);
  handler({ target: $(id) });
};

await import('../js/app.js');

test('the toll follows the clock while the page sits open', () => {
  assert.equal($('time-input').value, '07:29');
  assert.equal($('price-amount').textContent, '20.00');

  fakeNowMs = new RealDate(2026, 9, 8, 7, 30).getTime(); // one minute later, transition starts
  intervalCb();

  assert.equal($('time-input').value, '07:30');
  assert.equal($('price-amount').textContent, '22.00');
  assert.equal($('period-badge').textContent, '過渡期');
});

test('following stops once the user picks a time themselves', () => {
  $('time-slider').value = '630'; // 10:30
  fire('time-slider', 'input');
  assert.equal($('price-amount').textContent, '30.00');

  fakeNowMs = new RealDate(2026, 9, 8, 16, 30).getTime();
  intervalCb();

  assert.equal($('time-input').value, '10:30');
  assert.equal($('price-amount').textContent, '30.00');
});

test('the clock label always tracks real time, even when following is off', () => {
  fakeNowMs = new RealDate(2026, 9, 8, 18, 5).getTime();
  intervalCb();
  assert.equal($('now-time').textContent, '18:05');
});
